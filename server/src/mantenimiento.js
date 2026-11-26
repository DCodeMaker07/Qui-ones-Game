import { LIMPIEZA_CADA_MS, PING_CADA_MS } from './config.js';
import { conexiones } from './Conexion.js';
import { limpiarSalasViejas } from './salas.js';

// Las dos tareas que corren solas cada cierto tiempo. Les pongo unref() para que no impidan que el proceso termine.
export function iniciarMantenimiento() {
  // Ping: mantiene viva la conexión y detecta las caídas. Si una conexión no contestó el ping anterior, la cierro
  setInterval(() => {
    for (const conexion of conexiones) {
      if (!conexion.viva) {
        conexion.alCerrar();
        continue;
      }
      conexion.viva = false;
      conexion.hacerPing();
    }
  }, PING_CADA_MS).unref();

  // Borra las salas que se quedaron abandonadas
  setInterval(limpiarSalasViejas, LIMPIEZA_CADA_MS).unref();
}
