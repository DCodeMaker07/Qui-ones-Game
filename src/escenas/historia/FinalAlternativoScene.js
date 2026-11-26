import Phaser from 'phaser';
import { FUENTE, FUENTE_TITULO, px } from '../../config.js';
import { ambiente } from '../../sistemas/efectos/Ambiente.js';
import { crearBaseEnLlamas } from '../../sistemas/efectos/BaseEnLlamas.js';

// FINAL ALTERNATIVO (no histórico): tras la picada, Quiñones se lanza en paracaídas y cae junto al río.
// Se desbloquea si el jugador pierde pocos soldados en el Nivel 3 (ver Level3Scene). Lleva siempre un cartel que dice que
// NO ocurrió así, y después un epílogo y el tributo cuentan lo que sucedió en realidad.
// Arte opcional: assets/sprites/aviones/paracaidas.png (si no existe se dibuja un paracaídas visto desde arriba).
export default class FinalAlternativoScene extends Phaser.Scene {
  constructor() {
    super('FinalAlternativoScene');
  }

  create() {
    const { width, height } = this.scale;
    ambiente.escena('victoria');
    this.cameras.main.fadeIn(900, 0, 0, 0);
    this.fondo = this.add.tileSprite(0, 0, width, height, 'terreno_3').setOrigin(0).setDepth(0);
    this.add.rectangle(0, 0, width, height, 0x000000, 0.18).setOrigin(0).setDepth(1);

    // La base destruida, a lo lejos, ardiendo: sprite calcinado, muchas llamas, humo y chispas
    const bx = width * 0.3;
    const by = height * 0.5;
    crearBaseEnLlamas(this, bx, by, 1.45, 2);

    // Cartel permanente: no es la historia real
    this.add.rectangle(0, 0, width, 78, 0x000000, 0.65).setOrigin(0).setDepth(20);
    this.add.text(width / 2, 24, 'FINAL ALTERNATIVO', { fontFamily: FUENTE_TITULO, fontStyle: 'bold', fontSize: '34px', color: '#ffd35a', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5).setDepth(21);
    this.add.text(width / 2, 58, 'Esto NO ocurrió así: es un final inventado por el juego', { fontFamily: FUENTE, fontSize: px(9), color: '#ffffff' }).setOrigin(0.5).setDepth(21);

    // Paracaídas: baja con vaivén y aterriza en la orilla del río
    const destino = { x: width * 0.78, y: height * 0.6 };
    const sombra = this.add.ellipse(destino.x + 12, destino.y + 30, 80, 40, 0x000000, 0).setDepth(2.5);
    this.tweens.add({ targets: sombra, fillAlpha: 0.35, scaleX: 1.25, scaleY: 1.25, duration: 9000, ease: 'Sine.easeIn' });
    const cont = this.crearParacaidas().setPosition(destino.x - 60, -140).setDepth(10);
    this.tweens.add({ targets: cont, y: destino.y, duration: 9500, ease: 'Sine.easeOut' });
    this.tweens.add({ targets: cont, x: destino.x + 30, duration: 2400, yoyo: true, repeat: 1, ease: 'Sine.easeInOut', delay: 200 });
    this.tweens.add({ targets: cont, x: destino.x, duration: 1500, delay: 9600, ease: 'Sine.easeOut' });
    this.tweens.add({ targets: cont, angle: { from: -6, to: 6 }, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    // Subtítulos de Layla (personaje de ficción), con su voz
    const caja = this.add.rectangle(width / 2, height - 70, width - 160, 90, 0x000000, 0.7).setStrokeStyle(2, 0xffd35a).setDepth(20);
    const txt = this.add.text(width / 2, height - 70, '', { fontFamily: FUENTE, fontSize: px(10), color: '#ffffff', align: 'center', wordWrap: { width: width - 220 } }).setOrigin(0.5).setDepth(21);
    const dicho = (ms, t) =>
      this.time.delayedCall(ms, () => {
        txt.setText(`LAYLA: ${t}`);
        this.game.voice?.hablar(t, undefined, 'M');
      });
    dicho(1200, '¡Lo veo! ¡Saltó! ¡Veo el paracaídas!');
    dicho(5200, 'Los soldados corren hacia él, cerca del río.');
    dicho(9600, '¡Está a salvo!');

    this.time.delayedCall(12800, () => this.cameras.main.fadeOut(900, 0, 0, 0));
    this.time.delayedCall(13800, () => this.scene.start('CutsceneScene', { id: 'epilogo_alt' }));
    this.events.once('shutdown', () => window.speechSynthesis?.cancel());
  }

  // El fondo (terreno y río) no se mueve en esta escena: lo único que se anima es el humo, el fuego y el paracaídas.

  // Paracaídas visto desde arriba: copa con gajos y un piloto diminuto. Usa assets/sprites/aviones/paracaidas.png si existe.
  crearParacaidas() {
    if (this.textures.exists('paracaidas')) return this.add.container(0, 0, [this.add.image(0, 0, 'paracaidas')]);
    const g = this.add.graphics();
    const R = 46;
    for (let i = 0; i < 8; i++) {
      g.fillStyle(i % 2 ? 0xe8e0c8 : 0x6f7a46, 1).beginPath().slice(0, 0, R, (i * Math.PI) / 4, ((i + 1) * Math.PI) / 4, false).fillPath();
    }
    g.lineStyle(2, 0x2a2a1a, 0.8).strokeCircle(0, 0, R);
    g.fillStyle(0x2a2a1a, 1).fillCircle(0, 0, 4);
    g.fillStyle(0x35506b, 1).fillCircle(7, 9, 5); // el piloto, asomando bajo la copa
    g.fillStyle(0xd9a679, 1).fillCircle(9, 12, 2.5);
    return this.add.container(0, 0, [g]);
  }
}
