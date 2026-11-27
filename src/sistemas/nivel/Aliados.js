import Phaser from 'phaser';
import { alinearAliado, ESCALA } from '../../config.js';
import { DISTANCIA_ASALTO_BASE, REFUERZOS_VOZ, TURBO, MARGEN_BORRADO, PUNTOS, DANO_ALIADO_NIDO, DANO_ALIADO_SOLDADO, FUEGO_BLOQUEO, FUEGO_DANO_ALIADO, FUEGO_RADIO, VIDA_ALIADO } from './constantes.js';

// Mis soldados aliados. Llegan en escuadras de 3 por abajo cuando el mapa se frena ante las torretas y marchan a atacarlas.
// Los heridos buscan un botiquín. El fuego grande de la R los detiene y el chico lo rodean. Layla les puede dar órdenes (avanzar, mantener, atacar un objetivo).
export default class Aliados {
  constructor(escena) {
    this.escena = escena;
    this.orden = { tipo: 'avanzar', id: null };
    this.bajas = 0; // cuántos soldados perdí (cada baja resta puntos)
    this.turboHasta = 0; // hasta cuándo avanzan más rápido (orden por voz)
    this.turboLibre = 0; // desde cuándo se puede repetir esa orden
    this.refuerzosUsados = 0;
    this.refuerzoLibre = 0;
  }

  // "Layla, que avancen más rápido los soldados": durante TURBO.duracion segundos todos corren (TURBO.factor veces más rápido). Devuelve lo que
  // Layla le contesta al jugador
  acelerar() {
    const e = this.escena;
    if (e.terminado) return null;
    const espera = (this.turboLibre - e.time.now) / 1000;
    if (espera > 0) return `Los soldados todavía están recuperando el aliento: ${Math.ceil(espera)} s.`;
    if (!e.aliados.countActive(true)) return 'No hay soldados en el campo.';
    this.turboHasta = e.time.now + TURBO.duracion * 1000;
    this.turboLibre = e.time.now + TURBO.espera * 1000;
    return `Los soldados avanzan más rápido durante ${TURBO.duracion} segundos.`;
  }

  factorVelocidad() {
    return this.escena.time.now < this.turboHasta ? TURBO.factor : 1;
  }

  // "Layla, trae refuerzos": entran (por abajo en el avance y por los costados con la base a la vista) REFUERZOS_VOZ.escuadras escuadras de 3 soldados, una tras otra, con un máximo de aliados en el campo,
  // una espera entre pedidos y un número de pedidos por nivel. Devuelve lo que Layla le contesta al jugador
  traerRefuerzos() {
    const e = this.escena;
    if (e.terminado) return null;
    if (this.refuerzosUsados >= REFUERZOS_VOZ.usos) return 'No me quedan refuerzos para este nivel.';
    const espera = (this.refuerzoLibre - e.time.now) / 1000;
    if (espera > 0) return `Los refuerzos todavía se están organizando: ${Math.ceil(espera)} s.`;
    if (e.aliados.countActive(true) >= REFUERZOS_VOZ.max) return 'Ya hay muchos soldados en el campo.';
    this.refuerzosUsados++;
    this.refuerzoLibre = e.time.now + REFUERZOS_VOZ.espera * 1000;
    for (let i = 0; i < REFUERZOS_VOZ.escuadras; i++) {
      e.time.delayedCall(i * 1800, () => !e.terminado && this.entrarEscuadra(e.fase === 'avance' ? 'abajo' : i % 2 ? 1 : -1)); // por abajo en el avance; por cada costado con la base a la vista
    }
    return 'Recibido. Refuerzos en camino.';
  }

