#!/usr/bin/env python3
"""Arma los sprites del general a partir de UNA imagen (la que genera GPT), que puede venir de dos formas:
  - una sola fila de 4 cuadros (la más cómoda, con fondo transparente), o
  - una cuadrícula de 2x2.
El script se da cuenta solo: si la imagen es mucho más ancha que alta, es una fila.

Orden de los cuadros (de izquierda a derecha; en la cuadrícula, arriba-izquierda, arriba-derecha, abajo-izquierda, abajo-derecha)
  = boca cerrada, entreabierta, abierta, entreabierta.

Salidas (en public/assets/ui/retratos/):
  general_hablar.png   tira de 4 cuadros de 132x132 (528x132)
  retrato_general.png  el primer cuadro (boca cerrada), de 132x132

Uso:   python scripts/hoja-general.py cuadricula.png [--fondo 00FF00] [--tol 60]
  --fondo: si GPT dejó un fondo liso de color en vez de transparente, lo vuelve transparente.
Requiere Pillow (pip install pillow).
"""
import argparse
import os
from PIL import Image, ImageChops

ap = argparse.ArgumentParser()
ap.add_argument('imagen')
ap.add_argument('--fondo', help='color hexadecimal del fondo liso a volver transparente (p. ej. 00FF00)')
ap.add_argument('--tol', type=int, default=60, help='tolerancia del color de fondo (0-255)')
ap.add_argument('--salida', default=os.path.join(os.path.dirname(__file__), '..', 'public', 'assets', 'ui', 'retratos'))
ap.add_argument('--tam', type=int, default=132)
a = ap.parse_args()

im = Image.open(a.imagen).convert('RGBA')
if a.fondo:
    c = tuple(int(a.fondo[i:i + 2], 16) for i in (0, 2, 4))
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, al = px[x, y]
            if abs(r - c[0]) + abs(g - c[1]) + abs(b - c[2]) <= a.tol:
                px[x, y] = (r, g, b, 0)

if im.width >= im.height * 3:  # una sola fila de 4 cuadros
    w, h = im.width // 4, im.height
    celdas = [im.crop((i * w, 0, (i + 1) * w, h)) for i in range(4)]
else:  # cuadrícula de 2x2
    w, h = im.width // 2, im.height // 2
    celdas = [im.crop((cx * w, cy * h, (cx + 1) * w, (cy + 1) * h)) for cy in range(2) for cx in range(2)]

# Un mismo recuadro para las cuatro celdas (la unión de lo dibujado), para que no se muevan al animar
caja = None
for c in celdas:
    b = c.getchannel('A').getbbox()
    if b:
        caja = b if caja is None else (min(caja[0], b[0]), min(caja[1], b[1]), max(caja[2], b[2]), max(caja[3], b[3]))
if caja is None:
    raise SystemExit('La imagen no tiene nada dibujado (todo transparente). ¿Falta --fondo?')
lado = max(caja[2] - caja[0], caja[3] - caja[1])
cx0 = (caja[0] + caja[2]) // 2 - lado // 2
cy0 = (caja[1] + caja[3]) // 2 - lado // 2

cuadros = []
for c in celdas:
    lienzo = Image.new('RGBA', (lado, lado), (0, 0, 0, 0))
    lienzo.paste(c.crop((cx0, cy0, cx0 + lado, cy0 + lado)), (0, 0))
    cuadros.append(lienzo.resize((a.tam, a.tam), Image.NEAREST))

tira = Image.new('RGBA', (a.tam * 4, a.tam), (0, 0, 0, 0))
for i, f in enumerate(cuadros):
    tira.paste(f, (i * a.tam, 0))

os.makedirs(a.salida, exist_ok=True)
tira.save(os.path.join(a.salida, 'general_hablar.png'))
cuadros[0].save(os.path.join(a.salida, 'retrato_general.png'))
print(f'Listo: general_hablar.png ({tira.width}x{tira.height}) y retrato_general.png ({a.tam}x{a.tam}) en {os.path.abspath(a.salida)}')
