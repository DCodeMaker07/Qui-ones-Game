import { aGris } from '../../ui/dibujo.js';
import Phaser from 'phaser';
import { FUENTE, VOCES, px } from '../../config.js';
import { ESCENAS, PERSONAJES, claveVoz, urlVoz } from '../../datos/historia.js';
import { ambiente } from '../../sistemas/efectos/Ambiente.js';
import { crearBaseEnLlamas } from '../../sistemas/efectos/BaseEnLlamas.js';
import { volumen } from '../../sistemas/audio/ajustes.js';
import { detenerPista, iniciarPista, volumenPista } from '../../sistemas/audio/pistas.js';

// Tamaño y posición de los retratos (la caja de diálogo se dibuja encima, así que los pies quedan detrás de ella).
const PERSONAJE_TAM = 380;
const PERSONAJE_Y = 360;

// Música de fondo de los diálogos: suena baja para no tapar las voces y se SILENCIA mientras el micrófono
// escucha al jugador (si no, el reconocimiento captaría la música por los parlantes).
const MUSICA = 'musica_dialogo';
const FACTOR_MUSICA = 0.5;

// Palabras sin tildes ni signos, en minúscula.
const palabras = (t) =>
  t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);

function distancia(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return d[a.length][b.length];
}

// ¿La palabra dicha equivale a la esperada? (se perdona alguna letra en palabras largas)
const igual = (dicha, esperada) =>
  dicha === esperada ||
  (VOCES.toleranciaLetras > 0 && dicha.length >= 5 && esperada.length >= 5 && distancia(dicha, esperada) <= VOCES.toleranciaLetras);

// Escena con personajes hablando (ver src/datos/historia.js). Uso: scene.start('CutsceneScene', { id: 'palacio' })
// Como en el juego de Grau: el que habla se ilumina y mueve la boca; el otro se atenúa y parpadea.
//
// Voces (ver VOCES en config.js):
//  - Líneas de Quiñones: el JUGADOR las lee en voz alta (micrófono). El texto aparece en negrita y atenuado, y cada
//    palabra se ilumina (karaoke) a medida que se reconoce, en orden. La escena NO avanza hasta decir la frase
//    completa; entonces el juego repite lo dicho con la voz H/M del DNI.
//  - Demás líneas: audio grabado (public/assets/audio/voces/<escena>_<nn>.mp3). Si falta, las lee la voz del
//    navegador como respaldo. Al terminar la voz, la escena avanza sola.
//  - ESPACIO / clic: salta la línea (salvo la de Quiñones mientras se escucha, ver VOCES.permitirSaltar).
export default class CutsceneScene extends Phaser.Scene {
  constructor() {
    super('CutsceneScene');
  }

  init(data) {
    this.id = ESCENAS[data.id] ? data.id : 'palacio';
    this.def = ESCENAS[this.id];
    this.musica = this.def.musica ?? MUSICA; // algunas escenas (el tributo) traen su propia música
    // Solo Quiñones (el piloto, o el único jugador) usa el micrófono: lee en voz alta las líneas de su personaje. El segundo jugador (Layla, la
    // estratega) no usa micrófono: sus líneas salen con voz sintetizada y las avanza con un clic (o ESPACIO)
    this.multi = this.registry.get('multi') === true && !!this.game.red?.activa;
    this.idJugador = this.multi && this.registry.get('rol') === 'estratega' ? 'layla' : 'quinones';
    this.soloClic = this.idJugador === 'layla'; // Layla solo da clic para avanzar: nada se salta solo
    // Escena compartida (multijugador): ambos jugadores en la misma escena, turnándose las líneas. El piloto es el
    // líder: decide cuándo se pasa a la siguiente línea y se lo avisa a Layla (mensaje "dialogo").
    this.compartida = this.multi && !!this.def.compartida && !!this.game.red.companero;
    this.lider = this.registry.get('rol') !== 'estratega';
    this.ultimoDicho = null;
    this.finEnviado = -1;
    this.finRecibido = -1;
    this.i = 0;
    this.token = 0; // identifica la línea actual: ignora eventos tardíos de líneas anteriores
    this.escribiendo = false;
    this.vozActiva = false;
    this.escuchando = false;
    this.conVoz = false;
    this.bocaActiva = false;
    this.puedeSaltar = false;
    this.hablante = null;
    this.completo = '';
    this.progreso = 0;
    this.evento = null;
    this.autoTimer = null;
    this.sonido = null;
  }

