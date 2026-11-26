import Phaser from 'phaser';
import { INFO } from '../../config.js';
import FondoBatalla from '../../entidades/FondoBatalla.js';
import { ajustes } from '../../sistemas/audio/ajustes.js';
import { playSfx } from '../../sistemas/audio/audio.js';
import { actualizarMusicaMenu, iniciarMusicaMenu } from '../../sistemas/audio/musicaMenu.js';
import { AGUA_ESPERA, BOMBA_ESPERA, nombreTecla, RAFAGA_ESPERA, TECLAS, ULTI_ESPERA } from '../../sistemas/nivel/constantes.js';
import { marcoRedondeado } from '../../ui/dibujo.js';
import { COLOR, FUENTE, FUENTE_TITULO, FUENTE_UI, TXT } from '../../ui/tema.js';

// Mi menú principal, inspirado en el de GTA IV: el personaje a un lado, el título al otro y una barra negra abajo con las
// opciones (la activa en naranja). De fondo pongo el campo de batalla en vivo con un velo negro al 50 %.
// Se maneja con las flechas izquierda/derecha (o A/D) y ENTER o ESPACIO, o con el mouse. ESC cierra los paneles.
// En el panel de Audio: arriba/abajo elige la fila e izquierda/derecha cambia el volumen de 10 en 10.
const OPCIONES = ['Iniciar', 'Controles', 'Audio', 'Créditos'];
const ALTO_BARRA = 64;
const TAM_RETRATO = 500;

// Quién sale según la opción activa, en el mismo orden que OPCIONES
const RETRATOS = [
  { key: 'retrato_quinones', parpadeo: 'quinones_parpadeo', lado: 'izq' }, // Iniciar
  { key: 'retrato_protagonista', parpadeo: 'layla_parpadeo', lado: 'izq' }, // Controles: Layla, la voz de la torre
  { key: 'retrato_presidente', parpadeo: null, lado: 'der' }, // Audio: Prado va a la derecha y el título pasa a la izquierda
  { key: 'yo_pixel', parpadeo: null, lado: 'izq', ancho: 420, alto: 560 }, // Créditos: yo, con marco dorado
];

const CONTROLES = [
  ['MOVER', 'FLECHAS'],
  ['BOMBA', `${TECLAS.bomba}  (recarga ${BOMBA_ESPERA} s)`],
  ['DISPARO', `${TECLAS.disparo}  (mantén pulsado)`],
  ['RÁFAGA', `${TECLAS.rafaga}  (recarga ${RAFAGA_ESPERA} s)`],
  ['ESPECIAL', `${TECLAS.especial}  (bombardeo de fuego, recarga ${ULTI_ESPERA} s)`],
  ['ALTURA', `${nombreTecla(TECLAS.subir)} sube, ${TECLAS.bajar} baja (los enemigos te siguen)`],
  ['AGUA', `${TECLAS.agua}  (apaga el fuego de la R, recarga ${AGUA_ESPERA} s)`],
  ['RADIO', `${TECLAS.radio}  (hablas y Layla repite tu voz)`],
  ['BOTIQUÍN', `${TECLAS.botiquin}  o decir "botiquín"`],
];

const FILAS_AUDIO = [
  { clave: 'musica', etiqueta: 'MÚSICA' },
  { clave: 'efectos', etiqueta: 'EFECTOS' },
  { clave: 'voces', etiqueta: 'VOCES' },
];

export default class TitleScene extends Phaser.Scene {
  constructor() {
    super('TitleScene');
  }

  // data.rapido: vengo de una partida (menú de pausa), así que la música del menú entra enseguida
  init(data) {
    this.rapido = !!data?.rapido;
  }

  create() {
    const { width, height } = this.scale;
    // Al entrar no debe quedar sonando (ni en pausa) la música de otra escena: nivel, diálogos o créditos
    this.sound.sounds.forEach((s) => {
      if (s.key !== 'musica_menu' && (s.isPlaying || s.isPaused)) s.stop();
    });
    iniciarMusicaMenu(this, this.rapido ? 1200 : 4000);

    this.panelAbierto = false;
    this.panelTipo = 'texto';
    this.contActual = null; // el panel que se ve en este momento
    this.iniciando = false;
    this.filaAudio = 0;
    this.sel = -1; // todavía no hay opción elegida

    this.fondo = new FondoBatalla(this);
    this.add.rectangle(0, 0, width, height, COLOR.negro, 0.5).setOrigin(0).setDepth(20);

    this.crearRetrato();
    this.crearTitulo();
    this.crearInsignia();
    this.crearBarraDeOpciones();
    this.crearPanelTexto();
    this.crearPanelAudio();
    this.crearTeclas();
  }

