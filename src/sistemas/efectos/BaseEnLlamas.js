import Phaser from 'phaser';

// La base enemiga destruida y ardiendo, para los finales del juego: el sprite de la base calcinado, cráteres y escombros,
// MUCHAS llamas animadas (assets/sprites/armas/llama.png; si no existe se usan brasas dibujadas por código), columnas de humo,
// chispas que suben y un resplandor naranja. Todo se destruye solo al cerrar la escena.
//   crearBaseEnLlamas(scene, x, y, escala = 1.5, profundidad = 1)

function texturaBrillo(scene) {
  if (scene.textures.exists('brillo_fuego')) return;
  const tex = scene.textures.createCanvas('brillo_fuego', 256, 256);
  const ctx = tex.getContext();
  const g = ctx.createRadialGradient(128, 128, 4, 128, 128, 128);
  g.addColorStop(0, 'rgba(255,190,80,0.95)');
  g.addColorStop(0.4, 'rgba(255,120,30,0.45)');
  g.addColorStop(1, 'rgba(255,90,20,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  tex.refresh();
}

export function crearBaseEnLlamas(scene, x, y, escala = 1.5, d = 1) {
  texturaBrillo(scene);
  const clave = scene.textures.exists('base_enemiga') ? 'base_enemiga' : 'deposito';
  const rnd = Phaser.Math.FloatBetween;

  // Resplandor detrás de la base
  const ancho0 = scene.textures.get(clave).getSourceImage().width * escala;
  const brillo = scene.add.image(x, y, 'brillo_fuego').setBlendMode(Phaser.BlendModes.ADD).setDepth(d).setScale((ancho0 * 1.9) / 256).setAlpha(0.75);
  scene.tweens.add({ targets: brillo, alpha: 0.45, scale: brillo.scale * 1.08, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

  // La base: calcinada (oscura) con cráteres, manchas de hollín y escombros encima
  const img = scene.add.image(x, y, clave).setScale(escala).setDepth(d + 0.1).setTint(0x4b3c36);
  const ancho = img.displayWidth;
  const alto = img.displayHeight;
  const g = scene.add.graphics().setDepth(d + 0.2);
  for (let i = 0; i < 10; i++) { // cráteres
    const cx = x + rnd(-0.42, 0.42) * ancho;
    const cy = y + rnd(-0.34, 0.34) * alto;
    const r = rnd(0.04, 0.1) * ancho;
    g.fillStyle(0x0e0a08, 0.6).fillEllipse(cx, cy, r * 2.2, r * 1.3);
    g.fillStyle(0x6a4a30, 0.5).fillEllipse(cx - r * 0.1, cy - r * 0.15, r * 1.6, r * 0.9);
  }
  for (let i = 0; i < 14; i++) g.fillStyle(0x000000, rnd(0.14, 0.3)).fillEllipse(x + rnd(-0.5, 0.5) * ancho, y + rnd(-0.4, 0.4) * alto, rnd(0.08, 0.2) * ancho, rnd(0.05, 0.12) * ancho);
  for (let i = 0; i < 60; i++) { // escombros alrededor y encima
    const ex = x + rnd(-0.58, 0.58) * ancho;
    const ey = y + rnd(-0.5, 0.52) * alto;
    const t = rnd(0.012, 0.03) * ancho;
    g.fillStyle(Phaser.Math.RND.pick([0x1a1411, 0x2c2420, 0x3c3028, 0x14100d]), 1).fillTriangle(ex, ey, ex + t * 1.6, ey + t * 0.4, ex + t * 0.5, ey + t * 1.3);
  }

  // Llamas: muchas, de distintos tamaños y velocidades, repartidas por toda la base (las de abajo van delante)
  const hayLlama = scene.textures.exists('llama');
  if (hayLlama && !scene.anims.exists('llama')) scene.anims.create({ key: 'llama', frames: scene.anims.generateFrameNumbers('llama'), frameRate: 12, repeat: -1 });
  const total = hayLlama ? scene.anims.get('llama').frames.length : 0;
  for (let i = 0; i < 22; i++) {
    const px = x + rnd(-0.46, 0.46) * ancho;
    const py = y + rnd(-0.28, 0.44) * alto;
    const k = rnd(0.35, 0.9) * (escala / 1.4);
    if (hayLlama) {
      const l = scene.add.sprite(px, py, 'llama').setOrigin(0.5, 1).setScale(k).setDepth(d + 0.3 + py / 10000);
      l.play({ key: 'llama', startFrame: Phaser.Math.Between(0, total - 1) });
      l.anims.timeScale = rnd(0.75, 1.35);
    } else {
      const c = scene.add.circle(px, py - 18 * k * 3, 16 * k * 2, Phaser.Math.RND.pick([0xff7a1a, 0xffa23a, 0xe0500f]), 0.85).setDepth(d + 0.3 + py / 10000);
      scene.tweens.add({ targets: c, scale: rnd(0.6, 1.2), alpha: 0.5, duration: Phaser.Math.Between(250, 600), yoyo: true, repeat: -1 });
    }
  }

  // Humo oscuro que sube y se ensancha, y chispas
  scene.time.addEvent({
    delay: 85, loop: true,
    callback: () => {
      const px = x + rnd(-0.4, 0.4) * ancho;
      const py = y + rnd(-0.3, 0.1) * alto;
      const h = scene.add.image(px, py, 'humo_carga').setTint(Phaser.Math.RND.pick([0x1b1b1b, 0x2a2a2a, 0x3d3d3d])).setAlpha(0.55).setScale(rnd(0.9, 1.5) * (escala / 1.4)).setDepth(d + 0.6);
      scene.tweens.add({ targets: h, y: py - rnd(190, 300) * (escala / 1.4), x: px + rnd(20, 110), scale: h.scale * rnd(2.4, 3.6), alpha: 0, duration: Phaser.Math.Between(3000, 4400), onComplete: () => h.destroy() });
    },
  });
  scene.time.addEvent({
    delay: 70, loop: true,
    callback: () => {
      const px = x + rnd(-0.45, 0.45) * ancho;
      const py = y + rnd(-0.2, 0.4) * alto;
      const c = scene.add.image(px, py, 'humo_carga').setTint(Phaser.Math.RND.pick([0xffa23a, 0xffd35a, 0xff7a1a])).setScale(0.05 * (escala / 1.4)).setDepth(d + 0.7);
      scene.tweens.add({ targets: c, y: py - rnd(90, 200), x: px + rnd(-30, 60), alpha: 0, duration: Phaser.Math.Between(900, 1700), onComplete: () => c.destroy() });
    },
  });
  return { img, ancho, alto };
}
