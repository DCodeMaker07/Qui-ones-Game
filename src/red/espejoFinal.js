// En el multijugador, cuando el piloto llega a las escenas finales, Layla las ve también y en el mismo momento: el piloto manda al empezar
// cada escena un aviso (ver main.js) y acá Layla pasa a la que le corresponde. El resto de las escenas finales se encadena solo en los dos
// (FinalAlternativoScene -> epílogo, y los diálogos compartidos -> EndingScene, que esperan a que los dos estén listos).
//  - El final alternativo (puntaje alto): FinalAlternativoScene, la animación del paracaídas.
//  - El final histórico: el tributo, una escena de diálogo del narrador que se ve en los dos dispositivos.
// Al terminar el ending, Layla no ve la línea de tiempo de juegos: vuelve a la torre de control (ver EndingScene).
export function iniciarEspejoFinal(juego) {
  const red = juego.red;
  const soyLayla = () => red.activa && red.rol === 'estratega';

  const iniciar = (clave, datos) => {
    const actual = juego.scene.getScenes(true)[0];
    if (!actual || actual.scene.key === clave) return;
    actual.scene.start(clave, datos);
  };

  // Qué final fue (alternativo o histórico): lo decide el puntaje del piloto y define cómo se ve el ending (el avión en gris, el cierre en 3D)
  red.ev.on('evento', (m) => {
    if (soyLayla() && m.tipo === 'final') juego.registry.set('finalMalo', !!m.malo);
  });

  red.ev.on('escena', (m) => {
    if (!soyLayla()) return;
    if (m.nombre === 'FinalAlternativoScene') iniciar('FinalAlternativoScene');
    else if (m.nombre === 'CutsceneScene' && m.id === 'tributo') iniciar('CutsceneScene', { id: 'tributo' });
  });
}
