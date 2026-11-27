import { INFO } from '../../config.js';

// El guion del ending, como en un anime. Cada plano dice cuándo entra (t, en segundos desde que empieza la música),
// cuánto dura (dur) y qué se ve. Los tiempos los puse donde cambia la canción (lo medí con ffmpeg):
//    0 s intro fuerte   12,75 s empieza la estrofa   34,5 s sube   70 s estribillo   81,5 s calma   89,75 s vuelve a subir
// Si cambio la canción, solo tengo que mover los tiempos de acá, nada más.
export const DURACION = 51.5; // el ending termina cuando acaba el cierre en 3D (39,5 + 12)

// "Pixel art: Pyxel Edit" pasa a ["Pixel art", "Pyxel Edit"]
const herramientas = (INFO.creditos ?? []).map((linea) => {
  const [rol, ...resto] = linea.split(':');
  return [rol.trim(), resto.join(':').trim()];
});

// Lo que menciono en los créditos, en dos planos de dos líneas: las herramientas de INFO.creditos (Pyxel Edit, Phaser 3 y Vite) y,
// además, Three.js y lo que uso para la web
const tecnologias = [...herramientas, ['Gráficos 3D', 'Three.js'], ['Web', 'HTML · CSS · JavaScript · Tailwind CSS']];

export const GUION = [
  { t: 0, dur: 6.4, plano: 'vuelo', terreno: 'terreno_1', ruta: [300, 880, 1000, -200], formacion: [[0, 0]], escala: 1.9, rotulo: ['1941: QUEBRADA SECA', INFO.subtitulo], rotuloEn: 1 },
  { t: 6.4, dur: 6.1, plano: 'vuelo', terreno: 'terreno_2', angulo: -10, ruta: [1020, 900, 260, -240], formacion: [[0, 0], [-190, 120], [190, 120]], escala: 1.7 },

  // Desde el segundo 12,5 de la canción corre la simulación del juego (el bombardeo, el combate, la infantería y el asedio) y por
  // encima voy mostrando los créditos en paneles que se alternan: izquierda, derecha, izquierda... Cada panel entra y sale por su costado
  { t: 12.5, dur: 7.5, plano: 'bombardeo' },
  { t: 20, dur: 6.75, plano: 'combate' },
  { t: 26.75, dur: 4, plano: 'infanteria' },
  { t: 30.75, dur: 3.75, plano: 'asedio' },

  // El primer panel espera 1 s después del cambio de la canción (en 12,5) para entrar justo con la música; la simulación sí arranca en 12,5
  { t: 13.5, dur: 3.5, plano: 'creditos', lado: 'izq', fade: 0.05, lineas: [['Un juego de', INFO.integrantes.join(' · ')]] },
  { t: 17, dur: 5.25, plano: 'creditos', lado: 'der', fade: 0.05, lineas: [['Proyecto final', INFO.curso]] },
  { t: 22.25, dur: 4.25, plano: 'creditos', lado: 'izq', fade: 0.05, lineas: [['Profesor', INFO.profesor]] },
  { t: 26.5, dur: 4, plano: 'creditos', lado: 'der', fade: 0.05, lineas: tecnologias.slice(0, 2) },
  { t: 30.5, dur: 4, plano: 'creditos', lado: 'izq', fade: 0.05, lineas: tecnologias.slice(2) },

  // Terminada la información, 5 s de animación del juego (el título con los aviones en V) y, enseguida, el cierre en 3D. Ahí termina el ending
  { t: 34.5, dur: 5, plano: 'titulo', fade: 0.05 },
  { t: 39.5, dur: 12, plano: 'cierre', toqueEn: 5.5, finEn: 8.25, fade: 0.05, sinSalida: true },
];
