import http from 'node:http';
import { VERSION } from './config.js';
import { conexiones } from './Conexion.js';
import { cuantasSalas } from './salas.js';

// El HTTP común: solo contesta /health con el estado del servidor. Sirve para que el juego sepa la versión del protocolo y
// también para "despertar" el servicio en Render (que se duerme si nadie lo usa).
export function crearServidorHttp() {
  return http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (req.url === '/' || req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, version: VERSION, salas: cuantasSalas(), conexiones: conexiones.size }));
    } else {
      res.writeHead(404);
      res.end();
    }
  });
}