  update(_, delta) {
    this.fondo.update(delta);
  }

  // ---------- lo que se ve ----------

  // El personaje va apoyado sobre la barra y "respira" suavecito. Su sprite cambia con la opción
  crearRetrato() {
    const { width, height } = this.scale;
    this.retratoIdx = 0;
    this.cambiandoRetrato = false;
    this.lado = 'izq';
    // Con el personaje a la izquierda el título va a la derecha, y al revés
    this.pos = {
      izq: { retrato: 290, titulo: width * 0.69 },
      der: { retrato: width - 290, titulo: width * 0.31 },
    };
    this.retrato = this.add.sprite(0, 0, RETRATOS[0].key).setDisplaySize(TAM_RETRATO, TAM_RETRATO);
    this.marcoYo = this.add.rectangle(0, 0, 420, 560).setStrokeStyle(4, COLOR.naranja).setVisible(false); // solo se ve con mi foto
    this.retratoCont = this.add.container(this.pos.izq.retrato, height - ALTO_BARRA - TAM_RETRATO / 2, [this.retrato, this.marcoYo]).setDepth(30);
    this.tweens.add({ targets: this.retratoCont, scale: { from: 1, to: 1.012 }, duration: 2500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.time.addEvent({
      delay: 3600,
      loop: true,
      callback: () => {
        const p = RETRATOS[this.retratoIdx];
        if (!p.parpadeo || this.cambiandoRetrato) return;
        this.retrato.play(p.parpadeo);
        this.retrato.once('animationcomplete', () => this.retrato.setTexture(p.key));
      },
    });
  }

  crearTitulo() {
    const [anio, nombre] = INFO.titulo.replace(':', '').split('\n');
    const x = this.pos.izq.titulo;
    this.titulo = [
      this.add.text(x, 205, anio, { fontFamily: FUENTE_TITULO, fontStyle: 'bold', fontSize: '170px', color: '#000000', stroke: '#ffffff', strokeThickness: 10 }).setOrigin(0.5),
      this.add.text(x, 340, nombre, { fontFamily: FUENTE_TITULO, fontStyle: 'bold', fontSize: '52px', color: '#ffffff', stroke: '#000000', strokeThickness: 8 }).setOrigin(0.5),
      this.add
        .text(x, 392, INFO.subtitulo, { fontFamily: FUENTE, fontSize: '15px', color: '#e6e0cc', stroke: '#000000', strokeThickness: 3, align: 'center', wordWrap: { width: 520 } })
        .setOrigin(0.5),
    ];
    this.titulo.forEach((t) => t.setDepth(30).setAlpha(0));
    this.tweens.add({ targets: this.titulo, alpha: 1, duration: 900, delay: 200 });
  }

  // La "D" de arriba a la derecha (como la de Rockstar en el original) es un botón: se hunde al pulsarla y vuelve con rebote.
  // Es mi atajo secreto: 5 clics seguidos abren el panel admin
  crearInsignia() {
    const { width } = this.scale;
    const g = this.add.graphics();
    g.fillStyle(0xffc83d, 1).fillRoundedRect(-32, -32, 64, 64, 12);
    g.lineStyle(3, 0x000000, 1).strokeRoundedRect(-32, -32, 64, 64, 12);
    const letra = this.add.text(0, 0, 'D', { fontFamily: FUENTE_TITULO, fontStyle: 'bold', fontSize: '44px', color: '#111111' }).setOrigin(0.5);
    const insignia = this.add.container(width - 54, 54, [g, letra]).setDepth(40).setSize(64, 64);
    insignia.setInteractive({ useHandCursor: true });

    const presionar = () => {
      this.tweens.killTweensOf(insignia);
      this.tweens.add({ targets: insignia, scale: 0.88, y: 57, alpha: 0.85, duration: 70, ease: 'Sine.easeOut' });
    };
    const soltar = () => {
      this.tweens.killTweensOf(insignia);
      this.tweens.add({ targets: insignia, scale: 1, y: 54, alpha: 1, duration: 180, ease: 'Back.easeOut' });
    };

    let clics = 0;
    let ultimo = 0;
    insignia
      .on('pointerdown', () => {
        presionar();
        playSfx(this, 'sfx_moneda', { volume: 0.6 });
        const ahora = performance.now();
        clics = ahora - ultimo < 1200 ? clics + 1 : 1;
        ultimo = ahora;
        if (clics >= 5) {
          clics = 0;
          this.game.menuMaster?.alternar();
        }
      })
      .on('pointerup', soltar)
      .on('pointerout', soltar);
  }

  crearBarraDeOpciones() {
    const { width, height } = this.scale;
    this.add.rectangle(0, height - ALTO_BARRA, width, ALTO_BARRA, COLOR.negro).setOrigin(0).setDepth(30);
    this.items = [];
    let x = 40;
    OPCIONES.forEach((nombre, i) => {
      const t = this.add
        .text(x, height - ALTO_BARRA / 2, nombre, { fontFamily: FUENTE_UI, fontStyle: 'bold', fontSize: '28px', color: TXT.gris })
        .setOrigin(0, 0.5)
        .setDepth(31)
        .setInteractive({ useHandCursor: true });
      t.baseX = x;
      t.baseY = height - ALTO_BARRA / 2;
      // Con un panel abierto el resaltado no se mueve con el cursor: sigue marcando la opción del panel
      t.on('pointerover', () => (!this.panelAbierto || this.panelTipo === 'creditos') && this.seleccionar(i));
      t.on('pointerdown', () => {
        this.clicOpcion(i);
        this.presionarItem(t);
      });
      t.on('pointerup', () => this.soltarItem(t));
      t.on('pointerout', () => this.soltarItem(t));
      x += t.width + 46;
      this.items.push(t);
    });
    // El subrayado naranja se desliza hasta la opción activa
    this.subrayado = this.add.rectangle(0, height - 10, 100, 3, COLOR.naranja).setOrigin(0, 0.5).setDepth(31);
    this.seleccionar(0, false);
  }

  crearTeclas() {
    const kb = this.input.keyboard;
    ['LEFT', 'A'].forEach((k) => kb.on(`keydown-${k}`, () => this.mover(-1)));
    ['RIGHT', 'D'].forEach((k) => kb.on(`keydown-${k}`, () => this.mover(1)));
    ['UP', 'W'].forEach((k) => kb.on(`keydown-${k}`, () => this.moverFilaAudio(-1)));
    ['DOWN', 'S'].forEach((k) => kb.on(`keydown-${k}`, () => this.moverFilaAudio(1)));
    ['ENTER', 'SPACE'].forEach((k) => kb.on(`keydown-${k}`, () => (this.panelAbierto ? this.cerrarPanel() : this.pulsar(this.sel))));
    kb.on('keydown-ESC', () => this.cerrarPanel());
  }

  // ---------- opciones ----------

  // animar = false cuando arranca: sin sonido ni movimiento
  seleccionar(i, animar = true) {
    if (i === this.sel) return;
    const primera = this.sel < 0;
    this.sel = i;
    this.items.forEach((t, k) => t.setColor(k === i ? TXT.naranja : TXT.gris));

    const t = this.items[i];
    const escalaX = t.width / 100;
    this.tweens.killTweensOf(this.subrayado);
    if (primera || !animar) {
      this.subrayado.setPosition(t.baseX, this.subrayado.y).setScale(escalaX, 1);
      return;
    }
    this.tweens.add({ targets: this.subrayado, x: t.baseX, scaleX: escalaX, duration: 170, ease: 'Cubic.easeOut' });
    this.tweens.killTweensOf(t);
    t.setScale(1);
    this.tweens.add({ targets: t, scale: 1.1, duration: 110, yoyo: true, ease: 'Sine.easeOut' });
    // Créditos es solo para leer: se abre al elegir la opción y se cierra al salir de ella
    if (this.panelAbierto && this.panelTipo === 'creditos') this.cerrarPanel(false);
    this.cambiarRetrato(i);
    playSfx(this, 'sfx_menu_mover', { volume: 0.6 });
    if (OPCIONES[i] === 'Créditos') this.abrirCreditos();
  }

  // El retrato que está sale por su borde y el nuevo entra por el suyo. Si cambia de lado (Prado va a la derecha),
  // el título se desliza al lado contrario
  cambiarRetrato(i) {
    if (i === this.retratoIdx) return;
    this.retratoIdx = i;
    const p = RETRATOS[i];
    const r = this.retrato;
    const ladoViejo = this.lado;
    this.lado = p.lado;

    this.tweens.killTweensOf([r, this.marcoYo]);
    r.off('animationcomplete');
    r.stop();
    this.cambiandoRetrato = true;
    this.tweens.add({
      targets: [r, this.marcoYo], x: ladoViejo === 'izq' ? -50 : 50, alpha: 0, duration: 120, ease: 'Cubic.easeIn',
      onComplete: () => {
        this.retratoCont.x = this.pos[p.lado].retrato; // en este momento está invisible, no se nota el salto
        r.setTexture(p.key);
        // Cada retrato tiene su tamaño y lo apoyo siempre sobre la barra
        const alto = p.alto ?? TAM_RETRATO;
        r.setDisplaySize(p.ancho ?? TAM_RETRATO, alto);
        r.y = TAM_RETRATO / 2 - alto / 2;
        this.marcoYo.setVisible(p.key === 'yo_pixel').setY(r.y);
        r.x = p.lado === 'izq' ? -50 : 50;
        this.marcoYo.x = r.x;
        this.tweens.add({
          targets: [r, this.marcoYo], x: 0, alpha: 1, duration: 220, ease: 'Cubic.easeOut',
          onComplete: () => {
            this.cambiandoRetrato = false;
            if (this.panelAbierto && this.panelTipo === 'audio') this.hablarPrado(true);
          },
        });
      },
    });

    if (p.lado !== ladoViejo) {
      this.tweens.killTweensOf(this.titulo);
      this.titulo.forEach((t) => t.setAlpha(1));
      this.tweens.add({ targets: this.titulo, x: this.pos[p.lado].titulo, duration: 520, ease: 'Cubic.easeInOut' });
      this.tweens.add({ targets: this.titulo, alpha: 0.3, duration: 220, yoyo: true, ease: 'Sine.easeInOut' });
    }
  }

  mover(d) {
    if (this.panelAbierto && this.panelTipo !== 'creditos') {
      // Con el panel de Audio abierto, izquierda y derecha cambian el volumen de la fila elegida
      if (this.panelTipo === 'audio') this.fijarAudio(this.filaAudio, ajustes.get(FILAS_AUDIO[this.filaAudio].clave) + d * 0.1);
      return;
    }
    this.seleccionar((this.sel + d + OPCIONES.length) % OPCIONES.length);
  }

  // Clic con el mouse. Si hay un panel abierto, clic en la misma opción lo cierra y clic en otra lo cierra y abre la nueva
  clicOpcion(i) {
    if (this.iniciando) return;
    if (this.panelAbierto && this.panelTipo !== 'creditos') {
      if (i === this.sel) return this.cerrarPanel();
      this.cerrarPanel(false);
    }
    this.seleccionar(i);
    this.activar(i);
  }

  // Al presionar, la opción se achica hacia su centro y se hunde un poquito. Al soltar vuelve con rebote
  presionarItem(t) {
    this.tweens.killTweensOf(t);
    t.setColor('#ffffff');
    this.tweens.add({ targets: t, scale: 0.9, x: t.baseX + t.width * 0.05, y: t.baseY + 3, duration: 70, ease: 'Sine.easeOut' });
  }

  soltarItem(t) {
    if (t.scale === 1 && t.y === t.baseY) return;
    this.tweens.killTweensOf(t);
    t.setColor(this.items[this.sel] === t ? TXT.naranja : TXT.gris);
    this.tweens.add({ targets: t, scale: 1, x: t.baseX, y: t.baseY, duration: 190, ease: 'Back.easeOut' });
  }

  // Con el teclado hago la misma animación (presiona y suelta) y después la acción
  pulsar(i) {
    const t = this.items[i];
    this.presionarItem(t);
    this.time.delayedCall(90, () => this.soltarItem(t));
    this.activar(i);
  }

  activar(i) {
    if (this.panelAbierto && this.panelTipo !== 'creditos') return;
    playSfx(this, 'sfx_menu_ok', { volume: 0.7 });
    const opcion = OPCIONES[i];
    if (opcion === 'Iniciar') {
      if (this.iniciando) return;
      this.iniciando = true;
      this.time.delayedCall(170, () => this.scene.start('DniScene')); // espero un instante para que se vea la animación
    } else if (opcion === 'Controles') {
      this.abrirPanel('CONTROLES', CONTROLES.map(([a, b]) => a.padEnd(11) + b).join('\n'), 'left');
    } else if (opcion === 'Audio') {
      this.abrirAudio();
    } else if (!this.panelAbierto) {
      this.abrirCreditos(); // si lo cerré con ESC o ENTER, vuelve a abrirse
    }
  }

  abrirCreditos() {
    const cuerpo = [
      INFO.titulo.replace('\n', ' '),
      '',
      'INTEGRANTES',
      ...INFO.integrantes,
      '',
      'PROFESOR',
      INFO.profesor,
      '',
      'CURSO',
      INFO.curso,
      '',
      (INFO.creditos ?? []).join('   ·   '),
    ].join('\n');
    this.abrirPanel('CRÉDITOS', cuerpo, 'center', 15, 5, 'creditos');
  }

  // ---------- paneles de al lado ----------

  // El marco de los dos paneles: oscuro, con borde naranja y esquinas redondeadas, igual que los modales
  marcoDePanel() {
    const marco = this.add.graphics();
    marcoRedondeado(marco, -330, -200, 660, 400, 26, { relleno: COLOR.fondo, alfaRelleno: 0.95, borde: COLOR.naranja });
    return marco;
  }

  // Panel de texto: sirve para Controles y para Créditos
  crearPanelTexto() {
    const { width, height } = this.scale;
    const zona = this.add.rectangle(0, 0, 660, 400, 0, 0).setInteractive(); // cierra el panel al hacer clic y tapa lo de atrás
    zona.on('pointerdown', () => this.cerrarPanel());
    this.panelTitulo = this.add.text(0, -165, '', { fontFamily: FUENTE_UI, fontStyle: 'bold', fontSize: '30px', color: TXT.naranja }).setOrigin(0.5);
    this.panelCuerpo = this.add.text(0, 5, '', { fontFamily: FUENTE, fontSize: '19px', color: TXT.blanco, lineSpacing: 10 }).setOrigin(0.5);
    const pista = this.add.text(0, 172, 'ESC / ENTER: VOLVER', { fontFamily: FUENTE, fontSize: '12px', color: TXT.grisOscuro }).setOrigin(0.5);
    this.panel = this.add.container(width / 2, height / 2 - 35, [this.marcoDePanel(), zona, this.panelTitulo, this.panelCuerpo, pista]).setDepth(40).setVisible(false);
  }

  abrirPanel(titulo, cuerpo, alineacion, tam = 19, espacio = 10, tipo = 'texto') {
    this.panelTitulo.setText(titulo);
    this.panelCuerpo.setText(cuerpo).setAlign(alineacion).setFontSize(tam).setLineSpacing(espacio);
    this.panelTipo = tipo;
    this.panelAbierto = true;
    this.mostrarPanel(this.panel);
  }

  cerrarPanel(sonido = true) {
    if (!this.panelAbierto) return;
    if (sonido) playSfx(this, 'sfx_menu_volver', { volume: 0.6 });
    const cont = this.panelTipo === 'audio' ? this.panelAudio : this.panel;
    if (this.panelTipo === 'audio') this.hablarPrado(false);
    this.panelAbierto = false;
    this.ocultarPanel(cont);
  }

  // El panel sale al costado del personaje (el lado contrario al retrato) y mientras está abierto escondo el título
  mostrarPanel(cont) {
    const { width, height } = this.scale;
    const x = this.lado === 'izq' ? width - 370 : 370;
    const desde = this.lado === 'izq' ? 40 : -40; // entra deslizándose desde el borde de su lado
    this.contActual = cont;
    this.tweens.killTweensOf(cont);
    cont.setPosition(x + desde, height / 2 - 35).setAlpha(0).setVisible(true);
    this.tweens.add({ targets: cont, x, alpha: 1, duration: 260, ease: 'Cubic.easeOut' });
    this.tweens.killTweensOf(this.titulo);
    this.titulo.forEach((t) => t.setX(this.pos[this.lado].titulo)); // por si el título se estaba deslizando
    this.tweens.add({ targets: this.titulo, alpha: 0, duration: 220 });
  }

  ocultarPanel(cont) {
    this.tweens.killTweensOf(cont);
    this.tweens.add({ targets: cont, alpha: 0, duration: 180, onComplete: () => (!this.panelAbierto || this.contActual !== cont) && cont.setVisible(false) });
    this.tweens.killTweensOf(this.titulo);
    this.titulo.forEach((t) => t.setX(this.pos[this.lado].titulo)); // ahora está invisible, así que el salto no se nota
    this.tweens.add({ targets: this.titulo, alpha: 1, duration: 300, delay: 120 });
  }

  // En el panel de Audio Prado mueve la boca con su hoja de "hablar"
  hablarPrado(activo) {
    if (RETRATOS[this.retratoIdx].key !== 'retrato_presidente') return;
    if (activo) {
      this.retrato.play('presidente_hablar', true);
    } else {
      this.retrato.stop();
      this.retrato.setTexture('retrato_presidente');
    }
  }

  // ---------- panel de Audio ----------

  crearPanelAudio() {
    const { width, height } = this.scale;
    const titulo = this.add.text(0, -165, 'AUDIO', { fontFamily: FUENTE_UI, fontStyle: 'bold', fontSize: '30px', color: TXT.naranja }).setOrigin(0.5);
    const objetos = [this.marcoDePanel(), titulo];

    this.filasAudio = FILAS_AUDIO.map((fila, r) => {
      const y = -75 + r * 70;
      const etiqueta = this.add.text(-300, y, fila.etiqueta, { fontFamily: FUENTE_UI, fontStyle: 'bold', fontSize: '24px', color: TXT.blanco }).setOrigin(0, 0.5);
      // 10 segmentos: al tocar uno fijo el volumen de esa fila
      const segmentos = Array.from({ length: 10 }, (_, k) => {
        const seg = this.add.rectangle(-130 + k * 39, y, 34, 24, 0x444444).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });
        seg.on('pointerdown', () => {
          this.filaAudio = r;
          this.fijarAudio(r, (k + 1) / 10);
        });
        return seg;
      });
      const porcentaje = this.add.text(315, y, '', { fontFamily: FUENTE_UI, fontStyle: 'bold', fontSize: '22px', color: TXT.blanco }).setOrigin(1, 0.5);
      objetos.push(etiqueta, ...segmentos, porcentaje);
      return { etiqueta, segmentos, porcentaje, clave: fila.clave };
    });

    objetos.push(this.add.text(0, 130, 'ARRIBA / ABAJO: ELEGIR      IZQUIERDA / DERECHA: AJUSTAR', { fontFamily: FUENTE, fontSize: '12px', color: TXT.grisOscuro }).setOrigin(0.5));
    const volver = this.add.text(0, 168, 'VOLVER', { fontFamily: FUENTE_UI, fontStyle: 'bold', fontSize: '22px', color: TXT.naranja }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    volver.on('pointerdown', () => this.cerrarPanel());
    objetos.push(volver);

    this.panelAudio = this.add.container(width / 2, height / 2 - 35, objetos).setDepth(40).setVisible(false);
  }

  abrirAudio() {
    this.panelTipo = 'audio';
    this.panelAbierto = true;
    this.pintarAudio();
    this.mostrarPanel(this.panelAudio);
    if (!this.cambiandoRetrato) this.hablarPrado(true); // si todavía está entrando el retrato, empieza al terminar (ver cambiarRetrato)
  }

  moverFilaAudio(d) {
    if (!this.panelAbierto || this.panelTipo !== 'audio') return;
    this.filaAudio = (this.filaAudio + d + FILAS_AUDIO.length) % FILAS_AUDIO.length;
    this.pintarAudio();
  }

  fijarAudio(fila, valor) {
    const clave = FILAS_AUDIO[fila].clave;
    ajustes.fijar(clave, valor);
    if (clave === 'musica') actualizarMusicaMenu(this); // se escucha al instante en la pista que está sonando
    if (clave === 'efectos') playSfx(this, 'sfx_menu_mover', { volume: 0.6 });
    this.pintarAudio();
  }

  pintarAudio() {
    this.filasAudio.forEach((f, r) => {
      const valor = ajustes.get(f.clave);
      const llenos = Math.round(valor * 10);
      f.segmentos.forEach((seg, k) => seg.setFillStyle(k < llenos ? COLOR.naranja : 0x444444));
      f.porcentaje.setText(Math.round(valor * 100) + '%');
      f.etiqueta.setColor(r === this.filaAudio ? TXT.naranja : TXT.blanco);
    });
  }
}
