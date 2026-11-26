import Phaser from 'phaser';
import { COLOR, FUENTE_UI, FUENTE, TXT, CAPA } from './tema.js';
import { marcoRedondeado } from './dibujo.js';
import { playSfx } from '../sistemas/audio/audio.js';

// Modal con título, texto opcional y una lista de opciones. Lo uso para la pausa y para la pantalla de derrota.
// Se navega con flechas o W/S, se elige con ENTER o con el clic. El ESC lo maneja quien lo crea (cada pantalla cierra distinto).
//
//   const modal = new Modal(escena, {
//     titulo: 'PAUSA',
//     opciones: [{ texto: 'Continuar', accion: () => ... }, ...],
//     pista: 'ESC: CONTINUAR',
//   });
//   modal.abrir();
export default class Modal {
  constructor(escena, { titulo, cuerpo = '', opciones, pista = '', ancho = 540, profundidad = CAPA.modal, teclado = true }) {
    this.escena = escena;
    this.opciones = opciones;
    this.seleccion = 0;
    this.abierto = false;
    this.items = [];

    const { width, height } = escena.scale;
    const lineasCuerpo = cuerpo ? cuerpo.split('\n').length : 0;
    const altoCuerpo = lineasCuerpo ? lineasCuerpo * 26 + 18 : 0;
    const alto = 150 + altoCuerpo + opciones.length * 62 + (pista ? 34 : 10);
    const x0 = -ancho / 2;
    const y0 = -alto / 2;

    // Todo va dentro de un contenedor para poder animarlo junto
    this.velo = escena.add.rectangle(0, 0, width, height, COLOR.negro, 0.62).setOrigin(0).setDepth(profundidad).setInteractive();
    this.caja = escena.add.graphics();
    marcoRedondeado(this.caja, x0 + 8, y0 + 8, ancho, alto, 26, { relleno: COLOR.negro, alfaRelleno: 0.5, grosor: 0 }); // sombra
    marcoRedondeado(this.caja, x0, y0, ancho, alto, 26, { relleno: COLOR.fondo, alfaRelleno: 0.97, borde: COLOR.naranja });

    this.titulo = escena.add.text(0, y0 + 56, titulo, { fontFamily: FUENTE_UI, fontStyle: 'bold', fontSize: '40px', color: TXT.naranja }).setOrigin(0.5);
    const partes = [this.caja, this.titulo];

    let y = y0 + 110;
    if (cuerpo) {
      partes.push(
        escena.add.text(0, y, cuerpo, { fontFamily: FUENTE, fontSize: '16px', color: TXT.blanco, align: 'center', lineSpacing: 8 }).setOrigin(0.5, 0)
      );
      y += altoCuerpo;
    }

    // El marcador es un triangulito naranja que se mueve hacia la opción elegida
    this.marcador = escena.add.triangle(0, 0, 0, 0, 0, 22, 18, 11, COLOR.naranja).setOrigin(0, 0.5);
    partes.push(this.marcador);

    opciones.forEach((op, i) => {
      const t = escena.add
        .text(0, y + 26 + i * 62, op.texto, { fontFamily: FUENTE_UI, fontStyle: 'bold', fontSize: '30px', color: TXT.gris })
        .setOrigin(0.5)
        .setInteractive({ useHandCursor: true });
      t.baseY = t.y;
      t.on('pointerover', () => this.abierto && this.seleccionar(i));
      t.on('pointerdown', () => this.abierto && this.presionar(t, () => this.elegir(i)));
      this.items.push(t);
      partes.push(t);
    });

    if (pista) partes.push(escena.add.text(0, y0 + alto - 26, pista, { fontFamily: FUENTE, fontSize: '12px', color: TXT.grisOscuro }).setOrigin(0.5));

    this.cont = escena.add.container(width / 2, height / 2, partes).setDepth(profundidad + 1);
    this.ocultar();

    if (teclado) this.escucharTeclas();
  }

  escucharTeclas() {
    const kb = this.escena.input.keyboard;
    ['UP', 'W'].forEach((k) => kb.on(`keydown-${k}`, () => this.abierto && this.mover(-1)));
    ['DOWN', 'S'].forEach((k) => kb.on(`keydown-${k}`, () => this.abierto && this.mover(1)));
    kb.on('keydown-ENTER', () => this.abierto && this.presionar(this.items[this.seleccion], () => this.elegir(this.seleccion)));
  }

  mover(d) {
    this.seleccionar((this.seleccion + d + this.opciones.length) % this.opciones.length);
  }

  seleccionar(i, sonido = true) {
    if (i === this.seleccion && this.marcadorColocado) return;
    this.seleccion = i;
    this.items.forEach((t, k) => t.setColor(k === i ? TXT.naranja : TXT.gris));
    const t = this.items[i];
    const x = -t.width / 2 - 38;
    if (this.marcadorColocado) {
      this.escena.tweens.killTweensOf(this.marcador);
      this.escena.tweens.add({ targets: this.marcador, x, y: t.y, duration: 120, ease: 'Cubic.easeOut' });
      if (sonido) playSfx(this.escena, 'sfx_menu_mover', { volume: 0.6 });
    } else {
      this.marcador.setPosition(x, t.y);
      this.marcadorColocado = true;
    }
  }

  // Animación de presionar: la opción se achica un poquito, vuelve con rebote y recién ahí corro la acción
  presionar(t, accion) {
    const e = this.escena;
    e.tweens.killTweensOf(t);
    e.tweens.add({
      targets: t, scale: 0.92, duration: 70, ease: 'Sine.easeOut',
      onComplete: () => {
        e.tweens.add({ targets: t, scale: 1, duration: 160, ease: 'Back.easeOut' });
        accion();
      },
    });
  }

  elegir(i) {
    playSfx(this.escena, 'sfx_menu_ok', { volume: 0.7 });
    this.opciones[i].accion?.();
  }

  abrir() {
    this.abierto = true;
    this.velo.setVisible(true);
    this.cont.setVisible(true).setAlpha(0).setScale(0.92);
    this.escena.tweens.killTweensOf(this.cont);
    this.escena.tweens.add({ targets: this.cont, alpha: 1, scale: 1, duration: 180, ease: 'Back.easeOut' });
    this.marcadorColocado = false;
    this.seleccionar(0, false);
  }

  cerrar() {
    this.abierto = false;
    this.ocultar();
  }

  ocultar() {
    this.velo.setVisible(false);
    this.cont.setVisible(false);
  }
}
