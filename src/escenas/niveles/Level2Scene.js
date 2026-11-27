import LevelScene from './LevelScene.js';

// Nivel 2: "Quebrada Seca". Hay más presión y a los 25 s aparece el depósito de suministros.
// Cuando lo destruyo hay una escena y después sigue el Nivel 3 (la base).
export default class Level2Scene extends LevelScene {
  constructor() {
    super('Level2Scene', {
      terreno: 'terreno_2',
      entreOleadas: 360,
      oleada: [2, 3],
      cadaEscuadra: 8, // segundos entre una escuadra aliada y otra
      meta: null,
      jefeEn: 25, // a los 25 s de avance sale la base enemiga
      baseFija: true, // cuando llega al centro la pantalla se frena (ver sistemas/nivel/BaseEnemiga.js)
      vidaBase: 12,
      escalaBase: 1.4, // si faltara el dibujo de la base, el depósito de respaldo se dibuja un 40 % más grande (y su radio de impacto crece igual)
      spriteBase: 'base_suministros', // el dibujo propio de la base (264x132)
      escalaSpriteBase: 2, // 264x132 pasa a 528x264 px en pantalla (antes 1,1: se veía muy chica)
      radioSpriteBase: 175, // radio del objetivo sobre la base (las bombas cuentan todo el dibujo, ver Objetivo.alcanza)
      escenaFinal: 'fin_nivel2', // la escena del final (datos/historia.js) y de ahí paso al Nivel 3
      musica: 'musica_nivel2',
    });
  }
}
