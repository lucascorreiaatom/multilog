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
| 8 | Captura de seleção: caminhão aparente dentro de vaga marcada como Livre (EST-B20) | perspectiva a 45° com a vaga vizinha ou caminhão saindo no instante | Teste de consistência: nenhum caminhão estacionado em vaga livre ou bloqueada; conferir em vista de topo |
