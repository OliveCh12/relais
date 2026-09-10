import AVFoundation
import SwiftUI

struct AppleCameraPreview: UIViewRepresentable {
  @ObservedObject var model: AppleCameraModel
  let grid: Bool
  @Binding var captureAngle: CGFloat

  func makeUIView(context: Context) -> ApplePreviewSurface {
    let view = ApplePreviewSurface()
    view.model = model
    view.preview.session = model.session
    view.onCaptureAngle = { captureAngle = $0 }
    return view
  }

  func updateUIView(_ view: ApplePreviewSurface, context: Context) {
    view.grid.isHidden = !grid
    view.connectRotation(model.activeDevice)
    view.setNeedsLayout()
  }
}

final class ApplePreviewSurface: UIView {
  override class var layerClass: AnyClass { AVCaptureVideoPreviewLayer.self }
  var preview: AVCaptureVideoPreviewLayer { layer as! AVCaptureVideoPreviewLayer }
  weak var model: AppleCameraModel?
  var onCaptureAngle: ((CGFloat) -> Void)?
  let grid = CAShapeLayer()
  private var rotationCoordinator: Any?
  private var rotationObservations: [NSKeyValueObservation] = []
  private var deviceID: String?
  private var initialZoom = 1.0

  override init(frame: CGRect) {
    super.init(frame: frame)
    backgroundColor = .black
    preview.videoGravity = .resizeAspect
    grid.strokeColor = UIColor.white.withAlphaComponent(0.28).cgColor
    grid.fillColor = UIColor.clear.cgColor
    grid.lineWidth = 0.5
    layer.addSublayer(grid)
    addGestureRecognizer(UIPinchGestureRecognizer(target: self, action: #selector(pinch(_:))))
    isAccessibilityElement = true
    accessibilityLabel = "Camera viewfinder"
    accessibilityHint = "Focus and exposure adjust automatically. Pinch to zoom."
  }

  required init?(coder: NSCoder) { fatalError("init(coder:) is not supported") }

  override func layoutSubviews() {
    super.layoutSubviews()
    if #unavailable(iOS 17.0), let orientation = window?.windowScene?.interfaceOrientation {
      let angle: CGFloat
      switch orientation {
      case .landscapeRight: angle = 0
      case .landscapeLeft: angle = 180
      case .portraitUpsideDown: angle = 270
      default: angle = 90
      }
      preview.connection?.videoOrientation = AppleCameraModel.videoOrientation(angle)
      DispatchQueue.main.async { [weak self] in self?.onCaptureAngle?(angle) }
    }
    let rect = preview.layerRectConverted(fromMetadataOutputRect: CGRect(x: 0, y: 0, width: 1, height: 1))
    let path = UIBezierPath()
    for fraction in [1.0 / 3.0, 2.0 / 3.0] {
      let x = rect.minX + rect.width * fraction
      let y = rect.minY + rect.height * fraction
      path.move(to: CGPoint(x: x, y: rect.minY)); path.addLine(to: CGPoint(x: x, y: rect.maxY))
      path.move(to: CGPoint(x: rect.minX, y: y)); path.addLine(to: CGPoint(x: rect.maxX, y: y))
    }
    grid.path = path.cgPath
  }

  func connectRotation(_ device: AVCaptureDevice?) {
    guard let device else { return }
    if device.uniqueID == deviceID {
      if #available(iOS 17.0, *), let coordinator = rotationCoordinator as? AVCaptureDevice.RotationCoordinator {
        let angle = coordinator.videoRotationAngleForHorizonLevelPreview
        if preview.connection?.isVideoRotationAngleSupported(angle) == true { preview.connection?.videoRotationAngle = angle }
      }
      return
    }
    deviceID = device.uniqueID
    if #available(iOS 17.0, *) {
      let coordinator = AVCaptureDevice.RotationCoordinator(device: device, previewLayer: preview)
      rotationCoordinator = coordinator
      rotationObservations = [
        coordinator.observe(\.videoRotationAngleForHorizonLevelPreview, options: [.initial, .new]) { [weak self] coordinator, _ in
          DispatchQueue.main.async {
            guard let self else { return }
            let angle = coordinator.videoRotationAngleForHorizonLevelPreview
            if self.preview.connection?.isVideoRotationAngleSupported(angle) == true {
              self.preview.connection?.videoRotationAngle = angle
            }
            self.setNeedsLayout()
          }
        },
        coordinator.observe(\.videoRotationAngleForHorizonLevelCapture, options: [.initial, .new]) { [weak self] coordinator, _ in
          DispatchQueue.main.async { self?.onCaptureAngle?(coordinator.videoRotationAngleForHorizonLevelCapture) }
        }
      ]
    }
    preview.connection?.automaticallyAdjustsVideoMirroring = false
    if preview.connection?.isVideoMirroringSupported == true { preview.connection?.isVideoMirrored = device.position == .front }
  }

  @objc private func pinch(_ recognizer: UIPinchGestureRecognizer) {
    guard let model, model.ready else { return }
    if recognizer.state == .began { initialZoom = model.zoom }
    model.setZoom(min(model.maxZoom, max(model.minZoom, initialZoom * recognizer.scale)))
  }
}