  // Los audios grabados se cargan solo al entrar a la escena; si faltan, se usa el respaldo.
  preload() {
    this.def.dialogo.forEach((_, i) => {
      const clave = claveVoz(this.id, i);
      if (!this.cache.audio.exists(clave)) this.load.audio(clave, urlVoz(this.id, i));
    });
  }

  create() {
    const { width, height } = this.scale;
    const def = this.def;
    ambiente.escena(def.fondo === 'palacio' ? 'palacio' : 'dialogo');

    // Fondo
    if (def.fondo === 'palacio') {
      const bg = this.add.image(width / 2, height / 2, 'palacio');
      bg.setScale(Math.max(width / bg.width, height / bg.height));
    } else {
      const fondoTerreno = this.add.tileSprite(0, 0, width, height, def.fondo ?? 'terreno_1').setOrigin(0);
      if (def.baseEnLlamas) {
        // Terreno quieto y base en llamas, con profundidad negativa: los personajes y el cuadro de diálogo de esta escena no
        // llevan profundidad (0) y deben quedar por delante.
        fondoTerreno.setDepth(-20);
        crearBaseEnLlamas(this, width * 0.7, height * 0.38, 1.2, -19); // opcional: la base destruida de fondo
      }
    }
    this.add.rectangle(0, 0, width, height, 0x000000, 0.5).setOrigin(0);

    // Personajes
    const xs = def.personajes.length === 1 ? [width / 2] : [width * 0.24, width * 0.76];
    this.pers = {};
    def.personajes.forEach((id, k) => {
      const p = PERSONAJES[id];
      const sprite = this.add.sprite(xs[k], PERSONAJE_Y, p.reposo).setDisplaySize(PERSONAJE_TAM, PERSONAJE_TAM).setAlpha(0.5);
      if (id === 'quinones' && this.registry.get('finalMalo')) aGris(sprite); // en el final histórico Quiñones ya murió: se ve gris
      this.pers[id] = { p, sprite, escala: sprite.scaleX };
    });

    // Caja de diálogo
    const bw = Math.min(width - 80, 1100);
    const x0 = (width - bw) / 2;
    const yTexto = height - 146;
    // Caja de esquinas redondeadas (un rectángulo de Phaser no puede redondearse: se dibuja con Graphics)
    const RADIO_CAJA = 26;
    this.add
      .graphics()
      .fillStyle(0x14110d, 0.95)
      .fillRoundedRect(x0, height - 190, bw, 170, RADIO_CAJA)
      .lineStyle(3, 0xffc83d, 1)
      .strokeRoundedRect(x0, height - 190, bw, 170, RADIO_CAJA);
    this.nombre = this.add.text(x0 + 30, height - 178, '', { fontFamily: FUENTE, fontStyle: 'bold', fontSize: px(16), color: '#ffc83d' });
    this.estado = this.add
      .text(x0 + bw - 30, height - 178, '', { fontFamily: FUENTE, fontStyle: 'bold', fontSize: px(11), color: '#ff6a6a' })
      .setOrigin(1, 0);
    this.texto = this.add.text(x0 + 30, yTexto, '', {
      fontFamily: FUENTE, fontSize: px(15), color: '#ffffff', lineSpacing: 12, wordWrap: { width: bw - 70 },
    });

    // Texto "karaoke" de Quiñones: dos capas con el mismo diseño (monospace, líneas ya partidas).
    // kBase = todo el texto atenuado; kLuz = solo las palabras reconocidas, en blanco, encima.
    const estiloK = { fontFamily: FUENTE, fontStyle: 'bold', fontSize: px(15), lineSpacing: 12 };
    this.kAncho = bw - 70;
    this.kBase = this.add.text(x0 + 30, yTexto, '', { ...estiloK, color: '#6f6a5c' }).setVisible(false);
    this.kLuz = this.add.text(x0 + 30, yTexto, '', { ...estiloK, color: '#ffffff' }).setVisible(false);

    this.pista = this.add
      .text(x0 + bw - 30, height - 48, 'CLIC / ESPACIO >', { fontFamily: FUENTE, fontSize: px(10), color: '#ffc83d' })
      .setOrigin(1, 0.5);
    this.tweens.add({ targets: this.pista, alpha: 0.2, duration: 500, yoyo: true, repeat: -1 });
    if (def.dramatizada) {
      this.add
        .text(width - 20, 18, 'ESCENA DRAMATIZADA', { fontFamily: FUENTE, fontSize: px(9), color: '#bbbbbb', stroke: '#000', strokeThickness: 3 })
        .setOrigin(1, 0);
    }

    // Sonido de escritura (opcional): solo suena cuando la línea no tiene voz
    this.blip = this.cache.audio.exists('sfx_texto') ? this.sound.add('sfx_texto', { loop: true, volume: 0.5 * volumen('efectos') }) : null;
    this.events.once('shutdown', () => this.detenerVoces());

    // Parpadeo de los personajes que no hablan
    this.time.addEvent({ delay: 3200, loop: true, callback: () => this.parpadear() });

    this.bloqueoHasta = performance.now() + 600;
    this.input.keyboard.on('keydown-SPACE', () => this.avanzar());
    this.input.keyboard.on('keydown-ENTER', () => this.avanzar());
    this.input.on('pointerdown', () => this.avanzar());

    if (this.musica !== MUSICA) detenerPista(this, MUSICA, 800); // vengo de la música de diálogos: la bajo y entra la propia
    iniciarPista(this, this.musica, FACTOR_MUSICA, 1800); // si ya suena (viene de otra escena de diálogo), sigue
    if (this.compartida) return this.iniciarCompartida();
    this.time.delayedCall(500, () => this.mostrar());
  }

