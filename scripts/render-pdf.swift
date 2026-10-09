import PDFKit
import AppKit
let path = CommandLine.arguments[1]
let out = CommandLine.arguments[2]
guard let doc = PDFDocument(url: URL(fileURLWithPath: path)) else { print("fail"); exit(1) }
print("pages:", doc.pageCount)
var all = ""
for i in 0..<doc.pageCount {
  let p = doc.page(at: i)!
  all += "\n===== PAGE \(i+1) =====\n" + (p.string ?? "")
  let b = p.bounds(for: .mediaBox)
  let scale: CGFloat = 1.6
  let img = NSImage(size: NSSize(width: b.width*scale, height: b.height*scale))
  img.lockFocus()
  NSColor.white.set(); NSRect(x:0,y:0,width:b.width*scale,height:b.height*scale).fill()
  let ctx = NSGraphicsContext.current!.cgContext
  ctx.scaleBy(x: scale, y: scale)
  p.draw(with: .mediaBox, to: ctx)
  img.unlockFocus()
  if let t = img.tiffRepresentation, let r = NSBitmapImageRep(data: t), let png = r.representation(using: .png, properties: [:]) {
    try? png.write(to: URL(fileURLWithPath: "\(out)/p\(String(format:"%02d", i+1)).png"))
  }
}
try! all.write(toFile: "\(out)/text.txt", atomically: true, encoding: .utf8)
