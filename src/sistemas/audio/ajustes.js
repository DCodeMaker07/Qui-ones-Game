// Ajustes de audio del jugador (menú "Audio"): tres volúmenes de 0 a 1 que se guardan en el navegador.
// 1 = el volumen de diseño del juego. Música, efectos y voces se ajustan por separado.
const CLAVE = 'quinones-audio';
const MUSICA_BASE = 0.7; // volumen de la música cuando el ajuste está al 100 %

function leer() {
  try {
    return JSON.parse(localStorage.getItem(CLAVE)) ?? {};
  } catch {
    return {};
  }
}

const datos = { musica: 1, efectos: 1, voces: 1, ...leer() };

export const ajustes = {
  get(nombre) {
    return datos[nombre] ?? 1;
  },
  // Se redondea a décimas (0, 0.1 ... 1) y se guarda.
  fijar(nombre, valor) {
    datos[nombre] = Math.min(1, Math.max(0, Math.round(valor * 10) / 10));
    try {
      localStorage.setItem(CLAVE, JSON.stringify(datos));
    } catch {
      /* sin almacenamiento: el ajuste dura solo esta sesión */
    }
  },
};

export const volumen = (nombre) => ajustes.get(nombre); // 'musica' | 'efectos' | 'voces'
export const volMusica = () => MUSICA_BASE * ajustes.get('musica');
