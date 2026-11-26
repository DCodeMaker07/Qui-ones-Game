import Phaser from 'phaser';
import { COLOR, TXT, MARGEN, CAPA, estiloHud } from '../tema.js';
import { paralelogramo } from '../dibujo.js';
import { crearVidrio } from '../vidrio.js';
import BarraHabilidades from './BarraHabilidades.js';
import { nombreTecla, TECLAS, VIDA_JUGADOR } from '../../sistemas/nivel/constantes.js';

// HUD del piloto, al estilo de GTA IV: retrato con marco blanco abajo a la izquierda (ahí iría el radar), las barras
// inclinadas al lado, los números grandes con borde negro arriba a la derecha y el objetivo de la misión arriba a la izquierda.
// Yo no le pongo lógica del juego: cada fotograma leo el estado de la escena en actualizar() y repinto solo lo que cambió.

const RETRATO = 116;
const SESGO = 12; // cuánto se inclinan las barras
const SEG_ANCHO = 32; // 5 segmentos: uno por cada vida
const SEG_ALTO = 24;
const SEG_GAP = 5;

export default class Hud {
  constructor(escena) {
    this.escena = escena;
    this.avisos = new Map();
    this.pilotoHablando = false;
    this.parpadeoActivo = false;
    this.vidaPintada = -1;
    this.crear();
    this.parpadeo = escena.time.addEvent({ delay: 4500, loop: true, callback: () => this.parpadear() });
  }

  crear() {
    const e = this.escena;
    const { width, height } = e.scale;
    const x0 = MARGEN;
    const y0 = height - MARGEN - RETRATO;
    const xb = x0 + RETRATO + 24; // donde empiezan las barras
    const derecha = width - MARGEN;

    // Retrato de Quiñones: un marco de vidrio y el marco blanco encima
    this.gFondoRetrato = crearVidrio(e, x0 - 8, y0 - 8, RETRATO + 16, RETRATO + 16);
    this.retrato = e.add.sprite(x0, y0, 'retrato_quinones').setOrigin(0).setDisplaySize(RETRATO, RETRATO);
    this.gMarco = e.add.graphics();
    this.xRetrato = x0;
    this.yRetrato = y0;
    this.pintarMarco(COLOR.blanco);

    // Barra de vida (3 segmentos inclinados)
    this.etqVida = e.add.text(xb, y0 - 2, 'VIDA', estiloHud(20));
    this.gVida = e.add.graphics();
    this.xBarras = xb;
    this.yVida = y0 + 26;

    this.txtAliados = e.add.text(xb, y0 + 64, '', estiloHud(16));

    // Abajo al centro: las habilidades Q, W, E y R (ver BarraHabilidades)
    this.barra = new BarraHabilidades(e);

    // Arriba a la derecha: botiquines (número grande con el ícono) y, si el nivel tiene meta, el contador de posiciones
    this.iconoBotiquin = e.add.sprite(derecha - 24, MARGEN + 24, 'botiquin_suelo').setDisplaySize(48, 48);
    this.txtBotiquines = e.add.text(derecha - 58, MARGEN - 8, '', estiloHud(48)).setOrigin(1, 0);
    this.etqBotiquin = e.add.text(derecha, MARGEN + 46, '', estiloHud(13, { color: TXT.dorado, fontStyle: 'bold' })).setOrigin(1, 0);
    this.txtMeta = e.add.text(derecha, MARGEN + 74, '', estiloHud(40)).setOrigin(1, 0);
    this.etqMeta = e.add.text(derecha, MARGEN + 118, '', estiloHud(13, { color: TXT.dorado, fontStyle: 'bold' })).setOrigin(1, 0);

    // Arriba a la izquierda: el objetivo, con una flechita naranja como en las misiones de GTA
    this.flecha = e.add.triangle(MARGEN, MARGEN + 12, 0, 0, 0, 20, 16, 10, COLOR.naranja).setOrigin(0, 0.5);
    this.txtObjetivo = e.add.text(MARGEN + 26, MARGEN, '', estiloHud(24));

    // Arriba al centro: distancia a la base (solo en los niveles con base fija)
    if (e.cfg.baseFija) {
      this.txtKm = e.add.text(width / 2, MARGEN, '', estiloHud(18)).setOrigin(0.5, 0);
      this.gKm = e.add.graphics();
    }

    // Abajo a la derecha: los controles, que se apagan un poco pasado un rato
    this.txtControles = e.add
      .text(derecha, height - MARGEN + 6, `FLECHAS mover   ${nombreTecla(TECLAS.subir)}/${TECLAS.bajar} altura   ${TECLAS.radio} radio   ${TECLAS.botiquin} botiquín   ESC pausa`, estiloHud(13, { fontStyle: 'bold' }))
      .setOrigin(1, 1);
    e.time.delayedCall(14000, () => e.tweens.add({ targets: this.txtControles, alpha: 0.35, duration: 800 }));

    this.objetos = [
      this.gFondoRetrato, this.retrato, this.gMarco, this.etqVida, this.gVida, this.txtAliados,
      this.iconoBotiquin, this.txtBotiquines, this.etqBotiquin, this.txtMeta, this.etqMeta, this.flecha, this.txtObjetivo,
      this.txtKm, this.gKm, this.txtControles, ...this.barra.objetos,
    ].filter(Boolean);
    this.objetos.forEach((o) => o.setDepth(CAPA.hud));
    this.actualizar();
  }

  pintarMarco(color) {
    this.gMarco.clear().lineStyle(3, color, 1).strokeRect(this.xRetrato, this.yRetrato, RETRATO, RETRATO);
  }

  // ---------- se llama una vez por fotograma ----------

