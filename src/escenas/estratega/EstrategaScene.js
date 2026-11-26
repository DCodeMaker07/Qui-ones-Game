import { VIDA_JUGADOR } from '../../sistemas/nivel/constantes.js';
import Phaser from 'phaser';
import { FUENTE, FUENTE_TITULO, GAME } from '../../config.js';
import { iniciarPista, detenerPista } from '../../sistemas/audio/pistas.js';
import TorreControl, { BANDA, VIGA } from './TorreControl.js';

// Vista de Layla (estratega) en el modo multijugador: la TORRE DE CONTROL. Arriba, el ventanal con aviones que pasan; abajo,
// el escritorio con el mapa del campo de batalla y el panel de la torre (pantallas, botones y radio). El mapa se actualiza
// en tiempo real,
// en tiempo real. El piloto (Quiñones) envía una "foto" del campo de batalla ~10 veces por segundo (mensaje 'estado')
// y Layla le responde con marcas, órdenes a los soldados, botiquines, refuerzos y mensajes por radio.
//
// Mapa: ancho = 1280 px del juego, alto = 1280 px de mundo (de y = -560 a y = 720). El tramo y < 0 es lo que el
// piloto todavía NO ve en su pantalla: la ventaja de información de Layla.
const MAPA = { x: 36, y: BANDA + VIGA + 10, w: 512, h: 512, esc: 0.4, adelante: 560 };
const K = MAPA.esc / 0.5; // las fichas se dibujaron para una escala de 0,5: se ajustan a la del mapa
const PANEL = { x: 580, y: BANDA + VIGA + 6, w: 664, h: 528 };
const FUENTE_UI = '"Nunito", "Segoe UI", Arial, sans-serif';
// Escenas del piloto en las que Layla también entra (id de la escena del piloto -> id de la que ve Layla; el mismo id
// significa una escena COMPARTIDA, donde ambos se turnan las líneas)
const PARALELAS = { fin_nivel1: 'fin_nivel1', fin_nivel2: 'fin_nivel2' };
const ESCENAS = {
  CutsceneScene: 'una escena de diálogo',
  TitleScene: 'el menú',
  EndScene: 'la pantalla final',
  EndingScene: 'el final del juego',
  DespegueScene: 'el despegue',
  Level1Scene: 'el Nivel 1',
  Level2Scene: 'el Nivel 2',
  Level3Scene: 'el Nivel 3',
  FinalAlternativoScene: 'el final alternativo',
};

function crearPapel(scene) {
  if (scene.textures.exists('papel')) return;
  const S = MAPA.w;
  const c = scene.textures.createCanvas('papel', S, S);
  const ctx = c.getContext();
  const g = ctx.createLinearGradient(0, 0, S, S);
  g.addColorStop(0, '#dcc99b');
  g.addColorStop(1, '#c9b384');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  for (let i = 0; i < 2500; i++) {
    ctx.fillStyle = `rgba(90,60,25,${Math.random() * 0.07})`;
    ctx.fillRect(Math.random() * S, Math.random() * S, 1 + Math.random() * 2, 1 + Math.random() * 2);
  }
  // Cuadrícula (cada 128 px de mundo)
  ctx.strokeStyle = 'rgba(80,52,22,0.28)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= S + 0.5; i += S / 10) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, S);
    ctx.moveTo(0, i);
    ctx.lineTo(S, i);
    ctx.stroke();
  }
  // Dobleces del papel
  ctx.fillStyle = 'rgba(60,40,15,0.12)';
  ctx.fillRect(S / 2 - 1, 0, 2, S);
  ctx.fillRect(0, S / 2 - 1, S, 2);
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(S / 2 + 1, 0, 1, S);
  ctx.fillRect(0, S / 2 + 1, S, 1);
  // Bordes envejecidos
  const b = ctx.createRadialGradient(S / 2, S / 2, S * 0.38, S / 2, S / 2, S * 0.75);
  b.addColorStop(0, 'rgba(70,45,15,0)');
  b.addColorStop(1, 'rgba(70,45,15,0.38)');
  ctx.fillStyle = b;
  ctx.fillRect(0, 0, S, S);
  c.refresh();
}

export default class EstrategaScene extends Phaser.Scene {
  constructor() {
    super('EstrategaScene');
  }

  init() {
    this.estado = null;
    this.tUltimo = 0;
    this.vel = 0;
    this.fichas = { o: new Map(), e: new Map(), s: new Map(), a: new Map(), b: new Map(), r: new Map(), m: new Map() };
    this.herramienta = 'marca-bomba';
    this.registroRadio = [];
    this.pideRefuerzos = false;
    this.escenaPiloto = null;
    this.escuchandoVoz = false;
    this.pausa = false; // el piloto pausó la partida
    this.derribado = false; // el piloto perdió y está en la pantalla de derrota (puede reintentar)
    this.picada = false; // el piloto se lanzó en picada: final del Nivel 3
  }

