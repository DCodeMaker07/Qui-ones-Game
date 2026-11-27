import Phaser from 'phaser';
import { ambiente } from '../efectos/Ambiente.js';
import { playSfx } from '../audio/audio.js';
import { crearBaseEnLlamas } from '../efectos/BaseEnLlamas.js';
import { CAPA, TXT, estiloHud } from '../../ui/tema.js';
import { PUNTAJE_FINAL_BUENO, PUNTOS, nombreTecla } from './constantes.js';

// El final del Nivel 3. La base no se destruye con bombas: se queda al 25 % de su vida y ahí aparece el aviso para lanzarme en
// picada con ENTER. La picada es una escena automática: el avión gira hacia la base, cae achicándose, estalla, y la base queda
// calcinada y en llamas durante 5 s antes de pasar al final. Si el puntaje es alto se ve el final alternativo (Quiñones sobrevive).
export default class Picada {
  constructor(escena) {
    this.escena = escena;
    this.lista = false; // la base ya está lo bastante débil
    this.activa = false; // la picada está en marcha
    this.bloqueadaHasta = 0;
  }

  // Cuando miro el nivel cada fotograma, reviso si la base ya llegó a su vida mínima
  vigilar() {
    const e = this.escena;
    const b = e.baseObj;
    if (e.cfg.baseVidaMinima && !this.lista && b?.activo && b.vida <= b.vidaMinima + 0.01) this.habilitar();
  }

  // El ENTER con el que elegí "Continuar" en la pausa no debe lanzar la picada
  bloquearEnter(ms) {
    this.bloqueadaHasta = performance.now() + ms;
  }

  habilitar() {
    const e = this.escena;
    this.lista = true;
    ambiente.pulso('#ff7a1a', 1500, 2);
    const mensaje = '¡La base está cediendo! Es tu momento, Quiñones.';
    e.radio.mostrar(mensaje, { duracion: 5500 });
    if (!e.multijugador.hayLayla()) e.game.voice?.hablar(mensaje, undefined, 'M');
    e.hud.mostrarAviso('picada', `BASE DEBILITADA\nPULSA ${nombreTecla('ENTER')} PARA LANZARTE EN PICADA`, TXT.rojo);
    e.multijugador.avisar('picadaLista');
  }

  iniciar() {
    const e = this.escena;
    if (!this.lista || e.terminado || e.pausado || this.activa || performance.now() < this.bloqueadaHasta) return;
    this.activa = true;
    e.puntoDeControl.borrar();
    e.puntaje.sumar(PUNTOS.base); // la base cae con la picada
    e.puntaje.bonoDeNivel();
    e.terminado = true; // congela spawns, daño y controles
    e.physics.pause();
    e.hud.quitarAviso('picada');
    e.multijugador.avisar('picada');
    ambiente.pulso('#ff2a2a', 1800, 2);
    playSfx(e, 'sfx_bomba');

    const j = e.jugador;
    const b = e.baseObj;
    j.setVelocity(0, 0);
    e.guiaBomba.fijarEnBase();
    e.cameras.main.shake(2600, 0.004);
    const angulo = Phaser.Math.Angle.Between(j.x, j.y, b.x, b.y);
    e.tweens.add({ targets: j, rotation: angulo + Math.PI / 2, duration: 450, ease: 'Sine.easeInOut' });
    e.tweens.add({ targets: j, x: b.x, y: b.y, scale: 0.35, duration: 2400, delay: 450, ease: 'Quad.easeIn', onComplete: () => this.impacto() });
    // Va dejando humo mientras cae
    e.time.addEvent({
      delay: 45, repeat: 60,
      callback: () => {
        const humo = e.add.circle(j.x, j.y, 7 * j.scale + 3, Phaser.Math.RND.pick([0xffd35a, 0xff7a1a, 0x555555]), 0.7).setDepth(4.5);
        e.tweens.add({ targets: humo, alpha: 0, scale: 2.2, duration: 700, onComplete: () => humo.destroy() });
      },
    });
  }

