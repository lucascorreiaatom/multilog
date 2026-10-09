// Extrai rótulos de texto (com posição em pontos PDF, origem embaixo à esquerda) de páginas do PDF.
// Uso: swift scripts/extract-labels.swift <pdf> <saida.json>
import PDFKit
let doc = PDFDocument(url: URL(fileURLWithPath: CommandLine.arguments[1]))!
var out: [[String: Any]] = []
for i in 0..<doc.pageCount {
  let page = doc.page(at: i)!
  guard let text = page.string else { continue }
  let chars = Array(text.utf16)
  var j = 0
  while j < chars.count {
    let isDigit = { (c: UInt16) in c >= 48 && c <= 57 }
    if isDigit(chars[j]) {
      var k = j
      var rects: [CGRect] = []
      while k < chars.count && isDigit(chars[k]) {
        let r = page.characterBounds(at: k)
        // quebra o número se o próximo dígito não estiver colado ao anterior
        if let last = rects.last, abs(r.minX - last.maxX) > max(2, r.width) || abs(r.midY - last.midY) > r.height * 0.6 { break }
        rects.append(r); k += 1
      }
      let u = rects.dropFirst().reduce(rects[0]) { $0.union($1) }
      let s = String(utf16CodeUnits: Array(chars[j..<k]), count: k - j)
      out.append(["page": i + 1, "text": s, "x": Double(u.midX), "y": Double(u.midY), "w": Double(u.width), "h": Double(u.height)])
      j = k
    } else { j += 1 }
  }
}
let data = try! JSONSerialization.data(withJSONObject: out, options: [.prettyPrinted])
try! data.write(to: URL(fileURLWithPath: CommandLine.arguments[2]))
print("rótulos:", out.count)
