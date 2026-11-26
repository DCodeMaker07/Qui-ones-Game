// Prueba automática del servidor: arranca el servidor, conecta dos clientes (piloto y estratega) y comprueba las salas.
// Uso: node prueba.mjs   (requiere Node 22+, que trae WebSocket de cliente)
import { spawn } from 'node:child_process';

const puerto = 18080 + Math.floor(Math.random() * 500);
const srv = spawn(process.execPath, ['index.js'], { env: { ...process.env, PORT: String(puerto) }, stdio: 'ignore' });
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
let fallos = 0;
const ok = (cond, msg) => {
  console.log((cond ? 'OK     ' : 'FALLÓ  ') + msg);
  if (!cond) fallos++;
};

function cliente() {
  const ws = new WebSocket(`ws://localhost:${puerto}`);
  const recibidos = [];
  ws.addEventListener('message', (e) => recibidos.push(JSON.parse(e.data)));
  const abierto = new Promise((r) => ws.addEventListener('open', r, { once: true }));
  return { ws, recibidos, abierto, enviar: (o) => ws.send(JSON.stringify(o)), ultimo: (t) => [...recibidos].reverse().find((m) => m.t === t) };
}

try {
  await esperar(600);
  const salud = await fetch(`http://localhost:${puerto}/health`).then((r) => r.json());
  ok(salud.ok === true && salud.version >= 4, '/health responde y declara su versión');

  const piloto = cliente();
  const lay = cliente();
  await Promise.all([piloto.abierto, lay.abierto]);

  piloto.enviar({ t: 'crear' });
  await esperar(150);
  const sala = piloto.ultimo('sala');
  ok(sala && /^[A-Z2-9]{4}$/.test(sala.codigo) && sala.rol === 'piloto', `el piloto crea una sala (${sala?.codigo})`);

  lay.enviar({ t: 'unirse', codigo: 'zzzz' });
  await esperar(150);
  ok(lay.ultimo('error')?.motivo === 'sala_no_existe', 'unirse a una sala inexistente da error');

  lay.enviar({ t: 'unirse', codigo: sala.codigo.toLowerCase() });
  await esperar(150);
  ok(lay.ultimo('sala')?.rol === 'estratega', 'Layla se une con el código (sin importar mayúsculas)');
  ok(piloto.ultimo('companero')?.conectado === true, 'el piloto recibe el aviso de que Layla se conectó');

  piloto.enviar({ t: 'estado', n: 1, x: 640 });
  await esperar(100);
  ok(lay.ultimo('estado')?.x === 640, 'el estado del piloto llega a Layla');

  lay.enviar({ t: 'marca', tipo: 'bomba', x: 100, y: 200 });
  lay.enviar({ t: 'estado', x: 1 }); // el estratega NO puede enviar "estado"
  await esperar(100);
  ok(piloto.ultimo('marca')?.x === 100, 'la marca de Layla llega al piloto');
  ok(!piloto.ultimo('estado'), 'un mensaje no permitido para ese rol se descarta');

  // Mensaje grande (>125 bytes) para probar la longitud extendida de la trama, y una ráfaga
  const grande = 'x'.repeat(5000);
  piloto.enviar({ t: 'radio', texto: grande });
  for (let i = 0; i < 50; i++) piloto.enviar({ t: 'estado', i });
  await esperar(200);
  ok(lay.ultimo('radio')?.texto.length === 5000, 'mensaje de 5000 bytes (trama extendida) llega completo');
  ok(lay.recibidos.filter((m) => m.t === 'estado' && 'i' in m).length === 50, 'ráfaga de 50 mensajes llega completa y en orden');

  // Historias en paralelo: ambos roles pueden mandar "sync" y se reenvía al otro
  piloto.enviar({ t: 'sync', etapa: 'inicio' });
  lay.enviar({ t: 'sync', etapa: 'nivel2' });
  await esperar(100);
  ok(lay.ultimo('sync')?.etapa === 'inicio' && piloto.ultimo('sync')?.etapa === 'nivel2', 'el mensaje sync llega en las dos direcciones');

  // Escenas compartidas: el mensaje "dialogo" viaja en las dos direcciones
  piloto.enviar({ t: 'dialogo', a: 'linea', id: 'fin_nivel1', i: 0 });
  lay.enviar({ t: 'dialogo', a: 'fin', id: 'fin_nivel1', i: 0, texto: 'hola' });
  await esperar(100);
  ok(lay.ultimo('dialogo')?.a === 'linea' && piloto.ultimo('dialogo')?.texto === 'hola', 'el mensaje dialogo llega en las dos direcciones');

  const tercero = cliente();
  await tercero.abierto;
  tercero.enviar({ t: 'unirse', codigo: sala.codigo });
  await esperar(150);
  ok(tercero.ultimo('error')?.motivo === 'sala_llena', 'una tercera persona no puede entrar (sala llena)');
  tercero.ws.close();

  lay.ws.close();
  await esperar(200);
  ok(piloto.ultimo('companero')?.conectado === false, 'el piloto recibe el aviso al desconectarse Layla');

  piloto.ws.close();
  await esperar(200);
  const salud2 = await fetch(`http://localhost:${puerto}/health`).then((r) => r.json());
  ok(salud2.salas === 0, 'la sala se elimina cuando ambos se van');
} catch (e) {
  console.log('ERROR en la prueba:', e);
  fallos++;
} finally {
  srv.kill();
  console.log(fallos ? `\n${fallos} comprobación(es) fallaron` : '\nTodas las comprobaciones pasaron');
  process.exit(fallos ? 1 : 0);
}
