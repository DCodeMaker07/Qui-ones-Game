import Phaser from 'phaser';
import { ambiente } from '../efectos/Ambiente.js';
import { ALTURA_CAMBIO_ESPERA, ESCALA_JUGADOR, FACTOR_ALTURA, TECLAS } from './constantes.js';

// La altura de vuelo de mi avión. Con ESPACIO subo y con C bajo (de bajo a normal a alto). Cada altura es un "piso":
// los aviones y las balas de otra altura no se tocan. Si me elevo, las balas enemigas pasan por debajo de mí, y unos segundos
// después los enemigos reaccionan y suben conmigo para seguir atacando (eso lo hace Enemigos.js). Entre un cambio de altura y otro
// hay una espera, para no poder esquivar todo el tiempo subiendo y bajando.
// Se nota en el tamaño del avión (más alto, más cerca de la cámara y más grande) y en la sombra, que se aleja del avión.
export default class Altura {
  constructor(escena) {
    this.escena = escena;
    this.nivel = 0; // -1 bajo, 0 normal, 1 alto
    this.espera = 0; // segundos que faltan para poder cambiar otra vez
    this.factor = FACTOR_ALTURA[0]; // tamaño actual del avión; cambia suave entre una altura y otra
    this.sombra = escena.add.sprite(0, 0, 'avion_jugador').setTint(0x000000).setAlpha(0.28).setDepth(4.9);
    this.sombra.play('nave_vuelo');

    const kb = escena.input.keyboard;
    const K = Phaser.Input.Keyboard.KeyCodes;
    kb.addKey(K[TECLAS.subir]).on('down', () => this.cambiar(1));
    kb.addKey(K[TECLAS.bajar]).on('down', () => this.cambiar(-1));
  }

  // Lo que necesita el HUD para mostrar la altura
  estado() {
    return { nivel: this.nivel, restante: this.espera, espera: ALTURA_CAMBIO_ESPERA };
  }

  cambiar(direccion) {
    const e = this.escena;
    if (e.terminado || e.pausado || this.espera > 0) return;
    const nuevo = Phaser.Math.Clamp(this.nivel + direccion, -1, 1);
    if (nuevo === this.nivel) return; // ya estoy en el piso más alto o más bajo
    this.nivel = nuevo;
    this.espera = ALTURA_CAMBIO_ESPERA;
    e.tweens.add({ targets: this, factor: FACTOR_ALTURA[nuevo], duration: 350, ease: 'Sine.easeInOut' });
    ambiente.pulso(nuevo > 0 ? '#8fd0ff' : '#c9a36a', 500, 1);
  }

  actualizar(dt) {
    this.espera = Math.max(0, this.espera - dt);
    const j = this.escena.jugador;
    const grande = ESCALA_JUGADOR * this.factor;
    j.setScale(grande * this.escena.habilidades.escalaTonel, grande); // en el tonel se achata de lado a lado y se da vuelta
    // La sombra se aleja del avión mientras más alto va: de 0 (el piso más bajo) a 1 (el más alto)
    const altura = (this.factor - FACTOR_ALTURA[-1]) / (FACTOR_ALTURA[1] - FACTOR_ALTURA[-1]);
    this.sombra.setVisible(j.visible).setScale(Math.abs(j.scaleX) * 1.02, j.scaleY * 1.02).setRotation(j.rotation).setPosition(j.x + 4 + 26 * altura, j.y + 6 + 38 * altura);
  }
}
