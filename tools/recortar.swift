// Quita el fondo de una foto y deja solo a la persona (PNG transparente).
// Uso: swift tools/recortar.swift foto.heic salida.png
import Vision
import CoreImage
import Foundation

let entrada = URL(fileURLWithPath: CommandLine.arguments[1])
let salida = URL(fileURLWithPath: CommandLine.arguments[2])
guard let img = CIImage(contentsOf: entrada, options: [.applyOrientationProperty: true]) else { print("No se pudo abrir la foto"); exit(1) }
let handler = VNImageRequestHandler(ciImage: img)
let req = VNGenerateForegroundInstanceMaskRequest()
try handler.perform([req])
guard let r = req.results?.first else { print("No encontré a nadie en la foto"); exit(1) }
print("Figuras encontradas:", r.allInstances.count)
let pb = try r.generateScaledMaskForImage(forInstances: r.allInstances, from: handler)
let mascara = CIImage(cvPixelBuffer: pb)

// Caja que encierra a la persona
CVPixelBufferLockBaseAddress(pb, .readOnly)
let w = CVPixelBufferGetWidth(pb), h = CVPixelBufferGetHeight(pb), fila = CVPixelBufferGetBytesPerRow(pb)
let base = CVPixelBufferGetBaseAddress(pb)!
var x0 = w, x1 = 0, y0 = h, y1 = 0
for y in 0..<h {
  let p = (base + y * fila).assumingMemoryBound(to: Float32.self)
  for x in 0..<w where p[x] > 0.5 { x0 = min(x0, x); x1 = max(x1, x); y0 = min(y0, y); y1 = max(y1, y) }
}
CVPixelBufferUnlockBaseAddress(pb, .readOnly)
let m = 12
let caja = CGRect(x: max(0, x0 - m), y: max(0, h - y1 - 1 - m), width: min(w, x1 + m) - max(0, x0 - m), height: min(h, y1 + m) - max(0, y0 - m))

let f = CIFilter(name: "CIBlendWithMask")!
f.setValue(img, forKey: kCIInputImageKey)
f.setValue(CIImage(color: .clear).cropped(to: img.extent), forKey: kCIInputBackgroundImageKey)
f.setValue(mascara, forKey: kCIInputMaskImageKey)
var res = f.outputImage!.cropped(to: caja)
res = res.transformed(by: CGAffineTransform(translationX: -caja.minX, y: -caja.minY))
let maxAlto = CommandLine.arguments.count > 3 ? CGFloat(Double(CommandLine.arguments[3])!) : 700
let escala = min(1, maxAlto / caja.height)
res = res.transformed(by: CGAffineTransform(scaleX: escala, y: escala))
let ctx = CIContext()
try ctx.writePNGRepresentation(of: res, to: salida, format: .RGBA8, colorSpace: CGColorSpace(name: CGColorSpace.sRGB)!)
print("Listo:", Int(res.extent.width), "x", Int(res.extent.height))
