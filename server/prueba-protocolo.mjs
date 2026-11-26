// Pruebas del protocolo con un socket falso (sin red): ping y pong, tramas inválidas, mensajes en fragmentos y límite por segundo.
// Uso: node prueba-protocolo.mjs
import { EventEmitter } from 'node:events';
import Conexion, { conexiones } from './src/Conexion.js';
const falso = () => { const s = new EventEmitter(); s.escrito = []; s.write = (b) => s.escrito.push(Buffer.from(b)); s.end = () => {}; s.destroy = () => { s.destruido = true; }; s.setNoDelay = () => {}; return s; };
const enmascarar = (opcode, carga) => { const m = Buffer.from([1, 2, 3, 4]); const c = Buffer.from(carga); for (let i = 0; i < c.length; i++) c[i] ^= m[i & 3]; return Buffer.concat([Buffer.from([0x80 | opcode, 0x80 | c.length]), m, c]); };
let ok = true; const comprobar = (c, m) => { console.log((c ? 'OK     ' : 'FALLÓ  ') + m); if (!c) ok = false; };

const s = falso(); const c = new Conexion(s);
c.hacerPing(); comprobar(s.escrito.at(-1)[0] === (0x80 | 0x9), 'hacerPing escribe una trama de ping');
s.emit('data', enmascarar(0x9, Buffer.from('hola'))); const pong = s.escrito.at(-1);
comprobar(pong[0] === (0x80 | 0xa) && pong.subarray(2).toString() === 'hola', 'un ping del cliente se contesta con pong y la misma carga');
c.viva = false; s.emit('data', enmascarar(0xa, Buffer.alloc(0))); comprobar(c.viva === true, 'un pong del cliente marca la conexión como viva');
// trama sin máscara: se cierra con 1002
const s2 = falso(); const c2 = new Conexion(s2); s2.emit('data', Buffer.from([0x81, 0x02, 0x7b, 0x7d]));
comprobar(c2.cerrada && s2.escrito.at(-1).readUInt16BE(2) === 1002, 'una trama sin máscara cierra con el código 1002');
// mensaje fragmentado en dos tramas
const s3 = falso(); const c3 = new Conexion(s3); const recibidos = []; c3.alMensaje = (t) => recibidos.push(t);
const cortar = (fin, opcode, texto) => { const m = Buffer.from([9, 8, 7, 6]); const c = Buffer.from(texto); for (let i = 0; i < c.length; i++) c[i] ^= m[i & 3]; return Buffer.concat([Buffer.from([(fin ? 0x80 : 0) | opcode, 0x80 | c.length]), m, c]); };
s3.emit('data', Buffer.concat([cortar(false, 0x1, '{"t":"pi'), cortar(true, 0x0, 'ng"}')]));
comprobar(recibidos[0] === '{"t":"ping"}', 'un mensaje en dos fragmentos llega junto');
// límite de mensajes por segundo
const s4 = falso(); const c4 = new Conexion(s4); for (let i = 0; i < 205; i++) c4.alMensaje('{"t":"ping"}');
comprobar(c4.cerrada && s4.escrito.some((b) => b[0] === (0x80 | 0x8) && b.readUInt16BE(2) === 1008), 'más de 200 mensajes por segundo cierra con el código 1008');
console.log(ok ? '\nTodo bien' : '\nHubo fallos'); process.exit(ok ? 0 : 1);
