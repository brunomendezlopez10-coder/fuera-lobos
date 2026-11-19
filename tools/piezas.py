# Prepara la imagen de Ian en piezas (cuerpo, brazo con pistola, pierna izq., pierna dcha.)
# sobre fondo magenta, para animarlo en el juego. Necesita Pillow, numpy y scipy.
# Uso: python piezas.py ian_grande.png ian-piezas.png piezas.json
import sys, json
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from scipy import ndimage as nd

src, salida, salida_json = sys.argv[1:4]
im = np.array(Image.open(src).convert('RGBA')).astype(np.float32)
H, W = im.shape[:2]
rgb, a = im[:, :, :3], im[:, :, 3] / 255
lum, chroma = rgb.mean(2), rgb.max(2) - rgb.min(2)

def poli(puntos):
    m = Image.new('L', (W, H), 0); ImageDraw.Draw(m).polygon(puntos, fill=1); return np.array(m).astype(bool)
def caja(x0, y0, x1, y1):
    m = np.zeros((H, W), bool); m[y0:y1, x0:x1] = True; return m

# 1) limpiar restos de suelo
m = a >= 0.5
m &= ~(caja(385, 185, 500, 293) & (chroma < 38) & (lum < 215))   # grava junto a la mano
m &= ~poli([(0, 1100), (90, 1100), (88, 1150), (80, 1215), (60, 1240), (0, 1240)])  # grava junto a la pierna
m = nd.binary_opening(m, iterations=2)
lab, n = nd.label(m); m = lab == (1 + np.argmax(nd.sum(m, lab, range(1, n + 1))))
m = nd.binary_erosion(m, iterations=1)

# 2) brazo con la pistola
manga = poli([(0, 330), (190, 300), (165, 420), (147, 560), (142, 700), (150, 790), (160, 800), (150, 835), (70, 840), (0, 835)])
mano_zona = poli([(65, 790), (165, 785), (168, 870), (160, 935), (105, 942), (62, 885)])
r_, g_, b_ = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
mano = mano_zona & (r_ > g_ + 18) & (r_ > b_ + 28)
mano = mano_zona
pistola_zona = poli([(80, 710), (150, 710), (165, 800), (172, 940), (180, 1050), (192, 1150), (194, 1272), (135, 1272), (125, 1150), (105, 1050), (92, 940), (80, 850)])
pistola = pistola_zona & (((b_ - r_ >= 2) & (lum < 105)) | ((r_ > 180) & (g_ < 120)))
pistola = nd.binary_fill_holes(nd.binary_closing(pistola, iterations=4))
pistola = nd.binary_dilation(pistola, iterations=2) & pistola_zona
brazo = m & (manga | mano | pistola)
cuerpo = m & ~brazo

# 3) rellenar el pantalón que tapaba la pistola (rayas verticales: copiar de al lado)
relleno = rgb.copy()
hueco = brazo & caja(0, 780, W, H)
for y in range(780, H):
    xs = np.where(hueco[y])[0]
    if y < 900: xs = xs[xs >= 80]
    if not len(xs): continue
    fila = lum[y, 185:265] - lum[y, 185:265].mean()
    corr = [np.dot(fila[:-L], fila[L:]) / (len(fila) - L) for L in range(12, 34)]
    L = 12 + int(np.argmax(corr))
    for x in xs:
        for k in range(1, 9):
            hecho = False
            for xx in (x + k * L, x - k * L):
                if 0 <= xx < W and cuerpo[y, xx]:
                    relleno[y, x] = relleno[y, xx]; cuerpo[y, x] = True; hecho = True; break
            if hecho: break

# 4) piernas
corte_x, corte_y = 280, 990
pierna_i = cuerpo & caja(0, corte_y - 60, corte_x, H)
pierna_d = cuerpo & caja(corte_x, corte_y - 60, W, H)
torso = cuerpo & caja(0, 0, W, corte_y + 40)

def alfa(mask, fundido_abajo=None):
    al = np.array(Image.fromarray((mask * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.0))).astype(np.float32) / 255
    if fundido_abajo:
        y0, y1 = fundido_abajo
        ys = np.arange(H)[:, None]
        al *= np.clip((y1 - ys) / (y1 - y0), 0, 1)
    return al

piezas = {
    'cuerpo': (relleno, alfa(torso, (corte_y + 10, corte_y + 40))),
    'brazo': (rgb, alfa(brazo)),
    'piernaI': (relleno, alfa(pierna_i)),
    'piernaD': (relleno, alfa(pierna_d)),
}
ESC = 0.55
MAG = np.array([255, 0, 255], np.float32)
recortes = {}
for nombre, (color, al) in piezas.items():
    ys, xs = np.where(al > 0.01)
    x0, x1, y0, y1 = xs.min() - 3, xs.max() + 4, ys.min() - 3, ys.max() + 4
    c = color[y0:y1, x0:x1]; aa = al[y0:y1, x0:x1, None]
    img = Image.fromarray((c * aa + MAG * (1 - aa)).astype(np.uint8))
    img = img.resize((round((x1 - x0) * ESC), round((y1 - y0) * ESC)), Image.LANCZOS)
    recortes[nombre] = (img, x0, y0)

# 5) montar todo en una sola imagen
hueco_px = 10
orden = ['cuerpo', 'brazo', 'piernaI', 'piernaD']
x = hueco_px; alto = max(r[0].size[1] for r in recortes.values()) + 2 * hueco_px
datos = {'escala': ESC, 'alto': H, 'ancho': W, 'piezas': {}}
for nombre in orden:
    img, ox, oy = recortes[nombre]
    datos['piezas'][nombre] = {'sx': x, 'sy': hueco_px, 'sw': img.size[0], 'sh': img.size[1], 'ox': int(ox), 'oy': int(oy)}
    x += img.size[0] + hueco_px
hoja = Image.new('RGB', (x, alto), (255, 0, 255))
for nombre in orden:
    p = datos['piezas'][nombre]; hoja.paste(recortes[nombre][0], (p['sx'], p['sy']))
hoja.save(salida)
datos['hoja'] = hoja.size
json.dump(datos, open(salida_json, 'w'), indent=1)
print(json.dumps(datos))
