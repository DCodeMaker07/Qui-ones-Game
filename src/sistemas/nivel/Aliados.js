import Phaser from 'phaser';
import { alinearAliado, ESCALA } from '../../config.js';
import { PUNTOS, DANO_ALIADO_NIDO, DANO_ALIADO_SOLDADO, FUEGO_BLOQUEO, FUEGO_DANO_ALIADO, FUEGO_RADIO, VIDA_ALIADO } from './constantes.js';

// Mis soldados aliados. Llegan en escuadras de 3 por abajo cuando el mapa se frena ante las torretas y marchan a atacarlas.
// Los heridos buscan un botiquín. El fuego grande de la R los detiene y el chico lo rodean. Layla les puede dar órdenes (avanzar, mantener, atacar un objetivo).
export default class Aliados {
  constructor(escena) {
    this.escena = escena;
    this.orden = { tipo: 'avanzar', id: null };
    this.bajas = 0; // cuántos soldados perdí (cada baja resta puntos)
  }

  crearEscuadra() {
    const e = this.escena;
    if (e.terminado || e.fase !== 'avance' || e.velTerreno > 5) return;
    if (e.aliados.countActive(true) >= 9) return;
    const x = e.xAleatorio(110);
    [[-36, 0], [0, 12], [36, 0]].forEach(([dx, dy]) => this.crear(x + dx, e.scale.height + 28 + dy));
  }

  crear(x, y) {
    const e = this.escena;
    const a = e.aliados.create(x, y, 'soldado_aliado_arriba').setDepth(3).setScale(ESCALA.soldado);
    a.play('aliado_arriba');
    alinearAliado(a, 'aliado_arriba');
    const r = 22;
    a.body.setCircle(r, a.width / 2 - r, a.height / 2 - r);
    a.vida = VIDA_ALIADO;
    a.idRed = e.nuevoId();
    return a;
  }

  recibirDano(a) {
    if (!a.active) return;
    a.vida--;
    if (a.vida <= 0) {
      this.bajas++;
      this.escena.puntaje.sumar(-PUNTOS.baja, a.x, a.y); // cada soldado que cae resta puntos
      this.escena.explosion(a.x, a.y, 0.35);
      this.escena.caidos.marcar('muerte_aliado', a.x, a.y);
      a.destroy();
    }
  }

  // El fuego les quita FUEGO_DANO_ALIADO vidas por segundo: cada vez que se acumula una vida entera pierden una
  quemar(a, dt) {
    a.quemadura = (a.quemadura ?? 0) + FUEGO_DANO_ALIADO * dt;
    a.setTint(0xff7a3a);
    if (a.quemadura < 1) return;
    a.quemadura -= 1;
    this.recibirDano(a);
  }

  // La torreta viva más cercana a un soldado, que es a donde marcha cuando avanza
  torretaCercana(a) {
    let mejor = null;
    let dmin = Infinity;
    for (const o of this.escena.objetivos) {
      if (!o.activo || !o.arma || o.y < 0) continue;
      const d = Phaser.Math.Distance.Between(a.x, a.y, o.x, o.y);
      if (d < dmin) {
        dmin = d;
        mejor = o;
      }
    }
    return mejor;
  }

  // A dónde mira y qué animación usa un soldado que camina hacia (angulo)
  direccion(angulo, velocidad) {
    const relX = Math.cos(angulo) * velocidad;
    const relY = Math.sin(angulo) * velocidad;
    if (Math.abs(relY) >= Math.abs(relX)) return { relX, relY, anim: relY < 0 ? 'aliado_arriba' : 'aliado_abajo', flip: false };
    return { relX, relY, anim: 'aliado_derecha', flip: relX < 0 };
  }

