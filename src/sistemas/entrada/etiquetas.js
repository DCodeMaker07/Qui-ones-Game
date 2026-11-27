// Cómo se llama en pantalla cada tecla del juego cuando juego con mando: la misma acción, pero con el botón que le toca (ver Mando.js).
// Los botones de colores (A, B, X, Y) también se dibujan con su color, como en el mando de verdad.
export const BOTON_DE_MANDO = { Q: 'A', W: 'RT', E: 'B', R: 'LT', F: 'X', X: 'Y', SPACE: 'RB', C: 'LB', B: 'SEL', T: 'R3', ESC: 'START', ENTER: 'A' };
export const COLOR_BOTON = { A: 0x4cd964, B: 0xff4a3d, X: 0x4a90ff, Y: 0xffd35a };

// El mismo botón con el nombre de PlayStation. nombreBoton(boton) da el nombre según el estilo elegido (xbox o playstation)
import { estiloMando } from './preferencias.js';
export const BOTON_PLAYSTATION = { A: 'CRUZ', B: 'CÍRCULO', X: 'CUADRADO', Y: 'TRIÁNGULO', LB: 'L1', RB: 'R1', LT: 'L2', RT: 'R2', SEL: 'SELECT', R3: 'R3', START: 'START' };
export const nombreBoton = (boton, estilo = estiloMando()) => (estilo === 'playstation' ? BOTON_PLAYSTATION[boton] ?? boton : boton);
// Los colores de los símbolos de PlayStation (cruz azul, círculo rojo, cuadrado rosa, triángulo verde) y cómo se dibuja cada uno
export const COLOR_SIMBOLO = { A: 0x7b9cf0, B: 0xff6b6b, X: 0xff8cc8, Y: 0x4cd9a0 };

// Dibuja en (cx, cy) el botón de cara (A, B, X o Y) con el estilo elegido: en Xbox un círculo de color (la letra la pone quien llama) y en
// PlayStation un círculo oscuro con el símbolo (cruz, círculo, cuadrado o triángulo) de su color. Devuelve true si ya trae su símbolo dibujado
export function dibujarBotonDeCara(g, cx, cy, boton, radio = 9) {
  if (estiloMando() !== 'playstation') {
    g.fillStyle(COLOR_BOTON[boton], 1).fillCircle(cx, cy, radio);
    g.lineStyle(2, 0x07090c, 1).strokeCircle(cx, cy, radio);
    return false;
  }
  const color = COLOR_SIMBOLO[boton];
  const k = radio * 0.45;
  g.fillStyle(0x1a1d24, 1).fillCircle(cx, cy, radio);
  g.lineStyle(2, 0x07090c, 1).strokeCircle(cx, cy, radio);
  g.lineStyle(2, color, 1);
  if (boton === 'A') g.beginPath().moveTo(cx - k, cy - k).lineTo(cx + k, cy + k).moveTo(cx + k, cy - k).lineTo(cx - k, cy + k).strokePath();
  else if (boton === 'B') g.strokeCircle(cx, cy, k);
  else if (boton === 'X') g.strokeRect(cx - k, cy - k, k * 2, k * 2);
  else g.strokePoints([{ x: cx, y: cy - k - 1 }, { x: cx + k + 1, y: cy + k }, { x: cx - k - 1, y: cy + k }], true);
  return true;
}
