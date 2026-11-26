import Phaser from 'phaser';
import { ESCALA_JUGADOR, RADIO_BOMBA } from './constantes.js';

// La guía de puntería de la bomba: una línea punteada baja desde el avión hasta donde va a explotar, con una gotita que cae
// y un círculo con la cruz que late. La dibujo semitransparente para que no estorbe.
//   verde = le doy a un objetivo   rojo = lastimo a mis soldados   blanco = no le doy a nada
export default class GuiaBomba {
  constructor(escena) {
    this.escena = escena;
    this.grafico = escena.add.graphics().setDepth(5.5).setAlpha(0.35);
    this.t = 0;
    this.distanciaInicial = 0;
  }

  // Latido "lub-dub": un golpe fuerte, otro más suave y un descanso. Dura 1 s y devuelve un valor entre 0 y 1
  latido() {
    const t = this.t % 1.0;
    const golpe = (centro, ancho) => Math.sin((Math.max(0, 1 - Math.abs(t - centro) / ancho) * Math.PI) / 2);
    return Math.max(golpe(0.1, 0.1), 0.65 * golpe(0.38, 0.09));
  }

  dibujar(dt) {
    const e = this.escena;
    this.t += dt;
    this.grafico.setAlpha(e.habilidades.esperaBomba > 0 ? 0.12 : 0.35); // casi invisible mientras la bomba se recarga
    const g = this.grafico.clear();
    const j = e.jugador;
    const x = j.x;
    const y0 = j.y + 26 * ESCALA_JUGADOR;
    // La bomba cae 220 px en 0,7 s y el terreno avanza mientras tanto, así que calculo dónde estará el punto de impacto
    const yImpacto = j.y + 240 - e.velTerreno * 0.7;
    if (yImpacto <= y0 + 10) return;

    const acierta = e.objetivos.some((o) => o.activo && Phaser.Math.Distance.Between(x, yImpacto, o.x, o.y) < RADIO_BOMBA + o.radio);
    const amigos = !acierta && e.aliados.getChildren().some((a) => Phaser.Math.Distance.Between(x, yImpacto, a.x, a.y) < 45);
    const color = acierta ? 0x5cff7a : amigos ? 0xff5c5c : 0xffffff;

    const CICLO = 0.95; // 0,7 s de caída y una pausa corta
    const t = this.t % CICLO;
    const u = Math.min(1, t / 0.7);
    const caida = u * u; // acelera como una bomba de verdad

    // Línea punteada con los guiones corriendo hacia abajo
    const fase = (this.t * 70) % 14;
    g.lineStyle(2, color, 1);
    for (let y = y0 - 14 + fase; y < yImpacto - 4; y += 14) {
      const ya = Math.max(y, y0);
      const yb = Math.min(y + 7, yImpacto);
      if (yb > ya) this.linea(g, x, ya, x, yb);
    }
    // Marcas de distancia
    for (let y = y0 + 60; y < yImpacto - 10; y += 60) this.linea(g, x - 8, y, x + 8, y);

    // Gotita cayendo con su estela
    const yGota = y0 + (yImpacto - y0) * caida;
    if (t <= 0.7) {
      g.lineStyle(3, color, 0.6);
      this.linea(g, x, Math.max(y0, yGota - 36 * u), x, yGota - 10);
      g.fillStyle(color, 1).fillCircle(x, yGota, 5);
      g.fillTriangle(x, yGota - 15, x - 4.5, yGota - 3, x + 4.5, yGota - 3);
    }

    // Círculo de la explosión: el anillo de afuera se cierra mientras cae la gota y al llegar sale una onda
    const pulso = this.latido();
    g.fillStyle(color, 0.14 + 0.14 * pulso).fillCircle(x, yImpacto, RADIO_BOMBA);
    g.lineStyle(2, color, 1).strokeCircle(x, yImpacto, RADIO_BOMBA);
    if (t <= 0.7) g.lineStyle(2, color, 0.35 + 0.65 * caida).strokeCircle(x, yImpacto, RADIO_BOMBA * (1.9 - 0.9 * caida));
    if (t > 0.7) {
      const s = (t - 0.7) / (CICLO - 0.7);
      g.lineStyle(3, color, 1 - s).strokeCircle(x, yImpacto, RADIO_BOMBA * (1 + 0.45 * s));
    }
    this.cruzQueLate(g, x, yImpacto, color, pulso);
  }