  create() {
    const { width, height } = this.scale;
    this.red = this.game.red;
    crearPapel(this);
    this.torre = new TorreControl(this); // ventanal con aviones, viga y escritorio
    iniciarPista(this, 'musica_dialogo', 0.35, 2500); // ambiente suave mientras espera

    // Sombra y papel del mapa; el terreno del juego, desvaído, anima el avance
    const marco = this.add.graphics().setDepth(1.6); // marco metálico de la mesa cartográfica
    marco.fillStyle(0x000000, 0.5).fillRoundedRect(MAPA.x - 2, MAPA.y + 2, MAPA.w + 20, MAPA.h + 20, 10);
    marco.fillStyle(0x1b2027, 1).fillRoundedRect(MAPA.x - 10, MAPA.y - 10, MAPA.w + 20, MAPA.h + 20, 10);
    marco.lineStyle(2, 0x59626e, 1).strokeRoundedRect(MAPA.x - 10, MAPA.y - 10, MAPA.w + 20, MAPA.h + 20, 10);
    [[-5, -5], [MAPA.w + 5, -5], [-5, MAPA.h + 5], [MAPA.w + 5, MAPA.h + 5]].forEach(([dx, dy]) => marco.fillStyle(0x7a8591, 1).fillCircle(MAPA.x + dx, MAPA.y + dy, 2.6));
    this.add.image(MAPA.x, MAPA.y, 'papel').setOrigin(0).setDepth(2);
    this.terreno = this.add.tileSprite(MAPA.x, MAPA.y, MAPA.w, MAPA.h, 'terreno_1').setOrigin(0).setDepth(3).setTint(0xb99c64).setAlpha(0.3);
    this.terreno.setTileScale(0.4);
    this.gMapa = this.add.graphics().setDepth(4); // marco de la pantalla del piloto, selección
    this.gFuego = this.add.graphics().setDepth(4.5); // rastro de fuego del bombardeo especial del piloto
    this.fuegos = [];
    this.dibujarMarco();

    // Fichas del piloto y mensajes sobre el mapa
    this.piloto = this.add.container(0, 0, [
      this.add.circle(0, 0, 22 * K, 0xffc83d, 0.25).setStrokeStyle(2, 0xffc83d, 0.9),
      this.add.sprite(0, 0, 'avion_jugador', 0).setScale(0.3 * K),
    ]).setDepth(7).setVisible(false);
    this.txtEspera = this.add
      .text(MAPA.x + MAPA.w / 2, MAPA.y + MAPA.h / 2, 'Esperando al piloto…', {
        fontFamily: FUENTE_UI, fontStyle: 'bold', fontSize: '22px', color: '#3a2810', stroke: '#e6d4a8', strokeThickness: 4, align: 'center', wordWrap: { width: 440 },
      })
      .setOrigin(0.5)
      .setDepth(9);
    this.txtHerramienta = this.add.text(MAPA.x - 8, MAPA.y + MAPA.h + 12, '', { fontFamily: FUENTE_UI, fontSize: '13px', color: '#aeb6c0', wordWrap: { width: PANEL.x - MAPA.x - 20 } }).setDepth(9);

    this.crearPanel();
    this.crearEntradaTexto();

    // Mapa: clics
    this.input.mouse?.disableContextMenu();
    this.input.on('pointerdown', (p) => this.alClicMapa(p));
    this.input.keyboard.on('keydown-SPACE', () => this.hablar());

    // Red
    const ev = this.red.ev;
    this.escuchas = {
      estado: (m) => this.aplicarEstado(m),
      radio: (m) => this.alRadio(m),
      evento: (m) => this.alEvento(m),
      escena: (m) => {
        this.escenaPiloto = m.nombre;
        // El piloto entró a una escena de diálogo con historia paralela: Layla vive la suya y luego se vuelven a encontrar
        if (m.nombre === 'CutsceneScene' && PARALELAS[m.id]) return this.scene.start('CutsceneScene', { id: PARALELAS[m.id] });
        // Pantalla final del piloto: con victoria termina la misión; con derrota no (puede reintentar y Layla sigue)
        if ((m.nombre === 'EndingScene' || m.nombre === 'EndScene') && m.victoria) this.mostrarFin();
        this.derribado = m.nombre === 'EndScene' && !m.victoria;
        this.actualizarEspera();
      },
      companero: () => this.actualizarEspera(),
      cierre: () => this.mostrarDesconexion('Se perdió la conexión con el servidor.'),
    };
    Object.entries(this.escuchas).forEach(([t, fn]) => ev.on(t, fn));
    this.events.once('shutdown', () => {
      Object.entries(this.escuchas).forEach(([t, fn]) => ev.off(t, fn));
      this.entrada.remove();
      detenerPista(this, 'musica_dialogo', 600);
      this.game.voice?.cancelarEscucha();
      window.speechSynthesis?.cancel();
    });
    this.actualizarEspera();
    this.seleccionarHerramienta('marca-bomba');
  }

  // ---------- panel de la torre (consola) ----------

  // Pantalla de tubo: bisel negro, fondo oscuro, líneas de barrido y un reflejo en el vidrio
  pantalla(x, y, w, h, fondo, borde) {
    const g = this.add.graphics().setDepth(5.5);
    g.fillStyle(0x050607, 1).fillRoundedRect(x - 4, y - 4, w + 8, h + 8, 10);
    g.fillStyle(fondo, 1).fillRoundedRect(x, y, w, h, 7);
    g.lineStyle(1, borde, 0.9).strokeRoundedRect(x, y, w, h, 7);
    g.lineStyle(1, 0x000000, 0.18);
    for (let yy = y + 3; yy < y + h - 2; yy += 3) g.lineBetween(x + 3, yy, x + w - 3, yy);
    g.fillStyle(0xffffff, 0.04).fillRoundedRect(x + 4, y + 3, w - 8, h * 0.35, 6);
  }

