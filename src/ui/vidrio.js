// "Liquid glass": el vidrio translúcido del HUD. En vez de un fondo negro, cada panel es un vidrio claro con un degradado
// de arriba hacia abajo, un borde que brilla en una esquina y se apaga en la otra, un segundo borde fino por dentro (como la
// refracción) y un reflejo suave arriba a la izquierda. Phaser no puede desenfocar lo que hay detrás de un panel, así que el
// efecto es de vidrio transparente con brillos, no de vidrio esmerilado.
//
// La textura se dibuja una sola vez con canvas y se usa como "nine slice", así se puede estirar a cualquier tamaño sin deformar
// las esquinas.
export const VIDRIO = 'vidrio_liquido';
const T = 96; // tamaño de la textura
const R = 24; // radio de las esquinas
const BORDE = 28; // lo que no se estira en cada lado

// El contorno de un rectángulo con esquinas redondeadas, a "m" píxeles del borde
function camino(ctx, m, radio) {
  const x0 = m;
  const y0 = m;
  const x1 = T - m;
  const y1 = T - m;
  ctx.beginPath();
  ctx.moveTo(x0 + radio, y0);
  ctx.arcTo(x1, y0, x1, y1, radio);
  ctx.arcTo(x1, y1, x0, y1, radio);
  ctx.arcTo(x0, y1, x0, y0, radio);
  ctx.arcTo(x0, y0, x1, y0, radio);
  ctx.closePath();
}

export function prepararVidrio(escena) {
  if (escena.textures.exists(VIDRIO)) return;
  const tex = escena.textures.createCanvas(VIDRIO, T, T);
  const ctx = tex.getContext();

  // El cuerpo del vidrio: más claro arriba y casi transparente abajo, con un toque azul
  camino(ctx, 1.5, R);
  const cuerpo = ctx.createLinearGradient(0, 0, 0, T);
  cuerpo.addColorStop(0, 'rgba(255,255,255,0.30)');
  cuerpo.addColorStop(0.45, 'rgba(255,255,255,0.13)');
  cuerpo.addColorStop(1, 'rgba(255,255,255,0.06)');
  ctx.fillStyle = cuerpo;
  ctx.fill();
  ctx.fillStyle = 'rgba(120,175,255,0.06)';
  ctx.fill();

  // El reflejo suave de arriba a la izquierda, recortado al contorno
  ctx.save();
  camino(ctx, 1.5, R);
  ctx.clip();
  const reflejo = ctx.createRadialGradient(T * 0.28, 4, 0, T * 0.28, 4, T * 0.7);
  reflejo.addColorStop(0, 'rgba(255,255,255,0.42)');
  reflejo.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = reflejo;
  ctx.fillRect(0, 0, T, T);
  // un borde oscuro muy leve abajo, para dar espesor
  const espesor = ctx.createLinearGradient(0, T * 0.7, 0, T);
  espesor.addColorStop(0, 'rgba(0,0,0,0)');
  espesor.addColorStop(1, 'rgba(0,0,0,0.16)');
  ctx.fillStyle = espesor;
  ctx.fillRect(0, 0, T, T);
  ctx.restore();

  // El borde: brilla en la esquina de arriba a la izquierda, se apaga al medio y vuelve a brillar un poco abajo a la derecha
  camino(ctx, 1.5, R);
  const borde = ctx.createLinearGradient(0, 0, T, T);
  borde.addColorStop(0, 'rgba(255,255,255,0.95)');
  borde.addColorStop(0.5, 'rgba(255,255,255,0.14)');
  borde.addColorStop(1, 'rgba(255,255,255,0.55)');
  ctx.lineWidth = 2;
  ctx.strokeStyle = borde;
  ctx.stroke();

  // El segundo borde, fino y por dentro
  camino(ctx, 5, R - 3.5);
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.stroke();
  tex.refresh();
}

// Un panel de vidrio en (x, y) de ancho x alto. Se le puede cambiar el tamaño con setSize() y darle un tinte con setTint()
export function crearVidrio(escena, x, y, ancho, alto, tinte) {
  prepararVidrio(escena);
  const panel = escena.add.nineslice(x, y, VIDRIO, undefined, ancho, alto, BORDE, BORDE, BORDE, BORDE).setOrigin(0, 0);
  if (tinte !== undefined) panel.setTint(tinte);
  return panel;
}
