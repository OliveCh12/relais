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
        if (!spike && /spikes\//.test(name)) errors.push(`${path}: import spike dans le produit`);
        if (!spike && /react-native-(webrtc|vision-camera)/.test(name))
          errors.push(`${path}: accès direct caméra/transport natif`);
        if (path.startsWith('src/domain/') && /react|expo|camera\/native/.test(name))
          errors.push(`${path}: dépendance domaine interdite`);
      }
      if (
        ts.isCallExpression(node) &&
        node.expression.getText(source).includes('getUserMedia') &&
        !spike
      )
        errors.push(`${path}: getUserMedia hors spike`);
      ts.forEachChild(node, check);
    }
    check(source);
  }
}
await visit('src');
await visit('app');
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else console.log('Frontières caméra, domaine et spike : OK.');
