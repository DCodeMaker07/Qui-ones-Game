// Personajes y escenas con diálogo (CutsceneScene), al estilo del juego de Grau:
// dos retratos grandes frente a frente, el que habla se ilumina y mueve la boca, el otro se atenúa y parpadea.
//
// IMPORTANTE: los diálogos de personas reales (Quiñones, Prado) son DRAMATIZADOS: no son citas históricas.
// Por eso las escenas con `dramatizada: true` muestran el aviso "ESCENA DRAMATIZADA".
// Layla es un personaje de ficción. Los datos del narrador salen de fuentes: verifícalos antes de sustentar.
//
// quien: id de un personaje de PERSONAJES, o null = narrador.
import { TECLAS } from '../sistemas/nivel/constantes.js'; // para nombrar las teclas en los diálogos sin repetirlas a mano

export const PERSONAJES = {
  quinones: {
    nombre: 'QUIÑONES', color: '#4af0ff', genero: 'H', jugador: true, // jugador: lo lee el jugador (ver VOCES en config.js)
    reposo: 'retrato_quinones', hablar: 'quinones_hablar', parpadeo: 'quinones_parpadeo',
  },
  layla: {
    nombre: 'LAYLA', color: '#ff8ad0', genero: 'M',
    reposo: 'retrato_protagonista', hablar: 'layla_hablar', parpadeo: 'layla_parpadeo',
  },
  // Personaje de ficción (no representa a ninguna persona real): el general que manda las tropas de tierra
  general: {
    nombre: 'GENERAL', color: '#9ad07a', genero: 'H',
    reposo: 'retrato_general', hablar: 'general_hablar', parpadeo: null, // sin hoja de parpadeo
  },
  prado: {
    nombre: 'PRESIDENTE PRADO', color: '#daa520', genero: 'H',
    reposo: 'retrato_presidente', hablar: 'presidente_hablar', parpadeo: null, // sin hoja de parpadeo
  },
};

