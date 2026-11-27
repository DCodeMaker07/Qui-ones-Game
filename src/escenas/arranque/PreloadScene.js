import Phaser from 'phaser';
import { FUENTE, MANIFEST, px } from '../../config.js';
import { crearPlaceholder } from '../../sistemas/herramientas/placeholders.js';

export default class PreloadScene extends Phaser.Scene {
  constructor() {
    super('PreloadScene');
  }

  preload() {
    const { width, height } = this.scale;

    if (this.textures.exists('pantalla_carga')) {
      const fondo = this.add.image(width / 2, height / 2, 'pantalla_carga');
      fondo.setScale(height / fondo.height); // cubre la altura; recorta los lados
    }

    this.animarCarga(); // aviones, estelas y viento animados sobre el fondo

    this.add.rectangle(width / 2, height - 60, width - 80, 16, 0x000000, 0.6).setStrokeStyle(2, 0xffffff);
    const barra = this.add.rectangle(41, height - 60, width - 82, 10, 0xffc83d).setOrigin(0, 0.5).setScale(0, 1);
    this.txtCarga = this.add
      .text(width / 2, height - 90, 'CARGANDO...', { fontFamily: FUENTE, fontSize: px(12), color: '#ffffff', stroke: '#000', strokeThickness: 4 })
      .setOrigin(0.5);
    this.load.on('progress', (v) => (barra.scaleX = v));

    // Los archivos que falten generan un error en consola; se reemplazan por placeholders.
    MANIFEST.images.filter((a) => a.key !== 'pantalla_carga').forEach((a) => this.load.image(a.key, a.url));
    MANIFEST.sheets.forEach((a) => this.load.spritesheet(a.key, a.url, { frameWidth: a.fw, frameHeight: a.fh }));
    MANIFEST.audio.forEach((a) => this.load.audio(a.key, a.url));
  }

