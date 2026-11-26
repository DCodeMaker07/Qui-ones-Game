import Phaser from 'phaser';
import { prepararPista } from '../efectos/aerodromo.js';

// Cosas chicas que repito en varios planos del ending: texturas hechas por código y animaciones de entrada.

// La chispa (para el polvo, el brillo del sol) y la viñeta oscura de los bordes los dibujo yo con canvas
export function prepararTexturas(escena) {
  const { width, height } = escena.scale;
  if (!escena.textures.exists('ending_chispa')) {
    const tex = escena.textures.createCanvas('ending_chispa', 32, 32);
    const ctx = tex.getContext();
    const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.4, 'rgba(255,220,150,0.6)');
    g.addColorStop(1, 'rgba(255,180,80,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 32, 32);
    tex.refresh();
  }
  prepararPista(escena);
  if (!escena.textures.exists('ending_vineta')) {
    const tex = escena.textures.createCanvas('ending_vineta', width, height);
    const ctx = tex.getContext();
    const g = ctx.createRadialGradient(width / 2, height / 2, height * 0.35, width / 2, height / 2, width * 0.62);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.75)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, width, height);
    tex.refresh();
  }
}

// El objeto aparece deslizándose desde (dx, dy) hasta donde yo lo puse, mientras se hace visible
export function deslizar(escena, objeto, { dx = 0, dy = 0, dur = 450, delay = 0, ease = 'Cubic.easeOut' } = {}) {
  const { x, y } = objeto;
  objeto.setPosition(x + dx, y + dy).setAlpha(0);
  escena.tweens.add({ targets: objeto, x, y, alpha: 1, duration: dur, delay, ease });
}

// El objeto aparece de golpe, grande, y se asienta con un rebote (lo uso en el título)
export function golpe(escena, objeto, { desde = 1.8, dur = 420, delay = 0 } = {}) {
  objeto.setScale(desde).setAlpha(0);
  escena.tweens.add({ targets: objeto, scale: 1, alpha: 1, duration: dur, delay, ease: 'Back.easeOut' });
}

// Polvo dorado que sube lento por toda la pantalla, igual que en los endings de anime
export function polvo(escena) {
  const { width, height } = escena.scale;
  return escena.add.particles(0, 0, 'ending_chispa', {
    x: { min: 0, max: width },
    y: height + 20,
    lifespan: { min: 3500, max: 6500 },
    speedY: { min: -75, max: -25 },
    speedX: { min: -18, max: 18 },
    scale: { start: 0.55, end: 0 },
    alpha: { start: 0.8, end: 0 },
    frequency: 90,
    blendMode: Phaser.BlendModes.ADD,
  });
}
