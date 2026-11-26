#!/usr/bin/env python3
"""Genera la pantalla de carga (960x540), al estilo de las pantallas de carga de GTA IV.

Por defecto genera SOLO EL FONDO: terreno oscuro y desaturado, trama de puntos, franja diagonal dorada, viñeta y grano.
Los aviones, sus estelas de humo y las rachas de viento se ANIMAN por código en PreloadScene (animarCarga), no van en la imagen.

    python scripts/pantalla-carga.py            # fondo  -> public/assets/ui/pantalla_carga.png
    python scripts/pantalla-carga.py --poster   # versión con personajes, aviones y título -> fuentes/arte/originales/pantalla_carga_poster.png

Requiere Pillow y numpy.
"""
import os
import sys
import random
import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter, ImageFont

RAIZ = os.path.join(os.path.dirname(__file__), '..', 'public', 'assets')
W, H = 960, 540
POSTER = '--poster' in sys.argv
random.seed(1941)
np.random.seed(1941)
FUENTE_NEGRITA = '/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf'
FUENTE_TEXTO = '/usr/share/fonts/truetype/google-fonts/Poppins-Bold.ttf'


def abrir(ruta):
    return Image.open(os.path.join(RAIZ, ruta)).convert('RGBA')


def ampliar(im, k):
    return im.resize((im.width * k, im.height * k), Image.NEAREST)  # vecino más cercano: conserva los píxeles


def contorno(im, grosor, color=(8, 6, 4, 255)):
    """Silueta negra más gruesa que el sprite (el contorno de 'pegatina' de las ilustraciones)."""
    a = im.getchannel('A').filter(ImageFilter.MaxFilter(grosor * 2 + 1))
    capa = Image.new('RGBA', im.size, color)
    capa.putalpha(a)
    return capa


