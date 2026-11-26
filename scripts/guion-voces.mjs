// Genera docs/GUION-VOCES.md: lista de líneas por personaje con el nombre de archivo que debe tener cada grabación.
// Uso: pnpm guion   (vuelve a ejecutarlo si cambias los diálogos en src/datos/historia.js)
import { writeFileSync } from 'node:fs';
import { ESCENAS, PERSONAJES, nombreVoz } from '../src/datos/historia.js';
import { VOCES } from '../src/config.js';

const porPersonaje = {};
const narrador = [];
for (const [id, escena] of Object.entries(ESCENAS)) {
  escena.dialogo.forEach((linea, i) => {
    const fila = { archivo: `${nombreVoz(id, i)}.mp3`, escena: id, texto: linea.texto };
    if (linea.quien) (porPersonaje[linea.quien] ??= []).push(fila);
    else narrador.push(fila);
  });
}

const tabla = (filas) =>
  ['| Archivo | Escena | Texto |', '|---|---|---|', ...filas.map((f) => `| \`${f.archivo}\` | ${f.escena} | ${f.texto} |`)].join('\n');

let md = `# Guion de voces

Cada persona graba **solo las líneas de su personaje**. Cada línea es un archivo independiente.
Los archivos van en \`public/assets/audio/voces/\` con el nombre exacto de la tabla.

## Cómo grabar
- Un lugar silencioso, el celular a unos 20 cm de la boca, sin música de fondo.
- Una línea por audio, con la emoción del personaje. Deja casi sin silencio al inicio y al final.
- Formato **mp3** (mono, 44.1 kHz o 22 kHz). Si grabas en m4a o wav, conviértelo (Audacity, ffmpeg o un convertidor en línea).
- Si falta un archivo, el juego lee esa línea con la voz del navegador, así que se puede ir sumando de a poco.

> Escenas con \`ESCENA DRAMATIZADA\`: los diálogos de personas reales son ficción para el juego, no citas históricas.
`;

for (const [id, filas] of Object.entries(porPersonaje)) {
  const p = PERSONAJES[id];
  const nota = p.jugador
    ? VOCES.jugadorLeeAQuinones
      ? '\n_Estas líneas las lee el jugador por micrófono (`jugadorLeeAQuinones` = true en `src/config.js`); solo se graban si ese valor pasa a `false`._\n'
      : '\n'
    : '\n';
  md += `\n## ${p.nombre} (voz ${p.genero === 'M' ? 'femenina' : 'masculina'})\n${nota}\n${tabla(filas)}\n`;
}
if (narrador.length) md += `\n## NARRADOR (voz masculina o la de quien narre)\n\n${tabla(narrador)}\n`;

writeFileSync(new URL('../docs/GUION-VOCES.md', import.meta.url), md);
console.log('docs/GUION-VOCES.md generado');
