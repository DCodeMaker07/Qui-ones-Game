// Río del Nivel 3 y del final alternativo: una franja vertical a la derecha que se desplaza con el terreno.
// Si existe assets/fondos/rio.png (opcional, se repite en vertical) se usa; si no, se dibuja por código.
export function crearRio(scene, profundidad = 0.5) {
  let clave = 'rio';
  if (!scene.textures.exists('rio')) {
    clave = 'rio_proc';
    if (!scene.textures.exists(clave)) {
      const W = 200;
      const H = 256;
      const tex = scene.textures.createCanvas(clave, W, H);
      const ctx = tex.getContext();
      const g = ctx.createLinearGradient(0, 0, W, 0);
      g.addColorStop(0, '#3f8fb8');
      g.addColorStop(0.5, '#2d6f9e');
      g.addColorStop(1, '#265f8c');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      const orilla = (y) => 15 + 5 * Math.sin(((2 * Math.PI * y) / H) * 3); // periódica: la textura encaja al repetirse
      ctx.fillStyle = '#c8b27a';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      for (let y = 0; y <= H; y += 4) ctx.lineTo(orilla(y), y);
      ctx.lineTo(0, H);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let y = 0; y <= H; y += 4) (y === 0 ? ctx.moveTo(orilla(y) + 2, y) : ctx.lineTo(orilla(y) + 2, y));
      ctx.stroke();
      for (let i = 0; i < 24; i++) { // ondas
        const x = 30 + Math.random() * 150;
        const y = Math.random() * H;
        const l = 14 + Math.random() * 26;
        ctx.strokeStyle = `rgba(255,255,255,${0.12 + Math.random() * 0.15})`;
        ctx.lineWidth = 2;
        for (const dy of [0, -H, H]) {
          ctx.beginPath();
          ctx.moveTo(x, y + dy);
          ctx.quadraticCurveTo(x + l / 2, y + dy - 3, x + l, y + dy);
          ctx.stroke();
        }
      }
      tex.refresh();
    }
  }
  const ancho = scene.textures.get(clave).getSourceImage().width;
  return scene.add.tileSprite(scene.scale.width - ancho, 0, ancho, scene.scale.height, clave).setOrigin(0).setDepth(profundidad);
}
