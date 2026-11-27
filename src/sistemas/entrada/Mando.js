// El mando (gamepad) del juego. En vez de tocar cada escena, el mando "aprieta teclas virtuales": cada fotograma leo el mando con la API del
// navegador (navigator.getGamepads) y, según lo que se apriete, marco como apretadas o sueltas las mismas teclas que ya usa el juego (flechas,
// Q, W, E, R, F, X, ESPACIO, C, B, T, ENTER, ESC). Así funciona en el nivel y también en los menús y en los diálogos, sin cambiar sus
// controles. Sirve con cualquier mando "estándar" (Xbox, PlayStation, etc.) que el navegador reconozca; ojo que el navegador solo lo detecta
// después de apretar un botón.
//
// En el nivel:
//   stick izquierdo o cruceta  mover            RT  disparar (W, mantenido)      A  bomba (Q) y, en la picada, ENTER
//   B  ráfaga (E)                               X   agua (F)                     Y  tonel (X)
//   LT  bombardeo de fuego (R)                  RB  subir de altura (ESPACIO)    LB bajar de altura (C)
//   Select  botiquín (B)                        R3  radio (T)                    Start  pausa (ESC)
// En los menús y diálogos: stick o cruceta para moverme, A confirma (ENTER y ESPACIO) y B o Start vuelven (ESC).
const CODIGOS = { UP: 38, DOWN: 40, LEFT: 37, RIGHT: 39, ENTER: 13, SPACE: 32, ESC: 27, Q: 81, W: 87, E: 69, R: 82, F: 70, X: 88, C: 67, T: 84, B: 66 };
const ZONA_MUERTA = 0.4; // cuánto hay que inclinar el stick para que cuente

// El primer mando conectado, con los botones ya convertidos a verdadero o falso
// El mando solo cuenta en esta ventana si tiene el foco y si no soy Layla. El navegador le muestra el mismo mando a todas las ventanas abiertas,
// así que al probar el multijugador en un solo computador los dos jugadores se movían con él a la vez. Ahora solo responde la ventana en la que estoy
// (la que tiene el foco) y nunca la de la estratega, que solo usa el mouse y el chat.
let juegoMando = null;
function mandoPermitido() {
  const esLayla = juegoMando?.registry.get('multi') === true && juegoMando?.registry.get('rol') === 'estratega';
  return document.hasFocus() && !esLayla;
}

function leerMando() {
  if (!mandoPermitido()) return null;
  const mando = [...(navigator.getGamepads?.() ?? [])].find((m) => m && m.connected);
  if (!mando) return null;
  const boton = (i) => !!mando.buttons[i]?.pressed || (mando.buttons[i]?.value ?? 0) > 0.5;
  const ax = mando.axes[0] ?? 0;
  const ay = mando.axes[1] ?? 0;
  return {
    izq: ax < -ZONA_MUERTA || boton(14),
    der: ax > ZONA_MUERTA || boton(15),
    arriba: ay < -ZONA_MUERTA || boton(12),
    abajo: ay > ZONA_MUERTA || boton(13),
    A: boton(0), B: boton(1), X: boton(2), Y: boton(3), LB: boton(4), RB: boton(5), LT: boton(6), RT: boton(7), SELECT: boton(8), START: boton(9), R3: boton(11),
  };
}

// Qué teclas deberían estar apretadas ahora, según el mando y si estoy jugando un nivel o en un menú
function teclasPara(m, jugando, escena) {
  const teclas = new Set();
  if (m.izq) teclas.add('LEFT');
  if (m.der) teclas.add('RIGHT');
  if (m.arriba) teclas.add('UP');
  if (m.abajo) teclas.add('DOWN');
  if (jugando) {
    if (m.A) ['Q', 'ENTER'].forEach((t) => teclas.add(t)); // el ENTER es para lanzarme en picada
    if (m.B) teclas.add('E');
    if (m.X) teclas.add('F');
    if (m.Y) teclas.add('X');
    if (m.LT) teclas.add('R');
    if (m.RT) teclas.add('W');
    if (m.RB) teclas.add('SPACE');
    if (m.LB) teclas.add('C');
    if (m.SELECT) teclas.add('B');
    if (m.R3) teclas.add('T');
    if (m.START) teclas.add('ESC');
  } else {
    if (m.A) {
      // A es "aceptar". Muchas escenas escuchan ENTER y ESPACIO por separado y hacen lo mismo con las dos: si mandara las dos, la acción
      // pasaba dos veces (por ejemplo el menú del título abría el panel y lo cerraba al instante). Mando solo una: la que la escena escucha
      const teclado = escena.input?.keyboard;
      const escuchaEnter = teclado?.listenerCount('keydown-ENTER') > 0;
      const escuchaEspacio = teclado?.listenerCount('keydown-SPACE') > 0;
      if (escuchaEnter || !escuchaEspacio) teclas.add('ENTER');
      if (!escuchaEnter && (escuchaEspacio || !escuchaEnter)) teclas.add('SPACE');
    }
    if (m.B || m.START) teclas.add('ESC');
  }
  return teclas;
}

