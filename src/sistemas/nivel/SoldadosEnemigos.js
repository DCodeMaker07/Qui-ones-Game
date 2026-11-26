import Phaser from 'phaser';
import { ESCALA } from '../../config.js';
import { FILA_SEPARACION, FILA_SOLDADOS, FUEGO_DPS, FUEGO_RADIO, PUNTOS } from './constantes.js';

// Los soldados enemigos de tierra. Cuidan las torretas y la base: se quedan en su puesto, se mueven con el terreno y les disparan
// a mis soldados aliados cuando los tienen a tiro. Mi avión no es su blanco (eso es cosa de los aviones enemigos). A ellos los
// derrotan mis soldados (disparando), mis bombas (Q) y el fuego de la R.
const VIDA = 2;
const ALCANCE = 260; // distancia a la que ven a un aliado (un poco más que los 230 desde los que mis soldados les disparan)
const VELOCIDAD = 38; // píxeles por segundo cuando caminan hacia un aliado
const DISTANCIA_TIRO = 170; // se acercan hasta quedar a esta distancia
const ESPERA_MS = [1500, 2400]; // tiempo entre un disparo y el siguiente. Lo subí porque mis soldados se estaban muriendo mucho

export default class SoldadosEnemigos {
  constructor(escena) {
    this.escena = escena;
    this.lista = [];
  }

  // n soldados repartidos alrededor de (x, y), por ejemplo cuidando un nido
  guarnicion(x, y, n = 2, radio = 62) {
    const giro = Math.random() * Math.PI * 2;
    for (let i = 0; i < n; i++) {
      const angulo = giro + (i / n) * Math.PI * 2;
      this.crear(x + Math.cos(angulo) * radio, y + Math.sin(angulo) * radio * 0.8);
    }
  }

  crear(x, y) {
    const e = this.escena;
    const s = e.add.sprite(x, y, 'soldado_enemigo_dispara_abajo', 0).setDepth(3).setScale(ESCALA.soldado);
    s.vida = VIDA;
    s.cooldown = Phaser.Math.Between(...ESPERA_MS);
    s.idRed = e.nuevoId();
    this.lista.push(s);
    return s;
  }

  // Una fila (horizontal) o una columna (vertical) de soldados, para que el bombardeo de fuego (R) los barra de una pasada. Si el
  // mapa está avanzando, entran por arriba; si está detenido aparecen ya en pantalla, con un fundido
  fila() {
    const e = this.escena;
    const { width } = e.scale;
    const parado = e.velTerreno < 5;
    const horizontal = Math.random() < 0.5;
    const largo = FILA_SEPARACION * (FILA_SOLDADOS - 1);
    const x0 = Phaser.Math.Between(120, width - 120 - (horizontal ? largo : 0));
    for (let i = 0; i < FILA_SOLDADOS; i++) {
      const x = horizontal ? x0 + i * FILA_SEPARACION : x0;
      const y = horizontal ? (parado ? 70 : -30) : (parado ? 40 : -30 - largo) + i * FILA_SEPARACION;
      const s = this.crear(x, y);
      if (parado) {
        s.setAlpha(0);
        e.tweens.add({ targets: s, alpha: 1, duration: 500 });
      }
    }
    e.radio.mostrar('Layla: ¡Una fila de soldados enemigos! Un bombardeo de fuego los barre de una pasada.', { duracion: 4500 });
  }

  // El aliado más cercano dentro del alcance, o null
  blancoDe(s) {
    let mejor = null;
    let dmin = ALCANCE;
    this.escena.aliados.getChildren().forEach((a) => {
      if (!a.active) return;
      const d = Phaser.Math.Distance.Between(s.x, s.y, a.x, a.y);
      if (d < dmin) {
        dmin = d;
        mejor = a;
      }
    });
    return mejor;
  }

  // El soldado enemigo más cercano a (x, y) dentro del radio, o null (así mis soldados eligen a quién disparar)
  masCercano(x, y, radio) {
    let mejor = null;
    let dmin = radio;
    this.lista.forEach((s) => {
      if (!s.active || s.y < 0) return;
      const d = Phaser.Math.Distance.Between(x, y, s.x, s.y);
      if (d < dmin) {
        dmin = d;
        mejor = s;
      }
    });
    return mejor;
  }

