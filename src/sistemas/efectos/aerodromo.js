import Phaser from 'phaser';

// Lo que dibujo por código para el aeródromo: la pista de aterrizaje, la torre de control, el hangar, la plataforma de concreto
// y la manga de viento. Todo se ve desde arriba, igual que el juego. Lo uso en el despegue antes del Nivel 1 (DespegueScene) y en el
// aterrizaje del ending. Pongo el sol arriba a la izquierda, así que todas las sombras caen hacia abajo y a la derecha.

export const PISTA = 'pista_aterrizaje';

// La pista: asfalto con granito, bordes blancos, línea central discontinua y luces amarillas a los costados.
// La dibujo como un mosaico de 160x256 que se repite hacia arriba y abajo
export function prepararPista(escena) {
  if (escena.textures.exists(PISTA)) return;
  const tex = escena.textures.createCanvas(PISTA, 160, 256);
  dibujarPista(tex.getContext());
  tex.refresh();
}

// El dibujo de la pista en un contexto 2D de 160x256. Lo uso para la textura de Phaser (arriba) y para la de Three.js (DespegueTresD.js)
export function dibujarPista(ctx) {
  ctx.fillStyle = '#3b3b42';
  ctx.fillRect(0, 0, 160, 256);
  for (let i = 0; i < 260; i++) {
    ctx.fillStyle = Math.random() < 0.5 ? '#46464e' : '#303036';
    ctx.fillRect((Math.random() * 158) | 0, (Math.random() * 254) | 0, 2, 2);
  }
  ctx.fillStyle = '#e8e8e8';
  ctx.fillRect(8, 0, 4, 256);
  ctx.fillRect(148, 0, 4, 256);
  [10, 138].forEach((y) => ctx.fillRect(76, y, 8, 72));
  ctx.fillStyle = '#ffd35a';
  [60, 188].forEach((y) => {
    ctx.fillRect(0, y, 4, 6);
    ctx.fillRect(156, y, 4, 6);
  });
}

// Dibujo las barras blancas del umbral de la pista (las "teclas de piano" que marcan donde empieza)
export function crearUmbral(escena, x, y, ancho, barras = 8) {
  const g = escena.add.graphics();
  const paso = ancho / barras;
  g.fillStyle(0xe8e8e8, 1);
  for (let i = 0; i < barras; i++) g.fillRect(-ancho / 2 + i * paso + paso * 0.2, 0, paso * 0.6, 58);
  return g.setPosition(x, y);
}

// Dibujo la plataforma de concreto donde van la torre y el hangar
export function crearPlataforma(escena, x, y, ancho, alto) {
  const g = escena.add.graphics();
  g.fillStyle(0xb9b3a2, 1).fillRect(-ancho / 2, -alto / 2, ancho, alto);
  g.lineStyle(4, 0x8a8474, 1).strokeRect(-ancho / 2, -alto / 2, ancho, alto);
  g.lineStyle(1, 0x9d9786, 1); // juntas de dilatación
  for (let i = 1; i < 4; i++) g.lineBetween(-ancho / 2 + (ancho / 4) * i, -alto / 2, -ancho / 2 + (ancho / 4) * i, alto / 2);
  for (let i = 1; i < 3; i++) g.lineBetween(-ancho / 2, -alto / 2 + (alto / 3) * i, ancho / 2, -alto / 2 + (alto / 3) * i);
  return g.setPosition(x, y);
}

// La torre de control vista desde arriba: dibujo el techo, la cabina de vidrio con su cruz, una antena y la baliza roja que parpadea
export function crearTorre(escena, x, y) {
  const g = escena.add.graphics();
  g.fillStyle(0x000000, 0.28).fillRect(-26, -20, 84, 84); // sombra del edificio
  g.fillStyle(0x000000, 0.22).fillCircle(20, 26, 30); // sombra de la cabina, que es más alta
  g.fillStyle(0xd9d0b8, 1).fillRect(-42, -42, 84, 84);
  g.lineStyle(4, 0x8a7f66, 1).strokeRect(-42, -42, 84, 84);
  g.fillStyle(0x9b9482, 1).fillRect(-36, 22, 18, 14).fillRect(20, 24, 14, 12); // equipos de aire en el techo
  g.fillStyle(0xbfb497, 1).fillCircle(0, -4, 30);
  g.lineStyle(3, 0x7a705a, 1).strokeCircle(0, -4, 30);
  g.fillStyle(0x6fb8d8, 0.95).fillCircle(0, -4, 22);
  g.lineStyle(2, 0x2d4252, 1).lineBetween(-22, -4, 22, -4).lineBetween(0, -26, 0, 18);
  g.fillStyle(0xffffff, 0.45).fillCircle(-8, -12, 6); // reflejo en el vidrio
  g.lineStyle(2, 0x555555, 1).lineBetween(26, -26, 38, -38); // antena
  const resplandor = escena.add.circle(38, -38, 14, 0xff3030, 0.3).setBlendMode(Phaser.BlendModes.ADD);
  const baliza = escena.add.circle(38, -38, 5, 0xff3030);
  escena.tweens.add({ targets: [baliza, resplandor], alpha: 0.15, duration: 600, yoyo: true, repeat: -1 });
  return escena.add.container(x, y, [g, resplandor, baliza]);
}

// El hangar: dibujo un techo a dos aguas de chapa con nervaduras y el portón que mira a la pista
export function crearHangar(escena, x, y, ancho = 200, alto = 110) {
  const g = escena.add.graphics();
  g.fillStyle(0x000000, 0.28).fillRect(-ancho / 2 + 14, -alto / 2 + 20, ancho, alto);
  g.fillStyle(0x8c97a3, 1).fillRect(-ancho / 2, -alto / 2, ancho / 2, alto);
  g.fillStyle(0x75808c, 1).fillRect(0, -alto / 2, ancho / 2, alto);
  g.lineStyle(2, 0x5c6671, 1);
  for (let ny = -alto / 2 + 14; ny < alto / 2 - 8; ny += 16) g.lineBetween(-ancho / 2, ny, ancho / 2, ny); // las nervaduras cruzan las dos aguas
  g.lineStyle(3, 0x4a535c, 1).lineBetween(0, -alto / 2, 0, alto / 2); // la cumbrera
  g.lineStyle(3, 0x4a535c, 1).strokeRect(-ancho / 2, -alto / 2, ancho, alto);
  g.fillStyle(0x2b3138, 1).fillRect(-ancho / 4, alto / 2 - 8, ancho / 2, 8);
  return g.setPosition(x, y);
}

// La manga de viento: la armo con cuatro tramos naranjas y blancos y la hago mecer
export function crearMangaDeViento(escena, x, y) {
  const g = escena.add.graphics();
  const mitades = [8, 6.5, 5, 3.5, 2];
  for (let i = 0; i < 4; i++) {
    g.fillStyle(i % 2 ? 0xffffff : 0xff7a1a, 1);
    g.fillPoints([{ x: i * 16, y: -mitades[i] }, { x: (i + 1) * 16, y: -mitades[i + 1] }, { x: (i + 1) * 16, y: mitades[i + 1] }, { x: i * 16, y: mitades[i] }], true);
  }
  const manga = escena.add.container(0, 0, [g]).setAngle(80);
  escena.tweens.add({ targets: manga, angle: 100, duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  const poste = escena.add.circle(0, 0, 5, 0x555555);
  return escena.add.container(x, y, [manga, poste]); // la dejo en (x, y), así la puedo escalar sin que se corra
}
