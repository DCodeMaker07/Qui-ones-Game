import LevelScene from './LevelScene.js';

// Nivel 1: "Escaramuza en la frontera". Tengo que destruir 6 nidos antiaéreos.
export default class Level1Scene extends LevelScene {
  constructor() {
    super('Level1Scene', {
      terreno: 'terreno_1',
      entreOleadas: 420, // píxeles de terreno que recorro sin torretas antes de que salga el siguiente grupo
      oleada: [1, 2], // torretas por grupo (mín., máx.)
      cadaEscuadra: 9, // segundos entre una escuadra aliada y otra
      meta: 6,
      jefeEn: null,
      escenaFinal: 'fin_nivel1', // la escena con los personajes del final (está en datos/historia.js)
      musica: 'musica_nivel1',
    });
  }
}
