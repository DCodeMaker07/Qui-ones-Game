// Los dos íconos del panel de Controles, en pixel art: un teclado con un mouse y un mando. Los dibujo con rectángulos en un canvas de unos
// 38x20 píxeles y el juego los agranda sin suavizar (pixelArt), así quedan con los píxeles bien marcados.
export const ICONO_TECLADO = 'icono_teclado_mouse';
export const ICONO_MANDO = 'icono_mando';
export const ICONO_PLAYSTATION = 'icono_playstation';

const OSCURO = '#14181d';
const CUERPO = '#8d98a6';
const CLARO = '#dfe5ec';
const SOMBRA = '#5b6571';
const AMBAR = '#ffb000';

export function prepararIconosControles(escena) {
  if (!escena.textures.exists(ICONO_TECLADO)) {
    const tex = escena.textures.createCanvas(ICONO_TECLADO, 38, 19);
    const ctx = tex.getContext();
    const r = (color, x, y, w, h) => {
      ctx.fillStyle = color;
      ctx.fillRect(x, y, w, h);
    };
    // El teclado: contorno, cuerpo con un brillo arriba y tres filas de teclas (la de abajo con la barra espaciadora)
    r(OSCURO, 0, 4, 25, 14);
    r(CUERPO, 1, 5, 23, 12);
    r(CLARO, 1, 5, 23, 1);
    [3, 7, 11, 15, 19].forEach((x) => r(CLARO, x, 7, 3, 2));
    [4, 8, 12, 16, 20].forEach((x) => r(CLARO, x, 10, 3, 2));
    r(CLARO, 3, 13, 3, 2);
    r(CLARO, 7, 13, 11, 2);
    r(CLARO, 19, 13, 3, 2);
    r(SOMBRA, 1, 16, 23, 1);
    // El mouse: contorno redondeado, dos botones arriba con la rueda en ámbar y el cuerpo con sombra a la derecha
    r(OSCURO, 29, 1, 7, 1);
    r(OSCURO, 28, 2, 9, 15);
    r(OSCURO, 29, 17, 7, 1);
    r(CUERPO, 29, 2, 7, 15);
    r(CLARO, 29, 2, 3, 6);
    r(CLARO, 33, 2, 3, 6);
    r(OSCURO, 32, 2, 1, 6);
    r(AMBAR, 32, 3, 1, 3);
    r(OSCURO, 29, 8, 7, 1);
    r(SOMBRA, 35, 9, 1, 8);
    tex.refresh();
  }
  if (!escena.textures.exists(ICONO_MANDO)) {
    const tex = escena.textures.createCanvas(ICONO_MANDO, 32, 19);
    const ctx = tex.getContext();
    const r = (color, x, y, w, h) => {
      ctx.fillStyle = color;
      ctx.fillRect(x, y, w, h);
    };
    // El cuerpo con sus dos agarraderas y los gatillos de arriba
    r(SOMBRA, 4, 3, 7, 2);
    r(SOMBRA, 21, 3, 7, 2);
    r(OSCURO, 2, 5, 28, 9);
    r(OSCURO, 2, 13, 8, 6);
    r(OSCURO, 22, 13, 8, 6);
    r(CUERPO, 3, 6, 26, 7);
    r(CUERPO, 3, 13, 6, 5);
    r(CUERPO, 23, 13, 6, 5);
    r(CLARO, 3, 6, 26, 1);
    [[2, 5], [29, 5], [2, 18], [9, 18], [22, 18], [29, 18]].forEach(([x, y]) => ctx.clearRect(x, y, 1, 1)); // esquinas redondeadas
    // La cruceta, los cuatro botones de colores, los dos sticks y el botón del centro
    r(OSCURO, 5, 9, 5, 3);
    r(OSCURO, 6, 8, 3, 5);
    r(SOMBRA, 7, 10, 1, 1);
    r('#ffd35a', 23, 7, 2, 2); // Y
    r('#4a90ff', 21, 9, 2, 2); // X
    r('#ff4a3d', 25, 9, 2, 2); // B
    r('#4cd964', 23, 11, 2, 2); // A
    r(OSCURO, 11, 12, 4, 4);
    r(OSCURO, 17, 12, 4, 4);
    r(SOMBRA, 12, 13, 2, 2);
    r(SOMBRA, 18, 13, 2, 2);
    r(CLARO, 15, 8, 2, 1);
    tex.refresh();
  }
  if (!escena.textures.exists(ICONO_PLAYSTATION)) {
    // El mando de PlayStation: más oscuro, con la cruceta a la izquierda, los cuatro botones de colores a la derecha y los dos sticks juntos
    // abajo en el centro
    const tex = escena.textures.createCanvas(ICONO_PLAYSTATION, 32, 19);
    const ctx = tex.getContext();
    const r = (color, x, y, w, h) => {
      ctx.fillStyle = color;
      ctx.fillRect(x, y, w, h);
    };
    r(SOMBRA, 4, 3, 7, 2);
    r(SOMBRA, 21, 3, 7, 2);
    r(OSCURO, 2, 5, 28, 9);
    r(OSCURO, 2, 13, 8, 6);
    r(OSCURO, 22, 13, 8, 6);
    r('#3f4552', 3, 6, 26, 7);
    r('#3f4552', 3, 13, 6, 5);
    r('#3f4552', 23, 13, 6, 5);
    r('#6a7384', 3, 6, 26, 1);
    [[2, 5], [29, 5], [2, 18], [9, 18], [22, 18], [29, 18]].forEach(([x, y]) => ctx.clearRect(x, y, 1, 1));
    r(OSCURO, 5, 8, 5, 3); // la cruceta
    r(OSCURO, 6, 7, 3, 5);
    r('#4cd9a0', 23, 7, 2, 2); // triángulo
    r('#7b9cf0', 23, 11, 2, 2); // cruz
    r('#ff6b6b', 25, 9, 2, 2); // círculo
    r('#ff8cc8', 21, 9, 2, 2); // cuadrado
    r(OSCURO, 11, 11, 4, 4); // los dos sticks, más abajo y juntos
    r(OSCURO, 17, 11, 4, 4);
    r(SOMBRA, 12, 12, 2, 2);
    r(SOMBRA, 18, 12, 2, 2);
    r(CLARO, 15, 8, 2, 1);
    tex.refresh();
  }
}
