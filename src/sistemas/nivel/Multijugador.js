import Phaser from 'phaser';
import { RED } from '../../config.js';
import { ambiente } from '../efectos/Ambiente.js';
import { playSfx } from '../audio/audio.js';
import { FUENTE } from '../../ui/tema.js';
import { esPedidoRefuerzos } from '../../ui/nivel/Radio.js';
import { PX_POR_KM, TECLAS, nombreTecla } from './constantes.js';

// Mi lado del modo multijugador. Yo soy el piloto: mi navegador corre todo el juego y le manda una "foto" del campo de batalla
// a Layla unas 10 veces por segundo. Ella me responde con marcas, órdenes, botiquines, refuerzos y mensajes de radio.
// Si Layla se desconecta, vuelve la asistente automática.
const COLOR_MARCA = { bomba: 0xff4a3d, peligro: 0xffc83d, aliados: 0x4dff88 };
const NOMBRE_MARCA = { bomba: 'BOMBA', peligro: 'PELIGRO', aliados: 'ALIADOS' };

export default class Multijugador {
  constructor(escena) {
    this.escena = escena;
    this.red = escena.game.red;
    this.marcas = [];
    this.idMarca = 0;
    this.ignorarHasta = 0; // las marcas con id hasta este número ya no guían a los soldados (Layla les dio una orden después)
    this.tEnvio = 0;
    this.refuerzosAvisados = false;
    this.grafico = escena.add.graphics().setDepth(5.7);
    if (escena.multi) this.escucharRed();
  }

  // ¿Hay una Layla humana conectada? Si no, la asistente automática hace su trabajo
  hayLayla() {
    return this.escena.multi && !!this.red?.activa && this.red.companero;
  }

  // Le aviso algo a Layla (por ejemplo "picada"). Si no estoy en multijugador no hago nada
  avisar(tipo, datos = {}) {
    if (this.escena.multi && this.red?.activa) this.red.enviar({ t: 'evento', tipo, ...datos });
  }

  // La pausa también congela a Layla (su mapa se detiene y no puede dar órdenes hasta que reanude)
  avisarPausa(pausado) {
    this.avisar('pausa', { pausado });
  }

  escucharRed() {
    const e = this.escena;
    const ev = this.red.ev;
    const escuchas = {
      radio: (m) => this.alRadioDeLayla(m),
      marca: (m) => this.alMarcaDeLayla(m),
      orden: (m) => this.alOrdenDeLayla(m),
      botiquin: (m) => e.botiquin.pedir({ x: m.x, y: m.y }),
      barrera: (m) => e.barreras.colocar(Phaser.Math.Clamp(Number(m.x) || 0, 20, e.scale.width - 20), Phaser.Math.Clamp(Number(m.y) || 0, 40, e.scale.height - 40), Phaser.Math.Wrap(Math.round(Number(m.a) || 0), 0, 360)),
      refuerzos: () => e.fase === 'base' && e.baseEnemiga.llamarRefuerzos(false),
      companero: (m) => !m.conectado && e.radio.mostrar('Layla se desconectó: vuelve la asistente automática.', { duracion: 4500 }),
    };
    Object.entries(escuchas).forEach(([tipo, fn]) => ev.on(tipo, fn));
    e.events.once('shutdown', () => Object.entries(escuchas).forEach(([tipo, fn]) => ev.off(tipo, fn)));
    e.radio.mostrar(`Layla está en la mesa de mando. Habla con ella pulsando ${nombreTecla(TECLAS.radio)}.`, { duracion: 4500 });
  }

  // Hablo yo (voz a texto): Layla lo recibe escrito y lo oye con voz sintetizada según el género de mi DNI
  hablarPorRadio() {
    const e = this.escena;
    const voz = e.game.voice;
    if (!voz?.soportado) return e.radio.mostrar('Tu navegador no soporta voz. Usa Chrome o Edge.');
    ambiente.pulso('#4aa3ff', 1500, 2);
    e.radio.mostrar('Escuchando...', { duracion: 6000 });
    voz.escuchar({
      onTexto: (dicho) => {
        e.hud.pilotoHabla(1500);
        e.radio.mostrar('Tú: ' + dicho, { duracion: 3500 });
        this.red.enviar({ t: 'radio', texto: dicho, genero: voz.genero });
        if (e.fase === 'base' && esPedidoRefuerzos(dicho)) this.avisarRefuerzos();
      },
      onError: (mensaje) => e.radio.mostrar(mensaje),
    });
  }

