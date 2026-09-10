import CoreTransferable
import PhotosUI
import QuickLook
import SwiftUI
import UniformTypeIdentifiers

private struct GalleryFile: Transferable {
  let url: URL
  static var transferRepresentation: some TransferRepresentation {
    FileRepresentation(importedContentType: .image) { try copy($0) }
    FileRepresentation(importedContentType: .movie) { try copy($0) }
  }
  private static func copy(_ received: ReceivedTransferredFile) throws -> GalleryFile {
    let url = FileManager.default.temporaryDirectory
      .appendingPathComponent("Relais-review-\(UUID().uuidString)")
      .appendingPathExtension(received.file.pathExtension)
    try FileManager.default.copyItem(at: received.file, to: url)
    return GalleryFile(url: url)
  }
}

struct AppleGalleryButton: View {
  @State private var selection: PhotosPickerItem?
  @State private var preview: URL?
  @State private var retained: URL?
  @State private var loading = false
  @State private var error: String?

  var body: some View {
    PhotosPicker(selection: $selection, matching: .any(of: [.images, .videos])) {
      if loading { ProgressView() }
      else { Image(systemName: "photo.on.rectangle").font(.title3).frame(width: 44, height: 44) }
    }
    .buttonStyle(.bordered).buttonBorderShape(.capsule).tint(.white)
    .accessibilityLabel("Open gallery").disabled(loading)
    .task(id: selection) {
      guard let selection else { return }
      loading = true
      defer { loading = false }
      do {
        guard let file = try await selection.loadTransferable(type: GalleryFile.self) else { return }
        if Task.isCancelled { try? FileManager.default.removeItem(at: file.url); return }
        cleanup()
        retained = file.url
        preview = file.url
      } catch { self.error = error.localizedDescription }
    }
    .quickLookPreview($preview)
    .onChange(of: preview) { value in if value == nil { cleanup(); selection = nil } }
    .onDisappear { if preview == nil { cleanup() } }
    .alert("Could not open this capture", isPresented: Binding(get: { error != nil }, set: { if !$0 { error = nil } })) {
      Button("OK") { error = nil }
    } message: { Text(error ?? "Try again.") }
  }

  private func cleanup() {
    if let retained { try? FileManager.default.removeItem(at: retained) }
    retained = nil
  }
}
