import Phaser from 'phaser';
import { deslizar, polvo, prepararTexturas } from '../../sistemas/ending/efectos.js';
import { DURACION, GUION } from '../../sistemas/ending/guion.js';
import * as PLANOS from '../../sistemas/ending/planos.js';
import { ambiente } from '../../sistemas/efectos/Ambiente.js';
import { iniciarPista } from '../../sistemas/audio/pistas.js';
import { TXT, estiloHud } from '../../ui/tema.js';

// El ending del juego, al estilo de los de anime (me guié por el de Hunter x Hunter): bandas negras de cine, planos que
// cambian con la música, tarjetas de personaje inclinadas, créditos que entran de costado y polvo dorado subiendo.
// Esta escena solo es la directora. Lo que se ve en cada tramo está en src/ending/ (guion.js dice qué y cuándo, planos.js lo arma).
// Cuando termina, la canción sigue sonando en la línea de tiempo y ahí la apago.
const MUSICA = 'musica_ending';
const BARRA = 64; // alto de las bandas negras
const FADE = 0.3; // segundos de disolución entre planos

export default class EndingScene extends Phaser.Scene {
  constructor() {
    super('EndingScene');
  }

  create() {
    const { width, height } = this.scale;
    ambiente.escena('victoria');
    prepararTexturas(this);
    this.saliendo = false;
    this.iniciado = false;
    this.bloqueoHasta = performance.now() + 1500; // el ENTER con el que pasé la última línea del narrador no debe saltar el ending

    this.add.rectangle(0, 0, width, height, 0x000000).setOrigin(0).setDepth(0);
    this.crearCapasFijas();
    ['ENTER', 'SPACE', 'ESC'].forEach((tecla) => this.input.keyboard.on(`keydown-${tecla}`, () => this.saltar()));
    this.arrancarMusica();
  }

  // Lo que está siempre encima de los planos: polvo, viñeta, bandas negras y el aviso para saltar
  crearCapasFijas() {
    const { width, height } = this.scale;
    polvo(this).setDepth(48);
    this.add.image(width / 2, height / 2, 'ending_vineta').setDepth(49);
    const arriba = this.add.rectangle(0, 0, width, 0, 0x000000).setOrigin(0).setDepth(50);
    const abajo = this.add.rectangle(0, height, width, 0, 0x000000).setOrigin(0, 1).setDepth(50);
    this.tweens.add({ targets: [arriba, abajo], height: BARRA, duration: 700, ease: 'Cubic.easeOut' });
    const aviso = this.add.text(width - 24, 32, 'ENTER: SALTAR', estiloHud(12, { color: TXT.grisOscuro, fontStyle: 'bold', letterSpacing: 3 })).setOrigin(1, 0.5).setDepth(51).setAlpha(0);
    this.tweens.add({ targets: aviso, alpha: 0.6, duration: 600, delay: 2500 });
  }

  // El guion arranca cuando la canción realmente empieza, para que los cortes caigan donde cambia la música
  arrancarMusica() {
    if (!this.cache.audio.exists(MUSICA)) return void this.time.delayedCall(400, () => this.reproducirGuion());
    iniciarPista(this, MUSICA, 1, 300);
    const musica = this.sound.get(MUSICA);
    if (musica.isPlaying) this.reproducirGuion();
    else musica.once('play', () => this.reproducirGuion());
    this.time.delayedCall(2500, () => this.reproducirGuion()); // si el navegador no deja sonar el audio, el ending sigue igual
  }

  reproducirGuion() {
    if (this.iniciado) return;
    this.iniciado = true;
    GUION.forEach((paso) => this.time.delayedCall(paso.t * 1000, () => this.entrarPlano(paso)));
    this.time.delayedCall(1000, () => this.cameras.main.flash(350, 255, 240, 200)); // el primer golpe de la canción
    this.time.delayedCall(DURACION * 1000, () => this.terminar());
  }

  entrarPlano(paso) {
    const plano = PLANOS[paso.plano](this, paso);
    if (paso.rotulo) this.agregarRotulo(plano, paso);
    const fade = (paso.fade ?? FADE) * 1000;
    this.tweens.add({ targets: plano.cont, alpha: 1, duration: fade });
    if (!paso.sinSalida) this.time.delayedCall(paso.dur * 1000 - fade, () => this.tweens.add({ targets: plano.cont, alpha: 0, duration: fade }));
    if (!paso.sinSalida) this.time.delayedCall(paso.dur * 1000 + fade, () => PLANOS.limpiar(this, plano));
  }

  // El título chiquito de abajo a la izquierda con el que arranca el ending
  agregarRotulo(plano, { rotulo: [titulo, subtitulo], rotuloEn = 1 }) {
    const t = this.add.text(70, 510, titulo, estiloHud(44));
    const s = this.add.text(70, 568, subtitulo.toUpperCase(), estiloHud(15, { color: TXT.dorado, fontStyle: 'bold', letterSpacing: 3 }));
    plano.cont.add([t, s]);
    [t, s].forEach((o) => o.setAlpha(0));
    plano.temporizadores.push(
      this.time.delayedCall(rotuloEn * 1000, () => [t, s].forEach((o, i) => this.time.delayedCall(i * 150, () => deslizar(this, o, { dx: -90, dur: 500 })))),
      this.time.delayedCall((rotuloEn + 4) * 1000, () => this.tweens.add({ targets: [t, s], alpha: 0, duration: 500 }))
    );
  }

  saltar() {
    if (performance.now() < this.bloqueoHasta) return;
    this.terminar();
  }

  terminar() {
    if (this.saliendo) return;
    this.saliendo = true;
    this.cameras.main.fadeOut(700, 0, 0, 0);
    this.time.delayedCall(750, () => this.scene.start('LineaTiempoScene'));
  }
}
