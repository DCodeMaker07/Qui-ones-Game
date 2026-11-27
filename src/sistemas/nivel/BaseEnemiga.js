import Phaser from 'phaser';
import { ESCALA, GAME } from '../../config.js';
import Objetivo from '../../entidades/Objetivo.js';
import { ambiente } from '../efectos/Ambiente.js';
import { MAX_SOLDADOS_ENEMIGOS, OLEADA_BASE, ESPERA_PRIMERA_OLEADA, PX_POR_KM, TECLAS, nombreTecla } from './constantes.js';

// La base enemiga de los niveles 2 y 3. Aparece cuando recorrí cierta distancia, el terreno se frena cuando queda en el centro,
// la base suelta oleadas de soldados, los aviones entran por arriba y los costados y yo pido refuerzos por radio (o llegan solos si no puedo hablar).
export default class BaseEnemiga {
  constructor(escena) {
    this.escena = escena;
    this.frenando = false;
    this.intentosRefuerzos = 0;
    if (escena.cfg.baseFija) {
      // La base se detiene al 46 % de la altura. Guardo la distancia total para el indicador de kilómetros
      this.metaY = escena.scale.height * 0.46;
      this.distanciaTotal = this.distanciaPx();
    }
  }

  // Píxeles de terreno que le faltan a la base para llegar al centro de la pantalla
  distanciaPx() {
    const e = this.escena;
    if (e.baseObj?.activo) return Math.max(0, this.metaY - e.baseObj.y);
    // Si todavía no apareció, su posición "virtual" está más arriba mientras más falte
    const falta = Math.max(0, e.cfg.jefeEn - e.avance.tNivel);
    return this.metaY - e.baseY0 + falta * GAME.scrollSpeed;
  }

  // El texto y el progreso (0 a 1) que muestra el HUD arriba, al centro
  estadoDistancia() {
    const e = this.escena;
    if (e.fase !== 'avance') return { texto: 'BASE ENEMIGA: EN POSICIÓN', progreso: 1 };
    const d = this.distanciaPx();
    return { texto: `BASE ENEMIGA A ${(d / PX_POR_KM).toFixed(1)} km`, progreso: 1 - Math.min(1, d / this.distanciaTotal) };
  }

  crearDeposito() {
    const e = this.escena;
    if (e.terminado || e.depositoCreado) return;
    e.depositoCreado = true;
    const cfg = e.cfg;
    // Si existe el sprite propio de la base lo uso; si no, el depósito agrandado
    const propia = !!cfg.spriteBase && e.textures.exists(cfg.spriteBase);
    e.baseObj = new Objetivo(e, e.scale.width / 2, e.baseY0, {
      base: propia ? cfg.spriteBase : 'deposito',
      arma: null,
      vida: cfg.vidaBase ?? 9,
      jefe: true,
      radio: propia ? cfg.radioSpriteBase ?? 110 : 68 * (cfg.escalaBase ?? 1),
      escala: propia ? cfg.escalaSpriteBase ?? 1 : ESCALA.deposito * (cfg.escalaBase ?? 1),
      vidaMinima: cfg.baseVidaMinima ? (cfg.vidaBase ?? 9) * cfg.baseVidaMinima : 0,
    });
    e.objetivos.push(e.baseObj);
    e.radio.mostrar('Base enemiga a la vista.');
  }

  actualizar(dt) {
    const e = this.escena;
    // La base aparece cuando recorrí la distancia del nivel
    // Y espera a que no quede ninguna torreta viva: si saliera con torretas en pantalla, la base les pasaría por encima y quedarían superpuestas
    if (e.cfg.jefeEn && !e.depositoCreado && e.avance.tNivel >= e.cfg.jefeEn && !e.objetivos.some((o) => o.activo && o.arma)) this.crearDeposito();
    this.frenarTerreno(dt);
  }

  frenarTerreno(dt) {
    const e = this.escena;
    if (this.frenando) {
      // El terreno se detiene en 0,8 s: la base recorre unos 48 px más y queda en el centro
      e.velTerreno = Math.max(0, e.velTerreno - (GAME.scrollSpeed / 0.8) * dt);
      if (e.velTerreno === 0) {
        this.frenando = false;
        this.iniciarAsedio();
      }
    } else if (e.cfg.baseFija && e.fase === 'avance' && e.baseObj?.activo && e.baseObj.y >= e.scale.height * 0.46 - 48) {
      this.frenando = true;
      e.radio.mostrar('Esa es la base. Mantén la posición.', { duracion: 3000 });
    }
  }

