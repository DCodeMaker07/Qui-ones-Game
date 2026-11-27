import { ESCALA } from '../../config.js';
import { BARRERAS_POR_NIVEL, BARRERA_ESPERA_MS, BARRERA_VIDA, GRUPO_SEPARACION, MARGEN_BORRADO } from './constantes.js';
import Phaser from 'phaser';

// Las barreras de los soldados aliados, como las nueces de Plants vs Zombies: tienen vida, frenan las balas de las torretas y de los soldados
// enemigos (cada bala le quita un punto), los soldados no las atraviesan (las rodean, ver Obstaculos.js) y se esconden detrás cuando hay peligro
// (ver cubiertaPara). Se rompen cuando se les acaba la vida. Bajan con el terreno. Las balas de los aviones pasan por encima.
// Las coloca Layla desde su panel en el multijugador (de a una: colocar) o, en el modo un jugador, la orden por voz "Layla, coloca barreras"
// (un grupo de tres delante de mis soldados: ponerGrupo).
const ANCHO_GOLPE = 96; // zona donde la barrera frena las balas (el dibujo mide unos 85 px de ancho en pantalla)
const ALTO_GOLPE = 30;

export default class Barreras {
  constructor(escena) {
    this.escena = escena;
    this.lista = [];
    this.restantes = BARRERAS_POR_NIVEL;
    this.ultima = -Infinity;
  }

  // Milisegundos que faltan para que Layla pueda colocar otra (0 si ya puede)
  esperaRestante() {
    return Math.max(0, this.ultima + BARRERA_ESPERA_MS - this.escena.time.now);
  }

  // Una barrera nueva en (x, y), girada "angulo" grados (0 = horizontal): el dibujo (o un rectángulo si falta), su vida y su barrita de vida,
  // que solo se ve cuando ya recibió daño. El ángulo lo elige Layla al colocarla, para que sirva contra los que vienen de los costados
  crear(x, y, angulo = 0) {
    const e = this.escena;
    const dibujo = e.textures.exists('barrera_aliada')
      ? e.add.image(x, y, 'barrera_aliada').setScale(ESCALA.barrera)
      : e.add.rectangle(x, y, ANCHO_GOLPE, 20, 0x8a6a3a).setStrokeStyle(2, 0x3a2a10); // si falta el dibujo, un rectángulo
    dibujo.setDepth(2.8).setAlpha(0).setAngle(angulo);
    dibujo.angulo = angulo;
    dibujo.vida = BARRERA_VIDA;
    dibujo.vidaMax = BARRERA_VIDA;
    dibujo.idRed = e.nuevoId();
    dibujo.barra = e.add.graphics().setDepth(2.9);
    e.tweens.add({ targets: dibujo, alpha: 1, duration: 300 }); // aparece de a poco
    this.lista.push(dibujo);
    return dibujo;
  }

  // Layla (multijugador): una barrera donde ella quiera y con el ángulo que ella quiera
  colocar(x, y, angulo = 0) {
    const e = this.escena;
    if (e.terminado || this.restantes <= 0 || this.esperaRestante() > 0) return false;
    this.restantes--;
    this.ultima = e.time.now;
    this.crear(x, y, angulo);
    e.radio.mostrar('Layla coloca una barrera para los soldados.', { duracion: 3000 });
    return true;
  }

  // "Layla, coloca barreras": un grupo de hasta GRUPO_BARRERAS en fila, entre mis soldados y lo que los amenaza. Devuelve lo que Layla
  // le contesta al jugador. Dónde van lo calcula posicionesDeGrupo
  ponerGrupo() {
    const e = this.escena;
    if (e.terminado) return null;
    if (this.restantes < 1) return 'Ya no me quedan barreras en este nivel.';
    const espera = this.esperaRestante();
    if (espera > 0) return `Todavía estoy preparando las barreras: ${Math.ceil(espera / 1000)} s.`;
    const posiciones = this.posicionesDeGrupo().slice(0, this.restantes);
    if (!posiciones.length) return 'No encuentro un buen lugar para las barreras ahora.';
    posiciones.forEach(({ x, y }) => this.crear(x, y));
    this.restantes -= posiciones.length;
    this.ultima = e.time.now;
    return e.aliados.countActive(true) ? 'Barreras colocadas entre los soldados y el peligro.' : 'Barreras colocadas. Todavía no hay soldados a los que proteger.';
  }

