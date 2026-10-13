# Pendências do PDF de implantação (confirmar com a Multilog)

Inconsistências encontradas na digitalização das plantas do PDF de implantação. Não se resolvem no código: dependem de resposta ou planta revisada do cliente. Enquanto isso, o app segue a ordem de confiança **PDF > SoW > referências visuais** (decisão de 09/10/2026, ver `checkpoint-m1/README.md`).

| # | Pendência | Como o app trata hoje | Pergunta para o cliente |
|---|---|---|---|
| 1 | A legenda da pág. 6 soma **164** lentes nas câmeras 1 a 69; o texto do PDF diz **198**. | Usa a contagem da legenda (164). | Qual é o total correto de lentes? Se for 198, quais câmeras têm lentes a mais? |
| 2 | Símbolo azul **sem número** logo abaixo da câmera 14 (pág. 6). | Ignorado. | É uma câmera? Se sim, qual número e modelo? |
| 3 | Câmeras **70 a 106** não aparecem em nenhuma planta. | Listadas como não mapeadas (`camerasNaoMapeadas` em `lib/cameras/catalogo.ts`), sem posição no mapa. | Essas numerações existem? Onde ficam? |
| 4 | Número **149** aparece duas vezes na pág. 7. | Sem correção. | Qual das duas é a 149 e qual é o número da outra? |
| 5 | Número **216** aparece duas vezes na pág. 10. | Sem correção. | Qual das duas é a 216 e qual é o número da outra? |
| 6 | Pág. 9 informa **14** câmeras, mas a planta mostra **18**. | Usa a planta (18). | O total certo é 14 ou 18? |
| 7 | **Pátio Container**: o PDF mostra a grade de contêineres, sem vagas de caminhão marcadas (a Imagem 2 fala em 36 vagas). | Modela só a grade; o setor aparece como "sem vagas no PDF". | Existem vagas de caminhão no Pátio Container? Onde e quantas? |

## Outras dúvidas registradas no checkpoint

- **Gates**: a planta da pág. 11 sugere 6 pistas (6 pares de câmeras frontal/traseira); a Imagem 2 mostra 7 portões (3 entrada, 4 saída). O app usa 6 pistas.
- **Prédios sem posição clara na pág. 6**: Portaria Geral, Apoio Motoristas (interno e pulmão), Subestação, Casa de Bombas, Guarita Estacionamento, Cabine de Medição.
