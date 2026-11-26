// Genera texturas provisionales (rectángulo de color + nombre) para los assets que
// todavía no existen, con el mismo tamaño que tendrá el sprite final.
function hex(n) {
  return '#' + n.toString(16).padStart(6, '0');
}

export function crearPlaceholder(scene, { key, w, h, fw, fh, frames = 1, color }) {
  const cw = fw ?? w;
  const ch = fh ?? h;
  const tex = scene.textures.createCanvas(key, cw * frames, ch);
  const ctx = tex.getContext();

  for (let i = 0; i < frames; i++) {
    const x = i * cw;
    ctx.fillStyle = hex(color);
    ctx.fillRect(x, 0, cw, ch);

    if (key.startsWith('terreno')) {
      // Puntos oscuros para que el scroll se note.
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      for (let n = 0; n < 40; n++) {
        ctx.fillRect(x + Math.random() * cw, Math.random() * ch, 4, 4);
      }
    } else {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, 1, cw - 2, ch - 2);
      // Marca la "nariz" (arriba) para ver hacia dónde apunta el sprite.
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x + cw / 2 - 2, 2, 4, Math.min(10, ch / 3));
      if (cw >= 48) {
        ctx.fillStyle = '#000000';
        ctx.font = '9px monospace';
        ctx.fillText(frames > 1 ? `${key.slice(0, 9)} ${i}` : key.slice(0, 14), x + 4, ch / 2 + 3);
      }
    }
  }
  tex.refresh();
  if (frames > 1) {
    for (let i = 0; i < frames; i++) tex.add(i, 0, i * cw, 0, cw, ch);
  }
}