  // El cálculo de dónde ponerlas:
  //  1. El grupo de soldados a proteger: el más numeroso (el soldado con más compañeros a menos de 200 px y los que están con él).
  //  2. La amenaza: la torreta más cercana a ese grupo (a menos de 480 px) o, si no hay, el soldado enemigo más cercano (a menos de 400 px).
  //  3. El punto ideal: del grupo hacia la amenaza, a casi la mitad del camino (entre 70 y 110 px del grupo), pero nunca a menos de 130 px de la
  //     amenaza. Sin amenaza, 85 px delante del grupo (hacia arriba).
  //  4. Tres barreras en fila alrededor de ese punto. Cada una se valida (libre) y, si no sirve, busco el lugar libre más cercano en anillos
  //     cada vez más grandes. Las que no encuentran lugar no se ponen.
  posicionesDeGrupo() {
    const e = this.escena;
    const { width, height } = e.scale;
    const aliados = e.aliados.getChildren().filter((a) => a.active && a.y > 0 && a.y < height);

    // 1. El grupo
    let centro = { x: width / 2, y: height * 0.62 };
    if (aliados.length) {
      const cercanos = (a) => aliados.filter((o) => Phaser.Math.Distance.Between(a.x, a.y, o.x, o.y) < 200);
      const semilla = aliados.reduce((mejor, a) => (cercanos(a).length > cercanos(mejor).length ? a : mejor), aliados[0]);
      const grupo = cercanos(semilla);
      centro = { x: grupo.reduce((s, a) => s + a.x, 0) / grupo.length, y: grupo.reduce((s, a) => s + a.y, 0) / grupo.length };
    }

    // 2. La amenaza
    const dist = (o) => Phaser.Math.Distance.Between(centro.x, centro.y, o.x, o.y);
    const torreta = e.objetivos.filter((o) => o.activo && o.arma && o.y > 0 && dist(o) < 480).sort((p, q) => dist(p) - dist(q))[0];
    const enemigo = torreta ? null : e.soldadosEnemigos.masCercano(centro.x, centro.y, 400);
    const amenaza = torreta ?? enemigo;

    // 3. El punto ideal
    let ideal = { x: centro.x, y: centro.y - 85 };
    if (amenaza) {
      const d = dist(amenaza);
      const rumbo = Phaser.Math.Angle.Between(centro.x, centro.y, amenaza.x, amenaza.y);
      let avance = Phaser.Math.Clamp(d * 0.45, 70, 110);
      while (avance > 50 && d - avance < 130) avance -= 10; // no demasiado cerca de la amenaza
      ideal = { x: centro.x + Math.cos(rumbo) * avance, y: centro.y + Math.sin(rumbo) * avance };
    }

    // 4. La fila de barreras, cada una validada
    const lista = [];
    for (let k = -1; k <= 1; k++) {
      const sitio = this.sitioLibre(ideal.x + k * GRUPO_SEPARACION, ideal.y, lista);
      if (sitio) lista.push(sitio);
    }
    return lista;
  }

  // ¿Puedo poner una barrera en (x, y)? Dentro de la zona de juego, lejos de torretas (a más de 62 px de su borde), sin pisar la base y a una
  // distancia de otra barrera (las que ya hay y las que acabo de calcular, "nuevas") que deje un hueco de HUECO_BARRERAS px para que mis soldados
  // puedan pasar y salir de detrás
  libre(x, y, nuevas = []) {
    const e = this.escena;
    const { width } = e.scale;
    if (x < 70 || x > width - 70 || y < 120 || y > (e.sueloAvion ?? 560) - 10) return false;
    const pisa = (o) => {
      if (o.tipo === 'circulo') return Phaser.Math.Distance.Between(x, y, o.x, o.y) < o.r + 62;
      if (o.barrera) {
        // Entre dos barreras queda siempre un hueco por donde pasar. Si la otra está girada uso una distancia, que no depende de su ángulo
        const girada = Math.abs(Math.sin(o.ang ?? 0)) > 0.3;
        return girada ? Phaser.Math.Distance.Between(x, y, o.x, o.y) < 120 : Math.abs(x - o.x) < GRUPO_SEPARACION && Math.abs(y - o.y) < 40;
      }
      return Math.abs(x - o.x) < o.w / 2 + 50 && Math.abs(y - o.y) < o.h / 2 + 24; // la base
    };
    return !e.obstaculos.lista().some(pisa) && !nuevas.some((n) => Math.abs(x - n.x) < GRUPO_SEPARACION && Math.abs(y - n.y) < 40);
  }

