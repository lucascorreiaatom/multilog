# Checkpoint M1 · Digitalização da planta (pág. 6)

Imagem: `planta-anotada.png` (raster nativo 1006x612 da pág. 6 ampliado 2x).

## Método
- Vagas contadas pelos batentes desenhados em cada vaga (perfil de intensidade ao longo de cada linha de batentes, passo constante de 7 px em todas as linhas), com pontas falsas (bordas de ilha) removidas por teste de linha reta.
- Câmeras 1 a 69: rótulos por OCR (Vision) e leitura manual, símbolos por cor da legenda no raster.
- A Imagem 2 (Portal Multilog · Pátio Foz do Iguaçu) é a mesma planta girada 180° e serviu de verificação cruzada.

## Vagas por área
| Área na planta | Contagem na planta | Imagem 2 | Diferença |
|---|---|---|---|
| Pátio inferior (espinha de peixe, 5 fileiras) + faixa à direita | 774 + 40 = **814** | Pátio Estacionamento 815 | 1 |
| Fileiras verticais (canto superior esquerdo) + colunas junto ao Scanner e aos Gates | 122 + 14 + 12 = **148** | Pátio Pulmão 149 | 1 |
| Vagas perpendiculares entre as câmeras 45 e 46 | 24 + 24 = **48** | Cargas Perigosas 48 | 0 |
| Grade com ilhas circulares (canto superior direito) | blocos de contêiner | Pátio Container 36 vagas, 1.020 contêineres | a confirmar |
| Armazém | 16 portas de doca + 3 pistas de conferência física | Docas do Armazém 21 | a confirmar |

Contagem por fileira (pátio inferior): F1 98 · F2 101 + 103 · F3 97 + 96 · F4 90 + 85 · F5 104. Verticais: 26 · 24 · 24 · 24 · 24. Faixa à direita: 20 · 20.

## Câmeras externas (1 a 69)
15 P3738-PLE (4 sensores) · 32 P4707-PLVE (2) · 6 P3827-PVE (4) · 12 P1487-LE (1) · 4 Q6225-LE PTZ (1).

## Pendências encontradas
- Lentes: a legenda dá **164**, o PDF diz 198.
- Símbolo azul sem número logo abaixo da câmera 14.
- Câmeras 70 a 106 ausentes do PDF; 149 e 216 duplicadas; pág. 9 diz 14 câmeras mas tem 18.
- Gates: a planta da pág. 11 sugere 6 pistas (6 pares de câmeras frontal/traseira); a Imagem 2 mostra 7 portões (3 entrada, 4 saída).
- Prédios sem posição clara na pág. 6: Portaria Geral, Apoio Motoristas (interno e pulmão), Subestação, Casa de Bombas, Guarita Estacionamento, Cabine de Medição.

## Decisões do usuário (09/10/2026)
- Nomes dos setores da Imagem 2 (Pátio Estacionamento, Pátio Pulmão, Cargas Perigosas, Pátio Container, Docas do Armazém).
- **Ordem de confiança: PDF > SoW > referências visuais.** Totais oficiais vêm do PDF: **Estacionamento 812 · Pulmão 146 · Cargas Perigosas 48 · Docas do Armazém 16 = 1.022 vagas** (geometria final em `lib/site/planta.json`, sobreposição em `planta-digitalizada-overlay.png`). Ajustes após a sobreposição: 2 falsos positivos removidos no Estacionamento (pontas de F2-s e F4-s sobre a ilha) e colunas do Pulmão junto aos Gates com 5 vagas cada (não 6). Pátio Container modelado pela grade do PDF; as 36 vagas da Imagem 2 ficam pendentes (o PDF não marca vagas de caminhão ali).
- Gates pela planta: 6 pistas com balança; 1 a 3 entrada, 4 reversível, 5 e 6 saída.
- Sem stepper de jornada (não está no SoW).
- Animação de entrada: cada evento de entrada dispara o trajeto do caminhão do gate até a vaga definida.

## Escala medida
- Listras das vagas a 45° (medido no raster: 1 px em x por 1 px em y), passo ao longo da fileira 7 px.
- Vaga medida: 24 px ao longo da listra x 4,95 px de largura. Adotado **1 px = 0,78 m** (vaga de 18,7 m x 3,9 m, padrão de carreta; vagas perpendiculares de Cargas Perigosas dão 18,7 m de comprimento, confirmando).
- Terreno no raster: cerca de 785 m x 477 m.
- Listras são separadas do zebrado das pontas pela presença do batente: só conta como vaga o que tem batente.