// fondo: 'palacio' o la key de un terreno ('terreno_1', 'terreno_2').
// personajes: 1 o 2 ids (el primero va a la izquierda, el segundo a la derecha).
// siguiente: { escena, data } que se inicia al terminar.
export const ESCENAS = {
  palacio: {
    fondo: 'palacio',
    personajes: ['quinones', 'prado'],
    dramatizada: true,
    dialogo: [
      { quien: null, texto: 'Julio de 1941. La disputa fronteriza entre Perú y Ecuador desemboca en el conflicto de Zarumilla.' },
      { quien: 'prado', texto: 'Piloto, la frontera norte necesita apoyo desde el aire.' },
      { quien: 'quinones', texto: 'La escuadrilla está lista. Despegaremos de Tumbes.' },
      { quien: null, texto: 'La Fuerza Aérea opera con aviones North American NA-50, apodados "Torito".' },
      { quien: 'prado', texto: 'Que la Fuerza Aérea cumpla su misión. El país cuenta con ustedes.' },
      { quien: 'quinones', texto: 'Así será. Cumpliremos.' },
    ],
    siguiente: { escena: 'CutsceneScene', data: { id: 'torre' } },
    // Multijugador: Quiñones sale del palacio y espera a Layla; cuando ambos terminan, despega y empieza el Nivel 1
    siguienteMulti: { sync: 'inicio', escena: 'DespegueScene' },
  },

  // ---- Historia paralela de Layla (multijugador): mientras Quiñones habla con Prado en el palacio ----
  comando: {
    fondo: 'terreno_1',
    personajes: ['layla', 'general'],
    dramatizada: false, // personajes de ficción
    dialogo: [
      { quien: null, texto: 'Mientras tanto, en el puesto de mando de Tumbes…' },
      { quien: 'general', texto: 'Layla, las tropas de tierra están listas en la frontera, pero no podemos avanzar sin cobertura aérea.' },
      { quien: 'layla', texto: 'Entendido, mi general. Quiñones despegará apenas reciba sus órdenes.' },
      { quien: 'general', texto: 'Yo iré al frente con la infantería. Tú serás nuestros ojos: guía al piloto por radio.' },
      { quien: 'layla', texto: 'Cuente conmigo. Le marcaré cada objetivo y le avisaré de cualquier peligro.' },
      { quien: 'general', texto: 'Bien. Cuando el piloto despegue, comienza el avance. Suerte.' },
      { quien: null, texto: 'El general parte hacia el frente. Layla toma la radio y espera la señal del piloto.' },
    ],
    siguiente: { escena: 'EstrategaScene' },
    siguienteMulti: { sync: 'inicio', escena: 'EstrategaScene' },
  },

  torre: {
    fondo: 'terreno_1',
    personajes: ['quinones', 'layla'],
    dramatizada: true,
    dialogo: [
      { quien: 'layla', texto: 'Aquí la torre. Soy Layla, tu enlace de radio.' },
      { quien: 'quinones', texto: 'Recibido, torre. ¿Cómo nos comunicamos?' },
      { quien: 'layla', texto: `Pulsa ${TECLAS.radio} y habla: yo repito tus órdenes. Con ${TECLAS.botiquin} pido un botiquín para las tropas.` },
      { quien: 'quinones', texto: 'Entendido. Las tropas de tierra avanzarán detrás de nosotros.' },
      { quien: 'layla', texto: 'Despeja los nidos con bombas y cuida a los soldados. ¡Buen vuelo!' },
    ],
    siguiente: { escena: 'DespegueScene' }, // el avión despega de la pista y recién ahí empieza el Nivel 1
  },

  fin_nivel1: {
    fondo: 'terreno_1',
    personajes: ['quinones', 'layla'],
    dramatizada: true,
    // Multijugador: los dos jugadores están en ESTA escena y se turnan las líneas (cada uno lee las de su personaje y el
    // otro las oye). El piloto es el líder: marca cuándo se pasa a la siguiente línea.
    compartida: true,
    dialogo: [
      { quien: 'layla', texto: 'Posiciones despejadas. Las tropas avanzan.' },
      { quien: null, texto: 'El 23 de julio de 1941, la 41.ª Escuadrilla despega de Tumbes rumbo a Quebrada Seca.' },
      { quien: 'quinones', texto: '¿Cuál es el siguiente objetivo, torre?' },
      { quien: 'layla', texto: 'Quebrada Seca. Un depósito de suministros sostiene la posición enemiga.' },
      { quien: 'quinones', texto: 'Vamos allá.' },
    ],
    siguiente: { escena: 'Level2Scene' },
    siguienteMulti: { sync: 'nivel2', escena: 'Level2Scene', escenaEstratega: 'EstrategaScene' },
  },

  // Entre el Nivel 2 y el Nivel 3. En multijugador los dos jugadores están en la misma escena (ver "compartida").
  fin_nivel2: {
    fondo: 'terreno_2',
    personajes: ['quinones', 'layla'],
    dramatizada: true,
    compartida: true,
    dialogo: [
      { quien: 'layla', texto: 'Depósito destruido. Sin suministros, la base enemiga queda expuesta.' },
      { quien: 'quinones', texto: 'Entonces vamos por la base. Que no quede nada en pie.' },
      { quien: 'layla', texto: 'La infantería te cubre desde tierra. Cuida a los soldados: cada uno cuenta.' },
      { quien: 'quinones', texto: 'Entendido, torre. Voy.' },
    ],
    siguiente: { escena: 'Level3Scene' },
    siguienteMulti: { sync: 'nivel3', escena: 'Level3Scene', escenaEstratega: 'EstrategaScene' },
  },

  // Entre el final alternativo (paracaídas) y el tributo: aclara que ese final no es la historia real.
  epilogo_alt: {
    fondo: 'terreno_3',
    rio: true,
    personajes: ['quinones'],
    dramatizada: false,
    dialogo: [
      { quien: null, texto: 'Ese final alternativo es una invención del juego: no ocurrió así.' },
      { quien: null, texto: 'La historia real fue otra.' },
    ],
    siguiente: { escena: 'CutsceneScene', data: { id: 'tributo' } },
  },

  // Tributo: solo narrador, sin frases inventadas para Quiñones.
  tributo: {
    fondo: 'terreno_3',
    rio: true, // de fondo: el terreno y el río (la base destruida ya se vio en llamas en la escena del choque)
    personajes: ['quinones'],
    dramatizada: false,
    musica: 'musica_final', // suena hasta el final de esta escena, en vez de la música de diálogos
    dialogo: [
      { quien: null, texto: 'Ese día, José Abelardo Quiñones Gonzales participó en el ataque a baja altura contra Quebrada Seca.' },
      { quien: null, texto: 'Su avión fue alcanzado por fuego enemigo y lo dirigió contra la posición antiaérea, entregando su vida.' },
      { quien: null, texto: 'En su honor, cada 23 de julio se celebra el Día de la Fuerza Aérea del Perú.' },
    ],
    siguiente: { escena: 'EndingScene', data: { victoria: true } }, // victoria: true para que Layla vea que la misión terminó
  },
};

// Audios grabados: public/assets/audio/voces/<escena>_<nn>.mp3 (nn = número de línea con dos dígitos).
// Ejemplo: la línea 2 de "palacio" es palacio_02.mp3. Genera el guion con: pnpm guion
export const nombreVoz = (id, i) => `${id}_${String(i + 1).padStart(2, '0')}`;
export const claveVoz = (id, i) => `voz_${nombreVoz(id, i)}`;
export const urlVoz = (id, i) => `assets/audio/voces/${nombreVoz(id, i)}.mp3`;
