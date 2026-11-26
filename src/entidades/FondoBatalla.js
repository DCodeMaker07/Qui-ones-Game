import Phaser from 'phaser';
import { alinearAliado, ARMA_ORIGEN, ESCALA, GAME } from '../config.js';
import { bombaCayendo } from '../sistemas/efectos/bomba.js';

// Fondo "en vivo" para los menús: el campo de batalla ya en marcha, sin jugador real.
// Terreno con scroll, el avión de Quiñones en piloto automático (dispara y bombardea), aviones enemigos
// que bajan, nidos que giran y disparan, y escuadras de soldados que avanzan. Todo es decorativo (sin física).
// Uso: this.fondo = new FondoBatalla(this); y en update(): this.fondo.update(delta).
// Los objetos usan depth 0-8; pon tu overlay y tu interfaz por encima (depth >= 20).
export default class FondoBatalla {
  constructor(scene) {
    this.scene = scene;
    const { width, height } = scene.scale;
    this.w = width;
    this.h = height;
    this.t = 0;
    this.nidos = [];
    this.aliados = [];
    this.enemigos = [];
    this.balas = [];

    this.fondo = scene.add.tileSprite(0, 0, width, height, 'terreno_1').setOrigin(0).setDepth(0);
    this.jugador = scene.add.sprite(width * 0.5, height * 0.68, 'avion_jugador').setDepth(5);
    this.jugador.play('nave_vuelo');

    scene.time.addEvent({ delay: 3600, loop: true, callback: () => this.crearEnemigo() });
    scene.time.addEvent({ delay: 7000, loop: true, callback: () => this.crearNido() });
    scene.time.addEvent({ delay: 9000, loop: true, callback: () => this.crearEscuadra() });
    scene.time.addEvent({ delay: 240, loop: true, callback: () => this.disparar() });
    scene.time.addEvent({ delay: 3500, loop: true, callback: () => this.bombardear() });

    // Arranque: que parezca que la partida ya empezó
    this.crearNido(width * 0.62, height * 0.25);
    this.crearNido(width * 0.2, height * 0.55);
    this.crearEscuadra(width * 0.45, height * 0.72);
    this.crearEnemigo(width * 0.4, height * 0.1);
  }

  // ---------- creación ----------

  crearNido(x = Phaser.Math.Between(80, this.w - 80), y = -80) {
    const s = this.scene;
    const base = s.add.image(x, y, 'nido_base').setDepth(1).setScale(ESCALA.nido);
    const arma = s.add.image(x, y, 'nido_arma').setDepth(1.1).setScale(ESCALA.nido).setOrigin(ARMA_ORIGEN.x, ARMA_ORIGEN.y);
    this.nidos.push({
      base, arma, vivo: true, cd: Phaser.Math.Between(600, 1500),
      largo: arma.height * ARMA_ORIGEN.y * ESCALA.nido,
    });
  }

  crearEscuadra(x = Phaser.Math.Between(120, this.w - 120), y = -40) {
    [[-36, 0], [0, -45], [36, 0]].forEach(([dx, dy]) => {
      const a = this.scene.add.sprite(x + dx, y + dy, 'soldado_aliado_arriba').setDepth(3).setScale(ESCALA.soldado);
      a.play('aliado_arriba');
      alinearAliado(a, 'aliado_arriba');
      this.aliados.push(a);
    });
  }

  crearEnemigo(x = Phaser.Math.Between(80, this.w - 80), y = -90) {
    const e = this.scene.add.sprite(x, y, 'avion_enemigo').setDepth(4).setAngle(180).setScale(ESCALA.avionEnemigo);
    e.play('enemigo_vuelo');
    e.vy = Phaser.Math.Between(110, 170);
    e.vx = Phaser.Math.Between(-30, 30);
    this.enemigos.push(e);
  }

  explosion(x, y, k = 1) {
    const s = this.scene;
    const e = s.add.sprite(x, y, 'explosion').setDepth(8).setScale(ESCALA.explosion * k);
    e.play('explotar');
    e.once('animationcomplete', () => e.destroy());
    s.tweens.add({ targets: e, y: y + GAME.scrollSpeed * 0.6, duration: 700 });
  }

  // ---------- acciones del avión en piloto automático ----------

  disparar() {
    const j = this.jugador;
    const objetivo = this.enemigos.some((e) => e.active && e.y > 0 && e.y < j.y - 40 && Math.abs(e.x - j.x) < 70);
    if (!objetivo) return;
    const img = this.scene.add.image(j.x, j.y - 40, 'bala').setDepth(4).setScale(0.4);
    this.balas.push({ img, vx: 0, vy: -520, enemiga: false });
  }

