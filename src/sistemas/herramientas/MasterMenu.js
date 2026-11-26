// Panel Admin (herramienta de desarrollo): panel lateral para saltar a cualquier escena, como el del juego de Grau.
// Se abre y cierra con Ctrl + Shift + A, Ctrl + Alt + M o L3 + R3 (mando); también con #master al final de la
// dirección o con 5 clics seguidos en la insignia "D" del título. Mientras está abierto el juego se congela.
// Con el panel abierto: flechas arriba/abajo o D-pad navegan, Enter o Cross seleccionan, Esc o Circle cierran.
// Los estilos están en src/style.css (#admin-panel).

const ESCENAS = [
  ['Intro', 'IntroScene'],
  ['Menú principal', 'TitleScene'],
  ['DNI', 'DniScene'],
  ['Modo de juego (sala)', 'ModoScene'],
  ['Layla: mesa de mando', 'EstrategaScene'],
  ['Escena: Palacio (Prado + Quiñones)', 'CutsceneScene', { id: 'palacio' }],
  ['Escena: Torre (Layla + Quiñones)', 'CutsceneScene', { id: 'torre' }],
  ['Escena: Mando de tierra (Layla + General)', 'CutsceneScene', { id: 'comando' }],
  ['Despegue (antes del Nivel 1)', 'DespegueScene'],
  ['Nivel 1', 'Level1Scene'],
  ['Escena: Fin del Nivel 1', 'CutsceneScene', { id: 'fin_nivel1' }],
  ['Nivel 2', 'Level2Scene'],
  ['Escena: Fin del Nivel 2', 'CutsceneScene', { id: 'fin_nivel2' }],
  ['Nivel 3 (la base)', 'Level3Scene'],
  ['Nivel 3: picada (final histórico)', 'Level3Scene', { probarPicada: true, puntaje: 0 }],
  ['Nivel 3: picada (final alternativo)', 'Level3Scene', { probarPicada: true, puntaje: 99999 }],
  ['Final alternativo (paracaídas)', 'FinalAlternativoScene'],
  ['Escena: Epílogo del final alternativo', 'CutsceneScene', { id: 'epilogo_alt' }],
  ['Escena: Tributo', 'CutsceneScene', { id: 'tributo' }],
  ['Ending (créditos)', 'EndingScene', { victoria: true }],
  ['Línea de tiempo de juegos', 'LineaTiempoScene'],
  ['Derrota', 'EndScene', { victoria: false, nivel: 'Level1Scene' }],
];

// Mapeo estándar del mando (Standard Gamepad): Cross/A = 0, Circle/B = 1, L3 = 10, R3 = 11, D-pad arriba/abajo = 12/13
const PAD = { CROSS: 0, CIRCLE: 1, L3: 10, R3: 11, UP: 12, DOWN: 13, EJE_Y: 1 };

