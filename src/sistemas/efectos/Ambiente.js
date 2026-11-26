// Fondo "mesh gradient" animado que ocupa lo que el juego no cubre (barras laterales o superior/inferior).
// Los colores cambian según la escena y reaccionan a lo que pasa en el juego.
// Paleta = [c1, c2, c3, base]. El CSS (src/style.css) anima la posición de los 3 focos de color.
const PALETAS = {
  intro: ['#1a1a2e', '#3a2a0a', '#102a4a', '#050508'],
  menu: ['#d9a441', '#7a3b12', '#12335a', '#0d0a06'],
  dialogo: ['#8a6a2a', '#2a3f5a', '#3a2a18', '#0b0a08'],
  palacio: ['#b08a3a', '#4a3a24', '#2a3f5a', '#0c0a08'],
  nivel1: ['#e0a040', '#a8581e', '#5a7a2a', '#1c1208'],
  nivel2: ['#d0643a', '#6a2a1a', '#3a1a40', '#14090a'],
  victoria: ['#ffd35a', '#e08a2a', '#2a8a5a', '#1a1208'],
  derrota: ['#a01818', '#3a0a0a', '#1a1a22', '#0a0505'],
};

const raiz = document.documentElement;
const temporizadores = [];
let actual = 'intro';
let enPeligro = false;

function colores() {
  const paleta = [...PALETAS[actual]];
  if (enPeligro) paleta[1] = '#c01818'; // con la última vida el foco 2 se queda rojo
  return paleta;
}

function aplicar(duracionMs) {
  raiz.style.setProperty('--dur', `${duracionMs}ms`);
  colores().forEach((c, i) => raiz.style.setProperty(`--c${i + 1}`, c));
}

export const ambiente = {
  // Cambia toda la paleta (transición suave).
  escena(nombre) {
    if (!PALETAS[nombre]) return;
    actual = nombre;
    aplicar(1400);
  },

  // Destello breve de un foco (índice 0, 1 o 2): daño, explosión, botiquín, radio...
  pulso(color, ms = 350, indice = 1) {
    clearTimeout(temporizadores[indice]);
    raiz.style.setProperty('--dur', '80ms');
    raiz.style.setProperty(`--c${indice + 1}`, color);
    temporizadores[indice] = setTimeout(() => {
      raiz.style.setProperty('--dur', '900ms');
      raiz.style.setProperty(`--c${indice + 1}`, colores()[indice]);
    }, ms);
  },

  // Modo peligro: el fondo se agita más rápido y se tiñe de rojo.
  peligro(activo) {
    enPeligro = activo;
    document.getElementById('mesh')?.classList.toggle('peligro', activo);
    aplicar(800);
  },
};

ambiente.escena('intro');
