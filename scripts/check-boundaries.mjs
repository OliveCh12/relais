import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import ts from 'typescript';

const errors = [];
async function visit(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await visit(path);
      continue;
    }
    if (!/\.tsx?$/.test(path)) continue;
    const text = await readFile(path, 'utf8');
    const source = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true);
    const spike = path.startsWith('src/spikes/webrtc-preview/');
    function check(node) {
      if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
        const name = node.moduleSpecifier.text;
        if (!spike && /spikes\//.test(name)) errors.push(`${path}: spike import in product code`);
        const localCameraOwner =
          path === 'modules/relais-camera-engine/src/android/LocalCamera.tsx' &&
          name === 'react-native-vision-camera';
        const nativeTransport =
          [
            'src/transport/PeerSession.ts',
            'src/transport/native/media.ts',
            'src/transport/native/RemotePreview.tsx',
          ].includes(path) && name === 'react-native-webrtc';
        if (
          !spike &&
          !localCameraOwner &&
          !nativeTransport &&
          /react-native-(webrtc|vision-camera)/.test(name)
        )
          errors.push(`${path}: direct native camera/transport access`);
        if (
          (path.endsWith('.ios.tsx') || path.endsWith('.ios.ts') || path.includes('/src/ios/')) &&
          /\/android\//.test(name)
        )
          errors.push(`${path}: Android camera import in iOS code`);
        if (
          (path.endsWith('.android.tsx') ||
            path.endsWith('.android.ts') ||
            path.includes('/src/android/')) &&
          /\/ios\//.test(name)
        )
          errors.push(`${path}: iOS camera import in Android code`);
        if (path.startsWith('src/capture/') && /\/(android|ios)\//.test(name))
          errors.push(`${path}: platform camera import in the shared command protocol`);
        if (path.startsWith('src/capture/') && /\/(components|design)\//.test(name))
          errors.push(`${path}: presentation import in the shared command protocol`);
        if (path.startsWith('src/domain/') && /react|expo|camera\/native/.test(name))
          errors.push(`${path}: forbidden domain dependency`);
      }
      if (
        ts.isCallExpression(node) &&
        node.expression.getText(source).includes('getUserMedia') &&
        !spike
      )
        errors.push(`${path}: getUserMedia outside the isolated spike`);
      ts.forEachChild(node, check);
    }
    check(source);
  }
}
await visit('src');
await visit('app');
await visit('modules/relais-camera-engine/src');
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else console.log('Camera, domain and spike boundaries: OK.');
