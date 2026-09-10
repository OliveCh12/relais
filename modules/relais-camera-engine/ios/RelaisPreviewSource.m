#import "RelaisPreviewSource.h"
#import <CoreImage/CoreImage.h>
#import <React/RCTBridgeModule.h>
#import <react-native-webrtc/WebRTCModule.h>
#import <react-native-webrtc/CaptureController.h>
#import <react-native-webrtc/RTCMediaStreamTrack+React.h>

@interface RelaisPreviewSource () {
  CVPixelBufferPoolRef _pool;
  CGColorSpaceRef _sdrColorSpace;
}
@property(nonatomic, strong) RTCVideoSource *source;
@property(nonatomic, strong) RTCVideoCapturer *capturer;
@property(nonatomic, copy) NSString *trackID;
@property(nonatomic) int64_t lastFrame;
@property(nonatomic) int lastWidth;
@property(nonatomic) int lastHeight;
@property(nonatomic, strong) CIContext *context;
@property(nonatomic) OSType inputFormat;
@property(nonatomic) NSUInteger delivered;
@property(nonatomic) NSUInteger dropped;
- (void)detach:(NSString *)trackID;
@end

@interface RelaisPreviewController : CaptureController
@property(nonatomic, copy) NSString *trackID;
@end
@implementation RelaisPreviewController
- (void)startCapture {}
- (void)stopCapture { [[RelaisPreviewSource shared] detach:self.trackID]; }
- (NSDictionary *)getSettings { return @{ @"width": @1920, @"height": @1080, @"frameRate": @30 }; }
@end

@implementation RelaisPreviewSource
+ (instancetype)shared {
  static RelaisPreviewSource *instance;
  static dispatch_once_t once;
  dispatch_once(&once, ^{ instance = [RelaisPreviewSource new]; instance.rotation = 90; });
  return instance;
}
- (void)dealloc {
  if (_pool) CVPixelBufferPoolRelease(_pool);
  if (_sdrColorSpace) CGColorSpaceRelease(_sdrColorSpace);
}
- (NSDictionary *)diagnostics {
  @synchronized (self) {
    return @{ @"inputPixelFormat": @(self.inputFormat), @"width": @(self.lastWidth),
      @"height": @(self.lastHeight), @"delivered": @(self.delivered), @"dropped": @(self.dropped),
      @"output": @"SDR BT.709 NV12" };
  }
}
- (void)detach:(NSString *)trackID {
  @synchronized (self) {
    if (![self.trackID isEqualToString:trackID]) return;
    self.source = nil;
    self.capturer = nil;
    self.trackID = nil;
  }
}
- (void)captureOutput:(AVCaptureOutput *)output didOutputSampleBuffer:(CMSampleBufferRef)sample fromConnection:(AVCaptureConnection *)connection {
  RTCVideoSource *source;
  RTCVideoCapturer *capturer;
  int64_t time = (int64_t)(CMTimeGetSeconds(CMSampleBufferGetPresentationTimeStamp(sample)) * NSEC_PER_SEC);
  @synchronized (self) {
    if (!self.source || (time > self.lastFrame && time - self.lastFrame < 31 * NSEC_PER_MSEC)) return;
    self.lastFrame = time;
    source = self.source;
    capturer = self.capturer;
  }
  CVPixelBufferRef pixels = CMSampleBufferGetImageBuffer(sample);
  if (!pixels) return;
  @autoreleasepool {
    int width = (int)CVPixelBufferGetWidth(pixels);
    int height = (int)CVPixelBufferGetHeight(pixels);
    double scale = MIN(1.0, MIN(1920.0 / MAX(width, height), 1080.0 / MIN(width, height)));
    int targetWidth = MAX(2, (int)(width * scale) / 2 * 2);
    int targetHeight = MAX(2, (int)(height * scale) / 2 * 2);
    if (!self.context) {
      self.context = [CIContext contextWithOptions:@{ kCIContextCacheIntermediates: @NO }];
      _sdrColorSpace = CGColorSpaceCreateWithName(kCGColorSpaceITUR_709);
    }
    @synchronized (self) {
      self.inputFormat = CVPixelBufferGetPixelFormatType(pixels);
      if (!_pool || targetWidth != self.lastWidth || targetHeight != self.lastHeight) {
        if (_pool) { CVPixelBufferPoolRelease(_pool); _pool = NULL; }
        NSDictionary *attributes = @{ (id)kCVPixelBufferPixelFormatTypeKey: @(kCVPixelFormatType_420YpCbCr8BiPlanarFullRange),
          (id)kCVPixelBufferWidthKey: @(targetWidth), (id)kCVPixelBufferHeightKey: @(targetHeight),
          (id)kCVPixelBufferIOSurfacePropertiesKey: @{}, (id)kCVPixelBufferMetalCompatibilityKey: @YES };
        CVPixelBufferPoolCreate(kCFAllocatorDefault, NULL, (__bridge CFDictionaryRef)attributes, &_pool);
        [source adaptOutputFormatToWidth:targetWidth height:targetHeight fps:30];
        self.lastWidth = targetWidth;
        self.lastHeight = targetHeight;
      }
    }
    CVPixelBufferRef normalized = NULL;
    NSDictionary *limits = @{ (id)kCVPixelBufferPoolAllocationThresholdKey: @4 };
    if (!_pool || CVPixelBufferPoolCreatePixelBufferWithAuxAttributes(kCFAllocatorDefault, _pool,
        (__bridge CFDictionaryRef)limits, &normalized) != kCVReturnSuccess) {
      @synchronized (self) { self.dropped += 1; }
      return;
    }
    // Convert color and bit depth together; the movie output keeps its native HDR original.
    CIImage *image = [CIImage imageWithCVPixelBuffer:pixels options:@{ kCIImageToneMapHDRtoSDR: @YES }];
    image = [image imageByApplyingTransform:CGAffineTransformMakeScale((double)targetWidth / width, (double)targetHeight / height)];
    CVBufferSetAttachment(normalized, kCVImageBufferColorPrimariesKey, kCVImageBufferColorPrimaries_ITU_R_709_2, kCVAttachmentMode_ShouldPropagate);
    CVBufferSetAttachment(normalized, kCVImageBufferTransferFunctionKey, kCVImageBufferTransferFunction_ITU_R_709_2, kCVAttachmentMode_ShouldPropagate);
    CVBufferSetAttachment(normalized, kCVImageBufferYCbCrMatrixKey, kCVImageBufferYCbCrMatrix_ITU_R_709_2, kCVAttachmentMode_ShouldPropagate);
    [self.context render:image toCVPixelBuffer:normalized bounds:CGRectMake(0, 0, targetWidth, targetHeight) colorSpace:_sdrColorSpace];
    RTCCVPixelBuffer *buffer = [[RTCCVPixelBuffer alloc] initWithPixelBuffer:normalized];
    RTCVideoFrame *frame = [[RTCVideoFrame alloc] initWithBuffer:buffer rotation:(RTCVideoRotation)self.rotation timeStampNs:time];
    [source capturer:capturer didCaptureVideoFrame:frame];
    CVPixelBufferRelease(normalized);
    @synchronized (self) { self.delivered += 1; }
  }
}
@end

