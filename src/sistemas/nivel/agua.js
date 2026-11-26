// La gota de agua que suelta el avión para apagar el fuego (tecla F). La dibujo con canvas, con la punta hacia arriba, igual que
// la bomba, para poder usar la misma animación de caída.
export const GOTA = 'gota_agua';

export function prepararGotaDeAgua(escena) {
  if (escena.textures.exists(GOTA)) return;
  const tex = escena.textures.createCanvas(GOTA, 40, 64);
  const ctx = tex.getContext();
  const relleno = ctx.createLinearGradient(0, 0, 40, 64);
  relleno.addColorStop(0, '#9fdcff');
  relleno.addColorStop(1, '#2a7fd6');
  ctx.beginPath();
  ctx.moveTo(20, 2);
  ctx.bezierCurveTo(20, 2, 38, 28, 38, 42);
  ctx.arc(20, 42, 18, 0, Math.PI, false);
  ctx.bezierCurveTo(2, 28, 20, 2, 20, 2);
  ctx.closePath();
  ctx.fillStyle = relleno;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#0f3f7a';
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.65)'; // el brillo
  ctx.beginPath();
  ctx.ellipse(14, 42, 4, 9, -0.3, 0, Math.PI * 2);
  ctx.fill();
  tex.refresh();
}
