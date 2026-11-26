import Phaser from 'phaser';
import { RED } from '../config.js';

// Cliente de red del modo multijugador (WebSocket). Una sola instancia: game.red.
//  - rol: 'piloto' (Quiñones) o 'estratega' (Layla) una vez dentro de una sala
//  - companero: true si la otra persona está conectada
//  - ev: emisor de eventos con cada mensaje del servidor por su tipo ('estado', 'radio', 'marca', 'inicio', ...),
//        más 'sala', 'companero', 'error' y 'cierre'. Quita tus escuchas con ev.off(...) al cerrar la escena.
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

export class Red {
  constructor() {
    this.ev = new Phaser.Events.EventEmitter();
    this.ws = null;
    this.rol = null;
    this.codigo = null;
    this.companero = false;
    this.url = '';
    this.sincros = new Set(); // etapas a las que ya llegó el compañero
  }

  get conectada() {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  // Hay una sala y la conexión está viva
  get activa() {
    return this.conectada && this.rol !== null;
  }

  // Conecta con el servidor. En Render (plan gratuito) el servicio duerme tras 15 min sin uso y tarda hasta ~1 min
  // en despertar, así que primero se consulta /health con reintentos.
  async conectar(url, alEstado) {
    if (!url) throw new Error('Falta la dirección del servidor (VITE_WS_URL).');
    if (location.protocol === 'https:' && url.startsWith('ws://') && !/^ws:\/\/(localhost|127\.0\.0\.1)/.test(url)) {
      throw new Error('Esta página usa https: el servidor debe ser wss:// (no ws://).');
    }
    this.salir();
    this.url = url;
    const http = url.replace(/^ws/, 'http');
    const local = /^wss?:\/\/(localhost|127\.0\.0\.1|192\.168\.|10\.)/.test(url);
    const limite = Date.now() + (local ? 6000 : 70000); // un servidor local no "despierta": si no responde, no está encendido
    let despierto = false;
    while (!despierto && Date.now() < limite) {
      alEstado?.('Conectando con el servidor… (si estaba dormido puede tardar hasta 1 minuto)');
      try {
        const r = await fetch(`${http}/health`, { cache: 'no-store', signal: AbortSignal.timeout(8000) });
        despierto = r.ok;
        if (r.ok) this.versionServidor = (await r.json()).version ?? 1;
      } catch {
        await espera(2000);
      }
    }
    if (!despierto) throw new Error(local ? 'No se pudo contactar con el servidor local. ¿Está encendido? (pnpm servidor)' : 'No se pudo contactar con el servidor.');

    if (this.versionServidor < RED.versionMinima) {
      throw new Error(
        'El servidor es una versión anterior. Reinícialo: en tu computador, Ctrl+C y "pnpm servidor"; en Render, Manual Deploy.'
      );
    }

    await new Promise((resolver, rechazar) => {
      const ws = new WebSocket(url);
      this.ws = ws;
      ws.addEventListener('open', resolver, { once: true });
      ws.addEventListener('error', () => rechazar(new Error('Falló la conexión WebSocket.')), { once: true });
      ws.addEventListener('message', (e) => this._alMensaje(e.data));
      ws.addEventListener('close', () => {
        if (this.ws === ws) {
          this.rol = null;
          this.companero = false;
          this.ev.emit('cierre');
        }
      });
    });
  }

  _alMensaje(texto) {
    let msg;
    try {
      msg = JSON.parse(texto);
    } catch {
      return;
    }
    if (msg.t === 'sala') {
      this.rol = msg.rol;
      this.codigo = msg.codigo;
    } else if (msg.t === 'companero') {
      this.companero = !!msg.conectado;
    } else if (msg.t === 'sync') {
      this.sincros.add(msg.etapa);
    }
    this.ev.emit(msg.t, msg);
  }

  enviar(obj) {
    if (this.conectada) this.ws.send(JSON.stringify(obj));
  }

  // Punto de encuentro de las historias en paralelo: avisa que llegaste a la "etapa" y espera a que el compañero también
  // llegue. Se resuelve en cuanto ambos están, si el compañero se desconecta o tras 2 minutos (para no dejar a nadie atascado).
  esperarCompanero(etapa) {
    this.enviar({ t: 'sync', etapa });
    return new Promise((resolver) => {
      const terminar = () => {
        clearTimeout(limite);
        this.ev.off('sync', alSync);
        this.ev.off('companero', alCompanero);
        this.ev.off('cierre', terminar);
        this.sincros.delete(etapa);
        resolver();
      };
      const alSync = (m) => m.etapa === etapa && terminar();
      const alCompanero = () => !this.companero && terminar();
      const limite = setTimeout(terminar, 120000);
      if (this.sincros.has(etapa) || !this.companero) return terminar();
      this.ev.on('sync', alSync);
      this.ev.on('companero', alCompanero);
      this.ev.on('cierre', terminar);
    });
  }

  crearSala() {
    this.enviar({ t: 'crear' });
  }

  unirse(codigo) {
    this.enviar({ t: 'unirse', codigo });
  }

  salir() {
    const ws = this.ws;
    this.ws = null;
    this.rol = null;
    this.codigo = null;
    this.companero = false;
    this.sincros.clear();
    try {
      ws?.close();
    } catch {
      /* ya cerrada */
    }
  }
}
