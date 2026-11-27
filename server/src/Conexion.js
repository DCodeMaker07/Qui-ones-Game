import { MAX_MENSAJES_POR_SEG, MAX_PAYLOAD, PERMITIDOS } from './config.js';
import { buscarSala, crearSala, salir } from './salas.js';
import { DecodificadorTramas, OP, trama } from './websocket.js';

// Una persona conectada. Acá está lo del juego: crear una sala, unirse y reenviarle al compañero los mensajes que el rol
// tiene permitidos. Leer y armar tramas WebSocket lo hace websocket.js.
//
// Mensajes (JSON):
//   cliente -> servidor : { t: 'crear' } | { t: 'unirse', codigo } | { t: 'ping' }
//   servidor -> cliente : { t: 'sala', codigo, rol } | { t: 'companero', conectado } | { t: 'error', motivo } | { t: 'pong' }
//   piloto    -> estratega : estado, radio, evento, escena, inicio, fin, sync, dialogo
//   estratega -> piloto    : radio, orden, marca, botiquin, barrera, refuerzos, chat, sync, dialogo
//   dialogo { a: 'linea' | 'fin' | 'listo' | 'terminar', id, i, texto }: escenas compartidas (el piloto es el líder). 'fin' lo manda quien dijo la línea
//   justo cuando empieza a repetirla (así el otro la oye a la vez) y 'listo' el otro cuando terminó de oírla.
//   sync { etapa }: "llegué a este punto"; cada jugador espera el sync del otro (historias en paralelo)
export const conexiones = new Set();

export default class Conexion {
  constructor(socket) {
    this.socket = socket;
    this.sala = null;
    this.rol = null; // 'piloto' o 'estratega'
    this.viva = true; // se pone en false con cada ping y vuelve a true cuando contesta (ver mantenimiento.js)
    this.cuenta = 0;
    this.ventana = Date.now();
    this.cerrada = false;
    this.decodificador = new DecodificadorTramas({
      maxPayload: MAX_PAYLOAD,
      alTexto: (texto) => this.alMensaje(texto),
      alPing: (carga) => this.socket.write(trama(OP.PONG, carga)),
      alPong: () => (this.viva = true),
      alCierre: () => this.cerrar(1000),
      alError: (codigo) => this.cerrar(codigo),
      activa: () => !this.cerrada,
    });
    conexiones.add(this);
    socket.setNoDelay(true);
    socket.on('data', (datos) => this.decodificador.alimentar(datos));
    socket.on('close', () => this.alCerrar());
    socket.on('error', () => this.alCerrar());
  }

  enviar(objeto) {
    if (this.cerrada) return;
    try {
      this.socket.write(trama(OP.TEXTO, Buffer.from(JSON.stringify(objeto))));
    } catch {
      this.alCerrar();
    }
  }

  // El ping del mantenimiento: si la conexión está rota, esto falla y la doy por caída
  hacerPing() {
    try {
      this.socket.write(trama(OP.PING));
    } catch {
      this.alCerrar();
    }
  }

  cerrar(codigo = 1000) {
    if (this.cerrada) return;
    try {
      const carga = Buffer.alloc(2);
      carga.writeUInt16BE(codigo, 0);
      this.socket.write(trama(OP.CIERRE, carga));
    } catch {
      /* ya estaba cerrado */
    }
    this.socket.end();
    this.alCerrar();
  }

  alMensaje(texto) {
    // Límite de mensajes por segundo, para que un cliente no sature el servidor
    const ahora = Date.now();
    if (ahora - this.ventana > 1000) {
      this.ventana = ahora;
      this.cuenta = 0;
    }
    if (++this.cuenta > MAX_MENSAJES_POR_SEG) return this.cerrar(1008);

    let mensaje;
    try {
      mensaje = JSON.parse(texto);
    } catch {
      return;
    }
    if (!mensaje || typeof mensaje.t !== 'string') return;

    if (mensaje.t === 'crear') return this.crearSala();
    if (mensaje.t === 'unirse') return this.unirse(String(mensaje.codigo || ''));
    if (mensaje.t === 'ping') return this.enviar({ t: 'pong' });
    this.reenviar(mensaje);
  }

  crearSala() {
    if (this.sala) return this.enviar({ t: 'error', motivo: 'ya_estas_en_una_sala' });
    this.sala = crearSala(this);
    this.rol = 'piloto';
    this.enviar({ t: 'sala', codigo: this.sala.codigo, rol: 'piloto' });
  }

  unirse(codigo) {
    if (this.sala) return this.enviar({ t: 'error', motivo: 'ya_estas_en_una_sala' });
    const sala = buscarSala(codigo);
    if (!sala) return this.enviar({ t: 'error', motivo: 'sala_no_existe' });
    if (sala.estratega) return this.enviar({ t: 'error', motivo: 'sala_llena' });
    sala.estratega = this;
    this.sala = sala;
    this.rol = 'estratega';
    this.enviar({ t: 'sala', codigo: sala.codigo, rol: 'estratega' });
    this.enviar({ t: 'companero', conectado: !!sala.piloto });
    sala.piloto?.enviar({ t: 'companero', conectado: true });
  }

  // El compañero de sala (el otro rol), o null si no hay
  otro() {
    if (!this.sala) return null;
    return this.rol === 'piloto' ? this.sala.estratega : this.sala.piloto;
  }

  reenviar(mensaje) {
    if (!this.rol || !PERMITIDOS[this.rol].has(mensaje.t)) return;
    this.otro()?.enviar(mensaje);
  }

  alCerrar() {
    if (this.cerrada) return;
    this.cerrada = true;
    conexiones.delete(this);
    if (this.sala) {
      this.otro()?.enviar({ t: 'companero', conectado: false });
      salir(this.sala, this.rol);
    }
    try {
      this.socket.destroy();
    } catch {
      /* nada */
    }
  }
}