  // Radar: muestra de verdad lo que pasa alrededor del piloto (en el centro). Un barrido gira dejando una estela y cada
  // eco se ilumina cuando el barrido pasa por su rumbo y se va apagando, como el fósforo de un radar real.
  //   rojo = avión enemigo (grande) o soldado enemigo (chico)   ámbar = torreta (más grande: la base)   verde = soldado aliado
  // Lo que queda fuera de alcance se ve en el borde. Si un enemigo aéreo está cerca, el borde parpadea en rojo.
  crearRadar(cx, cy) {
    this.radar = { cx, cy, r: 30, alcance: 700, ang: -Math.PI / 2, ping: 0 };
    const R = this.radar;
    const base = this.add.graphics().setDepth(6);
    base.fillStyle(0x07140a, 1).fillCircle(cx, cy, R.r);
    base.lineStyle(1, 0x2f8f4a, 0.75).strokeCircle(cx, cy, R.r * 0.66).strokeCircle(cx, cy, R.r * 0.33);
    base.lineBetween(cx - R.r, cy, cx + R.r, cy).lineBetween(cx, cy - R.r, cx, cy + R.r);
    for (let i = 0; i < 12; i++) { // marcas de rumbo en el borde
      const a = (i * Math.PI) / 6;
      base.lineBetween(cx + Math.cos(a) * (R.r - 3), cy + Math.sin(a) * (R.r - 3), cx + Math.cos(a) * R.r, cy + Math.sin(a) * R.r);
    }
    this.gRadar = this.add.graphics().setDepth(7);
  }

  actualizarRadar(dt) {
    const R = this.radar;
    const g = this.gRadar;
    const TAU = Math.PI * 2;
    g.clear();
    const antes = R.ang;
    R.ang += (TAU / 3.2) * dt; // una vuelta cada 3,2 s
    const recorrido = (((R.ang - antes) % TAU) + TAU) % TAU;

    // Estela del barrido: cuñas cada vez más tenues hacia atrás
    const N = 14;
    for (let i = 0; i < N; i++) {
      g.fillStyle(0x59ff7a, 0.3 * (1 - i / N) ** 2 + 0.01);
      g.beginPath().slice(R.cx, R.cy, R.r - 1, R.ang - (0.9 * (i + 1)) / N, R.ang - (0.9 * i) / N, false).fillPath();
    }
    g.lineStyle(2, 0xb6ffc6, 0.95).lineBetween(R.cx, R.cy, R.cx + Math.cos(R.ang) * (R.r - 1), R.cy + Math.sin(R.ang) * (R.r - 1));

    // Ecos, relativos al piloto
    const c = this.piloto.px !== undefined ? { x: this.piloto.px, y: this.piloto.py } : null;
    let peligro = false;
    if (c) {
      const k = R.r / R.alcance;
      const eco = (f, color, radio) => {
        const dx = f.px - c.x;
        const dy = f.py - c.y;
        const d = Math.hypot(dx, dy) || 1;
        const fuera = d > R.alcance;
        const ex = fuera ? (dx / d) * (R.r - 2.5) : dx * k;
        const ey = fuera ? (dy / d) * (R.r - 2.5) : dy * k;
        const rumbo = Math.atan2(dy, dx);
        if (((((rumbo - antes) % TAU) + TAU) % TAU) <= recorrido) f.rb = 1; // el barrido acaba de pasar por aquí
        f.rb = Math.max(0, (f.rb ?? 0) - dt / 1.4);
        g.fillStyle(color, (0.18 + 0.82 * f.rb) * (fuera ? 0.6 : 1)).fillCircle(R.cx + ex, R.cy + ey, radio);
        return d;
      };
      for (const f of this.fichas.o.values()) eco(f, 0xffb000, f.jefe ? 3 : 2.2);
      for (const f of this.fichas.a.values()) eco(f, 0x59ff7a, 1.5);
      for (const f of this.fichas.s.values()) eco(f, 0xff5a4a, 1.3);
      for (const f of this.fichas.e.values()) if (eco(f, 0xff5a4a, 2) < 260) peligro = true;
      g.fillStyle(0xffe27a, 1).fillCircle(R.cx, R.cy, 2.4); // el piloto
    }
    // Ping de sonar que sale del centro
    R.ping = (R.ping + dt) % 1.6;
    g.lineStyle(1, 0x59ff7a, 0.45 * (1 - R.ping / 1.6)).strokeCircle(R.cx, R.cy, (R.ping / 1.6) * R.r);
    // Borde: parpadea en rojo si hay un enemigo aéreo cerca del piloto
    const alerta = peligro && Math.sin(this.time.now / 110) > 0;
    g.lineStyle(3, alerta ? 0xff3a2a : 0x0a0c10, 1).strokeCircle(R.cx, R.cy, R.r + 1.5);
  }

