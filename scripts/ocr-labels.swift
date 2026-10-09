// OCR (Vision) dos rótulos numéricos de uma imagem de página. Saída em pixels da imagem (origem em cima à esquerda).
// Uso: swift scripts/ocr-labels.swift <imagem.png> <saida.json>
import Vision
import AppKit
let url = URL(fileURLWithPath: CommandLine.arguments[1])
let img = NSImage(contentsOf: url)!
var rect = CGRect(origin: .zero, size: img.size)
let cg = img.cgImage(forProposedRect: &rect, context: nil, hints: nil)!
let W = Double(cg.width), H = Double(cg.height)
let req = VNRecognizeTextRequest()
req.recognitionLevel = .accurate
req.usesLanguageCorrection = false
req.minimumTextHeight = 0.004
try! VNImageRequestHandler(cgImage: cg).perform([req])
var out: [[String: Any]] = []
for obs in req.results ?? [] {
  guard let cand = obs.topCandidates(1).first else { continue }
  let s = cand.string
  // separa tokens numéricos, com caixa por token
  let ns = s as NSString
  let regex = try! NSRegularExpression(pattern: "[0-9]+")
  for m in regex.matches(in: s, range: NSRange(location: 0, length: ns.length)) {
    guard let r = Range(m.range, in: s), let box = try? cand.boundingBox(for: r) else { continue }
    let b = box.boundingBox
    out.append(["text": String(s[r]), "full": s, "conf": cand.confidence,
                "x": (b.midX) * W, "y": (1 - b.midY) * H, "w": b.width * W, "h": b.height * H])
  }
}
try! JSONSerialization.data(withJSONObject: out, options: [.prettyPrinted]).write(to: URL(fileURLWithPath: CommandLine.arguments[2]))
print("tokens:", out.count)
