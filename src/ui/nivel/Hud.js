import Phaser from 'phaser';
import { CAPA, COLOR, MARGEN, TXT, estiloHud } from '../tema.js';
import { ESCALA_HUD, METAL, TABLERO, bordeDe, costura, estiloInstrumento, flecha, hueco, placa, rejilla, remache, remaches, tecla, topeHud } from '../cabina.js';
import BarraHabilidades from './BarraHabilidades.js';
import { alCambiarEntrada, usandoMando } from '../../sistemas/entrada/preferencias.js';
import { nombreTecla, PUNTAJE_FINAL_BUENO, TECLAS, VIDA_JUGADOR } from '../../sistemas/nivel/constantes.js';

// El HUD del piloto, hecho como la cabina de un avión y con la idea del HUD de League of Legends: un tablero de metal oscuro abajo
// al centro con el retrato de Quiñones a la izquierda, las habilidades en el medio (cada una con su tecla debajo y, debajo de todas,
// la barra verde de vida y la barra azul de puntos) y a la derecha el equipo: botiquín, radio y pausa, con sus teclas, y las flechas
// para mover. Entre el retrato y las habilidades hay un altímetro con aguja para la altura de vuelo. Arriba van el objetivo, a la
// izquierda, y las placas de posiciones y de distancia a la base. Yo no le pongo lógica del juego: cada fotograma leo el estado de
// la escena en actualizar() y repinto solo lo que cambió.
const VIDA_X = 360; // donde empiezan las barras: más anchas que las habilidades, para aprovechar el ancho del tablero
const BARRAS_ANCHO = 560;
const Y_VIDA = 684;
const Y_PUNTOS = 700;
const DIAL = { x: 344, y: 672, r: 28 };
const EQUIPO_X = [902, 968, 1034]; // las tres casillas de la derecha (antes de correrlas hacia el borde, ver this.d)
const EQUIPO_Y = 598;
const CASILLA = 54;

export default class Hud {
  constructor(escena) {
    this.escena = escena;
    this.avisos = new Map();
    this.pilotoHablando = false;
    this.vidaPintada = -1;
    this.crear();
    this.parpadeo = escena.time.addEvent({ delay: 4500, loop: true, callback: () => this.parpadear() });
    const quitar = alCambiarEntrada(() => (this.flechasPintadas = '')); // al cambiar de teclado a mando se repintan las flechas
    escena.events.once('shutdown', quitar);
  }