  impacto() {
    const e = this.escena;
    const b = e.baseObj;
    const { x, y } = b;
    e.jugador.setVisible(false);
    // Explosiones en cadena sobre la base. El cielo queda limpio y las otras torretas también estallan
    [[0, 0, 2.4], [-60, -30, 1.6], [70, 20, 1.8], [-30, 60, 1.5], [40, -70, 1.7], [0, 0, 3]].forEach(([dx, dy, k], i) =>
      e.time.delayedCall(i * 160, () => e.explosion(x + dx, y + dy, k))
    );
    e.cameras.main.flash(1100, 255, 235, 170);
    e.cameras.main.shake(900, 0.02);
    this.ondaDeChoque(x, y);
    e.enemigos.clear(true, true);
    e.balasEnemigas.clear(true, true);
    e.balasTierra.clear(true, true);

    // Mientras el destello tapa el cambio, la base pasa a ser la base calcinada y en llamas. Esa es la que miro 5 s.
    // No la destruyo con alDestruirObjetivo porque la picada es el final y no una victoria normal.
    e.time.delayedCall(300, () => {
      const escala = b.base.scaleX;
      b.retirar();
      crearBaseEnLlamas(e, x, y, escala, 1);
      e.hud.ocultar();
      e.radio.ocultar();
      this.mostrarPuntaje();
    });
    e.objetivos
      .filter((o) => o.activo && o !== b)
      .forEach((o, i) =>
        e.time.delayedCall(300 + i * 140, () => {
          e.explosion(o.x, o.y, 1.1);
          o.retirar();
        })
      );
    e.time.delayedCall(5400, () => e.camara.fundirSalida(700));
    e.time.delayedCall(6150, () => this.terminar());
  }

  // La explosión de la base arrasa lo que la rodea: un anillo de fuego que se agranda hasta cubrir la pantalla, y los soldados enemigos que
  // quedaban alrededor mueren cuando la onda los alcanza
  ondaDeChoque(x, y) {
    const e = this.escena;
    const radio = 900; // más que la pantalla: no queda ningún soldado enemigo sin alcanzar
    const anillo = e.add.circle(x, y, 40, 0xffd35a, 0.22).setStrokeStyle(8, 0xfff1b0, 0.95).setDepth(7);
    e.tweens.add({ targets: anillo, scale: radio / 40, alpha: 0, duration: 1200, ease: 'Cubic.easeOut', onComplete: () => anillo.destroy() });
    e.soldadosEnemigos.onda(x, y, radio, 1100);
  }

  // Mientras la base arde muestro el puntaje final y cuál de los dos finales viene
  mostrarPuntaje() {
    const e = this.escena;
    const total = e.puntaje.total;
    const bueno = total >= PUNTAJE_FINAL_BUENO;
    const { width } = e.scale;
    e.camara.interfaz(e.add.text(width / 2, 80, `PUNTAJE FINAL: ${total}`, estiloHud(40)).setOrigin(0.5).setDepth(CAPA.hud + 2).setScrollFactor(0));
    e.camara.interfaz(
      e.add
        .text(width / 2, 132, bueno ? 'FINAL ALTERNATIVO DESBLOQUEADO' : `FINAL HISTÓRICO (para el alternativo hacían falta ${PUNTAJE_FINAL_BUENO})`, estiloHud(22, { color: bueno ? TXT.verde : TXT.rojo }))
        .setOrigin(0.5)
        .setDepth(CAPA.hud + 2)
        .setScrollFactor(0)
    );
  }

  // Con el puntaje alto se ve el final alternativo, donde Quiñones sobrevive. Con menos, el histórico, donde muere y aparece en gris
  // (CutsceneScene y el ending leen 'finalMalo' del registro)
  terminar() {
    const e = this.escena;
    const bueno = e.puntaje.total >= PUNTAJE_FINAL_BUENO;
    e.registry.set('finalMalo', !bueno);
    e.multijugador.avisar('final', { malo: !bueno }); // Layla ve el mismo final (ver red/espejoFinal.js)
    if (bueno) e.scene.start('FinalAlternativoScene');
    else e.scene.start('CutsceneScene', { id: 'tributo' });
  }

  // Atajo del menú master (data.probarPicada): dejo el nivel con la base ya débil y lista para la picada
  prepararPrueba() {
    const e = this.escena;
    e.baseEnemiga.crearDeposito();
    const b = e.baseObj;
    b.base.y = e.scale.height * 0.46;
    e.velTerreno = 0;
    e.baseEnemiga.frenando = false;
    e.fase = 'refuerzos';
    b.vida = b.vidaMinima || 1;
    this.habilitar();
  }
}