@interface RelaisPreviewBridge : NSObject <RCTBridgeModule>
@end
@implementation RelaisPreviewBridge
RCT_EXPORT_MODULE(RelaisPreviewBridge)
@synthesize moduleRegistry = _moduleRegistry;
+ (BOOL)requiresMainQueueSetup { return NO; }
RCT_REMAP_METHOD(createPreviewTrack, createWithResolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject) {
  WebRTCModule *module = (WebRTCModule *)[self.moduleRegistry moduleForName:"WebRTCModule"];
  if (!module) { reject(@"preview_unavailable", @"Live preview is unavailable. Reopen Relais.", nil); return; }
  dispatch_async(module.workerQueue, ^{
    RelaisPreviewSource *sink = [RelaisPreviewSource shared];
    NSString *trackID = NSUUID.UUID.UUIDString;
    RTCVideoSource *source = [module.peerConnectionFactory videoSource];
    [source adaptOutputFormatToWidth:1920 height:1080 fps:30];
    RTCVideoTrack *track = [module.peerConnectionFactory videoTrackWithSource:source trackId:trackID];
    RelaisPreviewController *controller = [RelaisPreviewController new];
    controller.trackID = trackID;
    track.captureController = controller;
    @synchronized (sink) {
      sink.source = source;
      sink.capturer = [[RTCVideoCapturer alloc] initWithDelegate:source];
      sink.trackID = trackID;
      sink.lastFrame = 0;
      sink.lastWidth = 0;
      sink.lastHeight = 0;
    }
    module.localTracks[trackID] = track;
    resolve(@{ @"id": trackID, @"kind": @"video", @"remote": @NO, @"enabled": @YES,
      @"readyState": @"live", @"peerConnectionId": @(-1), @"constraints": @{},
      @"settings": [controller getSettings] });
  });
}
@end