  // Pantalla de carga animada: un avión que vuela en diagonal (hélice girando, balanceo suave) con su estela de humo, y
  // rachas de viento (líneas de velocidad) que corren a lo largo del vuelo. Sigue en marcha mientras se espera una tecla.
  animarCarga() {
    const { width, height } = this.scale;
    if (!this.textures.exists('avion_jugador')) return;
    this.anims.create({ key: 'carga_avion', frames: this.anims.generateFrameNumbers('avion_jugador'), frameRate: 14, repeat: -1 });
    const rumbo = Phaser.Math.DegToRad(26); // los aviones apuntan 26° a la derecha de la vertical
    const hx = Math.sin(rumbo);
    const hy = -Math.cos(rumbo); // vector de avance (arriba a la derecha)
    // El viento corre en diagonal tendida (29° bajo la horizontal), de arriba a la derecha hacia abajo a la izquierda
    const viento = Phaser.Math.DegToRad(29);
    const wx = -Math.cos(viento);
    const wy = Math.sin(viento);

    // Viento: líneas finas a distintas velocidades
    this.vientos = [];
    for (let i = 0; i < 30; i++) {
      const largo = Phaser.Math.Between(70, 260);
      const l = this.add
        .rectangle(Phaser.Math.Between(-100, width + 200), Phaser.Math.Between(-150, height), largo, Phaser.Math.Between(1, 3), 0xffffff, Phaser.Math.FloatBetween(0.1, 0.34))
        .setRotation(-viento) // el extremo derecho más alto
        .setDepth(2);
      l.v = Phaser.Math.Between(700, 1600) * (l.height > 2 ? 1.2 : 1); // las más gruesas parecen más cercanas: más rápidas
      this.vientos.push(l);
    }
    const alActualizar = (_, delta) => {
      const dt = delta / 1000;
      for (const l of this.vientos) {
        l.x += wx * l.v * dt;
        l.y += wy * l.v * dt;
        if (l.y > height + 120 || l.x < -320) {
          // reaparece entrando por arriba o por la derecha
          if (Math.random() < 0.5) {
            l.x = Phaser.Math.Between(0, width + 300);
            l.y = -Phaser.Math.Between(20, 120);
          } else {
            l.x = width + Phaser.Math.Between(60, 300);
            l.y = Phaser.Math.Between(-60, height);
          }
        }
      }
    };
    this.events.on('update', alActualizar);
    this.events.once('shutdown', () => this.events.off('update', alActualizar));

    // Avión: [x, y, escala, brillo, fase]
    [[880, 235, 3.4, 1, 0]].forEach(([x, y, escala, brillo, fase]) => {
      const av = this.add.sprite(x, y, 'avion_jugador', 0).setScale(escala).setAngle(26).setDepth(4).setTint(Phaser.Display.Color.GetColor(255 * brillo, 255 * brillo, 255 * brillo));
      av.play('carga_avion');
      this.tweens.add({ targets: av, y: y + 14, duration: 2300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: fase });
      this.tweens.add({ targets: av, angle: 29, duration: 2900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut', delay: fase });
      // Estela: bocanadas de humo que salen de la cola y derivan hacia atrás
      this.time.addEvent({
        delay: 26, loop: true,
        callback: () => {
          const cola = 0.42 * 96 * escala;
          const humo = this.add.image(av.x - hx * cola, av.y - hy * cola, 'humo_carga').setDepth(3).setAlpha(0.2).setScale(0.13 * escala);
          this.tweens.add({
            targets: humo, x: humo.x - hx * 300 * escala * 0.5, y: humo.y - hy * 300 * escala * 0.5, scale: 0.4 * escala, alpha: 0,
            duration: 1100, onComplete: () => humo.destroy(),
          });
        },
      });
    });
  }

  create() {
    [...MANIFEST.images, ...MANIFEST.sheets].forEach((a) => {
      if (a.key !== 'pantalla_carga' && !a.opcional && !this.textures.exists(a.key)) crearPlaceholder(this, a);
    });

    MANIFEST.anims.forEach((a) => {
      const ultimo = this.textures.get(a.sheet).frameTotal - 2; // frameTotal incluye __BASE
      this.anims.create({
        key: a.key,
        frames: this.anims.generateFrameNumbers(a.sheet, { start: 0, end: ultimo }),
        frameRate: a.rate,
        repeat: a.repeat,
      });
    });

    if (!this.registry.has('genero')) this.registry.set('genero', 'H');

    this.arrancar();
  }

  arrancar() {
    // Atajos para grabar el video o probar: #nivel1 / #nivel2 / #nivel3 (saltan al nivel), #picada (Nivel 3 listo para la picada), #despegue (el despegue antes del Nivel 1), #cierre y #cierre-malo (el cierre del ending del final alternativo y del histórico), #sinintro (salta la intro)
    const h = window.location.hash;
    if (h === '#nivel1' || h === '#nivel2' || h === '#nivel3') {
      this.scene.start(h === '#nivel1' ? 'Level1Scene' : h === '#nivel2' ? 'Level2Scene' : 'Level3Scene');
      return;
    }
    if (h === '#cierre' || h === '#cierre-malo') {
      this.scene.start('EndingScene', { cierre: h === '#cierre' ? 'alt' : 'historico' });
      return;
    }
    if (h === '#despegue') {
      this.scene.start('DespegueScene');
      return;
    }
    if (h === '#linea') {
      this.scene.start('LineaTiempoScene'); // línea de tiempo final
      return;
    }
    if (h === '#picada') {
      this.scene.start('Level3Scene', { probarPicada: true, puntaje: 99999 }); // Nivel 3 con la base lista para la picada
      return;
    }
    this.listo = true; // la carga terminó: el menú master ya puede saltar de escena
    const destino = h === '#sinintro' ? 'TitleScene' : 'IntroScene';

    // Los navegadores bloquean el audio hasta el primer clic o tecla: se pide uno antes de la intro
    // para que su música (y la del menú) suenen desde el principio.
    this.txtCarga.setText('PRESIONA CUALQUIER TECLA O BOTÓN DEL MANDO PARA COMENZAR');
    this.tweens.add({ targets: this.txtCarga, alpha: 0.3, duration: 700, yoyo: true, repeat: -1 });
    const ir = () => this.scene.start(destino);
    this.input.keyboard.once('keydown', ir);
    this.input.once('pointerdown', ir);
  }
}