  // Si el aliado está lejos, el soldado camina hacia él mientras sigue disparando. Devuelve false si no se movió. Tengo dibujo de caminata
  // hacia la derecha (a la izquierda es el mismo, espejado) y, hacia abajo, solo cuando exista soldado_enemigo_abajo.png; hacia arriba no hay
  caminar(s, blanco, angulo, dt) {
    const e = this.escena;
    const dx = blanco.x - s.x;
    const dy = blanco.y - s.y;
    if (Math.hypot(dx, dy) <= DISTANCIA_TIRO) return false;
    const deLado = Math.abs(dx) >= Math.abs(dy);
    if (!deLado && !(dy > 0 && this.hayCaminataHaciaAbajo())) return false;
    s.x += Math.cos(angulo) * VELOCIDAD * dt;
    s.y += Math.sin(angulo) * VELOCIDAD * dt;
    s.setFlipX(deLado && dx < 0);
    s.anims.play(deLado ? 'enemigo_derecha' : 'enemigo_caminar', true);
    return true;
  }

  hayCaminataHaciaAbajo() {
    const textura = this.escena.textures.get('soldado_enemigo_abajo');
    return !!textura && !textura.customData?.placeholder;
  }

  // Daño de golpe (con destello): lo uso para las explosiones
  recibirDano(s, n) {
    if (!s.active) return;
    s.setTint(0xff9999);
    this.escena.time.delayedCall(100, () => s.active && s.clearTint());
    this.danoSuave(s, n);
  }

  // Daño continuo, sin destello: el de los disparos de mis soldados y el del fuego
  danoSuave(s, n) {
    if (!s.active) return;
    s.vida -= n;
    if (s.vida <= 0) this.matar(s);
  }

  matar(s) {
    this.escena.explosion(s.x, s.y, 0.35);
    this.escena.puntaje.sumar(PUNTOS.soldado, s.x, s.y);
    this.escena.caidos.marcar('muerte_enemigo', s.x, s.y);
    s.destroy();
  }

  // Las bombas (Q) matan a los soldados que estén dentro del radio
  explotar(x, y, radio) {
    this.lista.forEach((s) => s.active && Phaser.Math.Distance.Between(x, y, s.x, s.y) < radio && this.recibirDano(s, VIDA));
  }

  // Lo que le mando a Layla para su mapa
  foto() {
    return this.lista.filter((s) => s.active).map((s) => [s.idRed, Math.round(s.x), Math.round(s.y)]);
  }

  actualizar(dt) {
    const e = this.escena;
    const { height } = e.scale;
    this.lista = this.lista.filter((s) => s.active);
    [...this.lista].forEach((s) => {
      s.y += e.velTerreno * dt; // van pegados al terreno
      if (s.y > height + 60) return s.destroy();
      if (s.y < 10) return; // todavía no entraron a la pantalla
      if (e.especial.fuegoCerca(s.x, s.y, FUEGO_RADIO + 6)) {
        s.setTint(0xff7a3a);
        this.danoSuave(s, FUEGO_DPS * dt);
        if (!s.active) return;
      }
      const blanco = this.blancoDe(s);
      if (!blanco) {
        s.anims.stop();
        s.setFlipX(false);
        s.setTexture('soldado_enemigo_dispara_abajo', 0); // sin blanco se quedan quietos mirando hacia abajo
        return;
      }
      const angulo = Phaser.Math.Angle.Between(s.x, s.y, blanco.x, blanco.y);
      if (!this.caminar(s, blanco, angulo, dt)) {
        s.setFlipX(false);
        s.anims.play(blanco.y >= s.y ? 'enemigo_dispara_abajo' : 'enemigo_dispara_arriba', true);
      }
      s.cooldown -= dt * 1000;
      if (s.cooldown <= 0) {
        s.cooldown = Phaser.Math.Between(...ESPERA_MS);
        e.dispararEnemigo(s.x + Math.cos(angulo) * 20, s.y + Math.sin(angulo) * 20, angulo);
      }
    });
  }
}
