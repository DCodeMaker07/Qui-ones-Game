import Phaser from 'phaser';
import { FUENTE, FUENTE_TITULO, INFO } from '../../config.js';
import { ambiente } from '../../sistemas/efectos/Ambiente.js';
import { playSfx } from '../../sistemas/audio/audio.js';
import { volMusica } from '../../sistemas/audio/ajustes.js';

const separar = (t) => t.split('').join(' ');

export default class IntroScene extends Phaser.Scene {
  constructor() {
    super('IntroScene');
  }

  create() {
    const { width, height } = this.scale;
    const cx = width / 2;
    const cy = height / 2;
    this.salido = false;
    this.cameras.main.setBackgroundColor('#000000');
    ambiente.escena('intro');

    this.add
      .text(cx, height - 26, 'CUALQUIER TECLA O BOTÓN DEL MANDO: SALTAR', { fontFamily: FUENTE, fontSize: '11px', color: '#444444' })
      .setOrigin(0.5);
    this.input.keyboard.once('keydown', () => this.irAlMenu());
    this.input.once('pointerdown', () => this.irAlMenu());

    // Música de ambiente (opcional), con entrada suave
    if (this.cache.audio.exists('musica_intro')) {
      this.musica = this.sound.add('musica_intro', { volume: 0 });
      // El volumen sube cuando la pista realmente empieza (el navegador puede retrasarla hasta el primer clic)
      this.musica.once('play', () => {
        this.musica.volume = 0;
        this.tweens.add({ targets: this.musica, volume: volMusica(), duration: 2500 });
      });
      this.musica.play();
    }

    this.logo = this.crearLogo(cx, cy);
    this.variante = this.crearVariante(cx, cy);
    this.crearTitulo(cx, cy);

    // Secuencia: logo -> variante -> título -> menú
    const en = (ms, fn) => this.time.delayedCall(ms, () => !this.salido && fn());
    en(500, () => this.aparecer(this.logo, 1300));
    en(3300, () => this.desaparecer(this.logo, 700));
    en(4300, () => this.aparecer(this.variante, 1100));
    en(6700, () => this.desaparecer(this.variante, 700));
    en(7800, () => this.mostrarTitulo());
    en(12800, () => this.irAlMenu());
  }

  // ---------- logo y variante ----------

  crearLogo(cx, cy) {
    if (this.textures.exists('logo')) {
      const img = this.add.image(cx, cy, 'logo');
      return img.setScale(Math.min(420 / img.width, 260 / img.height)).setAlpha(0);
    }
    // Sello: doble marco con la inicial
    const marco = this.add.rectangle(0, 0, 150, 150).setStrokeStyle(5, 0xffffff);
    const marco2 = this.add.rectangle(0, 0, 130, 130).setStrokeStyle(2, 0xffffff);
    const inicial = this.add
      .text(0, 0, 'D', { fontFamily: FUENTE_TITULO, fontStyle: 'bold', fontSize: '106px', color: '#ffffff' })
      .setOrigin(0.5);
    return this.add.container(cx, cy, [marco, marco2, inicial]).setAlpha(0);
  }

  // Variante del logo: nombre en dorado, línea y lugar, con el curso debajo
  crearVariante(cx, cy) {
    if (this.textures.exists('logo_variante')) {
      const img = this.add.image(cx, cy, 'logo_variante');
      return img.setScale(Math.min(420 / img.width, 260 / img.height)).setAlpha(0);
    }
    const nombre = this.add
      .text(0, -30, 'DCodeMaker07', { fontFamily: FUENTE_TITULO, fontStyle: 'bold italic', fontSize: '64px', color: '#ffc83d' })
      .setOrigin(0.5);
    const linea = this.add.rectangle(0, 22, Math.max(400, nombre.width + 40), 2, 0xffc83d).setAlpha(0.8);
    const lugar = this.add
      .text(0, 48, separar('LIMA · PERÚ'), { fontFamily: FUENTE, fontSize: '16px', color: '#e8dfc4' })
      .setOrigin(0.5);
    const curso = this.add.text(0, 92, INFO.curso, { fontFamily: FUENTE, fontSize: '13px', color: '#7d7766' }).setOrigin(0.5);
    return this.add.container(cx, cy, [nombre, linea, lugar, curso]).setAlpha(0);
  }

