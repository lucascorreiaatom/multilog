# Gera public/modelos/chao-detalhe.jpg (512x512) a partir de 3 texturas CC0 do Poly Haven (diffuse 1K):
#   R = aerial_grass_rock, G = aerial_asphalt_01, B = brushed_concrete
# Cada canal guarda só o relevo de luz (luminância linear / média, 128 = 1,0); a cor vem da paleta da cena.
# Uso: python3 modelos-chao.py grama.jpg asfalto.jpg concreto.jpg saida.jpg   (pip install pillow numpy)
import sys
import numpy as np
from PIL import Image

def linear(c):
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)

def relevo(caminho):
    t = linear(np.asarray(Image.open(caminho).convert("RGB").resize((512, 512), Image.LANCZOS)).astype(np.float32) / 255)
    lum = 0.2126 * t[..., 0] + 0.7152 * t[..., 1] + 0.0722 * t[..., 2]
    return np.clip(lum / lum.mean() * 0.5, 0, 1)

if __name__ == "__main__":
    *entradas, saida = sys.argv[1:]
    canais = np.stack([relevo(c) for c in entradas], axis=-1)
    Image.fromarray((canais * 255 + 0.5).astype(np.uint8)).save(saida, quality=90)
    print("gravado", saida)