  avisarRefuerzos() {
    const e = this.escena;
    if (this.refuerzosAvisados) return;
    this.refuerzosAvisados = true;
    this.avisar('pideRefuerzos');
    e.radio.mostrar('Mensaje enviado. Esperando a que Layla envíe los refuerzos.', { duracion: 5000 });
    // Si Layla no responde llegan igual, para no dejar la partida atascada
    e.time.delayedCall(45000, () => e.fase === 'base' && !e.terminado && e.baseEnemiga.llamarRefuerzos(true));
  }

  // Layla habla o escribe: yo la oigo con voz de mujer, sea quien sea la persona que lo dice
  alRadioDeLayla(m) {
    const e = this.escena;
    const texto = String(m.texto ?? '').slice(0, 140);
    if (!texto) return;
    e.radio.mostrar('Layla: ' + texto, { duracion: Math.max(4000, texto.length * 70) });
    e.game.voice?.hablar(texto, undefined, 'M');
  }

  // La marca más reciente de un tipo que todavía guía a los soldados (si no, null)
  ultimaMarca(tipo) {
    return this.marcas.filter((m) => m.tipo === tipo && m.id > this.ignorarHasta).sort((p, q) => q.id - p.id)[0] ?? null;
  }

  alOrdenDeLayla(m) {
    const e = this.escena;
    if (m.tipo === 'avanzar' || m.tipo === 'mantener') this.ignorarHasta = this.idMarca; // una orden nueva pasa por encima de las marcas que ya había
    if (m.tipo === 'atacar') {
      const objetivo = e.objetivos.find((o) => o.activo && o.id === m.id);
      if (!objetivo) return;
      e.soldados.orden = { tipo: 'atacar', id: objetivo.id };
      e.radio.mostrar(objetivo.jefe ? 'Layla: los soldados atacan la base.' : 'Layla: los soldados atacan el nido.', { duracion: 3000 });
    } else if (m.tipo === 'avanzar' || m.tipo === 'mantener') {
      e.soldados.orden = { tipo: m.tipo, id: null };
      e.radio.mostrar(m.tipo === 'avanzar' ? 'Layla: los soldados avanzan.' : 'Layla: los soldados mantienen la posición.', { duracion: 3000 });
    }
  }

  // ---------- marcas que me pone Layla en el suelo ----------

  alMarcaDeLayla(m) {
    if (m.tipo === 'borrar') return this.quitarMarca(m.id);
    if (!COLOR_MARCA[m.tipo]) return;
    const e = this.escena;
    const { width, height } = e.scale;
    if (this.marcas.length >= 6) this.quitarMarca(this.marcas[0].id);
    const marca = {
      id: ++this.idMarca,
      tipo: m.tipo,
      x: Phaser.Math.Clamp(Number(m.x) || 0, 20, width - 20),
      y: Phaser.Math.Clamp(Number(m.y) || 0, -560, height + 60),
      t: 0,
    };
    marca.texto = e.add
      .text(0, 0, '', { fontFamily: FUENTE, fontStyle: 'bold', fontSize: '11px', color: '#ffffff', stroke: '#000', strokeThickness: 4 })
      .setOrigin(0.5)
      .setDepth(5.8);
    this.marcas.push(marca);
    // Los soldados le hacen caso a las marcas de Layla (ver Aliados): van al objetivo que marcó, se reúnen donde dice "aliados aquí" y evitan el peligro
    const aviso = {
      bomba: 'Layla: los soldados van hacia el objetivo marcado.',
      aliados: 'Layla: los soldados se reúnen en la marca.',
      peligro: 'Layla: los soldados evitan la zona de peligro.',
    }[m.tipo];
    if (aviso) e.radio.mostrar(aviso, { duracion: 2800 });
    ambiente.pulso('#ffd35a', 500, 0);
    playSfx(e, 'sfx_menu_mover', { volume: 0.6 });
  }

  quitarMarca(id) {
    const i = this.marcas.findIndex((m) => m.id === id);
    if (i < 0) return;
    this.marcas[i].texto.destroy();
    this.marcas.splice(i, 1);
  }

  // Si ya bombardeé una marca de "bomba", la borro
  quitarMarcasDeBomba(x, y) {
    this.marcas.filter((m) => m.tipo === 'bomba' && Phaser.Math.Distance.Between(x, y, m.x, m.y) < 90).forEach((m) => this.quitarMarca(m.id));
  }