  // ---------- escena compartida (multijugador) ----------

  iniciarCompartida() {
    const red = this.game.red;
    this.alDialogo = (m) => this.recibirDialogo(m);
    this.alCompanero = (m) => !m.conectado && this.seguirSolo();
    red.ev.on('dialogo', this.alDialogo);
    red.ev.on('companero', this.alCompanero);
    this.events.once('shutdown', () => {
      red.ev.off('dialogo', this.alDialogo);
      red.ev.off('companero', this.alCompanero);
    });
    this.nombre.setText('');
    this.texto.setText(`Sincronizando con ${this.lider ? 'Layla' : 'el piloto'}…`);
    this.pista.setText('');
    // Los dos esperan a estar en la escena; luego el líder lanza la primera línea y la otra persona la recibe
    red.esperarCompanero(`dlg:${this.id}`).then(() => {
      if (!this.scene.isActive() || !this.compartida) return;
      if (this.lider) this.time.delayedCall(500, () => this.mostrar());
    });
  }

  recibirDialogo(m) {
    if (m.id !== this.id || !this.compartida) return;
    if (m.a === 'linea' && !this.lider) {
      this.i = m.i;
      this.mostrar();
    } else if (m.a === 'terminar' && !this.lider) {
      this.limpiarLinea();
      this.finalizarEscena();
    } else if (m.a === 'fin') {
      // El otro jugador dijo su línea. Se oye con voz sintetizada (Layla: voz de mujer) AL MISMO TIEMPO que en el dispositivo de quien la dijo:
      // quien habla manda este aviso justo cuando empieza a repetirla, no cuando termina. Cuando la oyó entera, le avisa al líder ("listo")
      const linea = this.def.dialogo[this.i];
      if (m.i !== this.i || !linea || linea.quien === this.idJugador || this.finRecibido === this.i) return;
      this.finRecibido = this.i;
      const token = this.token;
      if (this.lider) {
        // El líder ya oyó la línea de Layla cuando empezó (la dijo su propia voz sintetizada): este aviso es el clic con el que ella pasa de línea
        this.revisarFin(token);
        return;
      }
      const texto = String(m.texto || linea.texto).slice(0, 200);
      const alTerminar = () => {
        this.finVoz(token);
        this.game.red.enviar({ t: 'dialogo', a: 'listo', id: this.id, i: this.i });
      };
      this.conVoz = true;
      this.vozActiva = true;
      this.boca(true);
      if (this.game.voice?.soportado) this.game.voice.hablar(texto, alTerminar, PERSONAJES[linea.quien]?.genero ?? 'H');
      else this.time.delayedCall(1200, alTerminar);
    } else if (m.a === 'listo' && this.lider) {
      // El otro ya oyó mi línea completa: ahora sí puedo pasar a la siguiente
      this.listoRecibido = m.i;
      if (this.esperandoListo === this.token && m.i === this.i) {
        this.autoTimer?.remove();
        const token = this.token;
        this.autoTimer = this.time.delayedCall(VOCES.pausaMs, () => this.siguiente(token));
      }
    }
  }

