import { ESCALA } from '../../config.js';
import { BARRERAS_POR_NIVEL, BARRERA_ESPERA_MS, BARRERA_VIDA } from './constantes.js';

// Las barreras de los soldados aliados. Las coloca Layla desde su panel (modo multijugador) donde ella quiera dentro de mi pantalla.
// Una barrera frena las balas de las torretas y de los soldados enemigos que le llegan (cada bala le quita un punto de vida) y se rompe
// cuando se le acaba. Así los soldados que están detrás no mueren tan fácil. Baja con el terreno. Las balas de los aviones
// pasan por encima, no las frena.
const ANCHO_GOLPE = 96; // zona donde la barrera frena las balas (el dibujo mide unos 85 px de ancho en pantalla)
const ALTO_GOLPE = 30;

export default class Barreras {
  constructor(escena) {
    this.escena = escena;
    this.lista = [];
    this.restantes = BARRERAS_POR_NIVEL;
    this.ultima = -Infinity;
  }

  // Milisegundos que faltan para que Layla pueda colocar otra (0 si ya puede)
  esperaRestante() {
    return Math.max(0, this.ultima + BARRERA_ESPERA_MS - this.escena.time.now);
  }

  colocar(x, y) {
    const e = this.escena;
    if (e.terminado || this.restantes <= 0 || this.esperaRestante() > 0) return;
    this.restantes--;
    this.ultima = e.time.now;
    const dibujo = e.textures.exists('barrera_aliada')
      ? e.add.image(x, y, 'barrera_aliada').setScale(ESCALA.barrera)
      : e.add.rectangle(x, y, ANCHO_GOLPE, 20, 0x8a6a3a).setStrokeStyle(2, 0x3a2a10); // si falta el dibujo, un rectángulo
    dibujo.setDepth(2.8).setAlpha(0);
    dibujo.vida = BARRERA_VIDA;
    dibujo.idRed = e.nuevoId();
    e.tweens.add({ targets: dibujo, alpha: 1, duration: 300 }); // aparece de a poco
    this.lista.push(dibujo);
    e.radio.mostrar('Layla coloca una barrera para los soldados.', { duracion: 3000 });
  }

  actualizar(dt) {
    const e = this.escena;
    const { height } = e.scale;
    this.lista = this.lista.filter((b) => b.active);
    this.lista.forEach((b) => {
      b.y += e.velTerreno * dt;
      if (b.y > height + 80) return b.destroy();
      e.balasTierra.getChildren().forEach((bala) => {
        if (!bala.active || Math.abs(bala.x - b.x) > ANCHO_GOLPE / 2 || Math.abs(bala.y - b.y) > ALTO_GOLPE / 2) return;
        bala.destroy();
        this.recibirGolpe(b);
      });
    });
  }

  recibirGolpe(b) {
    if (!b.active) return;
    b.vida--;
    b.setTint?.(0xffc9a0);
    this.escena.time.delayedCall(90, () => b.active && b.clearTint?.());
    if (b.vida <= 0) {
      this.escena.explosion(b.x, b.y, 0.5);
      b.destroy();
    }
  }

  // Lo que le mando a Layla para su mapa: [id, x, y, vida]
  foto() {
    return this.lista.filter((b) => b.active).map((b) => [b.idRed, Math.round(b.x), Math.round(b.y), b.vida]);
  }
}
