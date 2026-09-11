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
  private let focusBox = CAShapeLayer()
  private let exposureRail = CAShapeLayer()
  private let sun = CALayer()
  private var focusPoint: CGPoint?
  private var initialY: CGFloat = 0
  private var initialExposure = 0.0
  private var lastExposureUpdate: CFTimeInterval = 0
  private var fade: DispatchWorkItem?


  override init(frame: CGRect) {
    super.init(frame: frame)
    backgroundColor = .black
    preview.videoGravity = .resizeAspect
    grid.strokeColor = UIColor.white.withAlphaComponent(0.28).cgColor
    grid.fillColor = UIColor.clear.cgColor
    grid.lineWidth = 0.5
    layer.addSublayer(grid)
    for mark in [focusBox, exposureRail] {
      mark.strokeColor = UIColor.systemYellow.cgColor
      mark.fillColor = UIColor.clear.cgColor
      mark.lineWidth = 1.5
      layer.addSublayer(mark)
    }
    sun.contents = UIImage(systemName: "sun.max.fill")?.withTintColor(.systemYellow, renderingMode: .alwaysOriginal).cgImage
    sun.contentsGravity = .resizeAspect
    layer.addSublayer(sun)
    hideFocus()
    let hold = UILongPressGestureRecognizer(target: self, action: #selector(hold(_:)))
    hold.minimumPressDuration = 0.18
    hold.allowableMovement = 1000
    addGestureRecognizer(hold)
    let tap = UITapGestureRecognizer(target: self, action: #selector(tap(_:)))
    tap.require(toFail: hold)
    addGestureRecognizer(tap)
    addGestureRecognizer(UIPinchGestureRecognizer(target: self, action: #selector(pinch(_:))))
    isAccessibilityElement = true
    accessibilityLabel = "Camera viewfinder"
    accessibilityHint = "Touch and hold to focus, then slide up or down to adjust brightness. Pinch to zoom."
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
    hideFocus()
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

  private var contentRect: CGRect {
    preview.layerRectConverted(fromMetadataOutputRect: CGRect(x: 0, y: 0, width: 1, height: 1))
  }

  private func beginFocus(_ point: CGPoint) -> Bool {
    guard contentRect.contains(point), let model, model.ready, !model.configuring, !model.busy || model.recording else { return false }
    fade?.cancel()
    focusPoint = point
    initialY = point.y
    initialExposure = model.exposure
    model.meter(at: preview.captureDevicePointConverted(fromLayerPoint: point))
    drawFocus(exposure: model.exposure)
    return true
  }

  private func drawFocus(exposure: Double) {
    guard let point = focusPoint, let model else { return }
    CATransaction.begin()
    CATransaction.setDisableActions(true)
    focusBox.isHidden = false
    focusBox.path = UIBezierPath(rect: CGRect(x: point.x - 32, y: point.y - 32, width: 64, height: 64)).cgPath
    let hasExposure = model.maxExposure > model.minExposure
    exposureRail.isHidden = !hasExposure
    sun.isHidden = !hasExposure
    let x = point.x + 56 < bounds.maxX - 16 ? point.x + 48 : point.x - 48
    let y = min(bounds.maxY - 68, max(68, point.y))
    let path = UIBezierPath()
    path.move(to: CGPoint(x: x, y: y - 52)); path.addLine(to: CGPoint(x: x, y: y + 52))
    exposureRail.path = path.cgPath
    let fraction = hasExposure ? (exposure - model.minExposure) / (model.maxExposure - model.minExposure) : 0.5
    sun.frame = CGRect(x: x - 10, y: y + 52 - 104 * fraction - 10, width: 20, height: 20)
    CATransaction.commit()
  }

  private func hideFocus() {
    focusPoint = nil
    focusBox.isHidden = true
    exposureRail.isHidden = true
    sun.isHidden = true
  }

  private func scheduleHide() {
    fade?.cancel()
    let work = DispatchWorkItem { [weak self] in self?.hideFocus() }
    fade = work
    DispatchQueue.main.asyncAfter(deadline: .now() + 4, execute: work)
  }

  override func didMoveToWindow() {
    super.didMoveToWindow()
    if window == nil { fade?.cancel(); hideFocus() }
  }

  @objc private func tap(_ recognizer: UITapGestureRecognizer) {
    if beginFocus(recognizer.location(in: self)) { scheduleHide() }
  }

  @objc private func hold(_ recognizer: UILongPressGestureRecognizer) {
    guard let model else { return }
    let point = recognizer.location(in: self)
    if recognizer.state == .began {
      if !beginFocus(point) { return }
    } else if focusPoint != nil && [.changed, .ended].contains(recognizer.state) {
      let value = min(model.maxExposure, max(model.minExposure, initialExposure + Double(initialY - point.y) / 80))
      drawFocus(exposure: value)
      let now = CACurrentMediaTime()
      if now - lastExposureUpdate >= 0.1 || recognizer.state == .ended {
        lastExposureUpdate = now
        model.setExposure(value)
      }
    }
    if [.ended, .cancelled, .failed].contains(recognizer.state) { scheduleHide() }
  }

  @objc private func pinch(_ recognizer: UIPinchGestureRecognizer) {
    guard let model, model.ready else { return }
    if recognizer.state == .began { initialZoom = model.zoom }
    model.setZoom(min(model.maxZoom, max(model.minZoom, initialZoom * recognizer.scale)))
  }
}
