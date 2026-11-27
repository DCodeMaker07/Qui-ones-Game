import Phaser from 'phaser';
import { ESCALA } from '../../config.js';
import { MARGEN_BORRADO, FILA_CENTRO_Y, FILA_SEPARACION, FILA_SOLDADOS, FUEGO_DPS, FUEGO_RADIO_SOLDADO, PUNTOS } from './constantes.js';

// Los soldados enemigos de tierra. Cuidan las torretas y la base: se quedan en su puesto, se mueven con el terreno y les disparan
// a mis soldados aliados cuando los tienen a tiro. Mi avión no es su blanco (eso es cosa de los aviones enemigos). A ellos los
// derrotan mis soldados (disparando), mis bombas (Q) y el fuego de la R.
const VIDA = 2;
const ALCANCE = 260; // distancia a la que ven a un aliado (un poco más que los 230 desde los que mis soldados les disparan)
const VELOCIDAD = 45;
const VELOCIDAD_FURIA = 95; // los que se enfurecen corren (ver enfurecer)
const DISTANCIA_FURIA = 110; // y se acercan más antes de detenerse a disparar // píxeles por segundo cuando caminan hacia un aliado
const DISTANCIA_TIRO = 170; // se acercan hasta quedar a esta distancia
const VELOCIDAD_ENTRADA = 100; // píxeles por segundo con los que marchan cuando entran por arriba en una fila
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

  // Una fila (horizontal) o una columna (vertical) de soldados, para que el bombardeo de fuego (R) los barra de una pasada. Siempre
  // aparecen por encima de la pantalla y entran marchando hacia abajo (aunque el mapa esté detenido), nunca de golpe en el medio, y se detienen casi en el centro, donde mi avión llega bien
  fila() {
    const e = this.escena;
    const { width } = e.scale;
    const horizontal = Math.random() < 0.5;
    const largo = FILA_SEPARACION * (FILA_SOLDADOS - 1);
    const x0 = Phaser.Math.Between(120, width - 120 - (horizontal ? largo : 0));
    for (let i = 0; i < FILA_SOLDADOS; i++) {
      const x = horizontal ? x0 + i * FILA_SEPARACION : x0;
      const y = horizontal ? -240 : -240 - largo + i * FILA_SEPARACION; // arriba de lo que alcanza a ver la cámara corrida y alejada
      const s = this.crear(x, y);
      // Cuánto les falta marchar hasta quedar casi al centro de la pantalla (la fila a la altura FILA_CENTRO_Y y la columna centrada ahí)
      s.fila = true; // forman parte de una fila: se quedan en su lugar, bloqueando el camino, hasta que los derroto
      s.entrada = { falta: (horizontal ? FILA_CENTRO_Y : FILA_CENTRO_Y - largo / 2 + i * FILA_SEPARACION) - y };
    }
    e.radio.mostrar('Layla: ¡Una fila de soldados enemigos! Un bombardeo de fuego los barre de una pasada.', { duracion: 4500 });
  }

  // Cuando destruyo una torreta, los soldados que están cerca de ella se enfurecen: salen corriendo a atacar a mis soldados, más rápido y
  // disparando más seguido. Les sale un "!" rojo encima para que se note la reacción
  enfurecer(x, y, radio) {
    const e = this.escena;
    this.lista.forEach((s) => {
      if (!s.active || s.furia || s.fila || Phaser.Math.Distance.Between(x, y, s.x, s.y) > radio) return;
      s.furia = true;
      const aviso = e.add.text(s.x, s.y - 36, '!', { fontFamily: 'Nunito, sans-serif', fontStyle: 'bold', fontSize: '26px', color: '#ff4a3d', stroke: '#000000', strokeThickness: 4 }).setOrigin(0.5).setDepth(6);
      e.tweens.add({ targets: aviso, y: aviso.y - 18, alpha: 0, duration: 900, ease: 'Cubic.easeOut', onComplete: () => aviso.destroy() });
    });
  }

  // La onda de choque de la explosión de la base final: todos los soldados enemigos a menos de "radio" mueren cuando la onda los alcanza (los
  // cercanos al instante y los lejanos hasta "ms" después). No suman puntos: el puntaje final ya se mostró y no tiene que cambiar
  onda(x, y, radio, ms) {
    this.lista.forEach((s) => {
      if (!s.active) return;
      const d = Phaser.Math.Distance.Between(x, y, s.x, s.y);
      if (d > radio) return;
      this.escena.time.delayedCall((d / radio) * ms, () => s.active && this.matar(s, false));
    });
  }

  // Cuántos soldados enemigos que no son de una fila siguen vivos y ya entraron a la pantalla: mientras haya alguno el mapa no avanza
  guardiasEnPantalla() {
    return this.lista.filter((s) => s.active && !s.fila && s.y >= 10).length;
  }

  // Cuántos soldados de una fila siguen vivos. Mientras haya alguno el mapa se frena (ver Avance), porque la fila les cierra el camino a
  // mis soldados y, si el terreno siguiera bajando, la arrastraría hasta salir de donde mi avión alcanza
  soldadosDeFila() {
    return this.lista.filter((s) => s.active && s.fila).length;
  }

  // Mientras entran marchan hacia abajo. Con el dibujo de caminata hacia abajo (soldado_enemigo_abajo.png) usan esa animación; mientras no
  // exista, uso el dibujo de mirar hacia abajo y lo balanceo un poco para que parezca que camina
  entrar(s, dt) {
    const paso = Math.min(s.entrada.falta, VELOCIDAD_ENTRADA * dt);
    s.y += paso;
    s.entrada.falta -= paso;
    s.setFlipX(false);
    if (this.hayCaminataHaciaAbajo()) {
      s.anims.play('enemigo_caminar', true);
    } else {
      s.anims.stop();
      s.setTexture('soldado_enemigo_dispara_abajo', 0);
      s.setAngle(Math.sin(this.escena.time.now / 90 + s.idRed) * 5);
    }
    if (s.entrada.falta <= 0) {
      s.entrada = null;
      s.setAngle(0);
    }
  }

  // El aliado más cercano dentro del alcance, o null
  // El aliado más cercano a s que esté a menos de "alcance" (Infinity para buscar en toda la pantalla), o null
  // (Ojo: masCercano(x, y, radio), más abajo, es al revés: el soldado enemigo más cercano a un punto, y lo usan mis soldados. Antes las dos se
  // llamaban igual y una pisaba a la otra: por eso los soldados enemigos no veían a nadie y se quedaban parados)
  aliadoMasCercano(s, alcance) {
    let mejor = null;
    let dmin = alcance;
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
  caminar(s, objetivo, dt) {
    let dx = objetivo.x - s.x;
    let dy = objetivo.y - s.y;
    if (Math.hypot(dx, dy) <= (s.furia ? DISTANCIA_FURIA : DISTANCIA_TIRO)) return false;
    // También rodean las barreras de mis soldados (a las torretas no: salen de ellas)
    let angulo = Math.atan2(dy, dx);
    const libre = this.escena.obstaculos.desviar(s.x, s.y, angulo, [], s.giro ?? 1, true);
    if (libre === null) return false; // sin salida: se quedan disparando
    if (libre !== angulo) s.giro = Math.sign(Phaser.Math.Angle.ShortestBetween(Phaser.Math.RadToDeg(angulo), Phaser.Math.RadToDeg(libre))) || 1;
    angulo = libre;
    const velocidad = s.furia ? VELOCIDAD_FURIA : VELOCIDAD;
    s.x += Math.cos(angulo) * velocidad * dt;
    s.y += Math.sin(angulo) * velocidad * dt;
    dx = Math.cos(angulo); // de acá en adelante, la dirección real en que caminan (para elegir el dibujo)
    dy = Math.sin(angulo);
    const deLado = Math.abs(dx) >= Math.abs(dy);
    s.setFlipX(dx < 0 && (deLado || !(dy > 0 && this.hayCaminataHaciaAbajo())));
    if (deLado) {
      s.setAngle(0);
      s.anims.play('enemigo_derecha', true);
    } else if (dy > 0 && this.hayCaminataHaciaAbajo()) {
      s.setAngle(0);
      s.anims.play('enemigo_caminar', true);
    } else {
      // Hacia arriba no hay dibujo de caminata: uso el de lado inclinado 45° hacia arriba (o hacia abajo si todavía falta el de abajo)
      s.setAngle(Math.sign(dy) * 45 * (s.flipX ? -1 : 1));
      s.anims.play('enemigo_derecha', true);
    }
    return true;
  }

  // Sin nadie a quien buscar o disparar se quedan quietos, mirando hacia abajo
  quedarse(s) {
    s.anims.stop();
    s.setFlipX(false);
    s.setAngle(0);
    s.setTexture('soldado_enemigo_dispara_abajo', 0);
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

  matar(s, conPuntos = true) {
    this.escena.explosion(s.x, s.y, 0.35);
    if (conPuntos) this.escena.puntaje.sumar(PUNTOS.soldado, s.x, s.y);
    this.escena.caidos.marcar('muerte_enemigo', s.x, s.y);
    s.destroy();
  }

  // Las bombas (Q) matan a los soldados que estén dentro del radio
  explotar(x, y, radio) {
    this.lista.forEach((s) => s.active && Phaser.Math.Distance.Between(x, y, s.x, s.y) < radio && this.recibirDano(s, VIDA));
  }

  // Lo mismo que explotar, pero con un daño dado en vez de matar de un golpe: lo usa cada bomba de la R
  explotarSuave(x, y, radio, dano) {
    this.lista.forEach((s) => s.active && Phaser.Math.Distance.Between(x, y, s.x, s.y) < radio && this.recibirDano(s, dano));
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
      if (s.y > height + MARGEN_BORRADO) return s.destroy();
      if (s.entrada) this.entrar(s, dt);
      if (s.y < 10) return; // todavía no entraron a la pantalla
      if (e.especial.fuegoCerca(s.x, s.y, FUEGO_RADIO_SOLDADO)) {
        s.setTint(0xff7a3a);
        this.danoSuave(s, FUEGO_DPS * dt);
        if (!s.active) return;
      }
      if (s.entrada) return; // mientras entran marchando no apuntan ni disparan
      // A quién le disparo (el aliado más cercano dentro del alcance) y a quién voy a buscar (el más cercano de todos). Si no ven a nadie
      // al alcance salen a buscarlos, así no se quedan parados; los de una fila se quedan en su lugar cerrando el camino
      const blanco = this.aliadoMasCercano(s, ALCANCE);
      const buscado = blanco ?? (s.fila ? null : this.aliadoMasCercano(s, Infinity));
      if (!buscado) return this.quedarse(s);
      const marchando = !s.fila && this.caminar(s, buscado, dt);
      if (!blanco) {
        if (!marchando) this.quedarse(s);
        return;
      }
      const angulo = Phaser.Math.Angle.Between(s.x, s.y, blanco.x, blanco.y);
      if (!marchando) {
        s.setFlipX(false);
        s.setAngle(0);
        s.anims.play(blanco.y >= s.y ? 'enemigo_dispara_abajo' : 'enemigo_dispara_arriba', true);
      }
      s.cooldown -= dt * 1000;
      if (s.cooldown <= 0) {
        s.cooldown = Phaser.Math.Between(...ESPERA_MS) * (s.furia ? 0.6 : 1); // enfurecidos disparan más seguido
        e.dispararEnemigo(s.x + Math.cos(angulo) * 20, s.y + Math.sin(angulo) * 20, angulo);
      }
    });
  }
}