  actualizar() {
    const e = this.escena;
    this.pintarVida(e.vida);
    this.barra.actualizar();
    this.cambiarTexto(this.txtAliados, `ALIADOS ${e.aliados.countActive(true)}`);
    this.cambiarTexto(this.txtBotiquines, `×${e.botiquin.restantes}`);
    this.cambiarTexto(this.etqBotiquin, e.multijugador.hayLayla() ? 'PÍDELO A LAYLA' : `BOTIQUÍN [${TECLAS.botiquin}]`);
    this.cambiarTexto(this.txtObjetivo, this.textoObjetivo());
    if (e.cfg.meta) {
      this.cambiarTexto(this.txtMeta, `${e.destruidos}/${e.cfg.meta}`);
      this.cambiarTexto(this.etqMeta, 'POSICIONES');
    }
    if (this.txtKm) this.pintarDistanciaBase();
  }

  textoObjetivo() {
    const e = this.escena;
    if (e.especial.hayFuego()) return `Apaga el fuego con agua (${TECLAS.agua})`;
    if (e.cfg.meta) return 'Destruye las posiciones antiaéreas';
    if (e.picada.lista) return 'Lánzate en picada (ENTER)';
    if (e.fase === 'base') return `Pide refuerzos por radio (${TECLAS.radio})`;
    if (e.depositoCreado) return 'Destruye la base';
    return e.cfg.baseVidaMinima ? 'Avanza a la base' : 'Avanza a Quebrada Seca';
  }

  cambiarTexto(t, texto) {
    if (t.text !== texto) t.setText(texto);
  }

  pintarVida(vida) {
    const critica = vida === 1;
    if (vida === this.vidaPintada && !critica) return;
    this.vidaPintada = vida;
    const g = this.gVida.clear();
    const parpadeo = critica ? 0.55 + 0.45 * Math.sin(this.escena.time.now / 120) : 1;
    for (let i = 0; i < VIDA_JUGADOR; i++) {
      const x = this.xBarras + i * (SEG_ANCHO + SEG_GAP);
      paralelogramo(g, x - 3, this.yVida - 3, SEG_ANCHO + 6, SEG_ALTO + 6, SESGO, COLOR.blanco, 0.28); // el borde es de vidrio
      const lleno = i < vida;
      paralelogramo(g, x, this.yVida, SEG_ANCHO, SEG_ALTO, SESGO, lleno ? (critica ? COLOR.rojo : COLOR.verde) : COLOR.blanco, lleno ? parpadeo : 0.12);
    }
  }

  pintarDistanciaBase() {
    const { texto, progreso } = this.escena.baseEnemiga.estadoDistancia();
    this.cambiarTexto(this.txtKm, texto);
    const { width } = this.escena.scale;
    const ancho = 380;
    const x = width / 2 - ancho / 2;
    const y = MARGEN + 32;
    const g = this.gKm.clear();
    paralelogramo(g, x - 3, y - 3, ancho + 6, 18, SESGO, COLOR.blanco, 0.28);
    paralelogramo(g, x, y, ancho, 12, SESGO, COLOR.blanco, 0.12);
    paralelogramo(g, x, y, ancho * Phaser.Math.Clamp(progreso, 0, 1), 12, SESGO, COLOR.naranja, 1);
  }

  // ---------- eventos ----------

  // Cuando el avión recibe daño el retrato se pone rojo un momento
  flashDano() {
    this.retrato.setTint(0xff3b3b);
    this.pintarMarco(COLOR.rojo);
    this.escena.time.delayedCall(280, () => {
      this.retrato.clearTint();
      this.pintarMarco(COLOR.blanco);
    });
  }

  // Quiñones mueve la boca mientras habla por radio
  pilotoHabla(ms) {
    this.pilotoHablando = true;
    this.retrato.play('quinones_hablar', true);
    this.escena.time.delayedCall(ms, () => {
      this.pilotoHablando = false;
      this.retrato.stop();
      this.retrato.setTexture('retrato_quinones');
    });
  }

  parpadear() {
    if (this.pilotoHablando || this.escena.terminado) return;
    this.retrato.play('quinones_parpadeo');
    this.retrato.once('animationcomplete', () => {
      if (!this.pilotoHablando) this.retrato.setTexture('retrato_quinones');
    });
  }

  // ---------- avisos grandes que parpadean arriba, en el centro ----------

  mostrarAviso(id, texto, color = TXT.dorado) {
    this.quitarAviso(id);
    const { width } = this.escena.scale;
    const y = 120 + this.avisos.size * 78;
    const t = this.escena.add.text(width / 2, y, texto, estiloHud(26, { color, align: 'center', lineSpacing: 6 })).setOrigin(0.5).setDepth(CAPA.hud + 1);
    this.escena.tweens.add({ targets: t, alpha: 0.4, duration: 600, yoyo: true, repeat: -1 });
    this.avisos.set(id, t);
  }

  quitarAviso(id) {
    const t = this.avisos.get(id);
    if (!t) return;
    this.escena.tweens.killTweensOf(t);
    t.destroy();
    this.avisos.delete(id);
  }

  // Etiqueta chica para recordar que el avión no recibe daño (casilla de prueba de la sala)
  etiquetaPrueba(texto) {
    const { width, height } = this.escena.scale;
    this.objetos.push(this.escena.add.text(width / 2, height - 118, texto, estiloHud(13, { color: TXT.dorado, fontStyle: 'bold' })).setOrigin(0.5, 1).setDepth(CAPA.hud));
  }

  // Lo uso en el final del Nivel 3 para que solo se vea la base en llamas
  ocultar() {
    this.objetos.forEach((o) => o.setVisible(false));
    this.avisos.forEach((t) => t.setVisible(false));
  }
}