  // El lugar para una barrera lo más cerca posible de (x, y): ahí mismo si sirve y, si no, en anillos de 30, 60, 90... px
  sitioLibre(x, y, nuevas) {
    if (this.libre(x, y, nuevas)) return { x, y };
    for (let radio = 30; radio <= 180; radio += 30) {
      for (let paso = 0; paso < 12; paso++) {
        const angulo = (paso / 12) * Math.PI * 2;
        const px = x + Math.cos(angulo) * radio;
        const py = y + Math.sin(angulo) * radio;
        if (this.libre(px, py, nuevas)) return { x: px, y: py };
      }
    }
    return null;
  }

  // El lugar donde un soldado se esconde detrás de la barrera más cercana (a menos de "alcance" px y no más abajo que él): a 40 px de ella, del
  // lado contrario a la amenaza ("amenaza": un punto {x, y}; sin amenaza, el lado de abajo) y alineado con su ancho. La barrera puede estar
  // girada, así que todo se calcula con sus ejes. Si no hay ninguna barrera cerca, null
  cubiertaPara(a, alcance = 240, amenaza = null) {
    let mejor = null;
    let dmin = alcance;
    this.lista.forEach((b) => {
      if (!b.active || b.y > a.y + 60) return;
      const d = Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y);
      if (d < dmin) {
        dmin = d;
        mejor = b;
      }
    });
    if (!mejor) return null;
    const eje = { x: Math.cos(mejor.rotation), y: Math.sin(mejor.rotation) }; // a lo largo de la barrera
    const normal = { x: -eje.y, y: eje.x }; // de frente a ella (con el ángulo 0, hacia abajo)
    const lado = amenaza && (amenaza.x - mejor.x) * normal.x + (amenaza.y - mejor.y) * normal.y > 0 ? -1 : 1; // del lado contrario a la amenaza
    const a_lo_largo = Phaser.Math.Clamp((a.x - mejor.x) * eje.x + (a.y - mejor.y) * eje.y, -38, 38);
    return { x: mejor.x + eje.x * a_lo_largo + normal.x * 40 * lado, y: mejor.y + eje.y * a_lo_largo + normal.y * 40 * lado, barrera: mejor };
  }

  actualizar(dt) {
    const e = this.escena;
    const { height } = e.scale;
    this.lista = this.lista.filter((b) => b.active);
    this.lista.forEach((b) => {
      b.y += e.velTerreno * dt;
      if (b.y > height + MARGEN_BORRADO) return this.quitar(b);
      // La bala se pasa a las coordenadas de la barrera (sin girar) para ver si entró en su zona, aunque la barrera esté girada
      const cos = Math.cos(b.rotation);
      const sin = Math.sin(b.rotation);
      e.balasTierra.getChildren().forEach((bala) => {
        if (!bala.active) return;
        const dx = bala.x - b.x;
        const dy = bala.y - b.y;
        if (Math.abs(dx * cos + dy * sin) > ANCHO_GOLPE / 2 || Math.abs(-dx * sin + dy * cos) > ALTO_GOLPE / 2) return;
        bala.destroy();
        this.recibirGolpe(b);
      });
      this.dibujarVida(b);
    });
  }

  quitar(b) {
    b.barra?.destroy();
    b.destroy();
  }

  recibirGolpe(b) {
    if (!b.active) return;
    b.vida--;
    b.setTint?.(0xffc9a0); // el destello del golpe; después queda un tono más oscuro cuanto más dañada esté
    this.escena.time.delayedCall(90, () => b.active && this.pintarDano(b));
    if (b.vida <= 0) {
      this.escena.explosion(b.x, b.y, 0.5);
      this.quitar(b);
    }
  }

  pintarDano(b) {
    const k = b.vida / b.vidaMax;
    if (k > 0.6) b.clearTint?.();
    else b.setTint?.(k > 0.3 ? 0xd9c4a0 : 0xa8896a);
  }

  // La barrita de vida sobre la barrera, solo cuando ya le pegaron: verde, amarilla y roja
  dibujarVida(b) {
    const g = b.barra.clear();
    if (b.vida >= b.vidaMax) return;
    const k = Phaser.Math.Clamp(b.vida / b.vidaMax, 0, 1);
    g.fillStyle(0x000000, 0.65).fillRoundedRect(b.x - 24, b.y - 30, 48, 7, 3);
    g.fillStyle(k > 0.6 ? 0x5cff7a : k > 0.3 ? 0xffc83d : 0xff4a3d, 1).fillRoundedRect(b.x - 22, b.y - 28, 44 * k, 3, 1);
  }

  // Lo que le mando a Layla para su mapa: [id, x, y, vida, ángulo]
  foto() {
    return this.lista.filter((b) => b.active).map((b) => [b.idRed, Math.round(b.x), Math.round(b.y), b.vida, b.angulo ?? 0]);
  }
}