  // Dibujo cada marca como un anillo que late en el suelo (baja con el terreno). Si quedó arriba de la pantalla, pongo una
  // flecha en el borde de arriba. Las dos dicen la distancia en km.
  actualizarMarcas(dt) {
    const e = this.escena;
    const g = this.grafico.clear();
    if (!this.marcas.length) return;
    const { width } = e.scale;
    const j = e.jugador;
    [...this.marcas].forEach((m) => {
      m.y += e.velTerreno * dt;
      m.t += dt;
      if (m.t > 40) return this.quitarMarca(m.id);
      const color = COLOR_MARCA[m.tipo];
      const km = Phaser.Math.Distance.Between(j.x, j.y, m.x, m.y) / PX_POR_KM;
      const etiqueta = `${NOMBRE_MARCA[m.tipo]}  ${km.toFixed(1)} km`;
      if (m.y > 36) {
        const pulso = 0.5 + 0.5 * Math.sin(m.t * 6);
        g.lineStyle(3, color, 0.9).strokeCircle(m.x, m.y, 26 + 6 * pulso);
        g.lineStyle(2, color, 0.9);
        g.beginPath();
        g.moveTo(m.x - 12, m.y);
        g.lineTo(m.x + 12, m.y);
        g.moveTo(m.x, m.y - 12);
        g.lineTo(m.x, m.y + 12);
        g.strokePath();
        m.texto.setPosition(m.x, m.y + 44).setText(etiqueta);
      } else {
        const x = Phaser.Math.Clamp(m.x, 40, width - 40);
        const y = x < 470 ? 176 : 70; // lejos del objetivo del HUD
        g.fillStyle(color, 0.9).fillTriangle(x, y, x - 12, y + 20, x + 12, y + 20);
        m.texto.setPosition(x, y + 34).setText(etiqueta);
      }
    });
  }

  // ---------- la foto para Layla ----------

  enviarEstado(dt) {
    const e = this.escena;
    if (!this.hayLayla()) return;
    this.tEnvio += dt;
    if (this.tEnvio < 1 / RED.envioPorSegundo) return;
    this.tEnvio = 0;
    const r = Math.round;
    const j = e.jugador;
    const conBase = e.cfg.baseFija;
    const distancia = conBase && e.fase === 'avance' ? e.baseEnemiga.distanciaPx() : 0;
    this.red.enviar({
      t: 'estado',
      nv: e.scene.key,
      fase: e.fase,
      vel: r(e.velTerreno),
      j: { x: r(j.x), y: r(j.y), v: e.vida, r: +j.rotation.toFixed(2), n: e.altura.nivel }, // r: hacia dónde apunta el avión
      o: e.objetivos.filter((o) => o.activo).map((o) => [o.id, r(o.x), r(o.y), +o.vida.toFixed(1), o.jefe ? 1 : 0]),
      e: e.enemigos.getChildren().map((a) => [a.idRed, r(a.x), r(a.y)]),
      a: e.aliados.getChildren().map((a) => [a.idRed, r(a.x), r(a.y), a.vida]),
      s: e.soldadosEnemigos.foto(), // soldados enemigos
      r: e.barreras.foto(), // barreras de los aliados
      br: e.barreras.restantes,
      bre: e.barreras.esperaRestante(),
      b: e.botiquin.lista.filter((b) => b.active && b.estado === 'suelo').map((b) => [b.idRed, r(b.x), r(b.y)]),
      m: this.marcas.map((m) => [m.id, m.tipo, r(m.x), r(m.y)]),
      bq: e.botiquin.restantes,
      esp: e.botiquin.esperaRestante(),
      km: conBase ? +(distancia / PX_POR_KM).toFixed(2) : null,
      prog: conBase ? (e.fase === 'avance' ? 1 - Math.min(1, distancia / e.baseEnemiga.distanciaTotal) : 1) : e.cfg.meta ? e.destruidos / e.cfg.meta : 0,
      meta: e.cfg.meta ? `OBJETIVOS  ${e.destruidos}/${e.cfg.meta}` : '',
      ref: e.fase === 'refuerzos' ? 1 : 0,
      fu: e.especial.fuegos.slice(-60).map((f) => [r(f.x), r(f.y)]), // el rastro de fuego del bombardeo especial
      pl: e.picada.lista ? 1 : 0, // la base ya está lista para la picada
      tq: e.avance.torretasVivas, // torretas vivas
      det: e.fase === 'avance' && e.velTerreno < 5 && e.avance.torretasVivas > 0 ? 1 : 0, // mapa detenido por ellas
    });
  }
}
