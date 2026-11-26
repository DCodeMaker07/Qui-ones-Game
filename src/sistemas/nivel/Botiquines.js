import Phaser from 'phaser';
import { ESCALA } from '../../config.js';
import { ambiente } from '../efectos/Ambiente.js';
import { BOTIQUINES_POR_NIVEL, CURA_ALIADO, CURA_JUGADOR, ESPERA_BOTIQUIN_MS, RADIO_RECOGER, TECLAS, VIDA_ALIADO, VIDA_JUGADOR } from './constantes.js';

// Botiquines con paracaídas. Caen, se quedan en el suelo avanzando con el terreno y los recogen mis soldados heridos
// o yo mismo si paso volando por encima y me falta vida. Tengo pocos por nivel y hay que esperar entre uno y otro.
export default class Botiquines {
  constructor(escena) {
    this.escena = escena;
    this.lista = [];
    this.restantes = BOTIQUINES_POR_NIVEL;
    this.ultimo = -Infinity;
  }

  // Milisegundos que faltan para poder pedir otro (0 si ya se puede)
  esperaRestante() {
    return Math.max(0, this.ultimo + ESPERA_BOTIQUIN_MS - this.escena.time.now);
  }

  // pos: dónde quiero que caiga (lo elige Layla). Sin pos cae desde mi avión (modo un jugador)
  pedir(pos) {
    const e = this.escena;
    if (e.terminado || e.pausado) return;
    if (!pos && e.multijugador.hayLayla()) return e.radio.mostrar(`Pídele el botiquín a Layla por radio (${TECLAS.radio}).`);
    if (this.restantes <= 0) return e.radio.mostrar('Sin botiquines disponibles.');
    const espera = this.esperaRestante();
    if (espera > 0) return e.radio.mostrar(`Preparando otro botiquín: ${Math.ceil(espera / 1000)} s.`);

    this.restantes--;
    this.ultimo = e.time.now;
    // Cae 126 px (90 px/s durante 1,4 s). Si lo elige Layla lo empiezo más arriba para que aterrice justo donde ella marcó
    const x0 = pos ? Phaser.Math.Clamp(pos.x, 40, e.scale.width - 40) : e.jugador.x;
    const y0 = pos ? Phaser.Math.Clamp(pos.y, 60, e.scale.height - 80) - 126 : e.jugador.y + 30;
    const b = e.add.sprite(x0, y0, 'botiquin_aire').setDepth(3).setScale(ESCALA.botiquinAire);
    b.idRed = e.nuevoId();
    b.play('botiquin_caer');
    b.estado = 'aire';
    b.t = 0;
    b.fase = Math.random() * 6;
    this.lista.push(b);
    e.radio.mostrar(pos ? 'Layla envía un botiquín.' : 'Botiquín en camino.');
  }

  // El botiquín en el suelo más cercano a un soldado herido (a menos de 280 px)
  masCercano(soldado) {
    let mejor = 280;
    let elegido = null;
    this.lista.forEach((b) => {
      if (!b.active || b.estado !== 'suelo') return;
      const d = Phaser.Math.Distance.Between(soldado.x, soldado.y, b.x, b.y);
      if (d < mejor) {
        mejor = d;
        elegido = b;
      }
    });
    return elegido;
  }

  curarAliado(aliado, botiquin) {
    aliado.vida = Math.min(VIDA_ALIADO, aliado.vida + CURA_ALIADO);
    botiquin.destroy();
    ambiente.pulso('#3ddc84', 800, 2);
    this.escena.radio.mostrar('Aliado curado.', { duracion: 1800 });
  }

  curarJugador(botiquin) {
    const e = this.escena;
    e.vida = Math.min(VIDA_JUGADOR, e.vida + CURA_JUGADOR);
    botiquin.destroy();
    if (e.vida >= 2) {
      e.jugador.play('nave_vuelo', true); // dejo de verme dañado
      ambiente.peligro(false);
    }
    ambiente.pulso('#3ddc84', 800, 2);
    e.radio.mostrar('Botiquín recogido: +1 vida.', { duracion: 2200 });
  }

  actualizar(dt) {
    const e = this.escena;
    this.lista = this.lista.filter((b) => b.active);
    this.lista.forEach((b) => {
      if (b.estado === 'aire') {
        b.t += dt;
        b.y += 90 * dt;
        b.x += Math.sin(b.t * 4 + b.fase) * 0.4; // el vaivén del paracaídas
        if (b.t >= 1.4) {
          b.estado = 'suelo';
          b.stop();
          b.setTexture('botiquin_suelo').setScale(ESCALA.botiquinSuelo);
        }
      } else {
        b.y += e.velTerreno * dt; // en el suelo se mueve con el terreno
        if (b.y > e.scale.height + 60) b.destroy();
      }
    });
    if (e.vida < VIDA_JUGADOR) {
      const cerca = this.lista.find(
        (b) => b.active && b.estado === 'suelo' && Phaser.Math.Distance.Between(b.x, b.y, e.jugador.x, e.jugador.y) < RADIO_RECOGER
      );
      if (cerca) this.curarJugador(cerca);
    }
  }
}
