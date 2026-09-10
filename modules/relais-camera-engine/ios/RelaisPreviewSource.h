#import <AVFoundation/AVFoundation.h>

NS_ASSUME_NONNULL_BEGIN
@interface RelaisPreviewSource : NSObject <AVCaptureVideoDataOutputSampleBufferDelegate>
+ (instancetype)shared;
@property(atomic) NSInteger rotation;
- (NSDictionary *)diagnostics;
@end
NS_ASSUME_NONNULL_END
