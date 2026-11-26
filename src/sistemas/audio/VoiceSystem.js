import { volumen } from './ajustes.js';

// Reconocimiento de voz (SpeechRecognition) + síntesis (SpeechSynthesis) del navegador.
// Funciona mejor en Chrome/Edge de escritorio. Requiere permiso de micrófono y,
// en Chrome, conexión a internet para el reconocimiento.

const FEMENINAS = /sabina|helena|laura|elvira|dalia|paulina|m[oó]nica|elena|luc[ií]a|camila|female|mujer/i;
const MASCULINAS = /raul|raúl|pablo|jorge|alvaro|álvaro|diego|carlos|andr[eé]s|alex|male|hombre/i;

const ERRORES = {
  'not-allowed': 'Permite el micrófono en el navegador.',
  'service-not-allowed': 'Permite el micrófono en el navegador.',
  'no-speech': 'No te escuché. Intenta de nuevo.',
  'audio-capture': 'No se detecta un micrófono.',
  network: 'Sin conexión: el reconocimiento de voz necesita internet.',
};

export class VoiceSystem {
  constructor() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.soportado = !!SR && 'speechSynthesis' in window;
    this.genero = 'H';
    this.escuchando = false;
    this.sesion = 0; // evita que eventos tardíos de una escucha cancelada afecten a la siguiente

    if (SR) {
      this.rec = new SR();
      this.rec.lang = 'es-PE';
      this.rec.continuous = false;
      this.rec.interimResults = false;
    }
    if ('speechSynthesis' in window) {
      // Las voces cargan de forma asíncrona.
      window.speechSynthesis.onvoiceschanged = () => {};
    }
  }

  // 'H' = hombre, 'M' = mujer (resultado de la consulta por DNI).
  setGenero(genero) {
    this.genero = genero === 'M' ? 'M' : 'H';
  }

  // onError recibe (mensaje, código) con el código de la Web Speech API (p. ej. 'no-speech').
  // onParcial(texto, esFinal): resultados a medida que se habla (modo karaoke); activa la escucha continua.
  escuchar({ onTexto, onParcial, onError, onFin } = {}) {
    if (!this.rec || this.escuchando) return;
    this.escuchando = true;
    const sesion = ++this.sesion;
    this.rec.continuous = !!onParcial;
    this.rec.interimResults = !!onParcial;

    this.rec.onresult = (e) => {
      if (sesion !== this.sesion) return;
      if (onParcial) {
        let texto = '';
        for (let i = 0; i < e.results.length; i++) texto += e.results[i][0].transcript + ' ';
        onParcial(texto.trim(), e.results[e.results.length - 1].isFinal);
        return;
      }
      const texto = e.results[0][0].transcript.trim();
      if (texto) onTexto?.(texto);
    };
    this.rec.onerror = (e) => {
      if (sesion !== this.sesion) return;
      onError?.(ERRORES[e.error] ?? `Error de voz (${e.error}).`, e.error);
    };
    this.rec.onend = () => {
      if (sesion !== this.sesion) return;
      this.escuchando = false;
      onFin?.();
    };

    try {
      this.rec.start();
    } catch {
      this.escuchando = false;
    }
  }

  cancelarEscucha() {
    if (!this.rec) return;
    this.sesion++;
    this.escuchando = false;
    try {
      this.rec.abort();
    } catch {
      /* no estaba escuchando */
    }
  }

  _elegirVoz(genero) {
    const voces = window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith('es'));
    const coincide = voces.filter((v) =>
      genero === 'M' ? FEMENINAS.test(v.name) : !FEMENINAS.test(v.name) && MASCULINAS.test(v.name)
    );
    const lista = coincide.length ? coincide : voces;
    const voz = lista.find((v) => v.lang.toLowerCase() === 'es-pe') ?? lista[0] ?? null;
    return { voz, exacta: coincide.length > 0 };
  }

  // genero: por defecto el del jugador (DNI); las escenas lo usan para dar voz a otros personajes.
  // onFin se llama UNA sola vez, incluso si el navegador no avisa el final de la voz.
  hablar(texto, onFin, genero = this.genero) {
    if (!('speechSynthesis' in window)) return onFin?.();
    const ss = window.speechSynthesis;
    if (ss.speaking || ss.pending) ss.cancel();

    const { voz, exacta } = this._elegirVoz(genero);
    const u = new SpeechSynthesisUtterance(texto);
    u.lang = 'es-PE';
    u.volume = volumen('voces');
    if (voz) u.voice = voz;
    // Si el navegador no trae una voz del género pedido, se simula con el tono.
    if (!exacta) u.pitch = genero === 'M' ? 1.35 : 0.7;

    let terminado = false;
    // Si el navegador nunca avisa el final (pasa en Chrome), se continúa tras una duración estimada.
    const vigilante = setTimeout(() => terminar(), 2000 + texto.length * 120);
    const terminar = () => {
      if (terminado) return;
      terminado = true;
      clearTimeout(vigilante);
      if (this._u === u) this._u = null;
      onFin?.();
    };
    u.onend = terminar;
    u.onerror = terminar;

    // Chrome puede recolectar la locución y no avisar el final: se mantiene una referencia.
    this._u = u;
    // Hablar justo después de cancelar a veces se descarta: se espera un instante.
    setTimeout(() => {
      ss.resume();
      ss.speak(u);
    }, 60);
  }
}
