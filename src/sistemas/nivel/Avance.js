import Phaser from 'phaser';
import { ESCALA, GAME } from '../../config.js';
import Objetivo from '../../entidades/Objetivo.js';
import { LINEA_PARADA } from './constantes.js';

// Cómo avanza el mapa. Va bajando mientras no haya torretas; cuando aparece un grupo y llega cerca del centro, el mapa
// frena (con una frenada suave) y no se mueve hasta que las destruyo todas. Entre grupo y grupo cuento el terreno que recorro
// sin torretas, y recién ahí sale la siguiente oleada.
export default class Avance {
  constructor(escena) {
    this.escena = escena;
    this.tNivel = 0; // segundos de avance, para calcular los km que faltan hasta la base
    this.recorrido = (escena.cfg.entreOleadas ?? 420) - 240; // la primera oleada sale enseguida
    this.estabaParado = false;
    this.torretasVivas = 0;
    this.textoAviso = '';
  }

  actualizar(dt) {
    const e = this.escena;
    this.frenarPorTorretas(dt);
    e.fondo.tilePositionY -= e.velTerreno * dt;
    // El progreso hacia la base depende del terreno que recorro: con el mapa frenado no avanza
    if (e.fase === 'avance') this.tNivel += dt * (e.velTerreno / GAME.scrollSpeed);
    this.generarOleadas(dt);
  }

  frenarPorTorretas(dt) {
    const e = this.escena;
    const torretas = e.objetivos.filter((o) => o.activo && o.arma);
    this.torretasVivas = torretas.length;
    if (e.fase !== 'avance' || e.baseEnemiga.frenando) return this.ocultarAviso();

    // El mapa se frena cuando las torretas llegan al centro y también mientras haya fuego de la R en pantalla: mis soldados
    // no pasan por las llamas, así que no se avanza hasta que lo apague con agua
    const fuego = e.especial.hayFuego();
    const detener = fuego || (torretas.length > 0 && torretas.every((o) => o.y >= LINEA_PARADA));
    const meta = detener ? 0 : GAME.scrollSpeed;
    const paso = (GAME.scrollSpeed / 0.7) * dt; // arranca y frena en 0,7 s
    e.velTerreno = meta > e.velTerreno ? Math.min(meta, e.velTerreno + paso) : Math.max(meta, e.velTerreno - paso);

    const parado = e.velTerreno < 5;
    if (parado && !this.estabaParado) e.time.delayedCall(1200, () => e.soldados.crearEscuadra()); // la infantería llega cuando se frena el frente
    this.estabaParado = parado;

    if (detener && parado && !fuego) {
      const texto = `DESTRUYE TODAS LAS TORRETAS PARA AVANZAR (${torretas.length})`;
      if (texto !== this.textoAviso) e.hud.mostrarAviso('avance', texto);
      this.textoAviso = texto;
    } else {
      this.ocultarAviso();
    }
  }

  ocultarAviso() {
    if (!this.textoAviso) return;
    this.escena.hud.quitarAviso('avance');
    this.textoAviso = '';
  }

  // Cuando no hay torretas cuento el terreno recorrido y al llegar a la distancia del nivel sale otro grupo
  generarOleadas(dt) {
    const e = this.escena;
    if (e.terminado || e.fase !== 'avance' || e.depositoCreado) return;
    if (e.objetivos.some((o) => o.activo && o.arma)) {
      this.recorrido = 0;
      return;
    }
    this.recorrido += e.velTerreno * dt;
    if (this.recorrido >= (e.cfg.entreOleadas ?? 420)) {
      this.recorrido = 0;
      this.crearOleada();
    }
  }

  // Un grupo de torretas en columnas distintas y a alturas parecidas, para que al frenar queden todas cerca del centro
  crearOleada() {
    const e = this.escena;
    const [min, max] = e.cfg.oleada ?? [1, 2];
    let n = Phaser.Math.Between(min, max);
    if (e.cfg.meta) n = Math.min(n, e.cfg.meta - e.destruidos); // no más de las que faltan para ganar
    if (n <= 0) return;
    const { width } = e.scale;
    Phaser.Utils.Array.Shuffle([-360, -180, 0, 180, 360])
      .slice(0, n)
      .forEach((dx) => {
        const x = Phaser.Math.Clamp(width / 2 + dx + Phaser.Math.Between(-40, 40), 70, width - 70);
        const y = e.yNido - Phaser.Math.Between(0, 100);
        e.objetivos.push(new Objetivo(e, x, y, { vida: 3, radio: 34, escala: ESCALA.nido }));
        e.soldadosEnemigos.guarnicion(x, y, 2); // dos soldados cuidan cada nido
      });
  }
}
