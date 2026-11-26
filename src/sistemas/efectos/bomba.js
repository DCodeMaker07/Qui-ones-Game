// Animación de la bomba al caer. El sprite (bomba.png) tiene la punta ARRIBA, así que al caer se gira 180°.
//   - Al soltarla se ve GRANDE y algo inclinada (sigue la dirección del vuelo, con la punta hacia adelante).
//   - Mientras cae va cabeceando hasta quedar con la punta hacia ABAJO y se achica: se aleja de la cámara.
export const BOMBA = {
  escIni: 0.78, // grande al soltarla (≈23x55 px)
  escFin: 0.3, // pequeña al llegar al suelo
  anguloIni: 28, // inclinada al salir del avión (grados; 0 = punta hacia arriba)
  anguloFin: 180, // punta hacia abajo
  cabeceo: 460, // ms que tarda en ponerse de punta hacia abajo
  duracion: 700, // ms de caída
};

// Crea la imagen de la bomba y sus animaciones. 'destino' opcional: { x, y } a donde cae (por defecto, 220 px más abajo).
// 'textura' permite soltar otra cosa con la misma caída (la gota de agua usa su propia imagen).
export function bombaCayendo(scene, x, y, { destino, alAterrizar, profundidad = 3, textura = 'bomba' } = {}) {
  const b = scene.add.image(x, y, textura).setDepth(profundidad).setScale(BOMBA.escIni).setAngle(BOMBA.anguloIni);
  scene.tweens.add({
    targets: b,
    x: destino ? destino.x : x,
    y: destino ? destino.y : y + 220,
    scale: BOMBA.escFin,
    duration: BOMBA.duracion,
    ease: 'Quad.easeIn',
    onComplete: () => {
      const pos = { x: b.x, y: b.y };
      b.destroy();
      alAterrizar?.(pos.x, pos.y);
    },
  });
  scene.tweens.add({ targets: b, angle: BOMBA.anguloFin, duration: BOMBA.cabeceo, ease: 'Sine.easeInOut' });
  return b;
}