  // Cuándo se esconden y dónde. Con barreras en el mapa, lo primero que hace un soldado es ir a cubrirse detrás de la más cercana, aunque no haya
  // peligro, y quedarse ahí unos segundos; en cuanto llega, se acuerda de todas las barreras que había (las "visitadas") y sigue con lo suyo.
  // Una barrera nueva lo vuelve a mandar a cubrirse. Mientras haya peligro (un soldado enemigo a tiro, una torreta con alcance o balas cerca)
  // se queda detrás de la barrera que tenga a menos de 240 px. Devuelve el lugar detrás de la barrera, o null si no tiene que cubrirse
  cubierta(a, enemigo) {
    const e = this.escena;
    if (!e.barreras.lista.length) return null;
    const cerca = (o) => Phaser.Math.Distance.Between(a.x, a.y, o.x, o.y);
    const torreta = e.objetivos.find((o) => o.activo && o.arma && o.y > 0 && cerca(o) < 330);
    const hayPeligro = !!enemigo || !!torreta || e.balasTierra.getChildren().some((b) => b.active && cerca(b) < 150);
    const amenaza = enemigo ?? torreta ?? null; // para esconderse del lado contrario (con las barreras giradas el "atrás" cambia)
    const enEspera = e.time.now < (a.cubiertoHasta ?? 0); // todavía se está un rato detrás de la barrera
    const sinVisitar = e.barreras.lista.some((b) => b.active && !a.visitadas?.has(b.idRed)); // hay una barrera a la que todavía no fue
    if (hayPeligro) return e.barreras.cubiertaPara(a, 240, amenaza);
    return enEspera || sinVisitar ? e.barreras.cubiertaPara(a, 600, amenaza) : null;
  }

  // Al llegar detrás de una barrera: se queda unos segundos y da por visitadas todas las que había
  llegoACubierta(a) {
    const e = this.escena;
    a.visitadas = new Set(e.barreras.lista.map((b) => b.idRed));
    if (e.time.now >= (a.cubiertoHasta ?? 0)) a.cubiertoHasta = e.time.now + 3500;
  }

  crearEscuadra() {
    const e = this.escena;
    if (e.terminado || e.fase !== 'avance' || e.velTerreno > 5) return;
    if (e.aliados.countActive(true) >= 9) return;
    this.entrarEscuadra();
  }

  // De dónde entran mis soldados. Durante el avance (los tres niveles) entran por abajo, como siempre. Cuando llegué a la base final del Nivel 2
  // o del 3, entran por los costados de la pantalla, donde hay más espacio. En los dos casos elijo un lugar donde no haya barreras ni
  // torretas en el camino de entrada (si no encuentro uno libre, uso uno al azar). lado es 'abajo', -1 (izquierda) o 1 (derecha)
  puntoDeEntrada(lado) {
    const e = this.escena;
    const { width, height } = e.scale;
    if (lado === 'abajo') {
      let x = Phaser.Math.Between(110, width - 110);
      for (let intento = 0; intento < 12; intento++) {
        const candidato = Phaser.Math.Between(110, width - 110);
        if ([60, 170, 280].every((subida) => !e.obstaculos.choca(candidato, (e.sueloAvion ?? height) - subida + 60))) {
          x = candidato;
          break;
        }
      }
      return { x, y: height + 180 };
    }
    const yMax = Math.max(420, (e.sueloAvion ?? 560) - 30);
    let y = Phaser.Math.Between(340, yMax);
    for (let intento = 0; intento < 10; intento++) {
      const candidato = Phaser.Math.Between(340, yMax);
      if ([60, 150, 240].every((paso) => !e.obstaculos.choca(lado < 0 ? paso : width - paso, candidato))) {
        y = candidato;
        break;
      }
    }
    return { x: lado < 0 ? -90 : width + 90, y };
  }

