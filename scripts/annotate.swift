// Desenha anotações (pontos, setas, polígonos, textos) sobre uma imagem, com escala.
// Uso: swift scripts/annotate.swift <imagem> <anotacoes.json> <escala> <saida.png>
// JSON: [{"t":"pt","x","y","c":"#hex","r"} | {"t":"txt","x","y","s","c","size"} | {"t":"line","pts":[[x,y]...],"c","w","close":bool,"fill":"#hex"}]
import AppKit
let a = CommandLine.arguments
let src = NSImage(contentsOf: URL(fileURLWithPath: a[1]))!
var r = CGRect(origin: .zero, size: src.size)
let cg = src.cgImage(forProposedRect: &r, context: nil, hints: nil)!
let items = try! JSONSerialization.jsonObject(with: Data(contentsOf: URL(fileURLWithPath: a[2]))) as! [[String: Any]]
let k = CGFloat(Double(a[3])!)
let W = Int(CGFloat(cg.width) * k), H = Int(CGFloat(cg.height) * k)
let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: W, pixelsHigh: H, bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
NSGraphicsContext.saveGraphicsState()
let ctx = NSGraphicsContext(bitmapImageRep: rep)!
NSGraphicsContext.current = ctx
let g = ctx.cgContext
g.interpolationQuality = .high
g.draw(cg, in: CGRect(x: 0, y: 0, width: W, height: H))
func color(_ s: Any?, _ alpha: CGFloat = 1) -> NSColor {
  guard var h = s as? String else { return .red }
  h = h.replacingOccurrences(of: "#", with: "")
  var v: UInt64 = 0; Scanner(string: h).scanHexInt64(&v)
  let al = h.count == 8 ? CGFloat(v & 0xff) / 255 : alpha
  if h.count == 8 { v >>= 8 }
  return NSColor(srgbRed: CGFloat((v >> 16) & 0xff) / 255, green: CGFloat((v >> 8) & 0xff) / 255, blue: CGFloat(v & 0xff) / 255, alpha: al)
}
func P(_ x: Any?, _ y: Any?) -> CGPoint { CGPoint(x: CGFloat((x as! NSNumber).doubleValue) * k, y: CGFloat(H) - CGFloat((y as! NSNumber).doubleValue) * k) }
for it in items {
  switch it["t"] as! String {
  case "pt":
    let p = P(it["x"], it["y"]); let rr = CGFloat((it["r"] as? NSNumber)?.doubleValue ?? 4)
    color(it["c"]).setFill(); NSBezierPath(ovalIn: CGRect(x: p.x - rr, y: p.y - rr, width: rr * 2, height: rr * 2)).fill()
  case "txt":
    let p = P(it["x"], it["y"]); let size = CGFloat((it["size"] as? NSNumber)?.doubleValue ?? 12)
    let attrs: [NSAttributedString.Key: Any] = [.font: NSFont.boldSystemFont(ofSize: size), .foregroundColor: color(it["c"]),
      .strokeColor: NSColor.white, .strokeWidth: -3]
    (it["s"] as! String).draw(at: CGPoint(x: p.x, y: p.y - size / 2), withAttributes: attrs)
  case "line":
    let pts = (it["pts"] as! [[NSNumber]]).map { P($0[0], $0[1]) }
    let path = NSBezierPath(); path.move(to: pts[0]); pts.dropFirst().forEach { path.line(to: $0) }
    if (it["close"] as? Bool) == true { path.close() }
    if let f = it["fill"] { color(f).setFill(); path.fill() }
    path.lineWidth = CGFloat((it["w"] as? NSNumber)?.doubleValue ?? 2)
    color(it["c"]).setStroke(); path.stroke()
  default: break
  }
}
NSGraphicsContext.restoreGraphicsState()
try! rep.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: a[4]))
print("ok", W, H)
