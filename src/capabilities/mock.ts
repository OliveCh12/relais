import fixture from '../../modules/relais-camera-engine/fixtures/capabilities.json';
import { parseCapabilities } from './validate';

export const mockCapabilities = parseCapabilities(fixture);
