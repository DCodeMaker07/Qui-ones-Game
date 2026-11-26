import crypto from 'node:crypto';

// El protocolo WebSocket (RFC 6455) hecho a mano con módulos de Node, para no depender de ninguna librería.
// Acá no sé nada del juego: solo aceptar la conexión, armar tramas y leerlas.
const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
export const OP = { CONTINUACION: 0x0, TEXTO: 0x1, BINARIO: 0x2, CIERRE: 0x8, PING: 0x9, PONG: 0xa };

// Responde al "upgrade" de HTTP. Devuelve true si acepté la conexión y false si la rechacé (pidió otra versión, falta la clave
// o viene de un origen que no dejé entrar)
export function aceptarUpgrade(req, socket, origenesPermitidos) {
  const clave = req.headers['sec-websocket-key'];
  const origen = req.headers.origin;
  const valido =
    String(req.headers.upgrade || '').toLowerCase() === 'websocket' &&
    clave &&
    req.headers['sec-websocket-version'] === '13' &&
    (!origenesPermitidos.length || !origen || origenesPermitidos.includes(origen));
  if (!valido) {
    socket.write('HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n');
    socket.destroy();
    return false;
  }
  const aceptar = crypto.createHash('sha1').update(clave + GUID).digest('base64');
  socket.write(
    'HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n' +
      `Sec-WebSocket-Accept: ${aceptar}\r\n\r\n`
  );
  return true;
}

// Una trama del servidor al cliente (el servidor nunca enmascara)
export function trama(opcode, payload = Buffer.alloc(0)) {
  const n = payload.length;
  let cabecera;
  if (n < 126) {
    cabecera = Buffer.from([0x80 | opcode, n]);
  } else if (n < 65536) {
    cabecera = Buffer.alloc(4);
    cabecera[0] = 0x80 | opcode;
    cabecera[1] = 126;
    cabecera.writeUInt16BE(n, 2);
  } else {
    cabecera = Buffer.alloc(10);
    cabecera[0] = 0x80 | opcode;
    cabecera[1] = 127;
    cabecera.writeUInt32BE(0, 2);
    cabecera.writeUInt32BE(n, 6);
  }
  return Buffer.concat([cabecera, payload]);
}

// Lee las tramas que van llegando por el socket (pueden venir cortadas o varias juntas) y avisa lo que encuentra:
//   alTexto(texto)   un mensaje completo, ya juntado si venía en fragmentos
//   alPing(carga)    el cliente me hizo ping (hay que contestar con pong y la misma carga)
//   alPong()         el cliente contestó mi ping
//   alCierre()       el cliente quiere cerrar
//   alError(codigo)  la trama no cumple el protocolo y hay que cerrar con ese código
//   activa()         devuelve false si la conexión ya se cerró, y entonces dejo de leer
export class DecodificadorTramas {
  constructor({ maxPayload, alTexto, alPing, alPong, alCierre, alError, activa }) {
    Object.assign(this, { maxPayload, alTexto, alPing, alPong, alCierre, alError, activa });
    this.pendiente = Buffer.alloc(0);
    this.fragmentos = [];
  }

  alimentar(datos) {
    this.pendiente = Buffer.concat([this.pendiente, datos]);
    while (this.pendiente.length >= 2 && this.activa()) {
      const b0 = this.pendiente[0];
      const b1 = this.pendiente[1];
      const fin = !!(b0 & 0x80);
      const opcode = b0 & 0x0f;
      const enmascarado = !!(b1 & 0x80);
      let largo = b1 & 0x7f;
      let desde = 2;
      if (largo === 126) {
        if (this.pendiente.length < 4) return;
        largo = this.pendiente.readUInt16BE(2);
        desde = 4;
      } else if (largo === 127) {
        if (this.pendiente.length < 10) return;
        if (this.pendiente.readUInt32BE(2) !== 0) return this.alError(1009);
        largo = this.pendiente.readUInt32BE(6);
        desde = 10;
      }
      if (!enmascarado) return this.alError(1002); // los clientes siempre enmascaran
      if (largo > this.maxPayload) return this.alError(1009);
      if (this.pendiente.length < desde + 4 + largo) return; // la trama todavía no llegó entera

      const mascara = this.pendiente.subarray(desde, desde + 4);
      const carga = Buffer.from(this.pendiente.subarray(desde + 4, desde + 4 + largo));
      for (let i = 0; i < carga.length; i++) carga[i] ^= mascara[i & 3];
      this.pendiente = this.pendiente.subarray(desde + 4 + largo);

      if (opcode === OP.CIERRE) return this.alCierre();
      if (opcode === OP.PING) this.alPing(carga);
      else if (opcode === OP.PONG) this.alPong();
      else if (opcode === OP.TEXTO || opcode === OP.BINARIO || opcode === OP.CONTINUACION) this.juntar(opcode, carga, fin);
    }
  }

  // Un mensaje puede venir en varios fragmentos: los junto hasta que llega el último
  juntar(opcode, carga, fin) {
    if (opcode !== OP.CONTINUACION) this.fragmentos = [];
    this.fragmentos.push(carga);
    if (!fin) return;
    const texto = Buffer.concat(this.fragmentos).toString('utf8');
    this.fragmentos = [];
    this.alTexto(texto);
  }
}
