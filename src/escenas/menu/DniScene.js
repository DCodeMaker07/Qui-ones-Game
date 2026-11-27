import { alCambiarEntrada, recienCambiada, usandoMando } from '../../sistemas/entrada/preferencias.js';
import { nombreBoton } from '../../sistemas/entrada/etiquetas.js';
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
    this.crearTeclado();

    this.events.once('shutdown', () => {
      this.quitarTeclado();
      this.ui.form.removeEventListener('submit', this.onSubmit);
      this.ui.overlay.classList.add('hidden');
      this.ui.overlay.classList.remove('flex');
      this.ui.dni.blur();
    });
  }

  update(_, delta) {
    this.fondo.update(delta);
  }

  // ---------- teclado numérico para jugar con mando ----------

  // Si hay un mando conectado muestro debajo del campo un teclado numérico (1 al 9, borrar, 0, listo) y, si hace falta elegir el género, dos
  // botones H y M. Se mueve con la cruceta o el stick, A pulsa la tecla y B vuelve al menú (el Mando.js manda esas flechas y el ENTER como
  // teclas virtuales, que se distinguen de las reales porque su "code" va en mayúsculas)
  crearTeclado() {
    this.teclas = [
      { texto: '1', valor: '1' }, { texto: '2', valor: '2' }, { texto: '3', valor: '3' },
      { texto: '4', valor: '4' }, { texto: '5', valor: '5' }, { texto: '6', valor: '6' },
      { texto: '7', valor: '7' }, { texto: '8', valor: '8' }, { texto: '9', valor: '9' },
      { texto: 'BORRAR', valor: 'borrar', pequena: true }, { texto: '0', valor: '0' }, { texto: 'LISTO', valor: 'listo', pequena: true },
      // Estos dos solo aparecen si el DNI no está en la base de prueba y hay que elegir el género (ver mostrarGenero)
      { texto: 'H (hombre)', valor: 'H', pequena: true, genero: true }, { texto: 'M (mujer)', valor: 'M', pequena: true, genero: true },
    ];
    this.generoVisible = false;
    this.tecladoSel = 4; // empieza en el 5, en el centro
    this.rejilla = document.createElement('div');
    this.rejilla.className = 'dni-teclado hidden';
    this.botonesTeclado = this.teclas.map((t, i) => {
      const boton = document.createElement('button');
      boton.type = 'button';
      boton.textContent = t.texto;
      if (t.pequena) boton.classList.add('pequena');
      if (t.genero) boton.classList.add('hidden'); // se muestran cuando hace falta
      boton.addEventListener('click', () => {
        this.tecladoSel = i;
        this.pulsarTecla();
      });
      this.rejilla.appendChild(boton);
      return boton;
    });
    this.pistaTeclado = document.createElement('p');
    this.pistaTeclado.className = 'dni-teclado-pista hidden';
    const pistaDeBotones = () => (this.pistaTeclado.textContent = `Cruceta o stick: mover  ·  ${nombreBoton('A')}: pulsar  ·  ${nombreBoton('B')}: volver`);
    pistaDeBotones();
    this.quitarAvisoEstilo = alCambiarEntrada(pistaDeBotones); // si cambia el estilo del mando se actualiza
    this.ui.hint.after(this.rejilla, this.pistaTeclado);

    const virtual = (evento) => evento?.code === 'ENTER' || evento?.code === 'SPACE'; // las del mando, no las del teclado de verdad
    const kb = this.input.keyboard;
    kb.on('keydown-LEFT', () => this.moverTeclado(-1, 0));
    kb.on('keydown-RIGHT', () => this.moverTeclado(1, 0));
    kb.on('keydown-UP', () => this.moverTeclado(0, -1));
    kb.on('keydown-DOWN', () => this.moverTeclado(0, 1));
    kb.on('keydown-ENTER', (evento) => virtual(evento) && !recienCambiada() && this.pulsarTecla()); // el botón con el que despierto el mando no cuenta

    // El teclado en pantalla solo se ve si juego con mando: hay un mando conectado Y lo último que usé fue el mando (no el teclado ni el mouse).
    // Se actualiza al conectar o desconectar el mando y cada vez que cambio de uno a otro (ver preferencias.js)
    this.alConectar = () => this.mostrarTeclado(this.conMando());
    window.addEventListener('gamepadconnected', this.alConectar);
    window.addEventListener('gamepaddisconnected', this.alConectar);
    this.quitarAvisoDispositivo = alCambiarEntrada(() => this.mostrarTeclado(this.conMando()));
    this.mostrarTeclado(this.conMando());
  }

  conMando() {
    return usandoMando() && this.hayMando();
  }

  hayMando() {
    return [...(navigator.getGamepads?.() ?? [])].some((m) => m && m.connected);
  }

  mostrarTeclado(visible) {
    this.rejilla.classList.toggle('hidden', !visible);
    this.pistaTeclado.classList.toggle('hidden', !visible);
    this.tecladoVisible = visible;
    if (visible) this.ui.dni.blur(); // con el mando no hace falta el cursor del campo
    else this.ui.dni.focus(); // con teclado y mouse se escribe directo en el campo
    this.pintarTeclado();
  }

  pintarTeclado() {
    this.botonesTeclado?.forEach((b, i) => b.classList.toggle('sel', i === this.tecladoSel));
  }

  // La cruceta mueve la tecla elegida por la rejilla de 3 columnas; en los bordes no da la vuelta
  moverTeclado(dx, dy) {
    if (!this.tecladoVisible) return;
    const col = Phaser.Math.Clamp((this.tecladoSel % 3) + dx, 0, 2);
    const fila = Phaser.Math.Clamp(Math.floor(this.tecladoSel / 3) + dy, 0, this.generoVisible ? 4 : 3);
    this.tecladoSel = Math.min(fila * 3 + col, this.generoVisible ? 13 : 11); // la última fila solo tiene H y M
    this.pintarTeclado();
  }

  pulsarTecla() {
    if (!this.tecladoVisible) return;
    const { valor } = this.teclas[this.tecladoSel];
    this.ui.error.classList.add('hidden');
    if (valor === 'listo') return this.confirmar();
    if (valor === 'H' || valor === 'M') {
      this.ui.genero.value = valor; // elijo el género; después se pulsa LISTO
      this.botonesTeclado.forEach((b, i) => b.classList.toggle('activa', this.teclas[i].genero && this.teclas[i].valor === valor));
      return;
    }
    if (valor === 'borrar') this.ui.dni.value = this.ui.dni.value.slice(0, -1);
    else if (this.ui.dni.value.length < 8) this.ui.dni.value += valor;
  }

  // Si hay que elegir el género muestro los botones H y M debajo del teclado
  mostrarGenero() {
    if (!this.botonesTeclado) return;
    this.generoVisible = true;
    this.teclas.forEach((t, i) => t.genero && this.botonesTeclado[i].classList.remove('hidden'));
  }

  quitarTeclado() {
    this.quitarAvisoEstilo?.();
    window.removeEventListener('gamepadconnected', this.alConectar);
    window.removeEventListener('gamepaddisconnected', this.alConectar);
    this.quitarAvisoDispositivo?.();
    this.rejilla?.remove();
    this.pistaTeclado?.remove();
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
      this.mostrarGenero();
      genero = this.ui.genero.value;
      if (!genero) return this.mostrarError('DNI no está en la base de prueba. Elige tu género (H/M) para continuar.');
    }

    this.registry.set('genero', genero);
    this.game.voice.setGenero(genero);
    this.scene.start('ModoScene'); // sigue la pantalla de un jugador o multijugador (la música del menú no se corta)
  }
}