  aparecer(obj, ms) {
    this.tweens.add({ targets: obj, alpha: 1, scale: { from: 0.96, to: 1 }, duration: ms, ease: 'Sine.easeOut' });
  }

  desaparecer(obj, ms) {
    this.tweens.add({ targets: obj, alpha: 0, duration: ms, ease: 'Sine.easeIn' });
  }

  // ---------- título ----------

  crearTitulo(cx, cy) {
    // Resplandor dorado detrás del título (degradado radial dibujado en un canvas)
    if (!this.textures.exists('vineta')) {
      const c = this.textures.createCanvas('vineta', 512, 512);
      const ctx = c.getContext();
      const g = ctx.createRadialGradient(256, 256, 0, 256, 256, 256);
      g.addColorStop(0, 'rgba(217,164,65,0.55)');
      g.addColorStop(1, 'rgba(217,164,65,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 512, 512);
      c.refresh();
    }
    const [anio, nombre] = INFO.titulo.replace(':', '').split('\n');

    this.glow = this.add.image(cx, cy, 'vineta').setScale(2.4).setAlpha(0);
    const lineaSup = this.add.rectangle(0, -135, 560, 3, 0xffc83d).setScale(0, 1);
    const txtAnio = this.add
      .text(0, -40, anio, {
        fontFamily: FUENTE_TITULO, fontStyle: 'bold', fontSize: '150px', color: '#efe6cf', stroke: '#000000', strokeThickness: 6,
      })
      .setOrigin(0.5)
      .setAlpha(0);
    const txtNombre = this.add
      .text(0, 75, separar(nombre), { fontFamily: FUENTE_TITULO, fontStyle: 'bold', fontSize: '46px', color: '#ffffff' })
      .setOrigin(0.5)
      .setAlpha(0);
    const lineaInf = this.add.rectangle(0, 128, 560, 3, 0xffc83d).setScale(0, 1);
    const sub = this.add
      .text(0, 168, INFO.subtitulo, { fontFamily: FUENTE, fontSize: '15px', color: '#c9c1a6' })
      .setOrigin(0.5)
      .setAlpha(0);

    this.titulo = this.add.container(cx, cy, [lineaSup, txtAnio, txtNombre, lineaInf, sub]);
    this.tit = { lineaSup, txtAnio, txtNombre, lineaInf, sub };
  }

  mostrarTitulo() {
    const { lineaSup, txtAnio, txtNombre, lineaInf, sub } = this.tit;
    ambiente.escena('menu'); // el fondo de la página se calienta junto con el título
    playSfx(this, 'sfx_intro');

    this.tweens.add({ targets: this.glow, alpha: 0.35, duration: 2500 });
    this.tweens.add({ targets: [lineaSup, lineaInf], scaleX: 1, duration: 800, ease: 'Cubic.easeOut' });
    this.tweens.add({ targets: txtAnio, alpha: 1, scale: { from: 1.12, to: 1 }, duration: 1300, delay: 400, ease: 'Sine.easeOut' });
    this.tweens.add({ targets: txtNombre, alpha: 1, y: { from: 88, to: 75 }, duration: 1000, delay: 1100, ease: 'Sine.easeOut' });
    this.tweens.add({ targets: sub, alpha: 1, duration: 1200, delay: 2000 });
    // Deriva lenta para que no quede estático
    this.tweens.add({ targets: this.titulo, scale: { from: 1, to: 1.04 }, duration: 6000, ease: 'Sine.easeInOut' });
  }

  irAlMenu() {
    if (this.salido) return;
    this.salido = true;
    if (this.musica) this.tweens.add({ targets: this.musica, volume: 0, duration: 400 });
    this.cameras.main.fadeOut(400, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.musica?.stop();
      this.scene.start('TitleScene');
    });
  }
}
