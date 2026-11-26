// Servidor de salas para el modo multijugador de "1941: Quebrada Seca".
// WebSocket (RFC 6455) con módulos de Node, SIN dependencias: no hace falta "npm install".
//
// El servidor no ejecuta el juego: solo reparte los mensajes entre los dos jugadores de cada sala (el piloto, que la crea, y la
// estratega, que se une con el código). Este archivo solo arma las piezas; cada una vive en server/src/:
//   config.js         valores fijos y variables de entorno (PORT y ORIGENES_PERMITIDOS)
//   websocket.js      el protocolo WebSocket: aceptar la conexión, armar y leer tramas
//   Conexion.js       una persona conectada y el protocolo del juego (la lista de mensajes está ahí)
//   salas.js          las salas y sus códigos
//   http.js           /health
//   mantenimiento.js  pings y limpieza de salas abandonadas
import { ORIGENES, PUERTO } from './src/config.js';
import Conexion from './src/Conexion.js';
import { crearServidorHttp } from './src/http.js';
import { iniciarMantenimiento } from './src/mantenimiento.js';
import { aceptarUpgrade } from './src/websocket.js';

const servidor = crearServidorHttp();
servidor.on('upgrade', (req, socket) => {
  if (aceptarUpgrade(req, socket, ORIGENES)) new Conexion(socket);
});
iniciarMantenimiento();
servidor.listen(PUERTO, () => console.log(`Servidor de salas escuchando en el puerto ${PUERTO}`));
