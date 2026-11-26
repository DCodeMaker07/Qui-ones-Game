import Phaser from 'phaser';
import { ambiente } from '../../sistemas/efectos/Ambiente.js';
import { clavePuntoDeControl } from '../../sistemas/nivel/PuntoDeControl.js';
import Modal from '../../ui/Modal.js';

// Pantalla de derrota: dejo seguir desde el punto de control (si ya avancé algo), empezar el nivel de cero o volver al menú, con el
// mismo Modal que la pausa. La victoria ya no pasa por acá: después del tributo viene EndingScene (el ending).
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

    const hayPunto = !!this.registry.get(clavePuntoDeControl(this.nivel));
    const opciones = [];
    if (hayPunto) opciones.push({ texto: 'Continuar desde el punto', accion: () => this.scene.start(this.nivel, { reanudar: true }) });
    opciones.push({
      texto: hayPunto ? 'Empezar el nivel de cero' : 'Reintentar',
      accion: () => {
        this.registry.remove(clavePuntoDeControl(this.nivel));
        this.scene.start(this.nivel, { reanudar: false });
      },
    });
    opciones.push({ texto: 'Salir al menú', accion: () => this.scene.start('TitleScene', { rapido: true }) });

    new Modal(this, {
      titulo: 'AVIÓN DERRIBADO',
      cuerpo: hayPunto ? 'Quiñones no pudo completar la misión.\nPuedes seguir desde donde llegaste.' : 'Quiñones no pudo completar la misión.',
      opciones,
      pista: 'FLECHAS + ENTER',
    }).abrir();
  }
}