  // El compañero se desconectó: la escena sigue sola (con el piloto como líder)
  seguirSolo() {
    this.compartida = false;
    this.multi = false;
    this.lider = true;
    if (this.def.dialogo[this.i] && !this.escuchando && !this.vozActiva) this.siguiente(this.token);
  }

  // ---------- líneas ----------

  mostrar() {
    this.limpiarLinea();
    const token = ++this.token;
    this.esperandoListo = null;
    const linea = this.def.dialogo[this.i];
    if (this.compartida && this.lider) this.game.red.enviar({ t: 'dialogo', a: 'linea', id: this.id, i: this.i });
    const p = linea.quien ? PERSONAJES[linea.quien] : null;
    this.hablante = linea.quien;
    this.completo = linea.texto;
    this.puedeSaltar = false;

    // Quién está iluminado
    Object.entries(this.pers).forEach(([id, o]) => {
      const habla = id === linea.quien;
      this.tweens.add({ targets: o.sprite, alpha: linea.quien ? (habla ? 1 : 0.45) : 0.6, duration: 300 });
      o.sprite.stop();
      o.sprite.setTexture(o.p.reposo);
      if (habla) this.tweens.add({ targets: o.sprite, scale: o.escala * 1.04, duration: 140, yoyo: true });
    });
    this.nombre.setText(p ? p.nombre : 'NARRADOR').setColor(p ? p.color : '#cccccc');
    this.estado.setText('');
    this.pista.setText('CLIC / ESPACIO >');
    this.texto.setText('').setVisible(true);
    this.kBase.setVisible(false);
    this.kLuz.setVisible(false);

    // Línea de Quiñones: la lee el jugador (karaoke). Layla no, porque ella no usa micrófono
    if (linea.quien === this.idJugador && this.idJugador === 'quinones' && VOCES.jugadorLeeAQuinones && this.game.voice?.soportado) {
      this.texto.setVisible(false);
      this.nombre.setText(`${p.nombre} (TÚ)`);
      this.pista.setText('DI LA FRASE PARA CONTINUAR');
      volumenPista(this, this.musica, 0, 250); // silencio antes de abrir el micrófono
      this.prepararKaraoke(linea.texto);
      this.time.delayedCall(450, () => token === this.token && this.escucharJugador(token));
      return;
    }

    // Escena compartida: la línea es del OTRO jugador. Se ve su texto y se espera a que la diga (llega su aviso 'fin')
    if (this.compartida && (linea.quien === 'quinones' || linea.quien === 'layla') && linea.quien !== this.idJugador) {
      volumenPista(this, this.musica, FACTOR_MUSICA, 400);
      if (this.lider) {
        // La línea es de Layla. Su dispositivo la empieza a la vez que este (le llegó el aviso "linea"), así que la oigo con voz de mujer desde ya y
        // no cuando ella termine. Después espero a que ella haga clic para pasar de línea
        this.pista.setText('ESPERANDO A LAYLA…');
        if (VOCES.respaldoTTS && this.game.voice?.soportado) {
          this.conVoz = true;
          this.vozActiva = true;
          this.boca(true);
          this.game.voice.hablar(linea.texto, () => this.finVoz(token), PERSONAJES[linea.quien]?.genero ?? 'M');
        }
      } else {
        this.pista.setText('ESPERANDO AL OTRO JUGADOR…'); // la seguidora la oye cuando el piloto empieza a repetir su frase (aviso "fin")
      }
      this.escribir(linea.texto, 28, token);
      return;
    }

    // Otras líneas: audio grabado o voz de respaldo
    volumenPista(this, this.musica, FACTOR_MUSICA, 400);
    let msPorLetra = 32;
    const clave = claveVoz(this.id, this.i);
    if (this.cache.audio.exists(clave)) {
      this.sonido = this.sound.add(clave, { volume: volumen('voces') });
      this.conVoz = true;
      this.vozActiva = true;
      // El texto termina de escribirse un poco antes que el audio
      msPorLetra = Math.max(12, (this.sonido.duration * 1000 * 0.92) / Math.max(1, linea.texto.length));
      this.sonido.once('complete', () => this.finVoz(token));
      this.sonido.play();
    } else if (VOCES.respaldoTTS && this.game.voice?.soportado) {
      this.conVoz = true;
      this.vozActiva = true;
      this.game.voice.hablar(linea.texto, () => this.finVoz(token), p?.genero ?? 'H');
    } else {
      this.blip?.play();
    }
    this.boca(true);
    this.escribir(linea.texto, msPorLetra, token);
  }

