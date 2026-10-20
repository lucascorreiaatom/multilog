# Cenário 3D modelado no Blender

O cenário da cena 3D (`public/modelos/patio.glb` e `entorno.glb`) vem de um projeto Blender que digitaliza a
pág. 6 do PDF Implantação Nova Foz CFTV Ver. 03: ruas e ilhas vetorizadas dos traços da planta, canteiros com
meio-fio, setas, faixas de pedestre, prédios com fachada e logo, portaria, cerca, 138 postes, mata, lavoura e
contêineres empilhados.

## O que vem do GLB e o que a cena desenha

| Do GLB (`scene/ambiente/Cenario.tsx`) | Da cena, a partir de `lib/site/planta.json` |
| --- | --- |
| Chão, asfalto, meio-fio, canteiros, sinalização das ruas | Piso e faixas das vagas (status, filtro, clique) |
| Prédios, portaria, scanner, reservatório, coberturas | Alvo de clique de cada prédio, cancelas dos Gates |
| Cerca, postes, árvores, mata, lavoura, rodovia | Caminhões e simulador, tráfego da rodovia, câmeras |

O GLB é unido por material ao carregar (algumas dezenas de draw calls). No tema escuro, `aplicarTema` escurece
cada família de material e acende vidros, LEDs e letreiros (`scene/ambiente/cenarioModelo.ts`).

## Referencial

O GLB já sai no referencial de `planta.json`: 0,78 m por pixel do raster nativo 1006x612, origem no centro do
raster, X para a direita do desenho e Z para baixo (sul). Conferido contra os contornos: o armazém bate em
décimos de metro e as vagas digitalizadas aqui caem a 0,1 m (média lateral) das faixas do cenário.

A rodovia segue o eixo do simulador (`vias.nos["rod-gate"]`), já que a BR-277 fica fora da planta.

## Atualizar

O projeto Blender fica em `~/Documents/Blender-test/multilog_foz` (máquina do Robson). Depois de mudar o cenário:

```bash
Blender -b multilog_foz.blend -P export_app.py -- /caminho/deste/repo --alvo=next
```

Isso regrava `public/modelos/patio.glb`, `entorno.glb` e o decodificador em `public/draco/`. As faixas das vagas
de caminhão, os batentes e a numeração dos painéis da portaria ficam de fora: aqui quem manda é `planta.json`.

## Diferenças conhecidas entre o cenário e `planta.json`

- Docas DOC-S01 a S04: na pág. 6 não há portas de doca nesse trecho da fachada sul do armazém; o cenário não
  tem portas ali.
- Algumas pontas de fileira (EST-A55, A56, B60, B61, C59, C60, D57, D58, E55, E56, F52, F53): no cenário
  ficam na ponta do canteiro.
