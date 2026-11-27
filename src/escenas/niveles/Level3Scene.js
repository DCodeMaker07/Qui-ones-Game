import LevelScene from './LevelScene.js';

// Nivel 3: "La base". Es el asalto final, con el terreno verdoso en toda la pantalla.
// Funciona como el Nivel 2 (oleadas de torretas, la base fija la pantalla, refuerzos por radio), pero la base NO se
// destruye con bombas: se queda al 25 % de su vida y ahí aparece el aviso para lanzarme en picada (ENTER), que es lo que
// la destruye (ver sistemas/nivel/Picada.js).
// El final histórico siempre se ve (picada y tributo). Si perdí pocos soldados, antes se ve el final alternativo.
export default class Level3Scene extends LevelScene {
  constructor() {
    super('Level3Scene', {
      terreno: 'terreno_3',
      entreOleadas: 340,
      oleada: [2, 3],
      cadaEscuadra: 8,
      meta: null,
      jefeEn: 20, // a los 20 s de avance aparece la base
      baseFija: true,
      vidaBase: 36,
      spriteBase: 'base_enemiga', // el sprite de la base (public/assets/sprites/objetivos/base_enemiga.png, 264x132)
      escalaSpriteBase: 3, // lo dibujo al triple: 264x132 pasa a 792x396 px en pantalla (es el final, tiene que ser enorme)
      radioSpriteBase: 260, // radio del objetivo sobre la base (el sprite es muy ancho)
      escalaBase: 1.35, // si no hubiera sprite de la base, uso el depósito del Nivel 2 agrandado (y su radio de impacto)
      baseVidaMinima: 0.25, // la base no baja de esta fracción de vida: de ahí en adelante hay que lanzarse en picada
      escenaFinal: null, // el final lo decide la picada
      musica: 'musica_nivel3',
      musicaInicio: 22, // la canción arranca en el segundo 22
      ganancia: 0.2, // la canción mide -7,8 LUFS y la del Nivel 2 -20,6: con 0,2 queda a un volumen parecido
    });
  }
}
