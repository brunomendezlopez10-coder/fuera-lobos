// Abre AirDrop en el Mac para mandar la foto de Ian al iPhone.
// Uso: swift tools/airdrop-foto.swift
import AppKit

let archivo = URL(fileURLWithPath: FileManager.default.currentDirectoryPath + "/ian-piezas.png").absoluteURL
class Delegado: NSObject, NSSharingServiceDelegate, NSApplicationDelegate {
  func applicationDidFinishLaunching(_ n: Notification) {
    guard let s = NSSharingService(named: .sendViaAirDrop), s.canPerform(withItems: [archivo]) else {
      print("AirDrop no está disponible."); NSApp.terminate(nil); return
    }
    s.delegate = self; NSApp.activate(ignoringOtherApps: true); s.perform(withItems: [archivo])
  }
  func sharingService(_ s: NSSharingService, didShareItems items: [Any]) { print("Enviado por AirDrop."); NSApp.terminate(nil) }
  func sharingService(_ s: NSSharingService, didFailToShareItems items: [Any], error: Error) { print("No se envió: \(error.localizedDescription)"); NSApp.terminate(nil) }
}
let app = NSApplication.shared; let d = Delegado(); app.delegate = d; app.setActivationPolicy(.regular); app.run()
