import Phaser from 'phaser';
import { ESCALA, GAME } from '../../config.js';
import Objetivo from '../../entidades/Objetivo.js';
import { ambiente } from '../efectos/Ambiente.js';
import { PX_POR_KM, TECLAS } from './constantes.js';

// La base enemiga de los niveles 2 y 3. Aparece cuando recorrí cierta distancia, el terreno se frena cuando queda en el centro,
// se arman las defensas, los aviones salen de ella y yo pido refuerzos por radio (o llegan solos si no puedo hablar).
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
    if (e.cfg.jefeEn && !e.depositoCreado && e.avance.tNivel >= e.cfg.jefeEn) this.crearDeposito();
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

    // Las defensas fijas rodean la base
    (e.cfg.defensas ?? [[-300, -50], [300, -50], [-330, 110], [330, 110]]).forEach(([dx, dy]) => this.crearNidoFijo(b.x + dx, b.y + dy));
    // Y los aviones salen de la base cada tanto
    e.time.addEvent({ delay: 2400, loop: true, callback: () => e.aviones.salirDeBase() });
    e.aviones.salirDeBase();

    e.radio.mostrar(`Encontraste la base. Pulsa ${TECLAS.radio} y pide refuerzos: "Encontré la ubicación, necesito refuerzos".`, { duracion: 9000 });
    e.hud.mostrarAviso('refuerzos', `PULSA ${TECLAS.radio} Y DI:\n"ENCONTRÉ LA UBICACIÓN, NECESITO REFUERZOS"`);
    // Sin micrófono no puedo pedirlos por voz: llegan solos
    if (!e.game.voice?.soportado) e.time.delayedCall(8000, () => this.llamarRefuerzos(true));
  }

  crearNidoFijo(x, y) {
    const e = this.escena;
    e.objetivos.push(new Objetivo(e, x, y, { vida: 3, radio: 34, escala: ESCALA.nido }));
    e.soldadosEnemigos.guarnicion(x, y, 1, 50);
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

    // Tres escuadras entran por abajo, una tras otra
    const { width, height } = e.scale;
    [[1500, 0.3], [5000, 0.7], [8500, 0.5]].forEach(([ms, f]) => {
      e.time.delayedCall(ms, () => {
        if (e.terminado) return;
        [[-36, 0], [0, 45], [36, 0]].forEach(([dx, dy]) => e.soldados.crear(width * f + dx, height + 30 + dy));
      });
    });
  }
}
