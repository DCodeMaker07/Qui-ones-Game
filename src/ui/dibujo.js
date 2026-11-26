// Pequeñas funciones para dibujar con Graphics. Las uso en el HUD y en los modales.

// Paralelogramo inclinado: es la forma de las barras del HUD
export function paralelogramo(g, x, y, ancho, alto, sesgo, color, alfa = 1) {
  g.fillStyle(color, alfa);
  g.fillPoints(
    [
      { x: x + sesgo, y },
      { x: x + ancho + sesgo, y },
      { x: x + ancho, y: y + alto },
      { x, y: y + alto },
    ],
    true
  );
}

// Lo mismo pero solo el contorno
export function contornoParalelogramo(g, x, y, ancho, alto, sesgo, color, grosor = 2, alfa = 1) {
  g.lineStyle(grosor, color, alfa);
  g.strokePoints(
    [
      { x: x + sesgo, y },
      { x: x + ancho + sesgo, y },
      { x: x + ancho, y: y + alto },
      { x, y: y + alto },
    ],
    true
  );
}

// Rectángulo redondeado con relleno y borde
export function marcoRedondeado(g, x, y, ancho, alto, radio, { relleno, alfaRelleno = 1, borde, grosor = 3 } = {}) {
  if (relleno !== undefined) g.fillStyle(relleno, alfaRelleno).fillRoundedRect(x, y, ancho, alto, radio);
  if (borde !== undefined) g.lineStyle(grosor, borde, 1).strokeRoundedRect(x, y, ancho, alto, radio);
  return g;
}

// Sombra dura (sin difuminar) debajo de un rectángulo, para que "flote" sobre el fondo
export function sombraDura(g, x, y, ancho, alto, desplazamiento = 6, alfa = 0.5) {
  g.fillStyle(0x000000, alfa).fillRect(x + desplazamiento, y + desplazamiento, ancho, alto);
}

// La parte oscura de un cuadrado que se va vaciando en sentido horario, como el reloj de enfriamiento de League of Legends.
// fraccion = 1 es todo oscuro y fraccion = 0 no dibuja nada. Arranca arriba, en el centro.
export function barridoCuadrado(g, cx, cy, mitad, fraccion, color, alfa) {
  if (fraccion <= 0) return;
  g.fillStyle(color, alfa);
  if (fraccion >= 1) {
    g.fillRect(cx - mitad, cy - mitad, mitad * 2, mitad * 2);
    return;
  }
  const inicio = -Math.PI / 2 + 2 * Math.PI * (1 - fraccion);
  // El punto donde un rayo desde el centro toca el borde del cuadrado
  const borde = (a) => {
    const t = mitad / Math.max(Math.abs(Math.cos(a)), Math.abs(Math.sin(a)));
    return { x: cx + Math.cos(a) * t, y: cy + Math.sin(a) * t };
  };
  const puntos = [{ x: cx, y: cy }, borde(inicio)];
  [-Math.PI / 4, Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4].forEach((esquina) => esquina > inicio && puntos.push(borde(esquina)));
  puntos.push({ x: cx, y: cy - mitad });
  g.fillPoints(puntos, true);
}
