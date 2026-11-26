// El ícono del tonel (X): una flecha que da la vuelta. Lo dibujo con canvas, igual que la gota de agua.
export const TONEL_ICONO = 'icono_tonel';

export function prepararIconoTonel(escena) {
  if (escena.textures.exists(TONEL_ICONO)) return;
  const tex = escena.textures.createCanvas(TONEL_ICONO, 64, 64);
  const ctx = tex.getContext();
  const radio = 20;
  const fin = Math.PI * 1.45; // donde termina el arco y empieza la punta
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#bfefff';
  ctx.beginPath();
  ctx.arc(32, 32, radio, -0.4, fin);
  ctx.stroke();
  // La punta de la flecha, en la dirección en que sigue el arco
  const x = 32 + Math.cos(fin) * radio;
  const y = 32 + Math.sin(fin) * radio;
  const tx = -Math.sin(fin); // tangente
  const ty = Math.cos(fin);
  ctx.fillStyle = '#bfefff';
  ctx.beginPath();
  ctx.moveTo(x + tx * 12, y + ty * 12);
  ctx.lineTo(x - ty * 10 - tx * 2, y + tx * 10 - ty * 2);
  ctx.lineTo(x + ty * 10 - tx * 2, y - tx * 10 - ty * 2);
  ctx.closePath();
  ctx.fill();
  tex.refresh();
}
