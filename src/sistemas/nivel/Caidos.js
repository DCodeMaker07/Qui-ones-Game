import Phaser from 'phaser';
import { ESCALA } from '../../config.js';
import { CAIDO_PERMANENCIA_MS } from './constantes.js';

// Los soldados caídos en el suelo, aliados ('muerte_aliado') y enemigos ('muerte_enemigo'). Llegan con un golpe (un poco más grandes y
// transparentes, y se asientan) y levanta polvo. Baja con el terreno, se queda unos segundos y se desvanece. El dibujo es opcional:
// si no existe, el soldado solo desaparece con su explosión.
export default class Caidos {
  constructor(escena) {
    this.escena = escena;
    this.lista = [];
  }

  marcar(clave, x, y) {
    const e = this.escena;
    if (!e.textures.exists(clave)) return;
    const marca = e.add.image(x, y, clave).setDepth(2.5).setScale(ESCALA.caido * 1.15).setAlpha(0);
    e.tweens.add({ targets: marca, scale: ESCALA.caido, alpha: 1, duration: 260, ease: 'Back.easeOut' });
    e.tweens.add({ targets: marca, alpha: 0, duration: 1500, delay: CAIDO_PERMANENCIA_MS, onComplete: () => marca.destroy() });
    this.lista.push(marca);
    for (let i = 0; i < 7; i++) {
      const polvo = e.add.circle(x, y, Phaser.Math.Between(5, 10), 0xc9a46a, 0.6).setDepth(2.6);
      const angulo = (i / 7) * Math.PI * 2;
      e.tweens.add({ targets: polvo, x: x + Math.cos(angulo) * 45, y: y + Math.sin(angulo) * 35, scale: 2.2, alpha: 0, duration: 700, ease: 'Quad.easeOut', onComplete: () => polvo.destroy() });
    }
  }

  // Los cráteres bajan con el terreno y se borran al salir de la pantalla
  actualizar(dt) {
    const e = this.escena;
    this.lista = this.lista.filter((c) => c.active);
    this.lista.forEach((c) => {
      c.y += e.velTerreno * dt;
      if (c.y > e.scale.height + 100) c.destroy();
    });
  }
}