// Aprieta o suelta una tecla virtual en una escena: actualiza la tecla (para quien pregunta isDown) y avisa a quien escucha sus eventos
function aplicar(escena, nombre, abajo) {
  const teclado = escena.input?.keyboard;
  if (!teclado) return;
  const tecla = teclado.addKey(CODIGOS[nombre], false); // sin capturar: no bloquea la tecla en el navegador
  if (tecla.isDown === abajo) return;
  const evento = { key: nombre, code: nombre, keyCode: CODIGOS[nombre], repeat: false, preventDefault() {}, stopPropagation() {} };
  tecla.isDown = abajo;
  tecla.isUp = !abajo;
  tecla._justDown = abajo;
  tecla._justUp = !abajo;
  tecla.emit(abajo ? 'down' : 'up', tecla, evento);
  teclado.emit(abajo ? `keydown-${nombre}` : `keyup-${nombre}`, evento);
}

import { estiloGuardado, fijarEstiloMando, registrarEntrada } from './preferencias.js';

// Un evento de teclado cualquiera, para las pantallas que esperan "cualquier tecla" (la intro y la pantalla de inicio)
const EVENTO_CUALQUIERA = { key: 'Gamepad', code: 'GAMEPAD', keyCode: 0, repeat: false, preventDefault() {}, stopPropagation() {} };

// Cuánto está inclinado el stick derecho (de -1 a 1 en cada eje, con zona muerta): lo uso para el zoom del nivel con el mando
export function ejeDerecho() {
  if (!mandoPermitido()) return { x: 0, y: 0 };
  const mando = [...(navigator.getGamepads?.() ?? [])].find((m) => m && m.connected);
  if (!mando) return { x: 0, y: 0 };
  const eje = (i) => (Math.abs(mando.axes[i] ?? 0) > ZONA_MUERTA ? mando.axes[i] : 0);
  return { x: eje(2), y: eje(3) };
}

export function iniciarMando(juego) {
  juegoMando = juego;
  let previos = new Set(); // los botones que estaban apretados el fotograma anterior
  const avisar = (mando) => {
    const aviso = document.createElement('div');
    aviso.textContent = `Mando conectado: ${mando.id.split('(')[0].trim()}`;
    aviso.style.cssText = 'position:fixed;right:16px;bottom:16px;z-index:50;padding:8px 14px;border:2px solid #ffb000;border-radius:8px;background:#0d1014;color:#f0e6d2;font:bold 13px Nunito,sans-serif;transition:opacity .6s';
    document.body.appendChild(aviso);
    setTimeout(() => (aviso.style.opacity = '0'), 2600);
    setTimeout(() => aviso.remove(), 3300);
  };
  window.addEventListener('gamepadconnected', (e) => {
    // Un mando de PlayStation conectado directo se reconoce por su nombre y pongo sus botones; con un adaptador que lo hace pasar por Xbox
    // no se puede saber, y el estilo se elige en el panel de Controles. Si ya elegí uno, no lo toco
    if (estiloGuardado() === null && /playstation|dualshock|dualsense|054c/i.test(e.gamepad.id)) fijarEstiloMando('playstation');
    avisar(e.gamepad);
  });
  // Con qué estoy jugando: lo último que use (el mando o el teclado y mouse de verdad) se guarda como preferencia (ver preferencias.js)
  ['keydown', 'mousedown', 'wheel'].forEach((tipo) => window.addEventListener(tipo, () => registrarEntrada('teclado'), { passive: true }));

  juego.events.on('prestep', () => {
    const mando = leerMando();
    // Qué botones están apretados, y si alguno es nuevo (recién apretado este fotograma). Solo una pulsación NUEVA cuenta como "juego con mando":
    // si el mando tiene un botón pegado o el stick desviado, no puede quitarle la preferencia al teclado y al mouse cada fotograma
    const activos = new Set(mando ? Object.entries(mando).filter(([, apretado]) => apretado).map(([nombre]) => nombre) : []);
    const nuevo = [...activos].some((nombre) => !previos.has(nombre));
    if (nuevo) registrarEntrada('mando');
    juego.scene.getScenes(true).forEach((escena) => {
      // En un nivel solo juego si no está en pausa ni terminado; en cualquier otro caso (menús, diálogos, pausa) uso los controles de menú
      const jugando = escena.scene.key.startsWith('Level') && !escena.pausado && !escena.terminado;
      const ahora = mando ? teclasPara(mando, jugando, escena) : new Set();
      if (escena.__mando === undefined) {
        // La escena acaba de empezar. Lo que ya estaba apretado (por ejemplo la A con la que confirmé el DNI en la pantalla anterior) no cuenta
        // hasta que lo suelte: si no, esa misma A elegía "Un jugador" en la pantalla siguiente sin que yo lo pidiera
        if (!escena.__mandoEnlazado) {
          escena.__mandoEnlazado = true;
          escena.events.on('shutdown', () => (escena.__mando = undefined)); // cuando la escena se cierra, la próxima vez vuelve a empezar de cero
        }
        escena.__mando = new Set([...ahora].filter((t) => t === 'ENTER' || t === 'SPACE' || t === 'ESC'));
      }
      const antes = escena.__mando;
      Object.keys(CODIGOS).forEach((nombre) => {
        if (ahora.has(nombre) !== antes.has(nombre)) aplicar(escena, nombre, ahora.has(nombre));
      });
      escena.__mando = ahora;
    });

    // "Cualquier tecla": cada vez que se aprieta un botón nuevo del mando (o se inclina el stick), cualquiera que sea, aviso como si se hubiera
    // apretado una tecla cualquiera. Así el mando también salta la intro y pasa de la pantalla de inicio
    if (nuevo) juego.scene.getScenes(true).forEach((escena) => escena.input?.keyboard?.emit('keydown', EVENTO_CUALQUIERA));
    previos = activos;
  });
}