  // Durante la picada la guía se queda fijada en la base y sigue al avión mientras cae sobre ella
  fijarEnBase() {
    this.distanciaInicial = Phaser.Math.Distance.Between(this.escena.jugador.x, this.escena.jugador.y, this.escena.baseObj.x, this.escena.baseObj.y);
    this.grafico.setAlpha(0.7);
  }

  dibujarPicada(dt) {
    const e = this.escena;
    this.t += dt;
    const g = this.grafico.clear();
    const j = e.jugador;
    const b = e.baseObj;
    if (!b?.activo || !j.visible) return;
    const dx = b.x - j.x;
    const dy = b.y - j.y;
    const d = Math.hypot(dx, dy);
    if (d < 6) return;
    const ux = dx / d;
    const uy = dy / d;
    const color = 0x5cff7a;
    const R = Math.max(RADIO_BOMBA, b.radio * 0.6);
    const cerca = Phaser.Math.Clamp(d / (this.distanciaInicial || d), 0, 1); // 1 = lejos, 0 = encima
    const pulso = this.latido();

    // Línea punteada con los guiones corriendo hacia la base
    g.lineStyle(2, color, 1);
    const fase = (this.t * 90) % 16;
    for (let s = fase - 16; s < d - R * 0.5; s += 16) {
      const a = Math.max(s, 0);
      const fin = Math.min(s + 8, d - R * 0.5);
      if (fin > a) this.linea(g, j.x + ux * a, j.y + uy * a, j.x + ux * fin, j.y + uy * fin);
    }
    // Gotita que cae por la línea
    const u = (this.t % 0.7) / 0.7;
    const px = j.x + ux * d * u * u;
    const py = j.y + uy * d * u * u;
    g.fillStyle(color, 1).fillCircle(px, py, 5);
    g.fillTriangle(px - ux * 15, py - uy * 15, px - uy * 4.5 - ux * 3, py + ux * 4.5 - uy * 3, px + uy * 4.5 - ux * 3, py - ux * 4.5 - uy * 3);

    // Círculo de impacto con el anillo de afuera que se cierra al acercarse el avión
    g.fillStyle(color, 0.14 + 0.14 * pulso).fillCircle(b.x, b.y, R);
    g.lineStyle(2, color, 1).strokeCircle(b.x, b.y, R);
    g.lineStyle(2, color, 0.35 + 0.65 * (1 - cerca)).strokeCircle(b.x, b.y, R * (1 + 1.3 * cerca));
    this.cruzQueLate(g, b.x, b.y, color, pulso);
  }

  // La cruz del centro se hincha y se engrosa con cada latido, como un corazón bombeando
  cruzQueLate(g, x, y, color, pulso) {
    const brazo = 8 + 9 * pulso;
    g.fillStyle(color, 0.35 * pulso).fillCircle(x, y, 10 + 16 * pulso);
    g.lineStyle(1.5, color, 0.8 * pulso).strokeCircle(x, y, 14 + 22 * pulso);
    g.lineStyle(2 + 2.5 * pulso, color, 1);
    g.beginPath();
    g.moveTo(x - brazo, y);
    g.lineTo(x + brazo, y);
    g.moveTo(x, y - brazo);
    g.lineTo(x, y + brazo);
    g.strokePath();
  }

  linea(g, x1, y1, x2, y2) {
    g.beginPath();
    g.moveTo(x1, y1);
    g.lineTo(x2, y2);
    g.strokePath();
  }
}
