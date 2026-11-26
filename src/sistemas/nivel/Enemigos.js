import Phaser from 'phaser';
import { ESCALA } from '../../config.js';
import { ambiente } from '../efectos/Ambiente.js';
import { playSfx } from '../audio/audio.js';
import { BALA_ESC, ENEMIGO_REACCION, FACTOR_ALTURA, MAX_AVIONES } from './constantes.js';

// Los aviones enemigos. Entran por arriba (o despegan de la base), se meten en la pantalla y se quedan patrullando mientras
// queden torretas o la base: vuelan de un punto a otro de la mitad de arriba, girando suave, y le disparan a mi avión.
// Recién cuando destruyo todas las defensas se retiran por arriba. Avión contra avión: solo ellos lastiman a mi avión.
// Cada avión vuela a una altura (ver Altura.js). Si yo cambio de altura, deja de poder atacarme y, entre 2,5 y 3,5 s después,
// reacciona y sube o baja un piso para seguirme. Mientras no estemos a la misma altura no dispara y se ve más transparente.
const VELOCIDAD = { entrando: 190, patrulla: 150, huyendo: 260 };
const GIRO = 2.2; // radianes por segundo que pueden virar
const escalaSegunAltura = (nivel) => ESCALA.avionEnemigo * FACTOR_ALTURA[nivel];

export default class Enemigos {
  constructor(escena) {
    this.escena = escena;
  }

  crear() {
    const e = this.escena;
    if (e.terminado || e.fase !== 'avance' || e.enemigos.countActive(true) >= MAX_AVIONES) return;
    const avion = e.enemigos.create(e.xAleatorio(60), -90, 'avion_enemigo').setDepth(4).setScale(escalaSegunAltura(e.altura.nivel));
    this.preparar(avion, 'entrando', Math.PI / 2); // entra mirando hacia abajo, a mi misma altura
  }

  // Un avión despega de la base (crece desde chiquito) y sale hacia mí
  salirDeBase() {
    const e = this.escena;
    const b = e.baseObj;
    if (e.terminado || !b?.activo || e.enemigos.countActive(true) >= 5) return;
    const avion = e.enemigos.create(b.x, b.y, 'avion_enemigo').setDepth(4).setScale(0.2);
    e.tweens.add({ targets: avion, scale: escalaSegunAltura(e.altura.nivel), duration: 900 });
    const rumbo = Phaser.Math.Angle.Between(b.x, b.y, e.jugador.x, e.jugador.y) + Phaser.Math.FloatBetween(-0.6, 0.6);
    this.preparar(avion, 'patrulla', rumbo);
    ambiente.pulso('#ff8a3a', 300, 0);
  }

  // rumbo: hacia dónde vuela, en radianes. El sprite mira hacia arriba con rotación 0, por eso se le suma 90°
  preparar(avion, estado, rumbo) {
    avion.play('enemigo_vuelo');
    const r = 56; // radio en píxeles del sprite de 172 px: el escalado lo achica en pantalla
    avion.body.setCircle(r, avion.width / 2 - r, avion.height / 2 - r);
    avion.vida = 2;
    avion.nivel = this.escena.altura.nivel; // aparece a mi misma altura
    avion.espera = 0; // segundos que lleva a otra altura que la mía
    avion.reaccion = Phaser.Math.FloatBetween(...ENEMIGO_REACCION);
    avion.idRed = this.escena.nuevoId();
    avion.estado = estado;
    avion.rumbo = rumbo;
    avion.destino = null;
    avion.rotation = rumbo + Math.PI / 2;
    avion.cooldown = Phaser.Math.Between(800, 1800);
    avion.setVelocity(Math.cos(rumbo) * VELOCIDAD[estado], Math.sin(rumbo) * VELOCIDAD[estado]);
  }

  // grupo 'aire': balas de los aviones, que solo lastiman a mi avión. 'tierra': balas de torretas y soldados enemigos, que solo
  // lastiman a mis soldados
  disparar(x, y, angulo, grupo = 'aire', nivel = 0) {
    const e = this.escena;
    const bala = (grupo === 'tierra' ? e.balasTierra : e.balasEnemigas).create(x, y, 'bala').setDepth(4).setTint(0xff5555).setScale(BALA_ESC * 0.9).setRotation(angulo + Math.PI / 2); // la punta del sprite mira hacia arriba
    bala.nivel = nivel; // las balas de los aviones llevan la altura del avión que las disparó
    e.physics.velocityFromRotation(angulo, 230, bala.body.velocity);
    playSfx(e, 'sfx_disparo', { volume: 0.3 });
  }

