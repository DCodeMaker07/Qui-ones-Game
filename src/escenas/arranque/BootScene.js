import Phaser from 'phaser';
import { MANIFEST } from '../../config.js';

// Carga solo lo necesario para la pantalla de carga (el fondo y el sprite del avión, que se anima) y pasa a PreloadScene.
export default class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    const carga = MANIFEST.images.find((i) => i.key === 'pantalla_carga');
    this.load.image(carga.key, carga.url);
    const avion = MANIFEST.sheets.find((i) => i.key === 'avion_jugador');
    this.load.spritesheet(avion.key, avion.url, { frameWidth: avion.fw, frameHeight: avion.fh });
  }

  create() {
    // Bocanada de humo (círculo blanco) para las estelas de los aviones de la pantalla de carga
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0xffffff, 1).fillCircle(16, 16, 16);
    g.generateTexture('humo_carga', 32, 32);
    g.destroy();
    this.scene.start('PreloadScene');
  }
}