  escribir(texto, ms, token) {
    this.escribiendo = true;
    let pos = 0;
    this.evento = this.time.addEvent({
      delay: ms,
      repeat: texto.length - 1,
      callback: () => {
        pos++;
        this.texto.setText(texto.slice(0, pos));
        if (pos >= texto.length) {
          this.escribiendo = false;
          this.revisarFin(token);
        }
      },
    });
  }

  finVoz(token) {
    if (token !== this.token) return;
    this.vozActiva = false;
    this.revisarFin(token);
  }

  // Cuando ya no hay texto escribiéndose, voz sonando ni micrófono abierto, la línea terminó.
  revisarFin(token) {
    if (token !== this.token || this.escribiendo || this.vozActiva || this.escuchando) return;
    const linea = this.def.dialogo[this.i];
    const deLayla = this.compartida && this.lider && linea?.quien === 'layla'; // línea de Layla vista desde el piloto
    if (deLayla && this.finRecibido !== this.i) return; // falta que Layla haga clic para pasar de línea
    this.boca(false);
    this.blip?.stop();
    if (deLayla) {
      this.autoTimer = this.time.delayedCall(VOCES.pausaMs, () => this.siguiente(token)); // ya hizo clic y yo terminé de oírla
    } else if (VOCES.autoAvance && this.conVoz && !this.soloClic) { // con un clic avanza Layla; al piloto lo avanza la voz
      // Si la línea es mía y Layla la está oyendo a la vez, espero a que termine de oírla ("listo") antes de pasar a la siguiente
      const alguienOye = this.compartida && this.lider && linea?.quien === this.idJugador && this.game.red.companero && this.listoRecibido !== this.i;
      if (alguienOye) {
        this.esperandoListo = token;
        this.autoTimer = this.time.delayedCall(6000, () => this.siguiente(token)); // por si el aviso no llega
      } else {
        this.autoTimer = this.time.delayedCall(VOCES.pausaMs, () => this.siguiente(token));
      }
    }
  }

  siguiente(token) {
    if (token !== undefined && token !== this.token) return;
    if (this.compartida) {
      // Terminé MI línea: se lo aviso al otro jugador (que la oye con voz sintetizada)
      const linea = this.def.dialogo[this.i];
      if (linea.quien === this.idJugador && this.finEnviado !== this.i) {
        this.finEnviado = this.i;
        this.game.red.enviar({ t: 'dialogo', a: 'fin', id: this.id, i: this.i, texto: this.ultimoDicho ?? linea.texto });
        this.ultimoDicho = null;
      }
      if (!this.lider) return; // la seguidora espera la siguiente línea que mande el líder
    }
    this.i++;
    if (this.i >= this.def.dialogo.length) {
      this.limpiarLinea();
      if (this.compartida) this.game.red.enviar({ t: 'dialogo', a: 'terminar', id: this.id });
      return this.finalizarEscena();
    }
    this.mostrar();
  }

  finalizarEscena() {
    const base = this.multi && this.def.siguienteMulti ? this.def.siguienteMulti : this.def.siguiente;
    const sig = this.idJugador === 'layla' && base.escenaEstratega ? { ...base, escena: base.escenaEstratega } : base;
    // Historias en paralelo: si el otro jugador aún no termina, se espera aquí
    if (this.multi && sig.sync && this.game.red.companero) return this.esperarCompanero(sig);
    this.salirDeLaEscena(sig);
  }

  salirDeLaEscena(sig) {
    // La música sigue entre escenas de diálogo y también hasta el despegue, que la apaga cuando el avión ya va en el aire
    if (sig.escena !== 'CutsceneScene' && sig.escena !== 'DespegueScene') detenerPista(this, this.musica, 900); // la música sigue entre escenas de diálogo
    this.scene.start(sig.escena, sig.data ?? {});
  }

