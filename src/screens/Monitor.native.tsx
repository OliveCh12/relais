import { mockCapabilities } from '@/capabilities/mock';
import { CaptureScreen } from './CaptureScreen';

export default function MonitorScreen() {
  return <CaptureScreen role="monitor" capabilities={mockCapabilities} />;
}
