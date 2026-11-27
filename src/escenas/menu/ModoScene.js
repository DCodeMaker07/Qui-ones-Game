import Phaser from 'phaser';
import { RED } from '../../config.js';
import FondoBatalla from '../../entidades/FondoBatalla.js';
import { detenerMusicaMenu, iniciarMusicaMenu } from '../../sistemas/audio/musicaMenu.js';
import { navegarConMando } from '../../sistemas/entrada/navegacionDom.js';

// Lo que viene después del DNI: elijo un jugador o multijugador.
//  - Multijugador: el piloto (Quiñones) CREA una sala y comparte el código; la estratega (Layla) se UNE con él.
//    Cuando Layla está conectada, el piloto pulsa "Comenzar". Ver server/ y src/red/Red.js.
// La interfaz son formularios en HTML sobre el campo de batalla en vivo.
const MOTIVOS = {
  sala_no_existe: 'Esa sala no existe. Revisa el código.',
  sala_llena: 'La sala ya tiene dos jugadores.',
  ya_estas_en_una_sala: 'Ya estás dentro de una sala.',
};

// Las clases (.boton-gta, .campo-gta, .modal-gta) están en style.css y son las mismas del formulario del DNI
const BTN = 'boton-gta boton-gta--lleno w-full';
const BTN2 = 'boton-gta w-full';
const INPUT = 'campo-gta w-full';

export default class ModoScene extends Phaser.Scene {
  constructor() {
    super('ModoScene');
  }

  create() {
    const { width, height } = this.scale;
    this.red = this.game.red;
    iniciarMusicaMenu(this);
    this.fondo = new FondoBatalla(this);
    this.add.rectangle(0, 0, width, height, 0x000000, 0.55).setOrigin(0).setDepth(20);

    this.construirDom();
    this.nav = navegarConMando(this, this.dom); // con el mando: la cruceta resalta un botón y A lo pulsa
    this.vista('modo');

    // Lo que me avisa el servidor
    const ev = this.red.ev;
    this.escuchas = {
      sala: (m) => this.alEntrarASala(m),
      companero: () => this.actualizarSala(),
      error: (m) => this.mostrarError(MOTIVOS[m.motivo] ?? 'Error del servidor.'),
      inicio: () => this.comenzarComoEstratega(),
      cierre: () => {
        this.mostrarError('Se perdió la conexión con el servidor.');
        this.vista('multi');
      },
    };
    Object.entries(this.escuchas).forEach(([t, fn]) => ev.on(t, fn));

    this.input.keyboard.on('keydown-ESC', () => this.atras());

    this.events.once('shutdown', () => {
      Object.entries(this.escuchas).forEach(([t, fn]) => ev.off(t, fn));
      this.nav.destruir();
      this.dom.remove();
    });
  }

  update(_, delta) {
    this.fondo.update(delta);
  }

  // ---------- HTML ----------