  async esperarCompanero(sig) {
    const { width, height } = this.scale;
    const quien = this.idJugador === 'layla' ? 'al piloto' : 'a Layla';
    this.add.rectangle(0, 0, width, height, 0x000000, 0.45).setOrigin(0).setDepth(30);
    const t = this.add
      .text(width / 2, 150, `Esperando ${quien}…`, { fontFamily: FUENTE, fontStyle: 'bold', fontSize: px(14), color: '#ffffff', stroke: '#000', strokeThickness: 5 })
      .setOrigin(0.5)
      .setDepth(31);
    this.tweens.add({ targets: t, alpha: 0.35, duration: 700, yoyo: true, repeat: -1 });
    this.estado.setText('');
    this.pista.setText('');
    await this.game.red.esperarCompanero(sig.sync);
    if (this.scene.isActive()) this.salirDeLaEscena(sig); // si ya salió por otro camino (panel admin), no se hace nada
  }

  // Detiene todo lo que pertenece a la línea actual.
  limpiarLinea() {
    this.detenerVoces();
    this.boca(false);
  }

  // Solo voces, micrófono y temporizadores: no toca sprites (al cerrar la escena ya pueden estar destruidos).
  detenerVoces() {
    this.autoTimer?.remove();
    this.evento?.remove();
    this.sonido?.stop();
    this.sonido?.destroy();
    this.sonido = null;
    window.speechSynthesis?.cancel();
    this.game.voice?.cancelarEscucha();
    this.blip?.stop();
    this.escribiendo = false;
    this.vozActiva = false;
    this.escuchando = false;
    this.conVoz = false;
  }

  // ---------- el jugador lee a Quiñones (karaoke) ----------

  // Parte el texto en líneas sin cortar palabras (monospace) y prepara las dos capas del karaoke.
  prepararKaraoke(texto) {
    this.kBase.setText('M'.repeat(20)).setVisible(true);
    const ancho = this.kBase.width / 20; // ancho de un carácter
    const maxChars = Math.max(10, Math.floor(this.kAncho / ancho));

    const lineas = [];
    let actual = '';
    texto.split(/\s+/).forEach((pal) => {
      if (actual && (actual + ' ' + pal).length > maxChars) {
        lineas.push(actual);
        actual = pal;
      } else {
        actual = actual ? actual + ' ' + pal : pal;
      }
    });
    lineas.push(actual);
    this.kTexto = lineas.join('\n');

    // Posición de cada palabra dentro del texto partido
    this.kPalabras = [...this.kTexto.matchAll(/\S+/g)].map((m) => ({
      ini: m.index,
      fin: m.index + m[0].length,
      norm: palabras(m[0]).join(''),
    }));
    this.kEsperadas = this.kPalabras.filter((w) => w.norm).map((w) => w.norm);

    this.progreso = 0;
    this.kBase.setText(this.kTexto);
    this.kLuz.setVisible(true);
    this.pintarKaraoke();
  }

  // Las palabras reconocidas se ven en blanco; el resto queda como espacios (monospace: mismo diseño).
  pintarKaraoke() {
    const mascara = [...this.kTexto].map((c) => (c === '\n' ? '\n' : ' '));
    let n = 0;
    this.kPalabras.forEach((w) => {
      const lit = !w.norm || n < this.progreso;
      if (w.norm) n++;
      if (lit) for (let k = w.ini; k < w.fin; k++) mascara[k] = this.kTexto[k];
    });
    this.kLuz.setText(mascara.join(''));
  }

  // Cuántas palabras de la frase, EN ORDEN, aparecen en lo dicho (se permiten palabras de más).
  avance(dicho) {
    let p = 0;
    for (const w of palabras(dicho)) {
      if (p < this.kEsperadas.length && igual(w, this.kEsperadas[p])) p++;
    }
    return p;
  }

