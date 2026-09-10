#import "RelaisPreviewSource.h"
#import <React/RCTBridgeModule.h>
#import <react-native-webrtc/WebRTCModule.h>
#import <react-native-webrtc/CaptureController.h>
#import <react-native-webrtc/RTCMediaStreamTrack+React.h>

@interface RelaisPreviewSource ()
@property(nonatomic, strong) RTCVideoSource *source;
@property(nonatomic, strong) RTCVideoCapturer *capturer;
@property(nonatomic, copy) NSString *trackID;
@property(nonatomic) int64_t lastFrame;
@property(nonatomic) int lastWidth;
@property(nonatomic) int lastHeight;
- (void)detach:(NSString *)trackID;
@end

@interface RelaisPreviewController : CaptureController
@property(nonatomic, copy) NSString *trackID;
@end
@implementation RelaisPreviewController
- (void)startCapture {}
- (void)stopCapture { [[RelaisPreviewSource shared] detach:self.trackID]; }
- (NSDictionary *)getSettings { return @{ @"width": @1280, @"height": @720, @"frameRate": @30 }; }
@end

@implementation RelaisPreviewSource
+ (instancetype)shared {
  static RelaisPreviewSource *instance;
  static dispatch_once_t once;
  dispatch_once(&once, ^{ instance = [RelaisPreviewSource new]; instance.rotation = 90; });
  return instance;
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
    if (!self.source || time - self.lastFrame < NSEC_PER_SEC / 30) return;
    self.lastFrame = time;
    source = self.source;
    capturer = self.capturer;
  }
  CVPixelBufferRef pixels = CMSampleBufferGetImageBuffer(sample);
  if (!pixels) return;
  @autoreleasepool {
    int width = (int)CVPixelBufferGetWidth(pixels);
    int height = (int)CVPixelBufferGetHeight(pixels);
    double scale = MIN(1.0, MIN(1280.0 / width, 720.0 / height));
    int targetWidth = MAX(2, (int)(width * scale) / 2 * 2);
    int targetHeight = MAX(2, (int)(height * scale) / 2 * 2);
    @synchronized (self) {
      if (targetWidth != self.lastWidth || targetHeight != self.lastHeight) {
        [source adaptOutputFormatToWidth:targetWidth height:targetHeight fps:30];
        self.lastWidth = targetWidth;
        self.lastHeight = targetHeight;
      }
    }
    RTCCVPixelBuffer *buffer = [[RTCCVPixelBuffer alloc] initWithPixelBuffer:pixels];
    RTCVideoFrame *frame = [[RTCVideoFrame alloc] initWithBuffer:buffer rotation:(RTCVideoRotation)self.rotation timeStampNs:time];
    [source capturer:capturer didCaptureVideoFrame:frame];
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
    [source adaptOutputFormatToWidth:1280 height:720 fps:30];
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