  // Suelta una bomba sobre un nido que tenga cerca; el nido explota al caer.
  bombardear() {
    const j = this.jugador;
    const n = this.nidos.find((q) => q.vivo && !q.marcado && q.base.y > this.h * 0.2 && q.base.y < this.h * 0.8 && Math.abs(q.base.x - j.x) < 220);
    if (!n) return;
    n.marcado = true;
    bombaCayendo(this.scene, j.x, j.y + 20, {
      destino: { x: n.base.x, y: n.base.y + GAME.scrollSpeed * 0.7 },
      alAterrizar: () => n.vivo && this.destruirNido(n),
    });
  }

  destruirNido(n) {
    this.explosion(n.base.x, n.base.y, 1.2);
    n.vivo = false;
    n.base.destroy();
    n.arma.destroy();
  }

  // ---------- bucle ----------

  update(delta) {
    const dt = delta / 1000;
    const scroll = GAME.scrollSpeed;
    const j = this.jugador;
    this.t += dt;
    this.fondo.tilePositionY -= scroll * dt;

    // Avión: persigue al enemigo que tenga delante; si no hay, patrulla de lado a lado
    const amenaza = this.enemigos.filter((e) => e.active && e.y > 0 && e.y < j.y - 60).sort((a, b) => b.y - a.y)[0];
    const deseado = amenaza ? amenaza.x : this.w * 0.5 + Math.sin(this.t * 0.4) * this.w * 0.3;
    j.x += (deseado - j.x) * Math.min(1, dt * 1.6);
    j.y = this.h * 0.68 + Math.sin(this.t * 0.9) * 18;

    // Nidos: avanzan con el terreno y apuntan al avión
    this.nidos.forEach((n) => {
      if (!n.vivo) return;
      n.base.y += scroll * dt;
      n.arma.y = n.base.y;
      if (n.base.y > this.h + 150) {
        n.vivo = false;
        n.base.destroy();
        n.arma.destroy();
        return;
      }
      if (n.base.y < 0) return;
      const ang = Phaser.Math.Angle.Between(n.base.x, n.base.y, j.x, j.y);
      n.arma.rotation = ang + Math.PI / 2;
      n.cd -= delta;
      if (n.cd <= 0 && n.base.y < this.h * 0.9) {
        n.cd = 1600;
        const img = this.scene.add.image(n.base.x + Math.cos(ang) * n.largo, n.base.y + Math.sin(ang) * n.largo, 'bala').setDepth(4).setTint(0xff5555).setScale(0.36).setRotation(ang + Math.PI / 2);
        this.balas.push({ img, vx: Math.cos(ang) * 230, vy: Math.sin(ang) * 230, enemiga: true });
      }
    });
    this.nidos = this.nidos.filter((n) => n.vivo);

    // Soldados: avanzan; frente a un nido se detienen y disparan
    this.aliados.forEach((a) => {
      if (!a.active) return;
      const bloqueado = this.nidos.some((n) => n.vivo && n.base.y > -20 && n.base.y < a.y && a.y - n.base.y < 200 && Math.abs(n.base.x - a.x) < 90);
      a.y += (scroll - (bloqueado ? 0 : 40)) * dt;
      const anim = bloqueado ? 'aliado_dispara_arriba' : 'aliado_arriba';
      a.anims.play(anim, true);
      alinearAliado(a, anim);
      if (a.y > this.h + 60) a.destroy();
    });
    this.aliados = this.aliados.filter((a) => a.active);

    // Aviones enemigos
    this.enemigos.forEach((e) => {
      if (!e.active) return;
      e.y += e.vy * dt;
      e.x += e.vx * dt;
      if (e.y > this.h + 120) e.destroy();
    });

    // Balas: las del avión derriban enemigos
    this.balas.forEach((b) => {
      if (!b.img.active) return;
      b.img.x += b.vx * dt;
      b.img.y += b.vy * dt;
      if (!b.enemiga) {
        const e = this.enemigos.find((q) => q.active && Phaser.Math.Distance.Between(q.x, q.y, b.img.x, b.img.y) < 42);
        if (e) {
          this.explosion(e.x, e.y);
          e.destroy();
          b.img.destroy();
          return;
        }
      }
      if (b.img.y < -20 || b.img.y > this.h + 20 || b.img.x < -20 || b.img.x > this.w + 20) b.img.destroy();
    });
    this.balas = this.balas.filter((b) => b.img.active);
    this.enemigos = this.enemigos.filter((e) => e.active);
  }
}