  actualizar(dt) {
    const e = this.escena;
    const vivos = e.aliados.getChildren();
    const limiteY = e.fase === 'avance' ? e.scale.height + 60 : e.scale.height + 220; // los refuerzos entran por abajo
    const base = e.baseObj?.activo ? e.baseObj : null;
    const asalto = e.fase === 'refuerzos' && base;

    // El objetivo de todos: la base (cuando llegan los refuerzos) o lo que Layla mandó atacar
    let meta = asalto ? base : null;
    if (!meta && this.orden.tipo === 'atacar') {
      meta = e.objetivos.find((o) => o.activo && o.id === this.orden.id) ?? null;
      if (!meta) this.orden = { tipo: 'avanzar', id: null }; // ya lo destruyeron
    }
    // Con el mapa frenado y la orden de avanzar, cada soldado marcha a la torreta que tenga más cerca
    const avanzaAlFrente = e.fase === 'avance' && this.orden.tipo === 'avanzar' && e.velTerreno < 5;

    [...vivos].forEach((a) => {
      if (a.y > limiteY) return a.destroy();
      if (a.vida < VIDA_ALIADO) a.setTint(0xff9a9a); // los heridos se ven rojizos hasta que se curan
      else a.clearTint();

      // Movimiento propio respecto al terreno, que ya se mueve a velTerreno
      let mov = { relX: 0, relY: -40, anim: 'aliado_arriba', flip: false }; // por defecto avanzan hacia el frente
      let quieto = false;
      const destino = meta ?? (avanzaAlFrente ? this.torretaCercana(a) : null);
      const frente = e.objetivos.find((o) => o.activo && o.arma && o.y > -20 && o.y < a.y && a.y - o.y < 200 && Math.abs(o.x - a.x) < 90);
      const botiquin = a.vida < VIDA_ALIADO ? e.botiquin.masCercano(a) : null;
      const enemigo = e.soldadosEnemigos.masCercano(a.x, a.y, 230); // un soldado enemigo a tiro

      if (botiquin) {
        mov = this.direccion(Phaser.Math.Angle.Between(a.x, a.y, botiquin.x, botiquin.y), 80);
        if (Phaser.Math.Distance.Between(a.x, a.y, botiquin.x, botiquin.y) < 28) e.botiquin.curarAliado(a, botiquin);
      } else if (enemigo) {
        // Los soldados enemigos son lo primero: se paran y les disparan hasta derrotarlos
        mov = { relX: 0, relY: 0, anim: enemigo.y < a.y ? 'aliado_dispara_arriba' : 'aliado_dispara_abajo', flip: false };
        e.soldadosEnemigos.danoSuave(enemigo, DANO_ALIADO_SOLDADO * dt);
      } else if (destino) {
        // Marchan al objetivo y al llegar disparan y lo van desgastando. A la base más despacio y a lo que Layla manda, más rápido
        if (Phaser.Math.Distance.Between(a.x, a.y, destino.x, destino.y) > 190) {
          mov = this.direccion(Phaser.Math.Angle.Between(a.x, a.y, destino.x, destino.y), 70);
        } else {
          mov = { relX: 0, relY: 0, anim: destino.y < a.y ? 'aliado_dispara_arriba' : 'aliado_dispara_abajo', flip: false };
          destino.danoSuave((destino.jefe ? 0.04 : destino === meta ? 0.15 : DANO_ALIADO_NIDO) * dt);
        }
      } else if (frente) {
        // Frente a un nido se detienen, disparan y lo desgastan (mis bombas lo destruyen mucho antes)
        mov = { relX: 0, relY: 0, anim: 'aliado_dispara_arriba', flip: false };
        frente.danoSuave(DANO_ALIADO_NIDO * dt);
      } else if (e.fase !== 'avance' || this.orden.tipo === 'mantener') {
        mov = { relX: 0, relY: 0, anim: 'aliado_arriba', flip: false };
        quieto = true;
      }

      // El fuego de la R: si estoy dentro, huyo y me quemo; si está adelante, no avanzo y espero a que lo apaguen
      const fuego = e.especial.fuegoCerca(a.x, a.y, FUEGO_RADIO + 14);
      if (fuego) {
        mov = this.direccion(Phaser.Math.Angle.Between(fuego.x, fuego.y, a.x, a.y), 110);
        quieto = false;
        this.quemar(a, dt);
      } else if (mov.relX || mov.relY) {
        const largo = Math.hypot(mov.relX, mov.relY);
        const adelante = e.especial.fuegoCerca(a.x + (mov.relX / largo) * FUEGO_BLOQUEO, a.y + (mov.relY / largo) * FUEGO_BLOQUEO, FUEGO_RADIO + 10);
        if (adelante && e.especial.fuegoBloqueante()) {
          // Un muro de fuego: se paran y esperan a que lo apaguen
          mov = { relX: 0, relY: 0, anim: 'aliado_arriba', flip: false };
          quieto = true;
        } else if (adelante) {
          // Un parche chico: lo rodean, girando el rumbo hacia el lado contrario al fuego
          const rumbo = Math.atan2(mov.relY, mov.relX);
          const lejos = Phaser.Math.Angle.Between(adelante.x, adelante.y, a.x, a.y);
          mov = this.direccion(Phaser.Math.Angle.RotateTo(rumbo, lejos, Math.PI / 2.5), largo);
        }
      }

      a.setVelocity(mov.relX, e.velTerreno + mov.relY);
      a.setFlipX(mov.flip);
      if (quieto) {
        a.anims.stop();
      } else {
        a.anims.play(mov.anim, true);
        alinearAliado(a, mov.anim); // evita el salto de posición al cambiar de animación
      }
    });
  }
}
