import Phaser from 'phaser';
import { ESCALA } from '../../config.js';
import { ambiente } from '../efectos/Ambiente.js';
import { playSfx } from '../audio/audio.js';
import { AVIONES_OLEADA, BALA_ESC, MARGEN_BORRADO, ENEMIGO_REACCION, ESPERA_OLEADA, ESPERA_PRIMERA_OLEADA, FACTOR_ALTURA, MAX_AVIONES, PUNTOS } from './constantes.js';

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
    this.espera = ESPERA_PRIMERA_OLEADA; // segundos que faltan para la próxima oleada (solo corren cuando no queda ningún avión)
    this.pendientes = 0; // aviones de la oleada que todavía no salieron
    this.hastaSiguiente = 0; // segundos para que salga el próximo avión de la oleada
  }

  // Las oleadas: cuando no queda ningún avión y pasó la espera, sale un grupo de 2 o 3, uno cada 1,2 s. Mientras quede alguno vivo el reloj
  // de la espera no corre, así que empieza a contar recién cuando derroto al último. Sin torretas ni base no vienen más.
  manejarOleadas(dt, defendido) {
    const e = this.escena;
    if (e.terminado || !defendido) return;
    if (this.pendientes > 0) {
      this.hastaSiguiente -= dt;
      if (this.hastaSiguiente > 0) return;
      this.hastaSiguiente = 1.2;
      this.pendientes--;
      if (e.fase === 'avance') this.crear();
      else this.salirDeBase();
      return;
    }
    if (e.enemigos.countActive(true) > 0) {
      this.espera = ESPERA_OLEADA;
      return;
    }
    this.espera -= dt;
    if (this.espera <= 0) {
      this.pendientes = Phaser.Math.Between(...AVIONES_OLEADA);
      this.hastaSiguiente = 0;
    }
  }

  // Los aviones enemigos entran siempre por arriba (lo más común) o por los costados, nunca desde las bases. Los de arriba entran mirando
  // hacia abajo y los de los costados ya salen patrullando hacia adentro
  bordeDeEntrada() {
    const { width } = this.escena.scale;
    const lado = Phaser.Math.Between(0, 4); // 0 a 2: arriba; 3: izquierda; 4: derecha
    if (lado <= 2) return { x: this.escena.xAleatorio(60), y: -260, estado: 'entrando', rumbo: Math.PI / 2 };
    const izquierda = lado === 3;
    return { x: izquierda ? -220 : width + 220, y: Phaser.Math.Between(60, 380), estado: 'patrulla', rumbo: izquierda ? 0 : Math.PI };
  }

  crearEnBorde() {
    const e = this.escena;
    const { x, y, estado, rumbo } = this.bordeDeEntrada();
    const avion = e.enemigos.create(x, y, 'avion_enemigo').setDepth(4).setScale(escalaSegunAltura(e.altura.nivel));
    this.preparar(avion, estado, rumbo); // aparece a mi misma altura
  }

  crear() {
    const e = this.escena;
    if (e.terminado || e.fase !== 'avance' || e.enemigos.countActive(true) >= MAX_AVIONES) return;
    this.crearEnBorde();
  }

  // Durante el asedio a la base también entran por arriba y los costados (el nombre es de cuando salían de la base)
  salirDeBase() {
    const e = this.escena;
    if (e.terminado || !e.baseObj?.activo || e.enemigos.countActive(true) >= 5) return;
    this.crearEnBorde();
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
      e.puntaje.sumar(PUNTOS.avion, avion.x, avion.y);
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
    this.manejarOleadas(dt, defendido);
    const miNivel = e.altura.nivel;
    // Las balas de otra altura pasan por debajo (o por encima) de mí: se ven transparentes para saber que no me tocan
    e.balasEnemigas.getChildren().forEach((b) => b.setAlpha(b.nivel === miNivel ? 1 : 0.3));
    [...e.enemigos.getChildren()].forEach((a) => {
      if (!defendido && a.estado !== 'huyendo') a.estado = 'huyendo'; // sin defensas se retiran
      if (a.y > height + MARGEN_BORRADO + 60 || a.y < -MARGEN_BORRADO - 80 || a.x < -MARGEN_BORRADO - 100 || a.x > width + MARGEN_BORRADO + 100) return a.destroy();

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