  // Una escuadra de 3 que entra al campo. Por abajo (el avance) sube con el terreno; por un costado (la base final) camina hacia adentro hasta
  // estar en pantalla. Si no se dice el lado, depende de la fase: abajo durante el avance y un costado al azar con la base a la vista
  entrarEscuadra(lado = this.escena.fase === 'avance' ? 'abajo' : Phaser.Math.RND.pick([-1, 1])) {
    const { x, y } = this.puntoDeEntrada(lado);
    const formacion = lado === 'abajo' ? [[-36, 0], [0, 12], [36, 0]] : [[0, -34], [lado * 34, 0], [0, 34]];
    formacion.forEach(([dx, dy]) => {
      const a = this.crear(x + dx, y + dy);
      if (lado !== 'abajo') a.entrando = lado;
    });
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
  // Para que se note que caminan en diagonal (noreste, noroeste, sureste y suroeste) inclino el dibujo hacia donde van: uso el de arriba,
  // abajo o de lado según el rumbo dominante y lo giro hasta 40° hacia el otro eje. Siempre miro el rumbo respecto al terreno, que es
  // hacia donde caminan. Cuando disparan o se quedan quietos vuelven a estar derechos
  inclinar(a, mov, quieto, dt) {
    let objetivo = 0;
    if (!quieto && (mov.relX || mov.relY)) {
      const { relX: x, relY: y } = mov;
      let radianes = 0;
      if (mov.anim === 'aliado_arriba') radianes = Math.atan2(x, -y); // hacia la derecha (noreste) gira a la derecha
      else if (mov.anim === 'aliado_abajo') radianes = -Math.atan2(x, y); // hacia la derecha (sureste) gira a la izquierda
      else if (mov.anim === 'aliado_derecha') radianes = Math.sign(x) * Math.atan2(y, Math.abs(x)); // de lado, gira hacia arriba o abajo
      objetivo = Phaser.Math.Clamp(Phaser.Math.RadToDeg(radianes), -40, 40);
    }
    a.setAngle(a.angle + (objetivo - a.angle) * Math.min(1, dt * 12)); // el giro es suave, para que no tiemblen al cambiar de rumbo
  }

  direccion(angulo, velocidad) {
    const relX = Math.cos(angulo) * velocidad;
    const relY = Math.sin(angulo) * velocidad;
    if (Math.abs(relY) >= Math.abs(relX)) return { relX, relY, anim: relY < 0 ? 'aliado_arriba' : 'aliado_abajo', flip: false };
    return { relX, relY, anim: 'aliado_derecha', flip: relX < 0 };
  }

  actualizar(dt) {
    const e = this.escena;
    const vivos = e.aliados.getChildren();
    const { width } = e.scale;
    const limiteY = e.fase === 'avance' ? e.scale.height + MARGEN_BORRADO : e.scale.height + 400; // los refuerzos entran por abajo
    const base = e.baseObj?.activo ? e.baseObj : null;
    const asalto = e.fase === 'refuerzos' && base;

    // El objetivo de todos: la base (cuando llegan los refuerzos) o lo que Layla mandó atacar
    let meta = asalto ? base : null;
    if (!meta && this.orden.tipo === 'atacar') {
      meta = e.objetivos.find((o) => o.activo && o.id === this.orden.id) ?? null;
      if (!meta) this.orden = { tipo: 'avanzar', id: null }; // ya lo destruyeron
    }
    // Las marcas de Layla (multijugador): una orden de atacar manda sobre todo; si no, hacen caso a lo último que ella marcó. Si marcó "bombardear"
    // sobre una torreta o la base, la atacan; si la marcó en el suelo, van hasta ahí y combaten; con "aliados aquí" se reúnen en el punto
    let marca = null;
    if (!meta && e.multijugador?.hayLayla()) {
      marca = [e.multijugador.ultimaMarca('bomba'), e.multijugador.ultimaMarca('aliados')].filter(Boolean).sort((p, q) => q.id - p.id)[0] ?? null;
      if (marca?.tipo === 'bomba') {
        const objetivoMarcado = e.objetivos.find((o) => o.activo && Phaser.Math.Distance.Between(o.x, o.y, marca.x, marca.y) < 140);
        if (objetivoMarcado) {
          meta = objetivoMarcado;
          marca = null;
        }
      }
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
      // Un punto del suelo como destino (la marca de Layla): cada soldado se para en un lugar distinto alrededor para no amontonarse
      a.puesto ??= { x: Phaser.Math.Between(-55, 55), y: Phaser.Math.Between(-40, 40) };
      const puntoMarca = marca && { x: marca.x + a.puesto.x, y: marca.y + a.puesto.y, llegada: 40, esPunto: true, jefe: false, danoSuave() {} };
      const destino = meta ?? puntoMarca ?? (avanzaAlFrente ? this.torretaCercana(a) : null);
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
        // Marchan al objetivo y al llegar disparan y lo van desgastando. A la base más despacio y a lo que Layla manda, más rápido. A la base
        // marchan hacia el punto más cercano de su borde y atacan al estar a DISTANCIA_ASALTO_BASE de él (no del centro): se paran afuera y no
        // se meten adentro
        const lejos = destino.jefe ? destino.distanciaAlBorde(a.x, a.y) > DISTANCIA_ASALTO_BASE : Phaser.Math.Distance.Between(a.x, a.y, destino.x, destino.y) > (destino.llegada ?? 190);
        if (lejos) {
          const punto = destino.jefe ? destino.puntoMasCercano(a.x, a.y) : destino;
          mov = this.direccion(Phaser.Math.Angle.Between(a.x, a.y, punto.x, punto.y), 70);
        } else if (destino.esPunto) {
          mov = { relX: 0, relY: 0, anim: 'aliado_arriba', flip: false }; // llegó a la marca: se queda ahí (y el de arriba les dispara a los enemigos que se acerquen)
          quieto = true;
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

      // Con peligro cerca y una barrera a mano, se esconden detrás de ella (y desde ahí le siguen disparando al enemigo que tengan a tiro)
      const cubierta = botiquin ? null : this.cubierta(a, enemigo);
      if (cubierta) {
        const lejos = Phaser.Math.Distance.Between(a.x, a.y, cubierta.x, cubierta.y);
        if (lejos <= 8) this.llegoACubierta(a);
        mov = lejos > 8 ? this.direccion(Phaser.Math.Angle.Between(a.x, a.y, cubierta.x, cubierta.y), 75) : { relX: 0, relY: 0, anim: 'aliado_dispara_arriba', flip: false };
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

      // Los que acaban de entrar por un costado caminan hacia adentro hasta estar en pantalla, sin hacer otra cosa
      if (a.entrando) {
        if (a.entrando < 0 ? a.x > 80 : a.x < width - 80) a.entrando = null;
        else {
          mov = this.direccion(a.entrando < 0 ? 0 : Math.PI, 95);
          quieto = false;
        }
      }

      // Los obstáculos del mapa (barreras, torretas y la base) no se atraviesan: los rodean. El objetivo al que se acercan a propósito no cuenta.
      // Si un obstáculo apareció justo encima del soldado (por ejemplo una barrera nueva), sale de él
      const ignorar = [destino, frente, meta].filter((o) => o && !o.jefe); // la base sí es un obstáculo: no se la pisa aunque sea el objetivo
      const atrapado = e.obstaculos.salida(a.x, a.y, ignorar);
      if (atrapado !== null) {
        mov = this.direccion(atrapado, 70);
        quieto = false;
      } else if ((mov.relX || mov.relY) && !fuego) {
        const velocidad = Math.hypot(mov.relX, mov.relY);
        const rumbo = Math.atan2(mov.relY, mov.relX);
        const libre = e.obstaculos.desviar(a.x, a.y, rumbo, ignorar, a.giro ?? 1);
        if (libre === null) {
          mov = { relX: 0, relY: 0, anim: 'aliado_arriba', flip: false }; // sin salida, se quedan esperando
          quieto = true;
        } else if (libre !== rumbo) {
          a.giro = Math.sign(Phaser.Math.Angle.ShortestBetween(Phaser.Math.RadToDeg(rumbo), Phaser.Math.RadToDeg(libre))) || 1; // siguen por el mismo lado
          mov = this.direccion(libre, velocidad);
        }
      }

      // La orden "que avancen más rápido": corren (se mueven y mueven las piernas más rápido)
      const factor = this.factorVelocidad();
      mov = { ...mov, relX: mov.relX * factor, relY: mov.relY * factor };
      a.anims.timeScale = factor > 1 ? 1.7 : 1;

      a.setVelocity(mov.relX, e.velTerreno + mov.relY);
      a.setFlipX(mov.flip);
      this.inclinar(a, mov, quieto, dt);
      if (quieto) {
        a.anims.stop();
      } else {
        a.anims.play(mov.anim, true);
        alinearAliado(a, mov.anim); // evita el salto de posición al cambiar de animación
      }
    });
  }
}
