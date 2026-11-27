import { FUENTE_UI } from './tema.js';

// El kit de dibujo del HUD de cabina: placas de metal oscuro, remaches, huecos hundidos para los instrumentos y teclas. Todo es plano,
// sin transparencias ni vidrio: se parece más al tablero de un avión que a una interfaz moderna.
export const METAL = {
  panel: 0x1c2128, // el tablero
  placa: 0x2a3038, // las placas chicas
  hueco: 0x0d1014, // el fondo hundido de cada instrumento
  oscuro: 0x07090c,
  borde: 0x59626e,
  brillo: 0x8b96a4,
  ambar: 0xffb000, // la luz de los instrumentos
  ambarSuave: 0xd7a540,
  verde: 0x4cd964,
  rojo: 0xff4a3d,
  celeste: 0x6fd3ff,
};

// Dónde va el tablero de abajo: el ancho es el de la parte baja y las esquinas de arriba van cortadas en diagonal (chaflán)
export const TABLERO = { x: 150, y: 588, ancho: 980, chaflan: 30 };

// El tablero de abajo se dibuja a escala ESCALA_HUD, anclado abajo al centro de la pantalla, para que ocupe menos. Mide (alto de pantalla -
// TABLERO.y) x ESCALA_HUD de alto: con 720 de pantalla son 132 x 0,88 = unos 116 px. topeHud() es la altura de pantalla donde queda su borde
// de arriba; el avión no puede bajar más que eso, para que nunca quede tapado por el tablero.
export const ESCALA_HUD = 0.88;
export const topeHud = (altoPantalla) => altoPantalla - (altoPantalla - TABLERO.y) * ESCALA_HUD;

// El texto de los instrumentos: sin cursiva, con un borde finito. color es el del número o la etiqueta
export function estiloInstrumento(tam, color = '#ffb000', extra = {}) {
  return { fontFamily: FUENTE_UI, fontStyle: 'bold', fontSize: `${tam}px`, color, stroke: '#000000', strokeThickness: 2, ...extra };
}

// Una placa de metal con las esquinas de arriba cortadas en diagonal (chaflan = 0 para esquinas rectas)
export function placa(g, x, y, ancho, alto, { chaflan = 0, relleno = METAL.placa, borde = METAL.borde, grosor = 2 } = {}) {
  const c = chaflan;
  const puntos = [
    { x: x + c, y },
    { x: x + ancho - c, y },
    { x: x + ancho, y: y + c },
    { x: x + ancho, y: y + alto },
    { x, y: y + alto },
    { x, y: y + c },
  ];
  g.fillStyle(relleno, 1).fillPoints(puntos, true);
  g.lineStyle(grosor, borde, 1).strokePoints(puntos, true);
  g.lineStyle(1, METAL.brillo, 0.6).beginPath().moveTo(x + c, y + 2).lineTo(x + ancho - c, y + 2).strokePath(); // el brillo del borde de arriba
}

// Un remache: un círculo gris con un puntito de luz
export function remache(g, x, y, radio = 3) {
  g.fillStyle(0x39414b, 1).fillCircle(x, y, radio);
  g.lineStyle(1, METAL.oscuro, 1).strokeCircle(x, y, radio);
  g.fillStyle(METAL.brillo, 0.8).fillCircle(x - radio * 0.3, y - radio * 0.3, radio * 0.4);
}

export function remaches(g, x, y, ancho, alto, margen = 7) {
  [[x + margen, y + margen], [x + ancho - margen, y + margen], [x + margen, y + alto - margen], [x + ancho - margen, y + alto - margen]].forEach(([rx, ry]) => remache(g, rx, ry, 2.5));
}

// El hueco hundido donde va un instrumento: fondo oscuro, sombra adentro y un reflejo en el borde de abajo
export function hueco(g, x, y, ancho, alto, radio = 6) {
  g.fillStyle(METAL.hueco, 1).fillRoundedRect(x, y, ancho, alto, radio);
  g.lineStyle(2, METAL.oscuro, 1).strokeRoundedRect(x, y, ancho, alto, radio);
  g.lineStyle(1, METAL.brillo, 0.5).beginPath().moveTo(x + radio, y + alto + 1.5).lineTo(x + ancho - radio, y + alto + 1.5).strokePath();
}

// El borde de un instrumento, para marcar su estado (por ejemplo ámbar mientras la habilidad está activa)
export function bordeDe(g, x, y, ancho, alto, color, grosor = 2, alfa = 1, radio = 6) {
  g.lineStyle(grosor, color, alfa).strokeRoundedRect(x, y, ancho, alto, radio);
}

// Una tecla de teclado: cuadrito oscuro con borde ámbar
export function tecla(g, cx, cy, ancho = 34, alto = 16) {
  g.fillStyle(0x090b0e, 1).fillRoundedRect(cx - ancho / 2, cy - alto / 2, ancho, alto, 4);
  g.lineStyle(2, METAL.ambarSuave, 1).strokeRoundedRect(cx - ancho / 2, cy - alto / 2, ancho, alto, 4);
}

// Una línea vertical hundida, que separa las zonas del tablero
export function costura(g, x, y1, y2) {
  g.lineStyle(2, METAL.oscuro, 1).beginPath().moveTo(x, y1).lineTo(x, y2).strokePath();
  g.lineStyle(1, METAL.brillo, 0.4).beginPath().moveTo(x + 2, y1).lineTo(x + 2, y2).strokePath();
}

// Una flechita llena dentro de una tecla; dir es 'izq', 'der', 'arriba' o 'abajo'
export function flecha(g, cx, cy, dir, color = METAL.ambar, r = 5) {
  const puntos = {
    izq: [[-r, 0], [r, -r], [r, r]],
    der: [[r, 0], [-r, -r], [-r, r]],
    arriba: [[0, -r], [-r, r], [r, r]],
    abajo: [[0, r], [-r, -r], [r, -r]],
  }[dir];
  g.fillStyle(color, 1).fillPoints(puntos.map(([dx, dy]) => ({ x: cx + dx, y: cy + dy })), true);
}

// Una rejilla de ventilación: ranuras oscuras paralelas con un reflejo debajo, para rellenar el metal del tablero
export function rejilla(g, x, y, ancho, alto, ranuras = 8) {
  const paso = alto / ranuras;
  for (let i = 0; i < ranuras; i++) {
    const yy = y + i * paso + paso / 2;
    g.lineStyle(3, METAL.oscuro, 1).beginPath().moveTo(x, yy).lineTo(x + ancho, yy).strokePath();
    g.lineStyle(1, METAL.brillo, 0.35).beginPath().moveTo(x, yy + 2.5).lineTo(x + ancho, yy + 2.5).strokePath();
  }
}