  construirDom() {
    const url = new URLSearchParams(location.search).get('ws') || localStorage.getItem('quinones-ws') || RED.urlPorDefecto;
    this.dom = document.createElement('div');
    this.dom.className = 'absolute inset-0 z-10 flex items-center justify-center p-4';
    this.dom.innerHTML = `
      <div class="modal-gta w-full max-w-md space-y-4">
        <section data-vista="modo" class="space-y-3">
          <h2 class="modal-gta__titulo">Modo de juego</h2>
          <button data-accion="solo" class="${BTN}">Un jugador</button>
          <button data-accion="multi" class="${BTN2}">Multijugador (2 personas)</button>
          <p class="text-xs text-neutral-400">Multijugador: Quiñones combate desde el avión y Layla lo guía por radio con un mapa táctico.</p>
        </section>

        <section data-vista="multi" class="hidden space-y-3">
          <h2 class="modal-gta__titulo">Multijugador</h2>
          <button data-accion="crear" class="${BTN}">Crear sala (soy Quiñones, el piloto)</button>
          <div class="flex items-center gap-3 text-xs text-neutral-500"><span class="h-px flex-1 bg-neutral-700"></span>o<span class="h-px flex-1 bg-neutral-700"></span></div>
          <input data-campo="codigo" maxlength="4" autocomplete="off" placeholder="Código de la sala" class="${INPUT} text-center text-xl uppercase tracking-[0.4em]" />
          <button data-accion="unirse" class="${BTN2}">Unirme (soy Layla, la estratega)</button>
          <details class="text-xs text-neutral-400">
            <summary class="cursor-pointer">Servidor</summary>
            <input data-campo="url" value="${url}" placeholder="wss://mi-servicio.onrender.com" class="${INPUT} mt-2 text-xs" />
          </details>
          <button data-accion="atras" class="text-sm text-neutral-400 underline">Volver</button>
        </section>

        <section data-vista="sala" class="hidden space-y-3 text-center">
          <p class="text-sm text-neutral-300" data-texto="rol"></p>
          <p class="text-5xl font-bold tracking-[0.3em] text-amber-400" data-texto="codigo"></p>
          <ul class="space-y-2">
          <li data-jugador="piloto" class="flex items-center gap-3 rounded-lg border border-neutral-700 bg-neutral-800/70 p-2 text-left transition-all duration-300">
            <img src="assets/ui/retratos/retrato_quinones.png" alt="" class="h-12 w-12 rounded border border-amber-500/40 object-cover" style="image-rendering: pixelated" />
            <div class="min-w-0 flex-1">
              <p class="text-sm font-bold text-neutral-100">Quiñones<span data-tu class="ml-1 hidden text-xs font-normal text-amber-300">(tú)</span></p>
              <p class="text-xs text-neutral-400">Piloto · combate</p>
            </div>
            <span data-indicador class="flex h-6 w-6 items-center justify-center"></span>
          </li>
          <li data-jugador="estratega" class="flex items-center gap-3 rounded-lg border border-neutral-700 bg-neutral-800/70 p-2 text-left transition-all duration-300">
            <img src="assets/ui/retratos/retrato_protagonista.png" alt="" class="h-12 w-12 rounded border border-amber-500/40 object-cover" style="image-rendering: pixelated" />
            <div class="min-w-0 flex-1">
              <p class="text-sm font-bold text-neutral-100">Layla<span data-tu class="ml-1 hidden text-xs font-normal text-amber-300">(tú)</span></p>
              <p class="text-xs text-neutral-400">Estratega · radio y mapa</p>
            </div>
            <span data-indicador class="flex h-6 w-6 items-center justify-center"></span>
          </li>
          </ul>
          <p class="text-sm text-neutral-300" data-texto="estado"></p>
          ${
            import.meta.env.DEV
              ? `<div data-bloque="prueba" class="hidden"><label class="flex cursor-pointer items-center justify-center gap-2 text-sm text-amber-300"><input type="checkbox" data-campo="invencible" class="accent-amber-500" ${localStorage.getItem('quinones-invencible') === '1' ? 'checked' : ''} /> Modo prueba: el avión no recibe daño</label></div>`
              : ''
          }
          <button data-accion="comenzar" class="${BTN}">Comenzar</button>
          <button data-accion="salir" class="text-sm text-neutral-400 underline">Salir de la sala</button>
        </section>

        <p class="text-sm text-sky-300" data-texto="info"></p>
        <p class="text-sm text-red-400" data-texto="error"></p>
        <p class="text-right text-xs text-neutral-500">ESC: volver</p>
      </div>`;
    document.getElementById('game-wrapper').append(this.dom);

    this.el = (sel) => this.dom.querySelector(sel);
    this.dom.addEventListener('click', (e) => {
      const accion = e.target.closest('[data-accion]')?.dataset.accion;
      if (accion) this[`accion_${accion}`]?.();
    });
    this.el('[data-campo="codigo"]').addEventListener('keydown', (e) => e.key === 'Enter' && this.accion_unirse());
  }

  // ESC retrocede una pantalla: sala, crear/unirse, modo de juego, DNI y menú principal
  atras() {
    if (this.ocupado) return; // todavía conectando con el servidor
    if (this.vistaActual === 'sala') this.accion_salir();
    else if (this.vistaActual === 'multi') this.vista('modo');
    else {
      this.red.salir();
      this.scene.start('DniScene'); // la pantalla anterior; desde ahí otro ESC me lleva al menú
    }
  }

  vista(nombre) {
    this.vistaActual = nombre;
    this.dom.querySelectorAll('[data-vista]').forEach((s) => s.classList.toggle('hidden', s.dataset.vista !== nombre));
    this.nav?.reiniciar(); // el resaltado del mando vuelve al primer botón de la pantalla nueva
    this.mostrarError('');
    this.info('');
  }

  info(t) {
    this.el('[data-texto="info"]').textContent = t;
  }

  mostrarError(t) {
    this.el('[data-texto="error"]').textContent = t;
  }

