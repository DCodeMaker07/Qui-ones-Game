import Phaser from 'phaser';
import { ambiente } from '../../sistemas/efectos/Ambiente.js';
import Modal from '../../ui/Modal.js';

// Pantalla de derrota: dejo reintentar el nivel o volver al menú, con el mismo Modal que la pausa.
// La victoria ya no pasa por acá: después del tributo viene EndingScene (el ending).
export default class EndScene extends Phaser.Scene {
  constructor() {
    super('EndScene');
  }

  init(data) {
    this.nivel = data.nivel ?? 'Level1Scene';
  }

  create() {
    const { width, height } = this.scale;
    ambiente.escena('derrota');
    this.add.tileSprite(0, 0, width, height, 'terreno_2').setOrigin(0);

    new Modal(this, {
      titulo: 'AVIÓN DERRIBADO',
      cuerpo: 'Quiñones no pudo completar la misión.',
      opciones: [
        { texto: 'Reintentar', accion: () => this.scene.start(this.nivel) },
        { texto: 'Salir al menú', accion: () => this.scene.start('TitleScene', { rapido: true }) },
      ],
      pista: 'FLECHAS + ENTER',
    }).abrir();
  }
}
