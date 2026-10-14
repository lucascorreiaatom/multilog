# Pendências de QA (corrigir na passada final, após concluir a implementação)

Pedido do usuário: não arriscar ajustes agora para evitar regressão; corrigir tudo numa passada dedicada.

| # | Problema | Origem provável | Correção planejada |
|---|---|---|---|
| 1 | Console: `BufferGeometry.toNonIndexed(): already non-indexed` repetido | `scene/geometrias/caminhao.ts` chama `toNonIndexed()` em geometrias já não indexadas (RoundedBoxGeometry) | Só converter quando `geometry.index !== null` |
| 2 | Console: `PCFSoftShadowMap has been removed` | three 0.186 removeu o tipo; `<Canvas shadows="soft">` | Usar `shadows` (PCF) com `shadow.radius`/VSM avaliado |
| 3 | Console: `THREE.Clock deprecated` | interno do R3F 9.8 | Sem ação no app; acompanhar atualização do R3F |
| 4 | Listras no chão e blocos verdes piscando de perto (captura do usuário) | shadow acne em planos grandes + z-fighting entre asfalto (y 0,01), gramado (-0,02), pintura (0,04) e canteiros | Separar camadas em alturas maiores, `polygonOffset` nas pinturas, ajustar `shadow.bias/normalBias`, aumentar `near` dinamicamente com a distância |
| 5 | Desempenho: 22 qps no Apple M1 (1440x900) | volume de triângulos dos caminhões + sombra + AO | **Parcial (13/10, reunião):** mata de 7.000 para 2.500 árvores junto à cerca, sem carros estacionados, tráfego de 34 para 12, sombra só com `?qualidade=3` (mapa 2048, dpr 1,5), ajuste automático começa em "alta" e rebaixa abaixo de 45 qps. Teste de GPU (`?dpr=2.5`): 26 para 47 qps parado, 59 no arrasto. Falta: LOD dos caminhões e AO em meia resolução |
| 6 | Transmissão AO VIVO não aparece | card opaco cobre o recorte do canvas | Copiar o quadro para um canvas 2D dentro do card no mesmo rAF |
| 7 | Mata rala em relação à Imagem 2 | densidade e distribuição | Mais árvores próximas da cerca, aglomerados |
| 8 | Captura de seleção: caminhão aparente dentro de vaga marcada como Livre (EST-B20) | perspectiva a 45° com a vaga vizinha ou caminhão saindo no instante | Teste de consistência: nenhum caminhão estacionado em vaga livre; conferir em vista de topo |

## Base de desempenho (14/10, build de produção, Apple M1, `scripts/perf.mjs`)

Teto do medidor numa página WebGL vazia: 60 qps (headless e com janela), então os números abaixo são da aplicação. Conceito 1 com `?qualidade=0` fixo, salvo indicação.

| Cenário | Parado (qps / p95 ms) | Arrasto (qps / p95 / p99 ms) |
|---|---|---|
| C1 1440x900, monitor automático (caiu para "baixa") | 43,2 / 33,4 | 55,2 / 33,3 / 33,4, long task 113 ms |
| C1 1440x900 base | 43,4 / 33,4 | 53,7 / 33,3 / 33,4 |
| C1 1440x900 `?sem=vidro` | **60 / 16,7** | **60 / 16,8 / 16,8** |
| C1 1440x900 `?sem=caminhoes` | 46,9 / 33,4 | 56,2 / 33,3 / 33,4 |
| C1 1440x900 `?sem=mata` | 42,9 / 33,4 | 53,9 / 33,3 / 33,4 |
| C1 1440x900 `?sem=pos` / `feed` / `eventos` | 49,2 / 43,5 / 43,0 | sem ganho relevante |
| C1 proxy GPU `?dpr=2.5` base | 22,5 / 50,1 | 24,7 / 50,1 / 66,7 |
| C1 proxy GPU `sem=vidro` | 34,1 / 33,4 | 33,4 / 33,4 / 50 |
| C1 proxy GPU `sem=mata` | 24,0 / 50,1 | 27,7 / 50,1 / 50,1 |
| C1 proxy GPU `sem=vidro,mata` | 36,6 / 33,4 | 37,1 / 33,4 / 33,4 |
| C1 proxy CPU 4x 1920x1080 base | 37,4 / 33,4 | 27,8 / 66,7 / 66,8, long task 111 ms |
| C1 proxy CPU 4x 1920x1080 `sem=vidro` | 47,3 / 33,4 | 49,7 / 33,4 / 50,1, long task 86 ms |
| C2 1440x900 | 60 / 16,7 | 56,8 / 16,8, uma travada de 483 ms |
| C2 proxy CPU 4x 1920x1080 | 59,3 / 16,7 | 57,5 / 16,8 / 50, long tasks até 90 ms |

Gargalo dominante do conceito 1: o `backdrop-filter` (`.vidro`) sobre o canvas WebGL, que repinta todo quadro. A mata pesa pouco (cerca de 10% só no proxy de GPU).