export function crearMasterMenu(game) {
  const panel = document.createElement('div');
  panel.id = 'admin-panel';
  panel.innerHTML = `
    <div id="admin-panel-backdrop"></div>
    <div id="admin-panel-drawer">
      <h2>Panel Admin</h2>
      <p class="admin-panel-hint">Ctrl + Shift + A o L3 + R3 para cerrar · D-pad navega · Cross selecciona</p>
      <p class="admin-panel-estado" id="admin-panel-estado"></p>
      <div id="admin-panel-list"></div>
    </div>`;
  document.body.append(panel);

  const estado = panel.querySelector('#admin-panel-estado');
  let abierto = false;
  let dormido = false;
  let foco = 0;

  const cargando = () => {
    const carga = game.scene.getScene('PreloadScene');
    return game.scene.isActive('BootScene') || (game.scene.isActive('PreloadScene') && !carga?.listo);
  };

  const botones = ESCENAS.map(([etiqueta, clave, data]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.tabIndex = -1;
    b.className = 'admin-panel-btn';
    b.textContent = etiqueta;
    b.addEventListener('click', () => ir(clave, data));
    b.addEventListener('mouseenter', () => marcar(botones.indexOf(b)));
    panel.querySelector('#admin-panel-list').append(b);
    return b;
  });

  function marcar(i) {
    foco = ((i % botones.length) + botones.length) % botones.length;
    botones.forEach((b, k) => b.classList.toggle('focused', k === foco));
    botones[foco].scrollIntoView?.({ block: 'nearest' });
  }

  function abrir() {
    panel.classList.add('open');
    abierto = true;
    estado.textContent = 'Activa: ' + game.scene.getScenes(true).map((s) => s.scene.key).join(', ');
    // Se congela el juego mientras se elige (salvo durante la carga: no avanzaría)
    if (!cargando()) {
      game.loop.sleep();
      dormido = true;
    }
    marcar(0);
  }

  function cerrar() {
    panel.classList.remove('open');
    abierto = false;
    if (dormido) {
      game.loop.wake();
      dormido = false;
    }
  }

  const alternar = () => (abierto ? cerrar() : abrir());

  function ir(clave, data) {
    if (cargando()) {
      estado.textContent = 'Cargando… espera a que termine la carga.';
      return;
    }
    cerrar(); // reanuda el juego antes de cambiar de escena
    game.scene.getScenes(true).forEach((s) => game.scene.stop(s.scene.key));
    game.sound.stopAll();
    window.speechSynthesis?.cancel();
    game.scene.start(clave, data ?? {});
  }

  // Para que el resto del juego (p. ej. la insignia del título) pueda abrirlo
  game.menuMaster = { abrir, cerrar, alternar };
  if (window.location.hash === '#master') abrir();
  window.addEventListener('hashchange', () => window.location.hash === '#master' && abrir());

  // Teclado. Se escucha en la fase de captura para que, con el panel abierto, el juego no reciba estas teclas.
  window.addEventListener(
    'keydown',
    (e) => {
      // e.code no depende de la distribución del teclado: KeyA / KeyM = las teclas A / M
      const atajo = (e.ctrlKey && e.shiftKey && e.code === 'KeyA') || (e.ctrlKey && e.altKey && e.code === 'KeyM');
      if (atajo) {
        e.preventDefault();
        e.stopPropagation();
        alternar();
        return;
      }
      if (!abierto) return;
      e.stopPropagation();
      if (e.key === 'Escape') cerrar();
      else if (e.key === 'ArrowUp') (e.preventDefault(), marcar(foco - 1));
      else if (e.key === 'ArrowDown') (e.preventDefault(), marcar(foco + 1));
      else if (e.key === 'Enter') (e.preventDefault(), botones[foco].click());
    },
    true
  );

  // Mando: bucle propio (no depende del loop de Phaser, que está detenido mientras el panel está abierto)
  let comboArmado = true;
  let navListoEn = 0;
  let cruzAntes = false;
  let circuloAntes = false;
  function sondearMando() {
    const pad = [...(navigator.getGamepads?.() ?? [])].find((p) => p?.connected);
    if (pad) {
      const pulsado = (i) => !!pad.buttons[i]?.pressed;
      const combo = pulsado(PAD.L3) && pulsado(PAD.R3);
      if (combo && comboArmado) {
        comboArmado = false;
        alternar();
      } else if (!combo) {
        comboArmado = true;
      }

      if (abierto) {
        const cruz = pulsado(PAD.CROSS);
        const circulo = pulsado(PAD.CIRCLE);
        const cruzNueva = cruz && !cruzAntes;
        const circuloNuevo = circulo && !circuloAntes;
        cruzAntes = cruz;
        circuloAntes = circulo;

        if (circuloNuevo) {
          cerrar();
        } else if (cruzNueva) {
          botones[foco].click();
        } else {
          const ahora = performance.now();
          const y = pad.axes[PAD.EJE_Y] || 0;
          if (ahora >= navListoEn) {
            if (pulsado(PAD.UP) || y < -0.5) (marcar(foco - 1), (navListoEn = ahora + 200));
            if (pulsado(PAD.DOWN) || y > 0.5) (marcar(foco + 1), (navListoEn = ahora + 200));
          }
        }
      }
    } else {
      comboArmado = true;
    }
    requestAnimationFrame(sondearMando);
  }
  requestAnimationFrame(sondearMando);

  // Clic en el fondo oscuro cierra el panel
  panel.querySelector('#admin-panel-backdrop').addEventListener('click', cerrar);
}
