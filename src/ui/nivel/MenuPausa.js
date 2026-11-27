import Modal from '../Modal.js';
import { usandoMando } from '../../sistemas/entrada/preferencias.js';
import { nombreBoton } from '../../sistemas/entrada/etiquetas.js';

// Menú de pausa (ESC o P). Congelo el nivel y abro un Modal con las tres opciones.
// La música del nivel sigue sonando mientras tanto, no la toco.
export default class MenuPausa {
  constructor(escena) {
    this.escena = escena;
    this.tweensCongelados = [];
    this.modal = new Modal(escena, {
      titulo: 'PAUSA',
      opciones: [
        { texto: 'Continuar', accion: () => this.reanudar() },
        { texto: 'Reiniciar nivel', accion: () => { escena.puntoDeControl.borrar(); escena.scene.restart({ reanudar: false }); } }, // desde cero
        { texto: 'Salir al menú', accion: () => escena.scene.start('TitleScene', { rapido: true }) }, // la música del menú entra enseguida
      ],
      pista: 'FLECHAS + ENTER      ESC: CONTINUAR',
    });
    ['ESC', 'P'].forEach((tecla) => escena.input.keyboard.on(`keydown-${tecla}`, () => this.alternar()));
  }

  alternar() {
    if (this.escena.terminado) return;
    if (this.escena.pausado) this.reanudar();
    else this.pausar();
  }

  pausar() {
    const e = this.escena;
    e.pausado = true;
    e.physics.pause();
    e.time.paused = true;
    // Congelo los tweens del juego uno por uno (no con pauseAll) para que los del propio modal sí se muevan
    this.tweensCongelados = e.tweens.getTweens().filter((t) => !t.isPaused());
    this.tweensCongelados.forEach((t) => t.pause());
    e.anims.pauseAll();
    window.speechSynthesis?.cancel();
    e.game.voice?.cancelarEscucha();
    e.multijugador.avisarPausa(true); // Layla también se pausa
    // La ayuda de abajo cambia si juego con mando
    this.modal.pistaTxt?.setText(usandoMando() ? `CRUCETA + ${nombreBoton('A')}      ${nombreBoton('B')} O START: CONTINUAR` : 'FLECHAS + ENTER      ESC: CONTINUAR');
    this.modal.abrir();
  }

  reanudar() {
    const e = this.escena;
    this.modal.cerrar();
    e.pausado = false;
    e.picada.bloquearEnter(500); // el ENTER con el que elegí "Continuar" no debe lanzar la picada
    e.multijugador.avisarPausa(false);
    e.physics.resume();
    e.time.paused = false;
    this.tweensCongelados.forEach((t) => t.isPaused() && t.resume());
    this.tweensCongelados = [];
    e.anims.resumeAll();
  }
}
