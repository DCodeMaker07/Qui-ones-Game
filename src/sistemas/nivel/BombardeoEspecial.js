import Phaser from 'phaser';
import { ambiente } from '../efectos/Ambiente.js';
import { playSfx } from '../audio/audio.js';
import { bombaCayendo } from '../efectos/bomba.js';
import {
  FUEGO_APILA_MAX, FUEGO_APILA_RADIO, FUEGO_DPS, FUEGO_RADIO, TECLAS, ULTI_CADA, ULTI_DANO_BOMBA, ULTI_DURACION, ULTI_ESPERA, ULTI_FACTOR_JEFE, ULTI_RADIO_BOMBA,
} from './constantes.js';

// Mi habilidad especial (tecla R): un bombardeo de fuego. Durante 1,5 s voy soltando bombas donde caerían las normales y
// "dibujo" la línea de fuego con mi vuelo. Cada bomba pega con su propio daño a lo que tenga cerca y además enciende un foco
// de fuego en el suelo.
//   - El fuego NO se apaga solo: se queda donde cayó hasta que lo apago con agua (F).
//   - Mientras haya fuego el mapa no avanza, porque mis soldados no pasan por las llamas y se queman si están dentro.
//   - Una torreta que toca el fuego se prende para siempre: su quemadura va haciendo más daño cada segundo (ver Objetivo.js).
//   - Si varias bombas caen en el mismo lugar el fuego se apila: llama más grande y humo.
export default class BombardeoEspecial {
  constructor(escena) {
    this.escena = escena;
    this.recarga = 0; // segundos que faltan para poder usarlo otra vez
    this.activa = false;
    this.t = 0;
    this.acumulado = 0;
    this.bombas = 0;
    this.fuegos = [];
    this.avisado = false; // si el aviso "el fuego bloquea a tus aliados" está en pantalla
    this.grafico = escena.add.graphics().setDepth(2); // sobre el terreno y debajo de soldados y aviones
  }

  hayFuego() {
    return this.fuegos.length > 0;
  }

  // El foco de fuego más cercano a (x, y) que esté a menos de "radio", o null
  fuegoCerca(x, y, radio) {
    let mejor = null;
    let dmin = radio;
    this.fuegos.forEach((f) => {
      const d = Phaser.Math.Distance.Between(x, y, f.x, f.y);
      if (d < dmin) {
        dmin = d;
        mejor = f;
      }
    });
    return mejor;
  }

  lanzar() {
    const e = this.escena;
    if (e.terminado || e.pausado || this.activa) return;
    if (this.recarga > 0) return e.radio.mostrar(`Bombardeo especial listo en ${Math.ceil(this.recarga)} s.`, { duracion: 1500 });
    this.recarga = ULTI_ESPERA;
    this.activa = true;
    this.t = 0;
    this.acumulado = 0;
    this.bombas = 0;
    ambiente.pulso('#ff7a1a', 1200, 2);
    playSfx(e, 'sfx_bomba');
    e.radio.mostrar('¡Bombardeo especial! Traza la línea de fuego con tu vuelo.', { duracion: 2500 });
  }

  actualizar(dt) {
    if (this.recarga > 0) this.recarga = Math.max(0, this.recarga - dt);
    if (this.activa) {
      this.t += dt;
      this.acumulado += dt;
      while (this.acumulado >= ULTI_CADA) {
        this.acumulado -= ULTI_CADA;
        this.soltarBomba();
      }
      if (this.t >= ULTI_DURACION) this.activa = false;
    }
    this.actualizarFuegos(dt);
  }

  // Es la misma bomba del juego: cae en 0,7 s y al tocar el suelo enciende el foco
  soltarBomba() {
    const j = this.escena.jugador;
    bombaCayendo(this.escena, j.x, j.y + 20, { alAterrizar: (x, y) => this.encender(x, y) });
  }

  encender(x, y) {
    const e = this.escena;
    // Si cae sobre otro foco (a menos de FUEGO_APILA_RADIO) el fuego se apila: este foco y los de al lado suben de nivel
    const vecinos = this.fuegos.filter((f) => Phaser.Math.Distance.Between(x, y, f.x, f.y) < FUEGO_APILA_RADIO);
    vecinos.forEach((f) => (f.nivel = Math.min(FUEGO_APILA_MAX, f.nivel + 1)));
    const foco = { x, y, semilla: Math.random() * 6, nivel: Math.min(FUEGO_APILA_MAX, 1 + vecinos.length) };
    if (e.textures.exists('llama')) {
      if (!e.anims.exists('llama')) e.anims.create({ key: 'llama', frames: e.anims.generateFrameNumbers('llama'), frameRate: 12, repeat: -1 });
      foco.sprite = e.add.sprite(x, y, 'llama').setOrigin(0.5, 1).setScale(0.4).setDepth(2.1);
      foco.sprite.play({ key: 'llama', startFrame: Phaser.Math.Between(0, e.anims.get('llama').frames.length - 1) });
    }
    this.fuegos.push(foco);
    if (this.fuegos.length > 200) this.fuegos.shift()?.sprite?.destroy(); // tope para no llenar la memoria
    if (++this.bombas % 3 === 0) e.explosion(x, y, 0.5); // no una explosión por bomba, si no suena todo junto
    this.danar(x, y);
  }

  // El daño propio de cada bomba: se suma bomba a bomba mientras el avión pasa por encima
  danar(x, y) {
    this.escena.objetivos.forEach((o) => {
      if (!o.activo || o.y < 0) return;
      if (Phaser.Math.Distance.Between(x, y, o.x, o.y) < ULTI_RADIO_BOMBA + o.radio * 0.6) o.recibirDano(o.jefe ? ULTI_DANO_BOMBA * ULTI_FACTOR_JEFE : ULTI_DANO_BOMBA);
    });
  }

