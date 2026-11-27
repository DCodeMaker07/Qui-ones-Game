// Con qué estoy jugando: 'mando' o 'teclado' (teclado y mouse). Lo voy actualizando según lo último que use (ver Mando.js) y lo guardo en
// localStorage, así la próxima vez que abra el juego ya sabe con qué juego: abre el panel de Controles en el mando, muestra el resaltado
// en los menús, etc. Si el navegador no deja usar localStorage (modo privado, por ejemplo), simplemente no se guarda.
const CLAVE = 'quinones-entrada';
const oyentes = new Set();
let cambioEn = 0; // cuándo cambió por última vez, para ignorar el botón con el que "despierto" el mando

function leer() {
  try {
    return localStorage.getItem(CLAVE) === 'mando' ? 'mando' : localStorage.getItem(CLAVE) === 'teclado' ? 'teclado' : null;
  } catch {
    return null;
  }
}

let actual = leer();

export const entradaActual = () => actual;
export const usandoMando = () => actual === 'mando';

// Se pasó a otro dispositivo hace menos de 200 ms: la acción que acaba de entrar fue la que lo "activó" y no debe contar
export const recienCambiada = () => performance.now() - cambioEn < 200;

export function registrarEntrada(valor) {
  if (valor === actual) return;
  actual = valor;
  cambioEn = performance.now();
  try {
    localStorage.setItem(CLAVE, valor);
  } catch {
    /* sin almacenamiento: no pasa nada */
  }
  oyentes.forEach((f) => f(valor));
}

// Para repintar algo cuando cambie (devuelve la función que quita el aviso)
export function alCambiarEntrada(funcion) {
  oyentes.add(funcion);
  return () => oyentes.delete(funcion);
}

// El estilo de los botones que muestro: 'xbox' (A, B, X, Y, LB, RB, LT, RT) o 'playstation' (cruz, círculo, cuadrado, triángulo, L1, R1, L2, R2).
// Un mando de PlayStation conectado con un adaptador que lo hace pasar por mando de Xbox le llega al navegador como Xbox, así que no se puede
// adivinar: se elige a mano en el panel de Controles y se guarda en localStorage.
const CLAVE_ESTILO = 'quinones-estilo-mando';
function leerEstilo() {
  try {
    return localStorage.getItem(CLAVE_ESTILO) === 'playstation' ? 'playstation' : localStorage.getItem(CLAVE_ESTILO) === 'xbox' ? 'xbox' : null;
  } catch {
    return null;
  }
}
let estilo = leerEstilo();

export const estiloGuardado = () => estilo; // null si todavía no se eligió
export const estiloMando = () => estilo ?? 'xbox';

export function fijarEstiloMando(valor) {
  if (valor === estilo) return;
  estilo = valor;
  try {
    localStorage.setItem(CLAVE_ESTILO, valor);
  } catch {
    /* sin almacenamiento: no pasa nada */
  }
  oyentes.forEach((f) => f(actual));
}
