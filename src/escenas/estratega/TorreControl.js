import Phaser from 'phaser';

// Interior de la torre de control: decorado de la pantalla de Layla (EstrategaScene).
//  - Ventanal panorámico arriba (alto BANDA): cielo al atardecer, cordillera, pista y hangares, nubes que pasan y
//    aviones que cruzan o despegan.
//  - Viga con luces parpadeantes y placa de la torre.
//  - Escritorio metálico debajo, con la luz de una lámpara sobre el mapa.
// Todo se dibuja por código. Arte propio opcional (public/assets/ui/torre/):
//  - torre_ventana.png: tira horizontal de cuadros de 1280x150 (animación en bucle a 8 cuadros/s): reemplaza el cielo, las
//    nubes y los aviones del ventanal. Se conservan el marco, la viga y el escritorio.
//  - torre_fondo.png (1280x720): reemplaza TODO el decorado (el mapa y el panel se dibujan encima).
export const BANDA = 150; // alto del ventanal
export const VIGA = 16; // alto de la viga entre el ventanal y el escritorio
const W = 1280;
const H = 720;

function lienzo(scene, clave, w, h, dibujar) {
  if (scene.textures.exists(clave)) return;
  const tex = scene.textures.createCanvas(clave, w, h);
  dibujar(tex.getContext(), w, h);
  tex.refresh();
}

function cielo(ctx) {
  const g = ctx.createLinearGradient(0, 0, 0, BANDA);
  g.addColorStop(0, '#0e2347');
  g.addColorStop(0.45, '#35609a');
  g.addColorStop(0.78, '#e89a58');
  g.addColorStop(1, '#f6c27a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, BANDA);

  // Sol bajo, entre las montañas
  const sol = ctx.createRadialGradient(930, 120, 4, 930, 120, 170);
  sol.addColorStop(0, 'rgba(255,238,175,0.95)');
  sol.addColorStop(0.2, 'rgba(255,190,100,0.55)');
  sol.addColorStop(1, 'rgba(255,150,70,0)');
  ctx.fillStyle = sol;
  ctx.fillRect(0, 0, W, BANDA);

  // Cordilleras (dos capas, la lejana más clara por la bruma)
  const cordillera = (y0, amp, color, semilla) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, BANDA);
    for (let x = 0; x <= W; x += 14) {
      const y = y0 - amp * (0.55 * Math.abs(Math.sin(x * 0.011 + semilla)) + 0.35 * Math.abs(Math.sin(x * 0.027 + semilla * 2)) + 0.1 * Math.sin(x * 0.09));
      ctx.lineTo(x, y);
    }
    ctx.lineTo(W, BANDA);
    ctx.closePath();
    ctx.fill();
  };
  cordillera(114, 48, 'rgba(70,82,124,0.8)', 1.3);
  cordillera(126, 32, 'rgba(32,38,62,0.96)', 4.1);

  // Campo de aviación: pasto, pista con línea central y hangares
  const suelo = ctx.createLinearGradient(0, 124, 0, BANDA);
  suelo.addColorStop(0, '#2c3a2a');
  suelo.addColorStop(1, '#141b15');
  ctx.fillStyle = suelo;
  ctx.fillRect(0, 126, W, BANDA - 126);
  ctx.fillStyle = '#3a3e46';
  ctx.beginPath();
  ctx.moveTo(0, 137);
  ctx.lineTo(W, 133);
  ctx.lineTo(W, 146);
  ctx.lineTo(0, 150);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,240,200,0.7)';
  ctx.lineWidth = 2;
  ctx.setLineDash([22, 18]);
  ctx.beginPath();
  ctx.moveTo(0, 143.5);
  ctx.lineTo(W, 139.5);
  ctx.stroke();
  ctx.setLineDash([]);

  const hangar = (x, w, h) => {
    ctx.fillStyle = '#0f141b';
    ctx.fillRect(x, 128 - h, w, h + 3);
    ctx.fillStyle = 'rgba(255,205,110,0.85)';
    for (let k = 0; k < Math.floor(w / 22); k++) ctx.fillRect(x + 8 + k * 22, 128 - h + 6, 8, 4);
  };
  [[70, 120, 22], [214, 70, 15], [1040, 150, 26], [1210, 60, 17]].forEach(([x, w, h]) => hangar(x, w, h));
  // Antena con luz roja
  ctx.fillStyle = '#0f141b';
  ctx.fillRect(1180, 78, 3, 52);
  ctx.fillStyle = '#ff4a3a';
  ctx.fillRect(1178, 76, 7, 4);
}