  // El agua (F) cae en (x, y) y apaga todos los focos que estén dentro del radio. Salpica y sale vapor de cada foco apagado
  apagar(x, y, radio) {
    const e = this.escena;
    const apagados = this.fuegos.filter((f) => Phaser.Math.Distance.Between(x, y, f.x, f.y) < radio);
    this.fuegos = this.fuegos.filter((f) => !apagados.includes(f));
    apagados.forEach((f) => f.sprite?.destroy());

    const anillo = e.add.circle(x, y, radio, 0x4aa8ff, 0.25).setStrokeStyle(3, 0x9fd4ff, 0.9).setDepth(6).setScale(0.2);
    e.tweens.add({ targets: anillo, scale: 1, alpha: 0, duration: 650, ease: 'Cubic.easeOut', onComplete: () => anillo.destroy() });
    for (let i = 0; i < 12; i++) {
      const gota = e.add.circle(x, y, Phaser.Math.Between(3, 6), 0x7cc4ff, 0.9).setDepth(6);
      const ang = (i / 12) * Math.PI * 2;
      e.tweens.add({ targets: gota, x: x + Math.cos(ang) * radio * 0.9, y: y + Math.sin(ang) * radio * 0.9, alpha: 0, duration: 550, ease: 'Quad.easeOut', onComplete: () => gota.destroy() });
    }
    apagados.slice(0, 14).forEach((f) => {
      const vapor = e.add.circle(f.x, f.y, 10, 0xeef6ff, 0.6).setDepth(6);
      e.tweens.add({ targets: vapor, y: f.y - 60, scale: 2.6, alpha: 0, duration: 900, onComplete: () => vapor.destroy() });
    });
    if (apagados.length && !this.fuegos.length) e.radio.mostrar('Fuego apagado: tus aliados pueden avanzar.', { duracion: 3000 });
  }

  // El aviso grande de arriba: se muestra mientras quede fuego y se quita cuando se apaga todo
  actualizarAviso() {
    const hay = this.hayFuego();
    if (hay === this.avisado) return;
    this.avisado = hay;
    if (hay) this.escena.hud.mostrarAviso('fuego', `EL FUEGO BLOQUEA A TUS ALIADOS\nAPÁGALO CON AGUA (${TECLAS.agua})`, '#ff9a4a');
    else this.escena.hud.quitarAviso('fuego');
  }

  // El fuego baja con el terreno (cuando el mapa se mueve) y se dibuja. Si no tengo la hoja de llama lo dibujo con triángulos
  actualizarFuegos(dt) {
    const e = this.escena;
    const g = this.grafico.clear();
    const { height } = e.scale;
    this.fuegos = this.fuegos.filter((f) => {
      if (f.y <= height + 80) return true;
      f.sprite?.destroy();
      return false; // se salió de la pantalla por abajo
    });
    this.actualizarAviso();
    if (!this.fuegos.length) return;

    const segundos = e.time.now / 1000;
    this.fuegos.forEach((f) => {
      f.y += e.velTerreno * dt;
      const tamano = 1 + 0.3 * (f.nivel - 1); // cada bomba apilada agranda la llama un 30 %
      g.fillStyle(0x8a2a08, 0.35).fillCircle(f.x, f.y, 30 * tamano); // las brasas
      f.sprite?.setPosition(f.x, f.y).setScale(0.4 * tamano);
      if (f.nivel >= 2) this.dibujarHumo(g, f, tamano, segundos);
      if (f.sprite) return;
      for (let k = 0; k < 3; k++) {
        const fase = segundos * 7 + f.semilla + k * 2.1;
        const dx = Math.sin(fase * 1.3) * 10 * tamano;
        const alto = (16 + 12 * Math.abs(Math.sin(fase))) * tamano;
        g.fillStyle(k === 1 ? 0xffd35a : 0xff7a1a, 0.85).fillTriangle(f.x + dx - 7 * tamano, f.y + 6, f.x + dx + 7 * tamano, f.y + 6, f.x + dx * 0.4, f.y - alto);
      }
    });
    // Una torreta que toca el fuego se prende para siempre. El depósito y la base no se prenden: el fuego solo los desgasta
    e.objetivos.forEach((o) => {
      if (!o.activo || o.y < 0) return;
      const tocado = this.fuegos.some((f) => Phaser.Math.Distance.Between(f.x, f.y, o.x, o.y) < FUEGO_RADIO + o.radio * 0.3);
      if (!tocado) return;
      if (o.arma) o.incendiar();
      else o.danoSuave(FUEGO_DPS * ULTI_FACTOR_JEFE * dt);
    });
  }

  // El humo de un foco apilado: una columna de bocanadas oscuras que suben y se abren. Mientras más nivel, más bocanadas
  dibujarHumo(g, f, tamano, segundos) {
    const bocanadas = f.nivel * 2;
    for (let k = 0; k < bocanadas; k++) {
      const ciclo = (segundos * 0.55 + k / bocanadas + f.semilla) % 1; // 0: nace en la llama, 1: se disipa arriba
      const x = f.x + Math.sin(segundos * 1.3 + k * 2.1 + f.semilla) * (8 + 10 * ciclo) * tamano;
      const y = f.y - 26 * tamano - ciclo * 90 * tamano;
      g.fillStyle(0x1f1f1f, 0.45 * (1 - ciclo)).fillCircle(x, y, (6 + ciclo * 16) * tamano);
    }
  }
}
