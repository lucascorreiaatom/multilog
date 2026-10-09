// Extrai as imagens embutidas (raster nativo) de uma página do PDF.
// Uso: swift scripts/extract-pdf-images.swift <pdf> <pagina 1-based> <pasta saida>
import Foundation
import CoreGraphics
import ImageIO
import UniformTypeIdentifiers

let args = CommandLine.arguments
let url = URL(fileURLWithPath: args[1]) as CFURL
let pageNumber = Int(args[2])!
let outDir = args[3]
guard let doc = CGPDFDocument(url), let page = doc.page(at: pageNumber), let dict = page.dictionary else { fatalError("pdf") }
var resources: CGPDFDictionaryRef?
guard CGPDFDictionaryGetDictionary(dict, "Resources", &resources), let res = resources else { fatalError("res") }
var xobjects: CGPDFDictionaryRef?
guard CGPDFDictionaryGetDictionary(res, "XObject", &xobjects), let xo = xobjects else { fatalError("xo") }

var index = 0
CGPDFDictionaryApplyBlock(xo, { key, obj, _ in
  var stream: CGPDFStreamRef?
  guard CGPDFObjectGetValue(obj, .stream, &stream), let s = stream, let sd = CGPDFStreamGetDictionary(s) else { return true }
  var subtype: UnsafePointer<CChar>?
  guard CGPDFDictionaryGetName(sd, "Subtype", &subtype), let st = subtype, String(cString: st) == "Image" else { return true }
  var w: CGPDFInteger = 0, h: CGPDFInteger = 0
  CGPDFDictionaryGetInteger(sd, "Width", &w); CGPDFDictionaryGetInteger(sd, "Height", &h)
  var format: CGPDFDataFormat = .raw
  guard let data = CGPDFStreamCopyData(s, &format) as Data? else { return true }
  let name = String(cString: key)
  index += 1
  if format == .jpegEncoded || format == .JPEG2000 {
    let ext = format == .jpegEncoded ? "jpg" : "jp2"
    let path = "\(outDir)/p\(pageNumber)-\(name)-\(w)x\(h).\(ext)"
    try? data.write(to: URL(fileURLWithPath: path))
    print("salvo", path)
  } else {
    var bpc: CGPDFInteger = 8
    CGPDFDictionaryGetInteger(sd, "BitsPerComponent", &bpc)
    let comps = data.count / Int(w * h)
    print("raw", name, w, h, "bpc", bpc, "bytes", data.count, "comps", comps)
    guard comps == 3 || comps == 4 || comps == 1 else { return true }
    let cs = comps == 1 ? CGColorSpaceCreateDeviceGray() : CGColorSpaceCreateDeviceRGB()
    let info: CGBitmapInfo = comps == 4 ? CGBitmapInfo(rawValue: CGImageAlphaInfo.noneSkipLast.rawValue) : CGBitmapInfo(rawValue: CGImageAlphaInfo.none.rawValue)
    guard let provider = CGDataProvider(data: data as CFData),
          let img = CGImage(width: w, height: h, bitsPerComponent: 8, bitsPerPixel: 8 * comps, bytesPerRow: comps * w, space: cs, bitmapInfo: info, provider: provider, decode: nil, shouldInterpolate: false, intent: .defaultIntent) else { return true }
    let path = "\(outDir)/p\(pageNumber)-\(name)-\(w)x\(h).png"
    let dest = CGImageDestinationCreateWithURL(URL(fileURLWithPath: path) as CFURL, UTType.png.identifier as CFString, 1, nil)!
    CGImageDestinationAddImage(dest, img, nil)
    CGImageDestinationFinalize(dest)
    print("salvo", path)
  }
  return true
}, nil)