  crear() {
    const e = this.escena;
    const { width, height } = e.scale;
    const g = (this.fondo = e.add.graphics());

    // El tablero de metal: las esquinas de arriba cortadas, un filete ámbar, costuras entre las zonas y remaches
    // El tablero ocupa todo el ancho de la pantalla: como el contenedor se escala (ESCALA_HUD) alrededor del centro, por dentro mide
    // width / ESCALA_HUD. Las habilidades y las barras quedan en el centro y el retrato con el altímetro y el equipo se corren hacia los bordes
    const T = TABLERO;
    this.ancho = width / ESCALA_HUD;
    this.x0 = (width - this.ancho) / 2;
    this.d = (this.ancho - T.ancho) / 2 - 18; // cuánto se corren hacia los bordes
    const x1 = this.x0 + this.ancho;
    placa(g, this.x0, T.y, this.ancho, height - T.y + 6, { chaflan: 0, relleno: METAL.panel, borde: METAL.borde, grosor: 3 });
    g.lineStyle(2, METAL.ambarSuave, 0.55).beginPath().moveTo(this.x0 + 24, T.y + 7).lineTo(x1 - 24, T.y + 7).strokePath();
    costura(g, 640 - 370, T.y + 16, height - 12);
    costura(g, 640 + 370, T.y + 16, height - 12);
    rejilla(g, 640 - 468 + 0, T.y + 26, 84, 70, 7); // el relleno entre el retrato y el centro...
    rejilla(g, 640 + 394, T.y + 26, 84, 70, 7); // ...y entre el centro y el equipo
    [[this.x0 + 20, T.y + 24], [x1 - 20, T.y + 24], [this.x0 + 12, height - 12], [x1 - 12, height - 12], [640 - 370, T.y + 10], [640 + 370, T.y + 10]].forEach(([x, y]) => remache(g, x, y));

    this.crearPiloto(g);
    this.crearAltimetro(g);
    this.crearBarras(g);
    this.barra = new BarraHabilidades(e); // las habilidades, en el medio del tablero
    this.crearEquipo(g);
    this.crearArriba(width);

    // Todo lo del tablero de abajo va en un contenedor escalado y anclado abajo al centro (ver ESCALA_HUD). Lo de arriba queda suelto
    const abajo = [
      this.fondo, this.retrato, this.gMarco, this.etqAliados, this.txtAliados, this.gDial, this.txtDial, this.txtAltura, this.gBarras, this.txtPuntos,
      this.etqVida, this.etqPuntos, this.iconoBotiquin, this.txtBotiquines, this.teclaBotiquin, this.teclaRadio, this.teclaPausa, this.txtMover,
      this.gEquipo, this.gFlechas, ...this.barra.objetos,
    ];
    this.tablero = e.add.container((width / 2) * (1 - ESCALA_HUD), height * (1 - ESCALA_HUD), abajo).setScale(ESCALA_HUD);
    this.objetos = [this.tablero, this.flecha, this.txtObjetivo, this.gPlacas, this.txtMeta, this.etqMeta, this.cajaKm].filter(Boolean);
    this.objetos.forEach((o) => o.setDepth(CAPA.hud).setScrollFactor(0)); // el HUD no se mueve con la cámara del nivel
    e.camara.interfaz(this.objetos); // y lo dibuja la cámara de la interfaz, para que no se acerque con el zoom
    this.actualizar();
  }

  // El retrato en una pantalla con marco de metal, y al lado cuántos soldados aliados quedan
  crearPiloto(g) {
    const e = this.escena;
    const x = 170 - this.d;
    const y = 598;
    hueco(g, x, y, 104, 104, 8);
    remaches(g, x, y, 104, 104, 5);
    this.xRetrato = x + 8;
    this.yRetrato = y + 8;
    this.retrato = e.add.sprite(this.xRetrato, this.yRetrato, 'retrato_quinones').setOrigin(0).setDisplaySize(88, 88);
    this.gMarco = e.add.graphics();
    this.pintarMarco(METAL.brillo);
    this.etqAliados = e.add.text(DIAL.x - this.d, 600, 'ALIADOS', estiloInstrumento(10, '#c9d1da')).setOrigin(0.5, 0);
    this.txtAliados = e.add.text(DIAL.x - this.d, 626, '', estiloInstrumento(30)).setOrigin(0.5);
  }

  // El altímetro: un reloj con tres marcas (bajo, normal y alto) y una aguja que apunta al piso donde vuela el avión
  crearAltimetro(g) {
    const e = this.escena;
    this.dial = { x: DIAL.x - this.d, y: DIAL.y, r: DIAL.r };
    const { x, y, r } = this.dial;
    g.fillStyle(0x14181d, 1).fillCircle(x, y, r + 2);
    g.lineStyle(3, METAL.borde, 1).strokeCircle(x, y, r + 2);
    g.fillStyle(0x07090c, 1).fillCircle(x, y, r - 3);
    [-50, -25, 0, 25, 50].forEach((grados, i) => {
      const a = Phaser.Math.DegToRad(grados);
      const largo = i % 2 === 0 ? 8 : 4;
      g.lineStyle(i % 2 === 0 ? 2 : 1, METAL.brillo, 0.9).beginPath().moveTo(x + Math.sin(a) * (r - 5), y - Math.cos(a) * (r - 5)).lineTo(x + Math.sin(a) * (r - 5 - largo), y - Math.cos(a) * (r - 5 - largo)).strokePath();
    });
    this.gDial = e.add.graphics();
    this.txtDial = e.add.text(x, y + 13, 'ALT', estiloInstrumento(9, '#c9d1da', { strokeThickness: 1 })).setOrigin(0.5);
    this.txtAltura = e.add.text(x, y + r + 8, '', estiloInstrumento(9, '#c9d1da', { strokeThickness: 1 })).setOrigin(0.5);
  }