  crearPanel() {
    const P = PANEL;
    const g = this.add.graphics().setDepth(5);
    // Carcasa de la consola con remaches
    g.fillStyle(0x000000, 0.45).fillRoundedRect(P.x + 6, P.y + 8, P.w, P.h, 14);
    g.fillStyle(0x1b2027, 1).fillRoundedRect(P.x, P.y, P.w, P.h, 14);
    g.lineStyle(3, 0x0a0c10, 1).strokeRoundedRect(P.x, P.y, P.w, P.h, 14);
    g.lineStyle(1, 0x4a5461, 0.9).strokeRoundedRect(P.x + 3, P.y + 3, P.w - 6, P.h - 6, 12);
    [[10, 10], [P.w - 10, 10], [10, P.h - 10], [P.w - 10, P.h - 10]].forEach(([dx, dy]) => g.fillStyle(0x59626e, 1).fillCircle(P.x + dx, P.y + dy, 3.2));

    // Cabecera: Layla, título y radar
    this.add.image(P.x + 18, P.y + 14, 'retrato_protagonista').setOrigin(0).setDisplaySize(52, 52).setDepth(6);
    this.add.rectangle(P.x + 18, P.y + 14, 52, 52).setOrigin(0).setStrokeStyle(2, 0xc8a94a).setDepth(7);
    this.add.text(P.x + 82, P.y + 14, 'TORRE DE CONTROL', { fontFamily: FUENTE_TITULO, fontStyle: 'bold', fontSize: '24px', color: '#e3c468' }).setDepth(6);
    this.add.text(P.x + 82, P.y + 46, 'Layla: enlace de radio y estratega', { fontFamily: FUENTE_UI, fontSize: '13px', color: '#aeb6c0' }).setDepth(6);
    this.crearRadar(P.x + P.w - 52, P.y + 38);

    // Pantalla verde: estado del piloto y del frente
    const sx = P.x + 14;
    const sy = P.y + 76;
    const sw = P.w - 28;
    const sh = 104;
    this.pantalla(sx, sy, sw, sh, 0x07140a, 0x1f5a30);
    this.txtEstado = this.add
      .text(sx + 14, sy + 8, '', { fontFamily: FUENTE, fontSize: '14px', color: '#8dffa8', lineSpacing: 4 })
      .setDepth(6)
      .setShadow(0, 0, '#46ff7a', 6, false, true);
    this.gBarra = this.add.graphics().setDepth(6);
    this.barraKm = { x: sx + 14, y: sy + sh - 16, w: sw - 28, h: 8 };
    this.pintarBarraKm(0);

    const titulo = (y, t) => this.add.text(P.x + 18, y, t, { fontFamily: FUENTE_UI, fontStyle: 'bold', fontSize: '12px', color: '#8d96a1' }).setDepth(6);
    const ancho3 = (P.w - 28 - 20) / 3;
    const col3 = (i) => P.x + 14 + i * (ancho3 + 10);

    titulo(P.y + 192, 'MARCAR EN EL MAPA (clic izquierdo; clic derecho borra)');
    this.botones = {};
    this.botones['marca-bomba'] = this.boton(col3(0), P.y + 208, ancho3, 30, 'Bombardear', () => this.seleccionarHerramienta('marca-bomba'));
    this.botones['marca-peligro'] = this.boton(col3(1), P.y + 208, ancho3, 30, 'Peligro', () => this.seleccionarHerramienta('marca-peligro'));
    this.botones['marca-aliados'] = this.boton(col3(2), P.y + 208, ancho3, 30, 'Aliados aquí', () => this.seleccionarHerramienta('marca-aliados'));

    titulo(P.y + 246, 'ÓRDENES A LOS SOLDADOS ALIADOS');
    this.botones.avanzar = this.boton(col3(0), P.y + 262, ancho3, 30, 'Avanzar', () => this.enviarOrden('avanzar'));
    this.botones.mantener = this.boton(col3(1), P.y + 262, ancho3, 30, 'Mantener', () => this.enviarOrden('mantener'));
    this.botones.atacar = this.boton(col3(2), P.y + 262, ancho3, 30, 'Atacar…', () => this.seleccionarHerramienta('atacar'));

    titulo(P.y + 300, 'APOYO');
    this.botones.botiquin = this.boton(col3(0), P.y + 316, ancho3, 32, 'Botiquín…', () => this.seleccionarHerramienta('botiquin'));
    this.botones.barrera = this.boton(col3(1), P.y + 316, ancho3, 32, 'Barrera…', () => this.seleccionarHerramienta('barrera'));
    this.botones.refuerzos = this.boton(col3(2), P.y + 316, ancho3, 32, 'Refuerzos', () => this.enviarRefuerzos());

    // Pantalla ámbar: la radio
    titulo(P.y + 358, 'RADIO');
    this.pantalla(P.x + 14, P.y + 374, P.w - 28, 98, 0x140c02, 0x6b4a12);
    this.txtRadio = this.add
      .text(P.x + 26, P.y + 380, '', { fontFamily: FUENTE_UI, fontSize: '13px', color: '#ffd27a', lineSpacing: 3, wordWrap: { width: P.w - 52 } })
      .setDepth(6)
      .setShadow(0, 0, '#ffb000', 5, false, true);
    this.botonVoz = this.boton(P.x + 14, P.y + 482, 150, 34, 'Hablar (ESPACIO)', () => this.hablar());
  }

  // Barra de kilómetros hecha de segmentos luminosos (verdes, y ámbar al final)
  pintarBarraKm(p) {
    const { x, y, w, h } = this.barraKm;
    const g = this.gBarra;
    g.clear();
    const N = 36;
    const sw = (w - 2 * (N - 1)) / N;
    const encendidos = Math.round(Phaser.Math.Clamp(p, 0, 1) * N);
    for (let i = 0; i < N; i++) {
      g.fillStyle(i < encendidos ? (i > N * 0.8 ? 0xffb000 : 0x59ff7a) : 0x12301a, 1).fillRect(x + i * (sw + 2), y, sw, h);
    }
  }

  // Botón de consola: carcasa con brillo, LED a la izquierda que se enciende cuando está activo
  boton(x, y, w, h, texto, alClic) {
    const g = this.add.graphics().setDepth(6);
    const txt = this.add
      .text(x + w / 2 + 6, y + h / 2, texto, { fontFamily: FUENTE_UI, fontStyle: 'bold', fontSize: '14px', color: '#e8edf2' })
      .setOrigin(0.5)
      .setDepth(7);
    const zona = this.add.zone(x + w / 2, y + h / 2, w, h).setDepth(8).setInteractive({ useHandCursor: true });
    const b = { g, txt, activo: false, habilitado: true, hover: false, pulso: false };
    b.pintar = () => {
      g.clear();
      const cara = !b.habilitado ? 0x1d2127 : b.activo ? 0x4a3a10 : b.hover ? 0x3b434d : 0x2f353d;
      g.fillStyle(0x07090c, 1).fillRoundedRect(x - 1, y - 1, w + 2, h + 3, 7);
      g.fillStyle(cara, 1).fillRoundedRect(x, y, w, h, 6);
      g.fillStyle(0xffffff, b.habilitado ? 0.08 : 0.03).fillRoundedRect(x + 2, y + 2, w - 4, h * 0.4, 4);
      g.lineStyle(2, b.activo ? 0xffb000 : 0x59626e, b.habilitado ? 1 : 0.35).strokeRoundedRect(x, y, w, h, 6);
      if (b.activo) g.fillStyle(0xffb000, 0.25).fillCircle(x + 12, y + h / 2, 8);
      g.fillStyle(b.activo ? 0xffb000 : 0x3a2a10, 1).fillCircle(x + 12, y + h / 2, 4);
      txt.setColor(!b.habilitado ? '#6f6b63' : b.activo ? '#ffd27a' : '#e8edf2');
    };
    zona.on('pointerover', () => ((b.hover = true), b.pintar()));
    zona.on('pointerout', () => ((b.hover = false), b.pintar()));
    zona.on('pointerdown', () => b.habilitado && !this.pausa && alClic(b));
    b.pintar();
    return b;
  }

