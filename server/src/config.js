// Los valores fijos del servidor y lo que leo del entorno. Todo lo que quiero ajustar está acá y en ningún otro archivo.

// Versión del protocolo: 2 = mensajes "sync" (historias en paralelo); 3 = "dialogo" (escenas compartidas); 4 = "barrera" (Layla coloca barreras).
// El juego se niega a conectarse a un servidor más viejo que su RED.versionMinima.
export const VERSION = 4;

// Render define PORT solo. ORIGENES_PERMITIDOS es una lista separada por comas; si está vacía acepto a todos.
export const PUERTO = Number(process.env.PORT) || 8080;
export const ORIGENES = (process.env.ORIGENES_PERMITIDOS || '')
  .split(',')
  .map((origen) => origen.trim())
  .filter(Boolean);

// Límites para que un cliente no pueda saturar el servidor
export const MAX_PAYLOAD = 64 * 1024; // bytes por mensaje
export const MAX_MENSAJES_POR_SEG = 200;

// Las letras del código de sala: sin 0/O ni 1/I/L para no confundirlas al dictar el código
export const LETRAS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

// Mantenimiento
export const PING_CADA_MS = 25000; // Render cierra las conexiones inactivas, así que mando un ping cada tanto
export const LIMPIEZA_CADA_MS = 10 * 60 * 1000;
export const SALA_VIEJA_MS = 6 * 3600 * 1000; // una sala abandonada más de 6 h se borra

// Qué mensajes le dejo reenviar a cada rol. Todo lo demás se descarta
export const PERMITIDOS = {
  piloto: new Set(['estado', 'radio', 'evento', 'escena', 'inicio', 'fin', 'sync', 'dialogo']),
  estratega: new Set(['radio', 'orden', 'marca', 'botiquin', 'barrera', 'refuerzos', 'chat', 'sync', 'dialogo']),
};