  recibirDano(avion, n) {
    const e = this.escena;
    avion.vida -= n;
    if (avion.vida <= 0) {
      e.explosion(avion.x, avion.y);
      avion.destroy();
    } else {
      avion.setTint(0xff9999);
      e.time.delayedCall(100, () => avion.active && avion.clearTint());
    }
  }

  // Un punto al azar de la mitad de arriba de la pantalla, hacia donde va a volar el avión que patrulla
  nuevoDestino() {
    const { width } = this.escena.scale;
    return { x: Phaser.Math.Between(100, width - 100), y: Phaser.Math.Between(90, 380) };
  }

  // Gira suave hacia el rumbo que quiere y avanza a la velocidad de su estado
  volar(avion, rumboDeseado, dt) {
    avion.rumbo = Phaser.Math.Angle.RotateTo(avion.rumbo, rumboDeseado, GIRO * dt);
    avion.rotation = avion.rumbo + Math.PI / 2;
    const v = VELOCIDAD[avion.estado];
    avion.setVelocity(Math.cos(avion.rumbo) * v, Math.sin(avion.rumbo) * v);
  }

  // Un piso hacia mi altura: cambia de tamaño con una transición, como cuando cambio yo
  seguirAltura(avion, miNivel) {
    avion.nivel += Math.sign(miNivel - avion.nivel);
    avion.espera = 0;
    avion.reaccion = Phaser.Math.FloatBetween(...ENEMIGO_REACCION);
    this.escena.tweens.add({ targets: avion, scale: escalaSegunAltura(avion.nivel), duration: 500, ease: 'Sine.easeInOut' });
  }

  // Los aviones fuera de la pantalla se borran, los que patrullan siguen su ruta y todos disparan cuando les toca
  actualizar(delta) {
    const e = this.escena;
    const dt = delta / 1000;
    const { width, height } = e.scale;
    const defendido = e.objetivos.some((o) => o.activo && (o.arma || o.jefe)); // quedan torretas o la base
    const miNivel = e.altura.nivel;
    // Las balas de otra altura pasan por debajo (o por encima) de mí: se ven transparentes para saber que no me tocan
    e.balasEnemigas.getChildren().forEach((b) => b.setAlpha(b.nivel === miNivel ? 1 : 0.3));
    [...e.enemigos.getChildren()].forEach((a) => {
      if (!defendido && a.estado !== 'huyendo') a.estado = 'huyendo'; // sin defensas se retiran
      if (a.y > height + 100 || a.y < -140 || a.x < -140 || a.x > width + 140) return a.destroy();

      if (a.estado === 'entrando') {
        this.volar(a, Math.PI / 2, dt);
        if (a.y > 110) a.estado = 'patrulla';
      } else if (a.estado === 'patrulla') {
        if (!a.destino || Phaser.Math.Distance.Between(a.x, a.y, a.destino.x, a.destino.y) < 50) a.destino = this.nuevoDestino();
        this.volar(a, Phaser.Math.Angle.Between(a.x, a.y, a.destino.x, a.destino.y), dt);
      } else {
        this.volar(a, -Math.PI / 2, dt); // huyen hacia arriba
      }

      // Si no vamos a la misma altura espera unos segundos y reacciona: sube o baja un piso para alcanzarme
      if (a.nivel !== miNivel) {
        a.espera += dt;
        if (a.espera >= a.reaccion) this.seguirAltura(a, miNivel);
      } else {
        a.espera = 0;
      }
      a.setAlpha(a.nivel === miNivel ? 1 : 0.55);

      a.cooldown -= delta;
      const enPantalla = a.y > 0 && a.y < height && a.x > 0 && a.x < width;
      if (a.cooldown <= 0 && enPantalla && a.estado !== 'huyendo' && a.nivel === miNivel) {
        a.cooldown = Phaser.Math.Between(1200, 2200);
        this.disparar(a.x, a.y + 30, Phaser.Math.Angle.Between(a.x, a.y, e.jugador.x, e.jugador.y), 'aire', a.nivel);
      }
    });
  }
}