  crearEntradaTexto() {
    // Campo para escribir mensajes de radio (alternativa a hablar). Posición en %: se escala con el juego.
    this.entrada = document.createElement('input');
    this.entrada.type = 'text';
    this.entrada.maxLength = 140;
    this.entrada.placeholder = 'Escribe un mensaje y pulsa Enter…';
    this.entrada.className = 'absolute z-10 rounded border border-neutral-600 bg-neutral-900/95 px-2 text-neutral-100 focus:border-amber-400 focus:outline-none';
    this.entrada.style.cssText = 'left:58.75%; width:37.3%; top:90.3%; height:4.7%; font-size:calc(min(100vw, 100dvh * 16 / 9) * 0.0105);';
    this.entrada.addEventListener('keydown', (e) => {
      e.stopPropagation(); // que ESPACIO y el resto de teclas no activen otras cosas del juego mientras se escribe
      if (e.key === 'Enter' && this.entrada.value.trim() && !this.pausa) {
        this.enviarRadio(this.entrada.value.trim());
        this.entrada.value = '';
      }
    });
    document.getElementById('game-wrapper').append(this.entrada);
  }

  // ---------- mapa ----------

  aPantalla(wx, wy) {
    return { x: MAPA.x + wx * MAPA.esc, y: MAPA.y + (wy + MAPA.adelante) * MAPA.esc };
  }

  aMundo(px, py) {
    return { x: (px - MAPA.x) / MAPA.esc, y: (py - MAPA.y) / MAPA.esc - MAPA.adelante };
  }

  dentroDelMapa(px, py) {
    return px >= MAPA.x && px <= MAPA.x + MAPA.w && py >= MAPA.y && py <= MAPA.y + MAPA.h;
  }

  dibujarMarco() {
    // Rectángulo de lo que ve el piloto en pantalla (mundo: x 0-1280, y 0-720)
    const a = this.aPantalla(0, 0);
    const b = this.aPantalla(GAME.width, GAME.height);
    const g = this.gMapa;
    g.clear();
    g.lineStyle(3, 0xb3261e, 0.9).strokeRect(a.x, a.y, b.x - a.x, b.y - a.y);
    g.fillStyle(0xb3261e, 0.06).fillRect(a.x, MAPA.y, MAPA.w, a.y - MAPA.y); // zona que el piloto aún no ve
    if (!this.etqMarco) {
      this.etqMarco = this.add.text(a.x + 8, a.y + 6, 'PANTALLA DEL PILOTO', { fontFamily: FUENTE_UI, fontStyle: 'bold', fontSize: '12px', color: '#7d1c16' }).setDepth(5);
      this.etqAdelante = this.add
        .text(a.x + 8, MAPA.y + 8, 'ADELANTE: el piloto aún no lo ve', { fontFamily: FUENTE_UI, fontStyle: 'bold', fontSize: '12px', color: '#7d1c16' })
        .setDepth(5);
    }
  }

  // ---------- estado del piloto ----------

  aplicarEstado(s) {
    this.estado = s;
    this.tUltimo = this.time.now;
    this.vel = s.vel ?? 0;
    this.escenaPiloto = s.nv;
    this.derribado = false;
    this.picada = false;
    this.piloto.setVisible(true);
    this.piloto.list[1].setRotation(s.j.r ?? 0); // el avión del mapa apunta igual que el del piloto
    this.piloto.tx = s.j.x;
    this.piloto.ty = s.j.y;
    if (this.piloto.px === undefined) {
      this.piloto.px = s.j.x;
      this.piloto.py = s.j.y;
    }

    this.sincronizar('o', s.o, (f) => this.fichaObjetivo(f));
    this.sincronizar('e', s.e, () => this.fichaSprite('avion_enemigo', 0.11, 180, true));
    this.sincronizar('s', s.s ?? [], () => {
      const ficha = this.fichaSprite('soldado_enemigo_dispara_abajo', 0.3, 0, false);
      ficha.cont.list[0].setTint(0xff9a8a); // los soldados enemigos se ven rojizos
      return ficha;
    });
    this.sincronizar('a', s.a, () => this.fichaSprite('soldado_aliado_arriba', 0.3, 0, false));
    this.sincronizar('b', s.b, () => this.fichaSprite('botiquin_suelo', 0.14, 0, false));
    this.sincronizar('r', s.r ?? [], () => this.fichaSprite(this.textures.exists('barrera_aliada') ? 'barrera_aliada' : 'botiquin_suelo', 0.27, 0, false)); // las barreras de los aliados
    this.sincronizar('m', s.m, (f) => this.fichaMarca(f));
    this.fuegos = (s.fu ?? []).map(([x, y]) => ({ x, y }));

    // Panel de estado
    const km = s.km;
    this.txtEstado.setText(
      `PILOTO     ${'■'.repeat(Math.max(0, s.j.v))}${'□'.repeat(Math.max(0, VIDA_JUGADOR - s.j.v))}\n` +
        `ALIADOS    ${s.a.length}      BOTIQUINES  ${s.bq}${s.esp > 0 ? `  (listo en ${Math.ceil(s.esp / 1000)} s)` : ''}\n` +
        (km === null ? s.meta : s.fase === 'avance' ? `BASE ENEMIGA A ${km.toFixed(1)} km` : 'BASE ENEMIGA: EN POSICIÓN') +
        (s.fase === 'avance' ? `\nMAPA  ${s.det ? `DETENIDO: ${s.tq} torreta(s) por destruir` : 'AVANZANDO'}` : '')
    );
    this.pintarBarraKm(s.prog ?? 0);
    this.botones.botiquin.habilitado = s.bq > 0 && s.esp <= 0;
    this.botones.barrera.habilitado = (s.br ?? 0) > 0 && (s.bre ?? 0) <= 0;
    this.botones.barrera.txt.setText(`Barrera (${s.br ?? 0})`);
    this.botones.refuerzos.habilitado = s.fase === 'base' && !s.ref;
    this.botones.refuerzos.activo = this.pideRefuerzos && s.fase === 'base' && !s.ref;
    Object.values(this.botones).forEach((b) => b.pintar());
    this.actualizarEspera();
  }

