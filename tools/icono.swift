// Crea los iconos de la app (dibujo de una oveja, sin fotos).
// Uso: swift tools/icono.swift
import AppKit

func circulo(_ x: CGFloat, _ y: CGFloat, _ r: CGFloat, _ c: NSColor) { c.setFill(); NSBezierPath(ovalIn: NSRect(x: x - r, y: y - r, width: r * 2, height: r * 2)).fill() }
func elipse(_ x: CGFloat, _ y: CGFloat, _ rx: CGFloat, _ ry: CGFloat, _ c: NSColor) { c.setFill(); NSBezierPath(ovalIn: NSRect(x: x - rx, y: y - ry, width: rx * 2, height: ry * 2)).fill() }

for tam in [180, 192, 512] {
  let s = CGFloat(tam)
  let bmp = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: tam, pixelsHigh: tam, bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
  NSGraphicsContext.saveGraphicsState()
  NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: bmp)
  NSGradient(starting: NSColor(red: 0.55, green: 0.82, blue: 1, alpha: 1), ending: NSColor(red: 0.85, green: 0.95, blue: 1, alpha: 1))!.draw(in: NSRect(x: 0, y: 0, width: s, height: s), angle: 90)
  elipse(s * 0.5, -s * 0.1, s * 0.9, s * 0.45, NSColor(red: 0.36, green: 0.70, blue: 0.27, alpha: 1))
  let r = s * 0.2, cx = s * 0.45, cy = s * 0.47
  let negro = NSColor(white: 0.17, alpha: 1)
  for dx in [-0.55, -0.2, 0.2, 0.55] { negro.setFill(); NSBezierPath(roundedRect: NSRect(x: cx + CGFloat(dx) * r - r * 0.09, y: cy - r * 1.05, width: r * 0.18, height: r * 0.6), xRadius: r * 0.05, yRadius: r * 0.05).fill() }
  for (dx, dy) in [(-0.6, -0.05), (0, -0.25), (0.55, -0.05), (-0.3, 0.3), (0.25, 0.32), (0, 0.05)] {
    circulo(cx + CGFloat(dx) * r, cy + CGFloat(dy) * r, r * 0.58, NSColor(white: 0.85, alpha: 1))
    circulo(cx + CGFloat(dx) * r, cy + CGFloat(dy) * r, r * 0.53, .white)
  }
  elipse(cx + r * 0.95, cy + r * 0.2, r * 0.42, r * 0.5, NSColor(white: 0.2, alpha: 1))
  elipse(cx + r * 0.65, cy + r * 0.55, r * 0.3, r * 0.13, NSColor(white: 0.2, alpha: 1))
  circulo(cx + r * 0.85, cy + r * 0.66, r * 0.26, .white)
  circulo(cx + r * 1.1, cy + r * 0.28, r * 0.15, .white)
  circulo(cx + r * 1.14, cy + r * 0.28, r * 0.08, .black)
  elipse(cx + r * 1.15, cy - r * 0.05, r * 0.1, r * 0.12, NSColor(red: 1, green: 0.48, blue: 0.56, alpha: 1))
  NSGraphicsContext.restoreGraphicsState()
  try! bmp.representation(using: .png, properties: [:])!.write(to: URL(fileURLWithPath: "icons/icon-\(tam).png"))
}
print("Iconos listos")
