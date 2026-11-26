import { INFO } from '../../config.js';

// El guion del ending, como en un anime. Cada plano dice cuándo entra (t, en segundos desde que empieza la música),
// cuánto dura (dur) y qué se ve. Los tiempos los puse donde cambia la canción (lo medí con ffmpeg):
//    0 s intro fuerte   12,75 s empieza la estrofa   34,5 s sube   70 s estribillo   81,5 s calma   89,75 s vuelve a subir
// Si cambio la canción, solo tengo que mover los tiempos de acá, nada más.
export const DURACION = 93.5;

// "Pixel art: Pyxel Edit" pasa a ["Pixel art", "Pyxel Edit"]
const herramientas = (INFO.creditos ?? []).map((linea) => {
  const [rol, ...resto] = linea.split(':');
  return [rol.trim(), resto.join(':').trim()];
});

export const GUION = [
  { t: 0, dur: 6.4, plano: 'vuelo', terreno: 'terreno_1', ruta: [300, 880, 1000, -200], formacion: [[0, 0]], escala: 1.9, rotulo: ['1941: QUEBRADA SECA', INFO.subtitulo], rotuloEn: 1 },
  { t: 6.4, dur: 6.35, plano: 'vuelo', terreno: 'terreno_2', angulo: -10, ruta: [1020, 900, 260, -240], formacion: [[0, 0], [-190, 120], [190, 120]], escala: 1.7 },

  // Los niveles en movimiento: el bombardeo (Q), el combate aéreo con ráfaga (E), la infantería y el asedio a la base con el bombardeo de fuego (R)
  { t: 12.75, dur: 7.5, plano: 'bombardeo' },
  { t: 20.25, dur: 6.75, plano: 'combate' },
  { t: 27, dur: 4, plano: 'infanteria' },
  { t: 31, dur: 3.5, plano: 'asedio' },

  { t: 34.5, dur: 13.25, plano: 'creditos', retrato: 'yo_pixel', lineas: [['Un juego de', INFO.integrantes.join(' · ')], ['Proyecto final', INFO.curso]] },
  { t: 47.75, dur: 11.25, plano: 'creditos', terreno: 'terreno_3', lineas: [['Profesor', INFO.profesor], ['Universidad', 'Universidad Tecnológica del Perú']] },
  { t: 59, dur: 5.5, plano: 'creditos', terreno: 'terreno_1', lineas: herramientas },
  { t: 64.5, dur: 5.5, plano: 'marcha', terreno: 'terreno_2' },

  { t: 70, dur: 11.5, plano: 'titulo', fade: 0.05 },
  { t: 81.5, dur: 12, plano: 'cierre', toqueEn: 5.5, finEn: 8.25, fade: 0.05, sinSalida: true },
];
