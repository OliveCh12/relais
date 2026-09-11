import { NativeModule, requireNativeModule } from 'expo';
import type { CaptureState } from '../../../../src/capture/protocol';

declare class AppleCameraModule extends NativeModule {
  captureAction(action: string): Promise<CaptureState>;
  getCaptureState(): Promise<CaptureState>;
}

export default requireNativeModule<AppleCameraModule>('RelaisCameraEngine');