function nube(ctx, w, h) {
  for (let i = 0; i < 7; i++) {
    const x = 34 + i * 28 + Math.random() * 10;
    const y = h / 2 + Math.sin(i * 1.4) * 8;
    const r = 20 + Math.random() * 12;
    const g = ctx.createRadialGradient(x, y, 2, x, y, r);
    g.addColorStop(0, 'rgba(255,246,232,0.9)');
    g.addColorStop(1, 'rgba(255,246,232,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Avión de caza visto de lado, mirando a la derecha
function avion(ctx) {
  ctx.fillStyle = '#0f1826';
  ctx.beginPath();
  ctx.ellipse(40, 15, 30, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath(); // cola
  ctx.moveTo(14, 14);
  ctx.lineTo(7, 3);
  ctx.lineTo(19, 3);
  ctx.lineTo(25, 13);
  ctx.closePath();
  ctx.fill();
  ctx.fillRect(8, 13, 16, 2);
  ctx.beginPath(); // ala
  ctx.ellipse(42, 17.5, 16, 2.4, 0.05, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(130,180,230,0.6)'; // cabina
  ctx.beginPath();
  ctx.ellipse(47, 11.5, 8, 3.2, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(210,220,230,0.4)'; // hélice
  ctx.fillRect(71, 6, 2, 18);
}

function estela(ctx, w, h) {
  const g = ctx.createLinearGradient(0, 0, w, 0);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(1, 'rgba(255,255,255,0.5)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function escritorio(ctx, w, h) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#2b323c');
  g.addColorStop(1, '#12171d');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // Acero cepillado
  for (let i = 0; i < 260; i++) {
    ctx.strokeStyle = Math.random() < 0.5 ? `rgba(255,255,255,${0.015 + Math.random() * 0.03})` : `rgba(0,0,0,${0.08 + Math.random() * 0.12})`;
    ctx.lineWidth = 0.6 + Math.random();
    const y = Math.random() * h;
    const x = Math.random() * (w + 200) - 100;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 100 + Math.random() * 500, y);
    ctx.stroke();
  }
  // Luz de lámpara sobre el mapa y viñeta en los bordes
  const luz = ctx.createRadialGradient(300, 260, 40, 300, 260, 520);
  luz.addColorStop(0, 'rgba(255,214,140,0.22)');
  luz.addColorStop(1, 'rgba(255,214,140,0)');
  ctx.fillStyle = luz;
  ctx.fillRect(0, 0, w, h);
  const v = ctx.createRadialGradient(w / 2, h / 2, 260, w / 2, h / 2, 800);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);
}

export default class TorreControl {
  constructor(scene) {
    this.scene = scene;
    this.aviones = [];
    this.nubes = [];
    this.tAvion = 1.2; // el primer avión pasa enseguida
    this.tDespegue = 4;

    // Arte propio: reemplaza todo el decorado procedural
    if (scene.textures.exists('torre_fondo')) {
      scene.add.image(0, 0, 'torre_fondo').setOrigin(0).setDepth(0);
      this.propio = true;
      return;
    }
    lienzo(scene, 'torre_mesa', W, H - BANDA - VIGA, escritorio);
    scene.add.image(0, BANDA + VIGA, 'torre_mesa').setOrigin(0).setDepth(0);

    // Ventanal: animación dibujada a mano, si existe; si no, cielo, nubes y aviones por código
    this.ventanaPropia = scene.textures.exists('torre_ventana');
    if (this.ventanaPropia) {
      if (!scene.anims.exists('torre_ventana')) {
        scene.anims.create({ key: 'torre_ventana', frames: scene.anims.generateFrameNumbers('torre_ventana'), frameRate: 8, repeat: -1 });
      }
      scene.add.sprite(0, 0, 'torre_ventana').setOrigin(0).setDepth(0).play('torre_ventana');
    } else {
      lienzo(scene, 'torre_cielo', W, BANDA, cielo);
      lienzo(scene, 'torre_nube', 240, 70, nube);
      lienzo(scene, 'torre_avion', 84, 28, avion);
      lienzo(scene, 'torre_estela', 200, 6, estela);
      scene.add.image(0, 0, 'torre_cielo').setOrigin(0).setDepth(0);
      this.nubesYAviones(scene);
    }
    this.marco(scene);
    this.viga(scene);
  }

  nubesYAviones(scene) {
    // Nubes a distintas alturas y velocidades (parallax)
    for (let i = 0; i < 5; i++) {
      const n = scene.add
        .image(Phaser.Math.Between(0, W), Phaser.Math.Between(6, 80), 'torre_nube')
        .setDepth(0.6)
        .setAlpha(Phaser.Math.FloatBetween(0.3, 0.55))
        .setScale(Phaser.Math.FloatBetween(0.8, 1.6));
      n.vel = Phaser.Math.FloatBetween(4, 14);
      this.nubes.push(n);
    }
  }

  // Marco del ventanal: bordes, parantes y reflejos en el vidrio
  marco(scene) {
    const g = scene.add.graphics().setDepth(1.5);
    g.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.55, 0.55, 0, 0).fillRect(0, 0, W, 22); // sombra del techo
    g.fillStyle(0x0b0e12, 1).fillRect(0, 0, W, 10);
    g.fillRect(0, 0, 14, BANDA).fillRect(W - 14, 0, 14, BANDA);
    [320, 640, 960].forEach((x) => {
      g.fillStyle(0x0b0e12, 1).fillRect(x - 7, 0, 14, BANDA);
      g.fillStyle(0x39424d, 0.9).fillRect(x - 7, 0, 2, BANDA); // filo de luz
    });
    g.fillStyle(0xffffff, 0.06);
    [[120, 80], [470, 60], [790, 90], [1090, 70]].forEach(([x, a]) => g.fillPoints([{ x, y: 10 }, { x: x + a, y: 10 }, { x: x + a - 70, y: BANDA }, { x: x - 70, y: BANDA }], true));
  }

  // Viga con luces de estado y la placa de la torre
  viga(scene) {
    const y = BANDA;
    const g = scene.add.graphics().setDepth(2);
    ['#3b434e', '#2c333c', '#20262d', '#171c22'].forEach((c, i) => {
      g.fillStyle(Phaser.Display.Color.HexStringToColor(c).color, 1).fillRect(0, y + i * (VIGA / 4), W, VIGA / 4);
    });
    g.fillStyle(0x59626e, 1).fillRect(0, y, W, 1);
    g.fillStyle(0x000000, 0.5).fillRect(0, y + VIGA, W, 3);
    for (let x = 40; x < W; x += 160) g.fillStyle(0x0b0e12, 1).fillCircle(x, y + VIGA / 2, 2.5); // tornillos

    scene.add.rectangle(W / 2, y + VIGA / 2, 330, 22, 0x0e1116).setStrokeStyle(2, 0xc8a94a, 0.9).setDepth(3);
    scene.add
      .text(W / 2, y + VIGA / 2, 'TUMBES · TORRE DE CONTROL', { fontFamily: '"Nunito", "Segoe UI", sans-serif', fontStyle: 'bold', fontSize: '12px', color: '#e3c468' })
      .setOrigin(0.5)
      .setDepth(4);

    // Luces que parpadean cada una a su ritmo
    [[130, 0x59ff7a], [210, 0x59ff7a], [290, 0xffb000], [1000, 0xff4a3a], [1080, 0xffb000], [1160, 0x59ff7a]].forEach(([x, color]) => {
      const led = scene.add.circle(x, y + VIGA / 2, 3.2, color).setDepth(3);
      scene.tweens.add({ targets: led, alpha: 0.2, duration: Phaser.Math.Between(500, 1500), yoyo: true, repeat: -1, delay: Phaser.Math.Between(0, 900) });
    });
  }

  // Un avión que cruza el ventanal (la escala da la distancia: los pequeños vuelan más alto y más lento)
  cruzar() {
    const s = this.scene;
    const dir = Math.random() < 0.5 ? 1 : -1;
    const escala = Phaser.Math.FloatBetween(0.55, 1.15);
    const y = Phaser.Math.Between(28, 100);
    const vel = Phaser.Math.Between(70, 130) * (0.6 + escala * 0.5);
    const rastro = s.add.image(-30, 0, 'torre_estela').setOrigin(1, 0.5).setDisplaySize(170, 4);
    const nave = s.add.image(0, 0, 'torre_avion');
    const cont = s.add.container(dir > 0 ? -120 : W + 120, y, [rastro, nave]).setScale(dir * escala, escala).setDepth(1).setAlpha(0.55 + escala * 0.35);
    this.aviones.push({ cont, vx: dir * vel });
  }

  // Un avión despega por la pista y se pierde en el cielo
  despegar() {
    const s = this.scene;
    const rastro = s.add.image(-30, 0, 'torre_estela').setOrigin(1, 0.5).setDisplaySize(120, 3);
    const nave = s.add.image(0, 0, 'torre_avion');
    const cont = s.add.container(-80, 139, [rastro, nave]).setScale(0.8).setDepth(1);
    s.tweens.add({ targets: cont, x: W + 120, duration: 12000, ease: 'Quad.easeIn', onComplete: () => cont.destroy() });
    s.tweens.add({ targets: cont, y: 46, duration: 7000, delay: 4500, ease: 'Sine.easeIn' });
    s.tweens.add({ targets: cont, angle: -9, duration: 1500, delay: 4300 });
    s.tweens.add({ targets: cont, scale: 0.5, duration: 7000, delay: 4500 });
  }

  update(dt) {
    if (this.propio || this.ventanaPropia) return;
    this.nubes.forEach((n) => {
      n.x += n.vel * dt;
      if (n.x > W + 140) n.x = -140;
    });
    this.aviones = this.aviones.filter((a) => {
      a.cont.x += a.vx * dt;
      const fuera = a.vx > 0 ? a.cont.x > W + 140 : a.cont.x < -140;
      if (fuera) a.cont.destroy();
      return !fuera;
    });
    if ((this.tAvion -= dt) <= 0) {
      this.tAvion = Phaser.Math.FloatBetween(3, 6.5);
      this.cruzar();
    }
    if ((this.tDespegue -= dt) <= 0) {
      this.tDespegue = Phaser.Math.FloatBetween(16, 24);
      this.despegar();
    }
  }
}