  escucharJugador(token) {
    this.escuchando = true;
    this.progreso = 0;
    this.pintarKaraoke();
    this.estado.setText('● ESCUCHANDO...').setColor('#ff6a6a');
    ambiente.pulso('#4aa3ff', 1500, 2);

    this.game.voice.escuchar({
      onParcial: (dicho) => {
        if (token !== this.token || !this.escuchando) return;
        const p = this.avance(dicho);
        if (p > this.progreso) {
          this.progreso = p;
          this.pintarKaraoke();
        }
        if (this.progreso >= this.kEsperadas.length) this.fraseCompleta(dicho, token);
      },
      onError: (mensaje, codigo) => {
        if (token !== this.token) return;
        if (codigo === 'no-speech' || codigo === 'aborted') return; // onFin vuelve a escuchar
        this.sinVoz(mensaje);
      },
      onFin: () => {
        // La escucha terminó sin que se completara la frase: se vuelve a abrir, sin límite de intentos.
        if (token !== this.token || !this.escuchando) return;
        this.time.delayedCall(300, () => token === this.token && this.escuchando && this.escucharJugador(token));
      },
    });
  }

  fraseCompleta(dicho, token) {
    this.escuchando = false;
    this.game.voice.cancelarEscucha();
    this.estado.setText('ENTENDIDO').setColor('#7cfc9a');
    volumenPista(this, this.musica, FACTOR_MUSICA, 500); // el micrófono ya se cerró: vuelve la música
    this.pista.setText('CLIC / ESPACIO >');
    this.repetirJugador(dicho, token);
  }

  // Sin micrófono o sin reconocimiento: se muestra el texto y se continúa con ESPACIO.
  sinVoz(mensaje) {
    this.escuchando = false;
    this.puedeSaltar = true;
    volumenPista(this, this.musica, FACTOR_MUSICA, 500);
    this.progreso = this.kEsperadas.length;
    this.pintarKaraoke();
    this.estado.setText(mensaje).setColor('#ffb347');
    this.pista.setText('ESPACIO: CONTINUAR SIN VOZ');
  }

  // El juego repite lo dicho con la voz H/M según el DNI del jugador.
  repetirJugador(dicho, token) {
    this.ultimoDicho = dicho;
    this.conVoz = true;
    this.vozActiva = true;
    this.boca(true);
    // Escena compartida: le aviso al otro jugador ahora (no cuando termine) para que la oiga a la vez que yo
    if (this.compartida && this.finEnviado !== this.i) {
      this.finEnviado = this.i;
      this.game.red.enviar({ t: 'dialogo', a: 'fin', id: this.id, i: this.i, texto: dicho });
    }
    this.game.voice.hablar(dicho, () => this.finVoz(token), this.idJugador === 'layla' ? 'M' : undefined);
  }

  // ---------- animación ----------

  boca(activa) {
    const o = this.pers?.[this.hablante];
    this.bocaActiva = activa;
    if (!o || !o.sprite.active) return;
    if (activa) {
      o.sprite.play(o.p.hablar, true);
    } else {
      o.sprite.stop();
      o.sprite.setTexture(o.p.reposo);
    }
  }

  parpadear() {
    Object.entries(this.pers).forEach(([id, o]) => {
      const hablando = this.bocaActiva && id === this.hablante;
      if (hablando || !o.p.parpadeo || !o.sprite.active) return;
      o.sprite.play(o.p.parpadeo);
      o.sprite.once('animationcomplete', () => {
        if (o.sprite.active && !(this.bocaActiva && id === this.hablante)) o.sprite.setTexture(o.p.reposo);
      });
    });
  }

  // ---------- entrada ----------

  avanzar() {
    if (performance.now() < this.bloqueoHasta || !this.def.dialogo[this.i]) return;
    this.bloqueoHasta = performance.now() + 150;
    // Escena compartida: la línea es del otro jugador, no se puede saltar: hay que esperar a que la diga
    const actual = this.def.dialogo[this.i];
    if (this.compartida && (actual.quien === 'quinones' || actual.quien === 'layla') && actual.quien !== this.idJugador) return;

    // Mientras se espera la frase de Quiñones no se puede saltar (salvo que no haya micrófono)
    if (this.escuchando && !VOCES.permitirSaltar && !this.puedeSaltar) return;
    // Saltar la línea mientras suena la voz o se escucha al jugador
    if (this.escuchando || (this.conVoz && this.vozActiva)) return this.siguiente();
    if (this.escribiendo) {
      this.evento?.remove();
      this.texto.setText(this.completo);
      this.escribiendo = false;
      this.boca(false);
      this.blip?.stop();
      return;
    }
    this.siguiente();
  }
}