  sincronizar(clave, filas, crear) {
    const mapa = this.fichas[clave];
    const vistos = new Set();
    for (const f of filas) {
      vistos.add(f[0]);
      let ficha = mapa.get(f[0]);
      if (!ficha) {
        ficha = crear(f);
        ficha.px = f[1];
        ficha.py = f[2];
        mapa.set(f[0], ficha);
      }
      ficha.tx = f[1];
      ficha.ty = f[2];
      ficha.datos = f;
    }
    for (const [id, ficha] of mapa) {
      if (!vistos.has(id)) {
        ficha.cont.destroy();
        mapa.delete(id);
      }
    }
  }

  fichaSprite(clave, escala, angulo, enemigo) {
    const s = this.add.sprite(0, 0, clave, 0).setScale(escala * K).setAngle(angulo);
    const items = [s];
    if (enemigo) items.unshift(this.add.circle(0, 0, 13 * K, 0xb3261e, 0.25).setStrokeStyle(1.5, 0xb3261e, 0.9));
    return { cont: this.add.container(0, 0, items).setDepth(6), suelo: !enemigo };
  }

  fichaObjetivo(f) {
    const jefe = f[4] === 1;
    const base = this.add.image(0, 0, jefe ? 'deposito' : 'nido_base').setScale((jefe ? 0.27 : 0.15) * K);
    const aro = this.add.circle(0, 0, (jefe ? 24 : 14) * K, 0xb3261e, 0.18).setStrokeStyle(1.5, 0xb3261e, 0.9);
    const items = [aro, base];
    if (!jefe) items.push(this.add.image(0, 0, 'nido_arma').setScale(0.14 * K));
    return { cont: this.add.container(0, 0, items).setDepth(5), suelo: true, objetivo: true, jefe };
  }

  fichaMarca(f) {
    const tipo = f[1];
    const color = tipo === 'bomba' ? 0xb3261e : tipo === 'peligro' ? 0xe0a000 : 0x1f7a3a;
    const aro = this.add.circle(0, 0, 16 * K, color, 0.2).setStrokeStyle(3, color, 1);
    const etq = this.add
      .text(0, 22 * K, tipo === 'bomba' ? 'BOMBA' : tipo === 'peligro' ? 'PELIGRO' : 'ALIADOS', {
        fontFamily: FUENTE_UI, fontStyle: 'bold', fontSize: '11px', color: '#2a1a08', stroke: '#e6d4a8', strokeThickness: 3,
      })
      .setOrigin(0.5);
    const cruz = this.add.text(0, 0, tipo === 'bomba' ? '✕' : tipo === 'peligro' ? '!' : '+', { fontFamily: FUENTE_UI, fontStyle: 'bold', fontSize: '16px', color: '#2a1a08' }).setOrigin(0.5);
    this.tweens.add({ targets: aro, scale: 1.35, alpha: 0.6, duration: 700, yoyo: true, repeat: -1 });
    return { cont: this.add.container(0, 0, [aro, cruz, etq]).setDepth(8), suelo: true, marca: true };
  }

  // ---------- bucle ----------

  update(_, delta) {
    const dt = delta / 1000;
    this.torre.update(dt); // ventanal: nubes y aviones
    if (this.pausa) return; // mapa congelado
    this.actualizarRadar(dt);
    this.terreno.tilePositionY -= this.vel * dt * 0.5;
    const suave = Math.min(1, dt * 14);

    const mover = (px, py, cont) => {
      const p = this.aPantalla(px, py);
      cont.setPosition(p.x, p.y);
      cont.setVisible(this.dentroDelMapa(p.x, p.y));
    };
    for (const mapa of Object.values(this.fichas)) {
      for (const f of mapa.values()) {
        if (f.suelo) f.ty += this.vel * dt; // lo que va pegado al terreno avanza entre foto y foto
        f.px += (f.tx - f.px) * suave;
        f.py += (f.ty - f.py) * suave;
        mover(f.px, f.py, f.cont);
      }
    }
    if (this.piloto.tx !== undefined) {
      this.piloto.px += (this.piloto.tx - this.piloto.px) * suave;
      this.piloto.py += (this.piloto.ty - this.piloto.py) * suave;
      const p = this.aPantalla(this.piloto.px, this.piloto.py);
      this.piloto.setPosition(p.x, p.y);
    }

    // Rastro de fuego del piloto (avanza con el terreno entre una foto y otra)
    const gf = this.gFuego;
    gf.clear();
    const t = this.time.now / 1000;
    this.fuegos.forEach((f, i) => {
      f.y += this.vel * dt;
      const p = this.aPantalla(f.x, f.y);
      if (!this.dentroDelMapa(p.x, p.y)) return;
      const r = 6 + Math.sin(t * 8 + i) * 1.5;
      gf.fillStyle(0xff7a1a, 0.55).fillCircle(p.x, p.y, r);
      gf.fillStyle(0xffd35a, 0.8).fillCircle(p.x, p.y, r * 0.5);
    });

    // Resalta el objetivo bajo el cursor cuando se va a elegir uno para atacar
    const g = this.gMapa;
    this.dibujarMarco();
    if (this.herramienta === 'atacar') {
      const o = this.masCercano(this.fichas.o, this.input.activePointer.x, this.input.activePointer.y, 28 * K);
      if (o) {
        const p = this.aPantalla(o.px, o.py);
        g.lineStyle(3, 0xffb000, 1).strokeCircle(p.x, p.y, 24 * K);
      }
    }
    // Aviso de "sin señal" si el piloto dejó de enviar datos
    if (this.estado && this.time.now - this.tUltimo > 2500) this.actualizarEspera();
  }

