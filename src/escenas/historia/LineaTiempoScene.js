import Phaser from 'phaser';
import { LINEA_TIEMPO } from '../../config.js';
import { ambiente } from '../../sistemas/efectos/Ambiente.js';
import { playSfx } from '../../sistemas/audio/audio.js';
import { detenerPista } from '../../sistemas/audio/pistas.js';

// Línea de tiempo de los juegos (estilo la cronología del universo de Marvel), al final de los créditos y antes de volver al
// inicio. Los juegos van en zigzag, uno arriba y otro abajo, ordenados cronológicamente; el siguiente aún no tiene nombre y el
// último es un signo de interrogación. Los datos (títulos, fechas, banda) están en LINEA_TIEMPO, en config.js.
//   Arte opcional (public/assets/ui/logos/): logo_grau.png y logo_quinones.png reemplazan los títulos dibujados por código.
const UI = '"Nunito", "Segoe UI", Arial, sans-serif';
const SERIF = 'Georgia, serif';
const XS = [235, 505, 775, 1045]; // columna de cada juego (zigzag: arriba, abajo, arriba, abajo)
const CIAN = 0x7fe9ff;
const ARRIBA = { logo: 118, linea0: 192, linea1: 244, punto: 250, fecha: 286, etiqueta: 312 };
const ABAJO = { fecha: 428, punto: 458, linea0: 466, linea1: 536, logo: 594, etiqueta: 402 };

export default class LineaTiempoScene extends Phaser.Scene {
  constructor() {
    super('LineaTiempoScene');
  }