  // Las dos barras de abajo del centro, como las de vida y maná de League: la verde (vida, en cinco celdas) y la azul (puntos)
  crearBarras(g) {
    const e = this.escena;
    hueco(g, VIDA_X - 3, Y_VIDA - 3, BARRAS_ANCHO + 6, 18, 4);
    hueco(g, VIDA_X - 3, Y_PUNTOS - 3, BARRAS_ANCHO + 6, 18, 4);
    this.gBarras = e.add.graphics();
    this.etqVida = e.add.text(VIDA_X - 8, Y_VIDA + 6, 'VIDA', estiloInstrumento(9, '#c9d1da', { strokeThickness: 1 })).setOrigin(1, 0.5);
    this.etqPuntos = e.add.text(VIDA_X - 8, Y_PUNTOS + 6, 'PTS', estiloInstrumento(9, '#c9d1da', { strokeThickness: 1 })).setOrigin(1, 0.5);
    this.txtPuntos = e.add.text(VIDA_X + BARRAS_ANCHO / 2, Y_PUNTOS + 6, '', estiloInstrumento(10, '#ffffff')).setOrigin(0.5);
  }

  // El equipo de la derecha: botiquín, radio y pausa, cada uno con su tecla abajo, y una tira con las flechas para mover
  crearEquipo(g) {
    const e = this.escena;
    this.equipoX = EQUIPO_X.map((x) => x + this.d); // las casillas del equipo, corridas hacia el borde derecho
    this.equipoX.forEach((x) => {
      hueco(g, x, EQUIPO_Y, CASILLA, CASILLA, 6);
      remaches(g, x, EQUIPO_Y, CASILLA, CASILLA, 4);
      tecla(g, x + CASILLA / 2, EQUIPO_Y + CASILLA + 14, 34, 16);
    });
    // Botiquín: el ícono del juego, con cuántos quedan abajo a la derecha
    const cb = this.equipoX[0] + CASILLA / 2;
    this.iconoBotiquin = e.add.sprite(cb, EQUIPO_Y + CASILLA / 2 - 2, 'botiquin_suelo').setDisplaySize(38, 38);
    this.txtBotiquines = e.add.text(this.equipoX[0] + CASILLA - 5, EQUIPO_Y + CASILLA - 4, '', estiloInstrumento(15)).setOrigin(1, 1);
    this.teclaBotiquin = e.add.text(cb, EQUIPO_Y + CASILLA + 14, '', estiloInstrumento(10, '#f0e6d2', { strokeThickness: 1 })).setOrigin(0.5);

    // Radio: un radio portátil dibujado con rectángulos, con una lucecita que parpadea mientras hay un mensaje
    const cr = this.equipoX[1] + CASILLA / 2;
    const cy = EQUIPO_Y + CASILLA / 2;
    g.lineStyle(2, METAL.brillo, 1).beginPath().moveTo(cr + 8, cy - 12).lineTo(cr + 12, cy - 24).strokePath(); // la antena
    g.fillStyle(0x3a424c, 1).fillRoundedRect(cr - 12, cy - 13, 24, 32, 4);
    g.lineStyle(2, METAL.oscuro, 1).strokeRoundedRect(cr - 12, cy - 13, 24, 32, 4);
    [0, 1, 2, 3].forEach((i) => g.lineStyle(1.5, 0x14181d, 1).beginPath().moveTo(cr - 7, cy - 6 + i * 4).lineTo(cr + 7, cy - 6 + i * 4).strokePath()); // la rejilla del parlante
    g.fillStyle(METAL.ambarSuave, 1).fillRect(cr - 6, cy + 12, 12, 4); // el botón de hablar
    this.teclaRadio = e.add.text(cr, EQUIPO_Y + CASILLA + 14, nombreTecla(TECLAS.radio), estiloInstrumento(10, '#f0e6d2', { strokeThickness: 1 })).setOrigin(0.5);

    // Pausa: dos barras
    const cp = this.equipoX[2] + CASILLA / 2;
    g.fillStyle(METAL.brillo, 1).fillRoundedRect(cp - 10, cy - 12, 7, 24, 2).fillRoundedRect(cp + 3, cy - 12, 7, 24, 2);
    this.teclaPausa = e.add.text(cp, EQUIPO_Y + CASILLA + 14, nombreTecla('ESC'), estiloInstrumento(10, '#f0e6d2', { strokeThickness: 1 })).setOrigin(0.5);

    // Las flechas para mover el avión
    hueco(g, this.equipoX[0], 676, this.equipoX[2] + CASILLA - this.equipoX[0], 32, 6);
    this.txtMover = e.add.text(this.equipoX[0] + 36, 692, 'MOVER', estiloInstrumento(11, '#c9d1da', { strokeThickness: 1 })).setOrigin(0.5);
    this.gFlechas = e.add.graphics(); // las cuatro teclas de flecha, que se encienden cuando las pulso (ver pintarFlechas)
    this.flechasPintadas = '';
    this.gEquipo = e.add.graphics(); // la luz de la radio
  }

