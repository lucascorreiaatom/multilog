# Mapa 3D modelado no Blender

Deste repositório fica a interface (painéis, cards, cabeçalho, busca, controles, mapa 2D). O mapa vem do projeto
Blender `multilog_foz`, o mesmo do app Vite do mapa: cenário, vagas e geometria do recinto, caminhões, carros,
luz, céu, sombra e noite.

## O que vem do projeto Blender

| Arquivo | Conteúdo |
| --- | --- |
| `public/modelos/patio.glb` | Chão, ruas e ilhas vetorizadas da pág. 6, meio-fio, faixas das vagas, setas, batentes, prédios com fachada e logo, portaria, cerca, 138 postes, árvores |
| `public/modelos/entorno.glb` | Mata, lavoura, rodovia e contêineres empilhados |
| `public/modelos/veiculos.glb` | Cavalo (origem no eixo traseiro), carretas por implemento (origem no pino-rei) e carros |
| `lib/site/planta.json` | Vagas, prédios, Gates, postes, cerca, áreas e vagas de carro, no formato de `lib/site/tipos.ts` |

`planta.json` é gerado por `planta_next.py` no projeto Blender. Ele mantém os ids e nomes que a interface usa
(`EST-A01`, `PUL-F03`, `DOC-N02`, ids dos prédios) e traz da versão anterior deste repositório só o que o projeto
Blender não traça: o grafo de vias do simulador, as posições das câmeras externas, a plataforma do scanner e os
canteiros do pátio de contêineres, convertidos para o referencial novo.

Não rode `npm run build-site`: ele regrava `planta.json` com a digitalização antiga.

## Na cena

- `scene/ambiente/Cenario.tsx` carrega os GLBs e une as malhas por material (algumas dezenas de draw calls).
- `scene/ambiente/Atmosfera.tsx`: céu, ambiente, sol e lua do app Vite. A sombra do sol é refeita quando o
  status das vagas muda (no nível máximo de qualidade, a cada quadro).
- `scene/ambiente/Patio.tsx`: status das vagas por cima da pintura do cenário (preenchimento e cabeceira), com
  clique e filtro.
- `scene/veiculos/modelosVeiculo.ts`: caminhões e carros; implemento e cores vêm do ocupante (simulador).
- Espinha, perpendicular e doca estacionam de ré, com a cabine para o corredor (`lib/patio/rotas.ts`).
- À noite acendem vidros, LEDs, letreiros e as poças de luz dos postes (`PocasLuz.tsx`).

## Referencial

Metros, X para a direita do desenho (leste), Z para baixo (sul), 0,8136 m por pixel do raster nativo 1006x612
da pág. 6, origem no mesmo ponto do app Vite. A rodovia segue o eixo do simulador (`vias.nos["rod-gate"]`).

## Contagens

| Setor | Vagas |
| --- | ---: |
| Pátio Estacionamento (fileiras A a J) | 817 |
| Pátio Pulmão (5 fileiras em espinha, colunas junto ao plurimodal e aos Gates) | 146 |
| Cargas Perigosas | 48 |
| Docas do Armazém (6 norte, 6 sul; só as portas desenhadas na pág. 6) | 12 |

## Atualizar

O projeto Blender fica em `~/Documents/Blender-test/multilog_foz` (máquina do Robson):

```bash
Blender -b --factory-startup -P build_multilog.py -- --no-export
Blender -b multilog_foz.blend -P export_app.py -- /caminho/deste/repo --alvo=next
```