  iniciarAsedio() {
    const e = this.escena;
    const b = e.baseObj;
    e.fase = 'base';
    e.soldadosEnemigos.guarnicion(b.x, b.y, 5, Math.max(120, b.radio * 1.1)); // la guarnición de la base

    // La base ya no tiene torretas alrededor: en cambio suelta oleadas de soldados enemigos (ver salirOleada)
    this.programarOleada(OLEADA_BASE.primera * 1000);
    e.aviones.espera = ESPERA_PRIMERA_OLEADA; // los aviones de la base también salen en oleadas (ver Enemigos)
    e.puntoDeControl.guardar(); // llegué a la base: este es el punto de control

    e.radio.mostrar(`Encontraste la base. Pulsa ${nombreTecla(TECLAS.radio)} y pide refuerzos: "Encontré la ubicación, necesito refuerzos".`, { duracion: 9000 });
    e.hud.mostrarAviso('refuerzos', `PULSA ${nombreTecla(TECLAS.radio)} Y DI:\n"ENCONTRÉ LA UBICACIÓN, NECESITO REFUERZOS"`);
    // Sin micrófono no puedo pedirlos por voz: llegan solos
    if (!e.game.voice?.soportado) e.time.delayedCall(8000, () => this.llamarRefuerzos(true));
  }

  // Programa la próxima oleada de soldados que sale de la base, y cuando sale vuelve a programar la siguiente (mientras la base siga en pie)
  programarOleada(ms) {
    const e = this.escena;
    e.time.delayedCall(ms, () => {
      if (e.terminado || !e.baseObj?.activo) return;
      this.salirOleada();
      this.programarOleada(Phaser.Math.Between(...OLEADA_BASE.cada) * 1000);
    });
  }

  // Una oleada: de 4 a 6 soldados enemigos aparecen dentro de la base, en su mitad de abajo, de a uno y con un fundido, y salen a buscar a
  // mis soldados (la base no los bloquea: solo las barreras). Si ya hay demasiados soldados enemigos en pantalla, se salta la oleada
  salirOleada() {
    const e = this.escena;
    const b = e.baseObj;
    if (e.soldadosEnemigos.lista.length >= MAX_SOLDADOS_ENEMIGOS) return;
    const caja = b.base.getBounds();
    const cuantos = Phaser.Math.Between(...OLEADA_BASE.soldados);
    for (let i = 0; i < cuantos; i++) {
      e.time.delayedCall(i * 450, () => {
        if (e.terminado || !b.activo) return;
        const s = e.soldadosEnemigos.crear(caja.centerX + Phaser.Math.Between(-caja.width * 0.3, caja.width * 0.3), caja.centerY + Phaser.Math.Between(0, caja.height * 0.3));
        s.setAlpha(0);
        e.tweens.add({ targets: s, alpha: 1, duration: 300 });
      });
    }
    if (!this.oleadaAvisada) {
      this.oleadaAvisada = true;
      e.radio.mostrar('Layla: ¡Salen soldados de la base! Prepárense.', { duracion: 4000 });
    }
  }

  refuerzoNoEntendido() {
    this.intentosRefuerzos++;
    if (this.intentosRefuerzos >= 3) return this.llamarRefuerzos(true); // para no dejar la partida atascada
    this.escena.radio.mostrar('No te entendí. Di: "Encontré la ubicación, necesito refuerzos".', { duracion: 4500 });
  }

  llamarRefuerzos(auto = false) {
    const e = this.escena;
    if (e.fase !== 'base' || e.terminado) return;
    e.fase = 'refuerzos';
    e.hud.quitarAviso('refuerzos');
    const mensaje = auto ? 'Envío refuerzos de todos modos.' : 'Recibido. Refuerzos en camino.';
    ambiente.pulso('#3ddc84', 900, 2);
    e.radio.mostrar(mensaje, { duracion: 4000 });
    e.game.voice?.hablar(mensaje, undefined, 'M'); // Layla siempre responde con voz de mujer

    // Tres escuadras entran por los costados, una tras otra (izquierda, derecha, izquierda)
    [[1500, -1], [5000, 1], [8500, -1]].forEach(([ms, lado]) => {
      e.time.delayedCall(ms, () => {
        if (e.terminado) return;
        e.soldados.entrarEscuadra(lado);
      });
    });
  }
}