  masCercano(mapa, px, py, radio) {
    let mejor = null;
    let dmin = radio;
    for (const f of mapa.values()) {
      const p = this.aPantalla(f.px, f.py);
      const d = Phaser.Math.Distance.Between(px, py, p.x, p.y);
      if (d < dmin) {
        dmin = d;
        mejor = f;
      }
    }
    return mejor;
  }

  actualizarEspera() {
    const conectado = this.red.companero;
    const reciente = this.estado && this.time.now - this.tUltimo < 2500;
    if (!conectado) {
      this.txtEspera.setText('El piloto se desconectó.').setVisible(true);
      return this.mostrarDesconexion('El piloto se desconectó.');
    }
    if (reciente && ['Level1Scene', 'Level2Scene', 'Level3Scene'].includes(this.escenaPiloto)) {
      this.txtEspera.setVisible(false);
    } else {
      const donde = ESCENAS[this.escenaPiloto];
      if (this.picada) this.txtEspera.setText('El piloto se lanza en picada sobre la base…').setVisible(true);
      else if (this.derribado) this.txtEspera.setText('El piloto fue derribado.\nEn cuanto reintente, verás el mapa aquí.').setVisible(true);
      else this.txtEspera.setText(donde ? `El piloto está en ${donde}.\nEn cuanto vuele, verás el mapa aquí.` : 'Esperando al piloto…').setVisible(true);
    }
  }

  // El piloto llegó a la pantalla final: misión terminada
  mostrarFin() {
    if (this.cartel) return;
    this.mostrarDesconexion('Misión terminada. ¡Buen trabajo, Layla!');
  }

  mostrarDesconexion(texto) {
    if (this.cartel) return;
    const { width, height } = this.scale;
    const fondo = this.add.rectangle(0, 0, width, height, 0x000000, 0.7).setOrigin(0).setDepth(50);
    const t = this.add.text(width / 2, height / 2 - 30, texto, { fontFamily: FUENTE_UI, fontStyle: 'bold', fontSize: '28px', color: '#ffffff' }).setOrigin(0.5).setDepth(51);
    const b = this.boton(width / 2 - 110, height / 2 + 10, 220, 44, 'Volver al menú', () => {
      this.red.salir();
      this.scene.start('TitleScene');
    });
    [b.g, b.txt].forEach((o) => o.setDepth(52));
    this.cartel = [fondo, t, b.g, b.txt];
  }

  // ---------- herramientas y órdenes ----------

  seleccionarHerramienta(h) {
    this.herramienta = h;
    ['marca-bomba', 'marca-peligro', 'marca-aliados', 'botiquin', 'barrera', 'atacar'].forEach((k) => {
      this.botones[k].activo = k === h;
      this.botones[k].pintar();
    });
    this.txtHerramienta.setText(
      {
        'marca-bomba': 'Herramienta: marca BOMBARDEAR. Clic en el mapa para señalar un objetivo al piloto',
        'marca-peligro': 'Herramienta: marca PELIGRO. Clic en el mapa',
        'marca-aliados': 'Herramienta: marca ALIADOS AQUÍ. Clic en el mapa',
        botiquin: 'Botiquín: haz clic en el mapa donde quieres que caiga (dentro de la pantalla del piloto)',
        barrera: 'Barrera: haz clic en el mapa donde la quieres. Frena las balas de las torretas y de los soldados enemigos',
        atacar: 'Atacar: haz clic en un nido o en la base para que los soldados vayan a atacarlo',
      }[h]
    );
  }

  alClicMapa(p) {
    if (!this.dentroDelMapa(p.x, p.y) || this.cartel || this.pausa) return;
    const w = this.aMundo(p.x, p.y);
    const wx = Math.round(w.x);
    const wy = Math.round(w.y);

    if (p.rightButtonDown()) {
      const m = this.masCercano(this.fichas.m, p.x, p.y, 24 * K);
      if (m) this.red.enviar({ t: 'marca', tipo: 'borrar', id: m.datos[0] });
      return;
    }
    if (this.herramienta === 'atacar') {
      const o = this.masCercano(this.fichas.o, p.x, p.y, 28 * K);
      if (!o) return;
      this.red.enviar({ t: 'orden', tipo: 'atacar', id: o.datos[0] });
      this.agregarRadio('sistema', o.jefe ? 'Orden: los soldados atacan la base.' : 'Orden: los soldados atacan el nido.');
      return this.seleccionarHerramienta('marca-bomba');
    }
    if (this.herramienta === 'botiquin') {
      if (wy < 0 || wy > GAME.height) return this.agregarRadio('sistema', 'El botiquín debe caer dentro de la pantalla del piloto.');
      this.red.enviar({ t: 'botiquin', x: wx, y: wy });
      this.agregarRadio('sistema', 'Botiquín enviado.');
      return this.seleccionarHerramienta('marca-bomba');
    }
    if (this.herramienta === 'barrera') {
      if (wy < 0 || wy > GAME.height) return this.agregarRadio('sistema', 'La barrera debe quedar dentro de la pantalla del piloto.');
      this.red.enviar({ t: 'barrera', x: wx, y: wy });
      this.agregarRadio('sistema', 'Barrera colocada.');
      return this.seleccionarHerramienta('marca-bomba');
    }
    this.red.enviar({ t: 'marca', tipo: this.herramienta.replace('marca-', ''), x: wx, y: wy });
  }