  bloquear(b) {
    this.ocupado = b;
    this.dom.querySelectorAll('button').forEach((x) => (x.disabled = b));
  }

  // ---------- acciones ----------

  accion_solo() {
    this.game.red.salir();
    this.registry.set('multi', false);
    this.registry.set('misionTerminada', false);
    this.registry.set('invencible', false);
    detenerMusicaMenu(this);
    this.scene.start('CutsceneScene', { id: 'palacio' });
  }

  accion_multi() {
    this.vista('multi');
  }

  accion_atras() {
    this.vista('modo');
  }

  async conectar() {
    const url = this.el('[data-campo="url"]').value.trim();
    localStorage.setItem('quinones-ws', url);
    this.bloquear(true);
    try {
      await this.red.conectar(url, (t) => this.info(t));
      return true;
    } catch (e) {
      this.mostrarError(e.message);
      return false;
    } finally {
      this.bloquear(false);
      this.info('');
    }
  }

  async accion_crear() {
    if (await this.conectar()) this.red.crearSala();
  }

  async accion_unirse() {
    const codigo = this.el('[data-campo="codigo"]').value.trim().toUpperCase();
    if (codigo.length !== 4) return this.mostrarError('El código tiene 4 letras o números.');
    if (await this.conectar()) this.red.unirse(codigo);
  }

  accion_salir() {
    this.red.salir();
    this.vista('multi');
  }

  accion_comenzar() {
    if (this.red.rol !== 'piloto' || !this.red.companero) return;
    this.red.enviar({ t: 'inicio' });
    const invencible = !!this.el('[data-campo="invencible"]')?.checked; // la casilla de prueba (solo la muestro en desarrollo)
    localStorage.setItem('quinones-invencible', invencible ? '1' : '0');
    this.registry.set('invencible', invencible);
    this.registry.set('multi', true);
    this.registry.set('misionTerminada', false);
    this.registry.set('rol', 'piloto');
    detenerMusicaMenu(this);
    this.scene.start('CutsceneScene', { id: 'palacio' });
  }

  // ---------- eventos de red ----------

  alEntrarASala(m) {
    this.vista('sala');
    this.el('[data-texto="codigo"]').textContent = m.codigo;
    this.el('[data-texto="rol"]').textContent =
      m.rol === 'piloto' ? 'Eres Quiñones (piloto). Dale este código a Layla:' : 'Eres Layla (estratega). Sala:';
    this.actualizarSala();
  }

  actualizarSala() {
    const piloto = this.red.rol === 'piloto';
    const lista = this.red.companero;
    this.el('[data-texto="estado"]').textContent = piloto
      ? lista ? 'Layla está conectada.' : 'Esperando a Layla…'
      : lista ? 'Piloto conectado. Esperando a que comience…' : 'Esperando al piloto…';
    // Jugadores: el que ya se conectó se ve a color con un visto; al que falta lo dejo medio gris, con un spinner a la derecha
    const conectados = { piloto: piloto ? true : lista, estratega: piloto ? lista : true };
    ['piloto', 'estratega'].forEach((rol) => {
      const fila = this.el(`[data-jugador="${rol}"]`);
      const on = conectados[rol];
      fila.classList.toggle('opacity-50', !on);
      fila.classList.toggle('grayscale', !on);
      fila.classList.toggle('border-emerald-500/50', on);
      fila.querySelector('[data-tu]').classList.toggle('hidden', (rol === 'piloto') !== piloto);
      fila.querySelector('[data-indicador]').innerHTML = on
        ? '<svg viewBox="0 0 20 20" class="h-5 w-5 text-emerald-400" fill="none" stroke="currentColor" stroke-width="3"><path d="M4 10.5l4 4 8-9" stroke-linecap="round" stroke-linejoin="round"/></svg>'
        : '<span class="h-5 w-5 animate-spin rounded-full border-2 border-neutral-500 border-t-amber-400"></span>';
    });
    const boton = this.el('[data-accion="comenzar"]');
    this.el('[data-bloque="prueba"]')?.classList.toggle('hidden', !piloto);
    boton.classList.toggle('hidden', !piloto);
    boton.disabled = !lista;
  }

  comenzarComoEstratega() {
    if (this.red.rol !== 'estratega') return;
    this.registry.set('multi', true);
    this.registry.set('misionTerminada', false);
    this.registry.set('rol', 'estratega');
    detenerMusicaMenu(this);
    this.scene.start('CutsceneScene', { id: 'comando' }); // su historia va en paralelo y después viene la mesa de mando
  }
}
