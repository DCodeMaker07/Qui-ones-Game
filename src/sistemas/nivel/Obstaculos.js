import Phaser from 'phaser';
import { BLOQUEO_BASE } from './constantes.js';

// Lo que los soldados no pueden atravesar: las barreras, las torretas y la base. Los soldados, en vez de pasar por encima, rodean el
// obstáculo (desviar) y, si un obstáculo aparece justo encima de ellos, salen de él (salida). El fuego de la R lo tratan Aliados y
// BombardeoEspecial aparte, porque además quema. Cada obstáculo es un círculo (las torretas) o un rectángulo (las barreras y la base).
const PASO = 46; // hasta dónde miro adelante para ver si me voy a chocar
const MARGEN = 14; // el "cuerpo" del soldado: se le suma al obstáculo
const ANCHO_BARRERA = 92;
const ALTO_BARRERA = 28;

export default class Obstaculos {
  constructor(escena) {
    this.escena = escena;
    this.cuadro = -1;
    this.cache = [];
  }

  // La lista de obstáculos de este fotograma (se arma una sola vez por fotograma). Cada uno dice quién es su dueño, para poder ignorar al
  // objetivo al que un soldado se está acercando a propósito
  lista(soloBarreras = false) {
    const e = this.escena;
    const cuadro = e.game.getFrame();
    if (this.cuadro !== cuadro) {
      this.cuadro = cuadro;
      const l = [];
      e.barreras?.lista.forEach((b) => b.active && l.push({ tipo: 'rect', barrera: true, x: b.x, y: b.y, w: ANCHO_BARRERA, h: ALTO_BARRERA, ang: b.rotation, dueno: b }));
      e.objetivos.forEach((o) => {
        if (!o.activo) return;
        if (o.jefe) {
          // La base es enorme: toda la caja de su dibujo, agrandada BLOQUEO_BASE px por cada lado. Es la "figura invisible" que mis soldados no
          // pisan, así se paran afuera al pie de la muralla y atacan desde ahí
          const caja = o.base.getBounds();
          l.push({ tipo: 'rect', x: caja.centerX, y: caja.centerY, w: caja.width + BLOQUEO_BASE * 2, h: caja.height + BLOQUEO_BASE * 2, dueno: o });
        } else {
          l.push({ tipo: 'circulo', x: o.x, y: o.y, r: o.radio * 0.85, dueno: o });
        }
      });
      // Las marcas de PELIGRO de Layla son zonas que mis soldados no pisan (y si quedaron dentro, salen). No frenan a los soldados enemigos
      e.multijugador?.marcas.filter((m) => m.tipo === 'peligro').forEach((m) => l.push({ tipo: 'circulo', x: m.x, y: m.y, r: 95, dueno: m }));
      this.cache = l;
    }
    return soloBarreras ? this.cache.filter((o) => o.barrera) : this.cache;
  }

  dentro(o, x, y, margen) {
    if (o.tipo === 'rect') {
      // Un rectángulo puede estar girado (las barreras de Layla): paso el punto a sus coordenadas, sin girar, y ahí comparo como siempre
      let lx = x - o.x;
      let ly = y - o.y;
      if (o.ang) {
        const cos = Math.cos(o.ang);
        const sin = Math.sin(o.ang);
        [lx, ly] = [lx * cos + ly * sin, -lx * sin + ly * cos];
      }
      return Math.abs(lx) < o.w / 2 + margen && Math.abs(ly) < o.h / 2 + margen;
    }
    return Phaser.Math.Distance.Between(x, y, o.x, o.y) < o.r + margen;
  }

  // ¿Hay un obstáculo en (x, y)? "ignorar" es un dueño (o varios) que no cuentan
  choca(x, y, ignorar = [], soloBarreras = false) {
    return this.lista(soloBarreras).some((o) => !ignorar.includes(o.dueno) && this.dentro(o, x, y, MARGEN));
  }

  // Si caminando con este rumbo me voy a chocar, busca el rumbo libre más cercano (girando cada vez más a un lado y al otro). Devuelve el
  // rumbo, o null si no hay salida y conviene quedarse quieto. "giro" es el lado preferido (1 o -1), para no zigzaguear
  desviar(x, y, rumbo, ignorar = [], giro = 1, soloBarreras = false) {
    if (!this.choca(x + Math.cos(rumbo) * PASO, y + Math.sin(rumbo) * PASO, ignorar, soloBarreras)) return rumbo;
    for (const abertura of [0.6, 1.2, 1.8, 2.4]) {
      for (const signo of [giro, -giro]) {
        const otro = rumbo + signo * abertura;
        if (!this.choca(x + Math.cos(otro) * PASO, y + Math.sin(otro) * PASO, ignorar, soloBarreras)) return otro;
      }
    }
    return null;
  }

  // Si (x, y) quedó dentro de un obstáculo (por ejemplo, pusieron una barrera encima del soldado), el rumbo más corto para salir; si no, null
  salida(x, y, ignorar = []) {
    const o = this.lista().find((u) => !ignorar.includes(u.dueno) && this.dentro(u, x, y, 0));
    if (!o) return null;
    return Math.atan2(y - o.y, x - o.x) || (o.tipo === 'rect' ? Math.PI / 2 : 0);
  }
}
