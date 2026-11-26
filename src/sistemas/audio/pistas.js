// Pistas de música que siguen sonando entre escenas (menú, diálogos, pausa) con fundidos.
// El fundido usa temporizadores del navegador (no de la escena): continúa aunque la escena se cierre o se pause.
// "factor" es la fracción (0 a 1) del volumen de música del jugador a la que suena la pista.
import { volMusica } from './ajustes.js';

// Ganancia propia de cada pista para igualar su sonoridad a la de musica_intro (medida en LUFS con ffmpeg:
// intro -22.1, menú -7.8). Si cambias un mp3, vuelve a medirlo y ajusta el número.
const GANANCIA = {
  musica_ending: 0.3, // medida en -11,5 LUFS: con 0,3 queda al nivel de la intro (-22)
  musica_menu: 0.14, // 0.19 igualaba la intro; 0.14 la deja unos 3 dB por debajo
};

// Segundo en el que empieza cada pista la primera vez (el bucle vuelve luego al segundo 0).
const INICIO = { musica_menu: 9 };
const destino = (clave, factor) => volMusica() * factor * (GANANCIA[clave] ?? 1);

// desde: volumen inicial explícito. En el evento "play" de Phaser el volumen todavía no es fiable, así que
// al arrancar una pista se parte siempre de 0.
function fundir(sonido, hasta, ms, alTerminar, desde) {
  clearInterval(sonido.idFundido); // un fundido nuevo cancela el anterior (y su "detener" pendiente)
  if (desde !== undefined) sonido.volume = desde;
  const paso = 50;
  const n = Math.max(1, Math.round(ms / paso));
  const delta = (hasta - (desde ?? sonido.volume)) / n;
  let k = 0;
  sonido.idFundido = setInterval(() => {
    k++;
    try {
      sonido.volume = Math.max(0, sonido.volume + delta);
    } catch {
      clearInterval(sonido.idFundido);
      return;
    }
    if (k >= n) {
      clearInterval(sonido.idFundido);
      alTerminar?.();
    }
  }, paso);
}

export function iniciarPista(scene, clave, factor = 1, ms = 1500) {
  if (!scene.cache.audio.exists(clave)) return;
  let m = scene.sound.get(clave);
  if (m && (m.isPlaying || m.pendiente)) {
    // Ya suena (viene de otra escena) o está esperando el permiso del navegador: solo se ajusta
    m.factor = factor;
    if (m.isPlaying) fundir(m, destino(clave, factor), 300);
    return;
  }
  m?.destroy(); // instancia detenida: se crea una nueva para que el punto de inicio vuelva a aplicarse
  m = scene.sound.add(clave, { loop: true, volume: 0 });
  m.factor = factor;
  m.pendiente = true;
  m.once('stop', () => (m.pendiente = false)); // si la paran antes de que empiece, no debe quedar "esperando" para siempre
  // Los navegadores bloquean el audio hasta el primer clic o tecla: play() queda en espera y, al empezar,
  // Phaser restablece el volumen a 0. Por eso el fundido arranca cuando la pista realmente empieza.
  m.once('play', () => {
    m.pendiente = false;
    fundir(m, destino(clave, m.factor ?? factor), ms, undefined, 0); // entrada gradual desde el silencio
  });
  // El punto de inicio (seek) solo se respeta si se pasa a play(); se pasa también volume: 0 porque esa
  // configuración sustituye a la del sonido y, sin él, arrancaría un instante a volumen 1 ("de golpe").
  m.play({ seek: INICIO[clave] ?? 0, volume: 0 });
}

// Sube o baja la pista que está sonando (por ejemplo, silencio mientras se escucha al jugador).
export function volumenPista(scene, clave, factor, ms = 300) {
  const m = scene.sound.get(clave);
  if (!m?.isPlaying) return;
  m.factor = factor;
  fundir(m, destino(clave, factor), ms);
}

export function detenerPista(scene, clave, ms = 700) {
  const m = scene.sound.get(clave);
  if (!m?.isPlaying) return;
  fundir(m, 0, ms, () => m.stop());
}

// Aplica al instante el ajuste de música del jugador.
export function actualizarPista(scene, clave) {
  const m = scene.sound.get(clave);
  if (m?.isPlaying) m.volume = destino(clave, m.factor ?? 1);
}