  create() {
    const { width, height } = this.scale;
    ambiente.escena('victoria');
    this.listo = false;
    this.cameras.main.fadeIn(700, 0, 0, 0);

    // Fondo oscuro con bruma que se desplaza lentamente
    const fondo = this.add.graphics().setDepth(0);
    fondo.fillGradientStyle(0x0a1019, 0x0a1019, 0x03060a, 0x03060a, 1, 1, 1, 1).fillRect(0, 0, width, height);
    if (!this.textures.exists('linea_bruma')) {
      const tex = this.textures.createCanvas('linea_bruma', 640, 280);
      const ctx = tex.getContext();
      for (let i = 0; i < 9; i++) {
        const x = 80 + Math.random() * 480;
        const y = 50 + Math.random() * 180;
        const r = 90 + Math.random() * 90;
        const g = ctx.createRadialGradient(x, y, 4, x, y, r);
        g.addColorStop(0, 'rgba(120,160,200,0.35)');
        g.addColorStop(1, 'rgba(120,160,200,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 640, 280);
      }
      tex.refresh();
    }
    [[260, 140], [900, 560], [640, 330]].forEach(([x, y], i) => {
      const b = this.add.image(x, y, 'linea_bruma').setScale(2.2).setAlpha(0.2).setDepth(0.5);
      this.tweens.add({ targets: b, x: x + (i % 2 ? -90 : 90), duration: 16000 + i * 3000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    });

    // Banda central (como "PHASE THREE")
    this.add.rectangle(width / 2, height / 2, width - 80, 52, 0x0b0f14, 0.6).setStrokeStyle(1, 0x8a929c, 0.7).setDepth(1);
    this.add.text(width / 2, height / 2, LINEA_TIEMPO.fase, { fontFamily: UI, fontStyle: 'bold', fontSize: '28px', color: '#ffffff' }).setOrigin(0.5).setDepth(2);

    // Un elemento por juego, que aparece en orden cronológico
    LINEA_TIEMPO.juegos.forEach((j, i) => this.crearJuego(j, i));
    const total = 700 + LINEA_TIEMPO.juegos.length * 1100 + 800;
    this.ayuda = this.add
      .text(width / 2, height - 26, 'ENTER: volver al inicio', { fontFamily: UI, fontStyle: 'bold', fontSize: '16px', color: '#9fb4c4' })
      .setOrigin(0.5)
      .setDepth(3)
      .setAlpha(0);
    this.time.delayedCall(total, () => {
      this.listo = true;
      this.tweens.add({ targets: this.ayuda, alpha: 1, duration: 400 });
      this.tweens.add({ targets: this.ayuda, alpha: 0.35, duration: 800, yoyo: true, repeat: -1, delay: 400 });
    });

    // ENTER: si la animación sigue, la acelera; si ya terminó, vuelve al inicio
    this.input.keyboard.on('keydown-ENTER', () => {
      if (!this.listo) {
        this.time.timeScale = 8;
        this.tweens.timeScale = 8;
        return;
      }
      if (this.saliendo) return;
      this.saliendo = true;
      detenerPista(this, 'musica_ending', 900); // la canción del ending sigue sonando hasta acá
      this.cameras.main.fadeOut(700, 0, 0, 0);
      this.time.delayedCall(750, () => this.scene.start('TitleScene'));
    });
  }

  // Título del juego (imagen propia si existe, si no tipografía por código)
  crearLogo(j, x, y) {
    if (j.logo && this.textures.exists(j.logo)) {
      const img = this.add.image(0, 0, j.logo);
      img.setScale(Math.min(280 / img.width, 120 / img.height, 1.5));
      return this.add.container(x, y, [img]);
    }
    const t = (yy, txt, size, color, trazo) =>
      this.add.text(0, yy, txt, { fontFamily: SERIF, fontStyle: 'bold', fontSize: `${size}px`, color, stroke: trazo, strokeThickness: Math.max(3, size / 9) }).setOrigin(0.5);
    const marca = () => this.add.text(0, -66, LINEA_TIEMPO.marca, { fontFamily: UI, fontStyle: 'bold', fontSize: '10px', color: '#c8a94a' }).setOrigin(0.5);
    let items;
    if (j.tipo === 'grau') {
      items = [marca(), t(-14, j.titulo[0], 22, '#d5dbe3', '#0b1722'), t(24, j.titulo[1], 42, '#9cc4ea', '#0b1b2c')];
    } else if (j.tipo === 'quinones') {
      items = [marca(), t(-32, j.titulo[0], 18, '#ffd35a', '#3a2506'), t(0, j.titulo[1], 36, '#ffd35a', '#4a2f06'), this.add.text(0, 32, j.subtitulo, { fontFamily: UI, fontSize: '12px', color: '#e6dcc0' }).setOrigin(0.5)];
    } else if (j.tipo === 'proximamente') {
      const g = this.add.graphics();
      g.fillStyle(0x0b0f14, 0.55).fillRoundedRect(-125, -42, 250, 84, 10);
      g.lineStyle(2, 0x4a5560, 0.8).strokeRoundedRect(-125, -42, 250, 84, 10);
      items = [g, t(0, 'PRÓXIMAMENTE', 24, '#6b7682', '#0a0d11')];
    } else {
      const q = t(0, '?', 120, '#e8f6ff', '#0b1a28').setShadow(0, 0, '#8fe8ff', 20, false, true);
      this.tweens.add({ targets: q, alpha: 0.55, duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      items = [q];
    }
    return this.add.container(x, y, items);
  }

  crearJuego(j, i) {
    const x = XS[i] ?? XS[XS.length - 1];
    const arriba = i % 2 === 0;
    const P = arriba ? ARRIBA : ABAJO;
    const delay = 700 + i * 1100;

    const logo = this.crearLogo(j, x, P.logo).setAlpha(0).setScale(0.85).setDepth(2);
    // Línea fina desde el logo hasta el punto (crece desde el logo)
    const largo = arriba ? P.linea1 - P.linea0 : P.linea1 - P.linea0;
    const linea = this.add.rectangle(x, arriba ? P.linea0 : P.linea1, 2, largo, CIAN, 0.8).setOrigin(0.5, arriba ? 0 : 1).setScale(1, 0).setDepth(2);
    const halo = this.add.circle(x, P.punto, 11, CIAN, 0.25).setScale(0).setDepth(2);
    const punto = this.add.circle(x, P.punto, 5, CIAN).setScale(0).setDepth(3);
    const fecha = this.add
      .text(x, P.fecha, j.fecha, { fontFamily: UI, fontStyle: 'bold', fontSize: '21px', color: '#ffffff' })
      .setOrigin(0.5)
      .setAlpha(0)
      .setDepth(2);
    const etiqueta = j.etiqueta
      ? this.add.text(x, P.etiqueta, j.etiqueta, { fontFamily: UI, fontStyle: 'bold', fontSize: '12px', color: '#ffd35a' }).setOrigin(0.5).setAlpha(0).setDepth(2)
      : null;

    this.time.delayedCall(delay, () => {
      playSfx(this, i === LINEA_TIEMPO.juegos.length - 1 ? 'sfx_menu_ok' : 'sfx_menu_mover', { volume: 0.5 });
      this.tweens.add({ targets: logo, alpha: 1, scale: 1, duration: 600, ease: 'Back.easeOut' });
      this.tweens.add({ targets: linea, scaleY: 1, duration: 450, delay: 250 });
      this.tweens.add({ targets: [punto, halo], scale: 1, duration: 350, delay: 650, ease: 'Back.easeOut' });
      this.tweens.add({ targets: halo, scale: 1.7, alpha: 0.05, duration: 1300, yoyo: true, repeat: -1, delay: 1000 });
      this.tweens.add({ targets: [fecha, etiqueta].filter(Boolean), alpha: 1, duration: 500, delay: 700 });
    });
  }
}