def pegar(lienzo, im, x, y, grosor=5, sombra=(10, 10), alfa_sombra=150):
    """Pega 'im' en (x, y) con sombra dura y contorno negro. Admite coordenadas fuera del lienzo (recorta)."""
    m = grosor + sombra[0] + 4
    base = Image.new('RGBA', (im.width + 2 * m, im.height + 2 * m), (0, 0, 0, 0))
    base.alpha_composite(im, (m, m))
    borde = contorno(base, grosor)
    sombra_im = Image.new('RGBA', base.size, (0, 0, 0, 0))
    s = borde.copy()
    s.putalpha(borde.getchannel('A').point(lambda v: v * alfa_sombra // 255))
    sombra_im.alpha_composite(s, (sombra[0], sombra[1]))
    sombra_im.alpha_composite(borde)
    sombra_im.alpha_composite(base)
    lienzo.alpha_composite(sombra_im, (x - m, y - m)) if x - m >= 0 and y - m >= 0 else pegar_recortado(lienzo, sombra_im, x - m, y - m)


def pegar_recortado(lienzo, im, x, y):
    capa = Image.new('RGBA', lienzo.size, (0, 0, 0, 0))
    capa.paste(im, (x, y))
    lienzo.alpha_composite(capa)


def tintar(im, factor, sat=1.0):
    rgb = im.convert('RGB')
    rgb = ImageEnhance.Brightness(ImageEnhance.Color(rgb).enhance(sat)).enhance(factor)
    out = rgb.convert('RGBA')
    out.putalpha(im.getchannel('A'))
    return out


# ---------- 1) fondo: terreno desaturado y oscuro, viñeta y trama de puntos ----------
tile = abrir('fondos/terreno_quebrada.png').convert('RGB')
fondo = Image.new('RGB', (W, H))
for yy in range(0, H, tile.height):
    for xx in range(0, W, tile.width):
        fondo.paste(tile, (xx, yy))
fondo = ImageEnhance.Color(fondo).enhance(0.45)
fondo = ImageEnhance.Brightness(fondo).enhance(0.42)
f = np.array(fondo).astype(float)
yy, xx = np.mgrid[0:H, 0:W]
vineta = 1 - 0.75 * np.clip(np.hypot((xx - W * 0.55) / (W * 0.75), (yy - H * 0.45) / (H * 0.8)), 0, 1) ** 1.6
f *= vineta[..., None]
f *= np.array([1.05, 0.98, 0.86])  # tono cálido
lienzo = Image.fromarray(np.clip(f, 0, 255).astype(np.uint8)).convert('RGBA')

# trama de puntos (halftone): más grande hacia abajo a la izquierda
tr = Image.new('RGBA', (W, H), (0, 0, 0, 0))
d = ImageDraw.Draw(tr)
paso = 10
for j in range(0, H + paso, paso):
    for i in range(0, W + paso, paso):
        ox = paso // 2 if (j // paso) % 2 else 0
        t = np.clip(0.2 + 0.8 * ((j / H) * 0.6 + (1 - i / W) * 0.4), 0, 1)
        r = 0.4 + 3.2 * t * t
        d.ellipse((i + ox - r, j - r, i + ox + r, j + r), fill=(0, 0, 0, 70))
lienzo.alpha_composite(tr)

# franja diagonal dorada (como el "rayo" de luz detrás de los personajes)
fr = Image.new('RGBA', (W, H), (0, 0, 0, 0))
d = ImageDraw.Draw(fr)
d.polygon([(-40, 420), (140, 540), (1000, 90), (1000, -40)], fill=(240, 190, 80, 34))
d.line([(-40, 420), (1000, -40)], fill=(255, 235, 170, 70), width=3)
d.line([(140, 540), (1000, 90)], fill=(255, 235, 170, 50), width=2)
lienzo.alpha_composite(fr)

if POSTER:
    # ---------- 2) avionetas con estela, arriba a la derecha ----------
    hoja = abrir('sprites/aviones/avion_jugador.png')
    avion = hoja.crop((0, 0, 96, 96))
    def con_estela(lienzo, im, x, y, giro, escala, alfa=255):
        a = ampliar(im, escala).rotate(giro, resample=Image.NEAREST, expand=True)
        est = Image.new('RGBA', (W, H), (0, 0, 0, 0))
        de = ImageDraw.Draw(est)
        cx, cy = x + a.width / 2, y + a.height / 2
        ang = np.radians(giro + 90)  # dirección opuesta a la proa
        for k in range(34):
            px = cx + np.cos(ang) * (60 + k * 8) * 1.0
            py = cy + np.sin(-ang) * (60 + k * 8) * 1.0
            r = 6 + k * 0.5
            de.ellipse((px - r, py - r, px + r, py + r), fill=(235, 235, 230, int(120 * (1 - k / 34) ** 1.5)))
        lienzo.alpha_composite(est)
        if alfa < 255:
            a.putalpha(a.getchannel('A').point(lambda v: v * alfa // 255))
        pegar(lienzo, a, int(x), int(y), grosor=4, sombra=(8, 12), alfa_sombra=120)
    con_estela(lienzo, tintar(avion, 0.85, 0.8), 800, 6, -28, 1, 230)    # la del fondo, más pequeña
    con_estela(lienzo, avion, 660, 10, -24, 2)                            # la principal
    # líneas de velocidad
    vl = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(vl)
    for _ in range(16):
        x0 = random.randint(520, 940); y0 = random.randint(6, 150); l = random.randint(40, 110)
        d.line([(x0, y0), (x0 - l, y0 + l * 0.55)], fill=(255, 255, 255, random.randint(25, 60)), width=random.choice([1, 2]))
    lienzo.alpha_composite(vl)

    # ---------- 3) personajes grandes, recortados por el borde inferior ----------
    K = 3  # los tres a la misma escala para que los píxeles midan lo mismo
    prado = tintar(ampliar(abrir('ui/retratos/retrato_presidente.png'), K), 0.55, 0.7)
    layla = ampliar(abrir('ui/retratos/retrato_protagonista.png'), K)
    quinones = ampliar(abrir('ui/retratos/retrato_quinones.png'), K)
    pegar(lienzo, prado, -60, 184)
    pegar(lienzo, layla, 566, 190)
    pegar(lienzo, quinones, 270, 172, grosor=6, sombra=(12, 12), alfa_sombra=170)


# degradado inferior para que la barra y el texto de carga se lean bien
g = np.zeros((H, W, 4), dtype=np.uint8)
t = np.clip((np.arange(H) - 430) / 110, 0, 1) ** 1.3
g[..., 3] = (t[:, None] * 190).astype(np.uint8)
lienzo.alpha_composite(Image.fromarray(g))

if POSTER:
    # ---------- 4) título ----------
    d = ImageDraw.Draw(lienzo)
    def texto(x, y, t, fuente, tam, relleno, trazo=7, sombra=7, ancla='la'):
        ft = ImageFont.truetype(fuente, tam)
        d.text((x + sombra, y + sombra), t, font=ft, fill=(0, 0, 0, 170), stroke_width=trazo, stroke_fill=(0, 0, 0, 170), anchor=ancla)
        d.text((x, y), t, font=ft, fill=relleno, stroke_width=trazo, stroke_fill=(10, 8, 4, 255), anchor=ancla)
        return ft.getbbox(t, anchor=ancla)
    texto(44, -6, '1941', FUENTE_NEGRITA, 122, (255, 255, 255, 255), trazo=7, sombra=7)
    texto(46, 104, 'QUEBRADA SECA', FUENTE_NEGRITA, 50, (255, 211, 90, 255), trazo=5, sombra=5)
    d.rectangle((50, 162, 420, 165), fill=(255, 211, 90, 255))
    texto(50, 172, 'JOSÉ ABELARDO QUIÑONES · ZARUMILLA, 1941', FUENTE_TEXTO, 14, (240, 236, 224, 255), trazo=3, sombra=2)
    texto(930, 14, 'DCODEMAKER07 PRESENTA', FUENTE_TEXTO, 13, (255, 211, 90, 255), trazo=3, sombra=2, ancla='ra')


# ---------- 5) grano de película ----------
a = np.array(lienzo.convert('RGB')).astype(int)
a += np.random.randint(-7, 8, size=(H, W, 1))
salida = os.path.join(RAIZ, '..', '..', 'fuentes', 'arte', 'originales', 'pantalla_carga_poster.png') if POSTER else os.path.join(RAIZ, 'ui', 'pantalla_carga.png')
os.makedirs(os.path.dirname(salida), exist_ok=True)
Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).save(salida)
print('Listo:', os.path.normpath(salida), (W, H))
