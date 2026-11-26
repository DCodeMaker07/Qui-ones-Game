import crypto from 'node:crypto';
import { LETRAS, SALA_VIEJA_MS } from './config.js';

// Las salas. Cada una tiene dos lugares: el piloto (quien la crea) y la estratega (quien se une con el código).
// Una sala es { codigo, piloto, estratega, creada }, donde piloto y estratega son conexiones (o null si se fue).
const salas = new Map();

export const cuantasSalas = () => salas.size;

// Una sala nueva con un código de 4 letras que no esté en uso
export function crearSala(piloto) {
  let codigo;
  do {
    codigo = Array.from({ length: 4 }, () => LETRAS[crypto.randomInt(LETRAS.length)]).join('');
  } while (salas.has(codigo));
  const sala = { codigo, piloto, estratega: null, creada: Date.now() };
  salas.set(codigo, sala);
  return sala;
}

// Busco por código sin importar mayúsculas ni espacios
export function buscarSala(codigo) {
  return salas.get(codigo.trim().toUpperCase());
}

// Saco a una conexión de su lugar. Si la sala queda vacía, la borro
export function salir(sala, rol) {
  if (rol === 'piloto') sala.piloto = null;
  else sala.estratega = null;
  if (!sala.piloto && !sala.estratega) salas.delete(sala.codigo);
}

// Borro las salas abandonadas hace más de SALA_VIEJA_MS
export function limpiarSalasViejas() {
  const limite = Date.now() - SALA_VIEJA_MS;
  for (const [codigo, sala] of salas) if (sala.creada < limite) salas.delete(codigo);
}