  enviarOrden(tipo) {
    this.red.enviar({ t: 'orden', tipo });
    this.agregarRadio('sistema', tipo === 'avanzar' ? 'Orden: los soldados avanzan.' : 'Orden: los soldados mantienen la posición.');
  }

  enviarRefuerzos() {
    this.red.enviar({ t: 'refuerzos' });
    this.pideRefuerzos = false;
    this.agregarRadio('sistema', 'Refuerzos enviados.');
  }

  // ---------- radio ----------

  hablar() {
    if (this.pausa) return;
    const voz = this.game.voice;
    if (!voz?.soportado) return this.agregarRadio('sistema', 'Tu navegador no soporta voz. Escribe el mensaje.');
    if (this.escuchandoVoz) return;
    this.escuchandoVoz = true;
    this.botonVoz.activo = true;
    this.botonVoz.txt.setText('Escuchando…');
    this.botonVoz.pintar();
    const terminar = () => {
      this.escuchandoVoz = false;
      this.botonVoz.activo = false;
      this.botonVoz.txt.setText('Hablar (ESPACIO)');
      this.botonVoz.pintar();
    };
    voz.escuchar({
      onTexto: (t) => this.enviarRadio(t),
      onError: (m) => this.agregarRadio('sistema', m),
      onFin: terminar,
    });
    // Por si el navegador no avisa el final
    this.time.delayedCall(12000, terminar);
  }

  // Layla envía el mensaje: el piloto lo oye con voz de mujer (síntesis), sea quien sea quien lo diga
  enviarRadio(texto) {
    this.red.enviar({ t: 'radio', texto });
    this.agregarRadio('layla', texto);
  }

  alRadio(m) {
    this.agregarRadio('piloto', m.texto);
    // Layla oye al piloto con una voz según el género que el piloto indicó con su DNI
    this.game.voice?.hablar(m.texto, undefined, m.genero === 'M' ? 'M' : 'H');
  }

  alEvento(m) {
    if (m.tipo === 'pausa') return this.ponerPausa(!!m.pausado);
    if (m.tipo === 'picadaLista') {
      this.agregarRadio('sistema', 'La base cede: el piloto puede lanzarse en picada.');
      this.cameras.main.flash(250, 255, 140, 60);
    }
    if (m.tipo === 'picada') {
      this.picada = true;
      this.agregarRadio('sistema', '¡El piloto se lanza en picada sobre la base!');
      this.actualizarEspera();
    }
    if (m.tipo === 'pideRefuerzos') {
      this.pideRefuerzos = true;
      this.agregarRadio('sistema', 'El piloto pide refuerzos. Pulsa "Enviar refuerzos".');
      this.cameras.main.flash(250, 255, 200, 80);
    }
  }

  // El piloto pausó (o reanudó) la partida: Layla se congela con él
  ponerPausa(pausado) {
    if (this.pausa === pausado) return;
    this.pausa = pausado;
    if (!this.velo) {
      const { width, height } = this.scale;
      this.velo = [
        this.add.rectangle(0, 0, width, height, 0x000000, 0.6).setOrigin(0).setDepth(40).setInteractive(), // también bloquea los clics
        this.add.text(width / 2, height / 2 - 20, 'PARTIDA EN PAUSA', { fontFamily: FUENTE_TITULO, fontStyle: 'bold', fontSize: '44px', color: '#e3c468', stroke: '#000', strokeThickness: 6 }).setOrigin(0.5).setDepth(41),
        this.add.text(width / 2, height / 2 + 30, 'El piloto pausó la partida. Continuará cuando la reanude.', { fontFamily: FUENTE_UI, fontSize: '18px', color: '#ffffff' }).setOrigin(0.5).setDepth(41),
      ];
    }
    this.velo.forEach((o) => o.setVisible(pausado));
    this.entrada.disabled = pausado;
    if (pausado) {
      this.tweens.pauseAll();
      this.game.voice?.cancelarEscucha();
      window.speechSynthesis?.cancel();
    } else {
      this.tweens.resumeAll();
      this.tUltimo = this.time.now; // el piloto no envió datos mientras estuvo en pausa: no es "sin señal"
    }
  }

  agregarRadio(quien, texto) {
    const etiqueta = { piloto: 'Quiñones', layla: 'Tú', sistema: '•' }[quien];
    this.registroRadio.push(`${etiqueta}: ${texto}`);
    this.registroRadio = this.registroRadio.slice(-7);
    this.txtRadio.setText(this.registroRadio.join('\n'));
    // La pantalla tiene sitio para unas 5 líneas: se descartan los mensajes más viejos hasta que quepa
    while (this.txtRadio.height > 92 && this.registroRadio.length > 1) {
      this.registroRadio.shift();
      this.txtRadio.setText(this.registroRadio.join('\n'));
    }
  }
}
