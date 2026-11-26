import { reiniciarPuntaje } from '../../sistemas/nivel/Puntaje.js';
import Phaser from 'phaser';
import { FUENTE, FUENTE_TITULO } from '../../config.js';
import { DNI_PRUEBA, generoPorDni } from '../../datos/dni.js';
import { detenerMusicaMenu, iniciarMusicaMenu } from '../../sistemas/audio/musicaMenu.js';
import FondoBatalla from '../../entidades/FondoBatalla.js';

// Acá pido el DNI con el formulario HTML de index.html y saco el género (H/M).
// El DNI no lo guardo: solo me quedo con el género en el registry.
export default class DniScene extends Phaser.Scene {
  constructor() {
    super('DniScene');
  }

  create() {
    const { width, height } = this.scale;
    reiniciarPuntaje(this.registry); // una partida nueva empieza en cero
    iniciarMusicaMenu(this); // sigue la música del título
    this.fondo = new FondoBatalla(this); // el mismo campo de batalla en vivo del menú
    this.add.rectangle(0, 0, width, height, 0x000000, 0.5).setOrigin(0).setDepth(20);
    this.add
      .text(width / 2, 80, 'TORRE DE CONTROL', { fontFamily: FUENTE_TITULO, fontStyle: 'bold', fontSize: '36px', color: '#ffd35a', stroke: '#000', strokeThickness: 5 })
      .setOrigin(0.5)
      .setDepth(30);

    this.add.text(width / 2, height - 40, 'ESC: VOLVER AL MENÚ', { fontFamily: FUENTE, fontSize: '14px', color: '#9a9a9a', stroke: '#000', strokeThickness: 3 }).setOrigin(0.5).setDepth(30);
    // ESC vuelve al menú principal, incluso con el cursor dentro del campo del DNI
    this.input.keyboard.on('keydown-ESC', () => this.scene.start('TitleScene'));

    const $ = (id) => document.getElementById(id);
    this.ui = {
      overlay: $('dni-overlay'), form: $('dni-form'), dni: $('dni-input'),
      manual: $('dni-manual'), genero: $('dni-genero'), error: $('dni-error'), hint: $('dni-hint'),
    };

    this.ui.dni.value = '';
    this.ui.genero.value = '';
    this.ui.manual.classList.add('hidden');
    this.ui.error.classList.add('hidden');
    this.ui.hint.textContent =
      'DNIs de prueba: ' + Object.entries(DNI_PRUEBA).map(([d, g]) => `${d} (${g})`).join(', ');

    this.ui.overlay.classList.remove('hidden');
    this.ui.overlay.classList.add('flex');
    setTimeout(() => this.ui.dni.focus(), 50);

    this.onSubmit = (e) => {
      e.preventDefault();
      this.confirmar();
    };
    this.ui.form.addEventListener('submit', this.onSubmit);

    this.events.once('shutdown', () => {
      this.ui.form.removeEventListener('submit', this.onSubmit);
      this.ui.overlay.classList.add('hidden');
      this.ui.overlay.classList.remove('flex');
      this.ui.dni.blur();
    });
  }

  update(_, delta) {
    this.fondo.update(delta);
  }

  mostrarError(msg) {
    this.ui.error.textContent = msg;
    this.ui.error.classList.remove('hidden');
  }

  confirmar() {
    const dni = this.ui.dni.value.trim();
    if (!/^\d{8}$/.test(dni)) return this.mostrarError('El DNI debe tener 8 dígitos.');

    let genero = generoPorDni(dni);
    if (!genero) {
      // Si el DNI no está en mi base de prueba, dejo elegir H o M a mano
      this.ui.manual.classList.remove('hidden');
      genero = this.ui.genero.value;
      if (!genero) return this.mostrarError('DNI no está en la base de prueba. Elige tu género (H/M) para continuar.');
    }

    this.registry.set('genero', genero);
    this.game.voice.setGenero(genero);
    this.scene.start('ModoScene'); // sigue la pantalla de un jugador o multijugador (la música del menú no se corta)
  }
}