  // Lo de arriba: el objetivo con una flechita, la placa de posiciones (si el nivel tiene meta) y la de distancia a la base
  crearArriba(width) {
    const e = this.escena;
    this.flecha = e.add.triangle(MARGEN, MARGEN + 12, 0, 0, 0, 20, 16, 10, COLOR.naranja).setOrigin(0, 0.5);
    this.txtObjetivo = e.add.text(MARGEN + 26, MARGEN, '', estiloHud(24));

    this.gPlacas = e.add.graphics();
    if (e.cfg.meta) {
      const x = width - MARGEN - 150;
      placa(this.gPlacas, x, MARGEN, 150, 66, { chaflan: 8, relleno: METAL.panel, borde: METAL.borde });
      remaches(this.gPlacas, x, MARGEN, 150, 66, 7);
      this.etqMeta = e.add.text(x + 75, MARGEN + 10, 'POSICIONES', estiloInstrumento(10, '#c9d1da', { strokeThickness: 1 })).setOrigin(0.5, 0);
      this.txtMeta = e.add.text(x + 75, MARGEN + 40, '', estiloInstrumento(34)).setOrigin(0.5);
    }
    if (e.cfg.baseFija) {
      // La barra de distancia a la base: una placa chica arriba a la derecha que flota (sube y baja despacio) con una sombra debajo
      const ancho = 320;
      const alto = 58;
      const x = width - MARGEN - ancho;
      this.cajaKm = e.add.container(x, MARGEN);
      const placaKm = e.add.graphics();
      placaKm.fillStyle(0x000000, 0.35).fillRoundedRect(5, 9, ancho, alto, 10); // la sombra
      placa(placaKm, 0, 0, ancho, alto, { chaflan: 10, relleno: METAL.panel, borde: METAL.borde });
      remaches(placaKm, 0, 0, ancho, alto, 7);
      this.txtKm = e.add.text(ancho / 2, 8, '', estiloInstrumento(13, '#f0e6d2')).setOrigin(0.5, 0);
      this.gKm = e.add.graphics();
      this.cajaKm.add([placaKm, this.txtKm, this.gKm]);
      e.tweens.add({ targets: this.cajaKm, y: MARGEN + 5, duration: 1900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
  }

  pintarMarco(color) {
    this.gMarco.clear();
    bordeDe(this.gMarco, this.xRetrato, this.yRetrato, 88, 88, color, 3, 1, 2);
  }

  // ---------- se llama una vez por fotograma ----------

  actualizar() {
    const e = this.escena;
    this.pintarVida(e.vida);
    this.pintarPuntos();
    this.pintarAltimetro();
    this.barra.actualizar();
    this.cambiarTexto(this.txtAliados, String(e.aliados.countActive(true)));
    this.pintarEquipo();
    this.pintarFlechas();
    this.cambiarTexto(this.txtObjetivo, this.textoObjetivo());
    if (e.cfg.meta) this.cambiarTexto(this.txtMeta, `${e.destruidos}/${e.cfg.meta}`);
    if (this.txtKm) this.pintarDistanciaBase();
  }

  textoObjetivo() {
    const e = this.escena;
    if (e.especial.fuegoBloqueante()) return `Apaga el fuego con agua (${nombreTecla(TECLAS.agua)})`;
    if (e.cfg.meta) return 'Destruye las posiciones antiaéreas';
    if (e.picada.lista) return `Lánzate en picada (${nombreTecla('ENTER')})`;
    if (e.fase === 'base') return `Pide refuerzos por radio (${nombreTecla(TECLAS.radio)})`;
    if (e.depositoCreado) return 'Destruye la base';
    return e.cfg.baseVidaMinima ? 'Avanza a la base' : 'Avanza a Quebrada Seca';
  }

  cambiarTexto(t, texto) {
    if (t.text !== texto) t.setText(texto);
  }

  // Cinco celdas verdes, una por vida; con una sola vida quedan rojas y parpadean
  pintarVida(vida) {
    const critica = vida === 1;
    if (vida === this.vidaPintada && !critica) return;
    this.vidaPintada = vida;
    const g = this.gBarras;
    g.clear();
    const separacion = 4;
    const celda = (BARRAS_ANCHO - separacion * (VIDA_JUGADOR - 1)) / VIDA_JUGADOR;
    const parpadeo = critica ? 0.55 + 0.45 * Math.sin(this.escena.time.now / 120) : 1;
    for (let i = 0; i < VIDA_JUGADOR; i++) {
      const x = VIDA_X + i * (celda + separacion);
      const llena = i < vida;
      g.fillStyle(llena ? (critica ? METAL.rojo : METAL.verde) : 0x15231a, llena ? parpadeo : 1).fillRect(x, Y_VIDA, celda, 12);
      if (llena) g.fillStyle(0xffffff, 0.28).fillRect(x, Y_VIDA, celda, 3); // el brillo de arriba
    }
    this.puntosPintados = -1; // esta misma gráfica dibuja la barra de puntos y hay que repintarla
  }

  // La barra azul: cuánto falta para el puntaje que desbloquea el final alternativo. Al llegar a la meta se pone dorada
  pintarPuntos() {
    const total = this.escena.puntaje.total;
    if (total === this.puntosPintados) return;
    this.puntosPintados = total;
    const g = this.gBarras;
    const fraccion = Phaser.Math.Clamp(total / PUNTAJE_FINAL_BUENO, 0, 1);
    g.fillStyle(0x10202c, 1).fillRect(VIDA_X, Y_PUNTOS, BARRAS_ANCHO, 12);
    const color = fraccion >= 1 ? 0xffd35a : 0x4fb8ff;
    g.fillStyle(color, 1).fillRect(VIDA_X, Y_PUNTOS, BARRAS_ANCHO * fraccion, 12);
    g.fillStyle(0xffffff, 0.28).fillRect(VIDA_X, Y_PUNTOS, BARRAS_ANCHO * fraccion, 3);
    this.cambiarTexto(this.txtPuntos, fraccion >= 1 ? `PUNTOS ${total}  ·  FINAL ALTERNATIVO` : `PUNTOS ${total} / ${PUNTAJE_FINAL_BUENO}`);
  }

  // La aguja del altímetro: 0 es el piso normal (arriba), el alto gira a la derecha y el bajo, a la izquierda. Mientras espero para poder
  // cambiar de piso la aguja se pone celeste y abajo salen los segundos que faltan
  pintarAltimetro() {
    const { nivel, restante } = this.escena.altura.estado();
    const { x, y, r } = this.dial;
    const a = Phaser.Math.DegToRad(nivel * 50);
    const color = restante > 0 ? METAL.celeste : METAL.ambar;
    this.gDial.clear().lineStyle(3, color, 1).beginPath().moveTo(x, y).lineTo(x + Math.sin(a) * (r - 8), y - Math.cos(a) * (r - 8)).strokePath();
    this.gDial.fillStyle(0x14181d, 1).fillCircle(x, y, 5).lineStyle(2, color, 1).strokeCircle(x, y, 5);
    this.cambiarTexto(this.txtAltura, restante > 0 ? `${Math.ceil(restante)} s` : `${nombreTecla(TECLAS.subir).slice(0, 3)} ▲  ${nombreTecla(TECLAS.bajar)} ▼`);
  }

  // Botiquines que quedan, su tecla (o "LAYLA" si en el multijugador los pide ella) y la luz de la radio cuando hay un mensaje
  pintarEquipo() {
    const e = this.escena;
    const quedan = e.botiquin.restantes;
    this.cambiarTexto(this.txtBotiquines, `×${quedan}`);
    this.txtBotiquines.setColor(quedan > 0 ? '#ffb000' : '#ff5a4a');
    if (quedan > 0) this.iconoBotiquin.clearTint();
    else this.iconoBotiquin.setTint(0x555555);
    this.cambiarTexto(this.teclaBotiquin, e.multijugador.hayLayla() ? 'LAYLA' : nombreTecla(TECLAS.botiquin));
    this.cambiarTexto(this.teclaRadio, nombreTecla(TECLAS.radio)); // con mando dicen R3 y START en vez de T y ESC
    this.cambiarTexto(this.teclaPausa, nombreTecla('ESC'));
    [this.teclaBotiquin, this.teclaRadio, this.teclaPausa].forEach((t) => t.setFontSize(t.text.length > 4 ? '8px' : '10px')); // SELECT y START son largas
    const hablando = (e.radio?.mensajes?.length ?? 0) > 0;
    const x = this.equipoX[1] + CASILLA - 8;
    this.gEquipo.clear();
    this.gEquipo.fillStyle(hablando ? (Math.floor(e.time.now / 300) % 2 ? METAL.verde : 0x1b5a2a) : 0x1b2a1f, 1).fillCircle(x, EQUIPO_Y + 8, 3.5);
  }

  // Las flechas del tablero se pulsan junto con las mías: la que estoy apretando se enciende en ámbar y se hunde un poco. Con mando, en vez
  // de las cuatro teclas muestro una cruceta, que también se enciende hacia donde inclino el stick o aprieto la cruceta
  pintarFlechas() {
    const c = this.escena.cursores;
    const estado = { izq: !!c?.left.isDown, arriba: !!c?.up.isDown, abajo: !!c?.down.isDown, der: !!c?.right.isDown };
    const clave = Object.values(estado).map(Number).join('') + (usandoMando() ? 'm' : 'k');
    if (clave === this.flechasPintadas) return; // solo repinto cuando cambia algo
    this.flechasPintadas = clave;
    const g = this.gFlechas.clear();
    if (usandoMando()) return this.pintarCruceta(g, estado);
    [['izq', 986], ['arriba', 1012], ['abajo', 1038], ['der', 1064]].forEach(([dir, x0]) => {
      const x = x0 + this.d;
      const pulsada = estado[dir];
      const y = pulsada ? 693 : 692; // al pulsarla se hunde un píxel
      g.fillStyle(pulsada ? METAL.ambar : 0x090b0e, 1).fillRoundedRect(x - 11, y - 10, 22, 20, 4);
      g.lineStyle(2, pulsada ? 0xfff0b0 : METAL.ambarSuave, 1).strokeRoundedRect(x - 11, y - 10, 22, 20, 4);
      flecha(g, x, y, dir, pulsada ? 0x090b0e : METAL.ambar);
    });
  }

  // La cruceta: una cruz con una flechita en cada punta, que se enciende en ámbar según lo que aprieto
  pintarCruceta(g, estado) {
    const cx = 1025 + this.d;
    const cy = 692;
    [['izq', -1, 0], ['der', 1, 0], ['arriba', 0, -1], ['abajo', 0, 1]].forEach(([dir, dx, dy]) => {
      const pulsada = estado[dir];
      const ancho = dx ? 14 : 9;
      const alto = dx ? 9 : 14;
      const x = cx + dx * 9 - ancho / 2;
      const y = cy + dy * 9 - alto / 2;
      g.fillStyle(pulsada ? METAL.ambar : 0x090b0e, 1).fillRoundedRect(x, y, ancho, alto, 2);
      g.lineStyle(2, pulsada ? 0xfff0b0 : METAL.ambarSuave, 1).strokeRoundedRect(x, y, ancho, alto, 2);
      flecha(g, cx + dx * 11, cy + dy * 11, dir, pulsada ? 0x090b0e : METAL.ambar, 3);
    });
    g.fillStyle(0x090b0e, 1).fillRect(cx - 4, cy - 4, 8, 8);
    g.lineStyle(2, METAL.ambarSuave, 1).strokeRect(cx - 4, cy - 4, 8, 8);
  }

  pintarDistanciaBase() {
    const { texto, progreso } = this.escena.baseEnemiga.estadoDistancia();
    this.cambiarTexto(this.txtKm, texto);
    const ancho = 280;
    const x = 20;
    const y = 36;
    const p = Phaser.Math.Clamp(progreso, 0, 1);
    const g = this.gKm.clear();
    hueco(g, x - 2, y - 2, ancho + 4, 14, 3);
    g.fillStyle(METAL.ambar, 1).fillRect(x, y, ancho * p, 10);
    g.fillStyle(0xffffff, 0.3).fillRect(x, y, ancho * p, 3);
    g.fillStyle(0xffffff, 1).fillTriangle(x + ancho * p, y - 6, x + ancho * p - 5, y - 13, x + ancho * p + 5, y - 13); // el marcador del avión
  }

  // ---------- eventos ----------

  // Cuando el avión recibe daño el retrato se pone rojo un momento
  flashDano() {
    this.retrato.setTint(0xff3b3b);
    this.pintarMarco(METAL.rojo);
    this.escena.time.delayedCall(280, () => {
      this.retrato.clearTint();
      this.pintarMarco(METAL.brillo);
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
    const t = this.escena.add.text(width / 2, y, texto, estiloHud(26, { color, align: 'center', lineSpacing: 6 })).setOrigin(0.5).setDepth(CAPA.hud + 1).setScrollFactor(0);
    this.escena.camara.interfaz(t);
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
    const { width } = this.escena.scale;
    const etiqueta = this.escena.add.text(width / 2, topeHud(this.escena.scale.height) - 12, texto, estiloHud(13, { color: TXT.dorado, fontStyle: 'bold' })).setOrigin(0.5, 1).setDepth(CAPA.hud).setScrollFactor(0);
    this.escena.camara.interfaz(etiqueta);
    this.objetos.push(etiqueta);
  }

  // Lo uso en el final del Nivel 3 para que solo se vea la base en llamas
  ocultar() {
    this.objetos.forEach((o) => o.setVisible(false));
    this.avisos.forEach((t) => t.setVisible(false));
  }
}

