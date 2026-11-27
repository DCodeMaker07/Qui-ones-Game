import { alCambiarEntrada, recienCambiada, usandoMando } from './preferencias.js';

// Para moverme con el mando por los menús hechos con HTML (ModoScene): la cruceta o el stick resaltan un botón de la pantalla que se ve, y A
// lo pulsa. Solo actúa si estoy jugando con mando (ver preferencias.js), así no estorba a quien usa teclado y mouse. Los eventos son las
// flechas y el ENTER virtuales que manda Mando.js; el "code" de las virtuales va en mayúsculas, el de las reales no.
const esVirtual = (evento) => evento?.code === 'ENTER' || evento?.code === 'SPACE';

export function navegarConMando(escena, raiz, selector = 'button[data-accion]') {
  let sel = 0;
  let observador = null;
  const visibles = () => [...raiz.querySelectorAll(selector)].filter((b) => b.offsetParent !== null && !b.disabled);

  const pintar = () => {
    const lista = visibles();
    sel = Math.min(sel, Math.max(0, lista.length - 1));
    // Uso toggle con el segundo parámetro, que no toca el elemento si ya está como quiero. Con remove() el navegador reescribe el atributo
    // aunque no cambie nada, y eso volvía a disparar al observador de más abajo en un bucle infinito que colgaba el juego
    raiz.querySelectorAll(selector).forEach((b) => b.classList.toggle('mando-sel', usandoMando() && b === lista[sel]));
    observador?.takeRecords(); // y descarto los cambios que acabo de hacer yo mismo, para que no me avisen a mí
  };

  const mover = (d) => {
    if (!usandoMando()) return;
    const lista = visibles();
    if (!lista.length) return;
    sel = (sel + d + lista.length) % lista.length;
    pintar();
  };

  const kb = escena.input.keyboard;
  kb.on('keydown-UP', () => mover(-1));
  kb.on('keydown-DOWN', () => mover(1));
  kb.on('keydown-ENTER', (evento) => {
    if (!usandoMando() || !esVirtual(evento) || recienCambiada()) return;
    visibles()[sel]?.click();
  });

  // Cuando cambia la pantalla (las secciones se muestran y se ocultan) o el dispositivo, repinto desde el primer botón
  observador = new MutationObserver(() => pintar());
  observador.observe(raiz, { attributes: true, subtree: true, attributeFilter: ['class', 'disabled'] });
  const quitar = alCambiarEntrada(() => pintar());
  pintar();

  return {
    reiniciar() {
      sel = 0;
      pintar();
    },
    destruir() {
      observador.disconnect();
      quitar();
    },
  };
}
