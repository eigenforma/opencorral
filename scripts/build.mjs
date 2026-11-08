import ts from 'typescript';
import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
await mkdir(path.join(root, 'dist'), { recursive: true });
const source = await readFile(path.join(root, 'apps/station/main.ts'), 'utf8');
const result = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022, sourceMap: true },
  fileName: 'main.ts', reportDiagnostics: true,
});
const errors = (result.diagnostics ?? []).filter(d => d.category === ts.DiagnosticCategory.Error);
if (errors.length) throw new Error(errors.map(d => ts.flattenDiagnosticMessageText(d.messageText, '\n')).join('\n'));
await writeFile(path.join(root, 'dist/main.js'), result.outputText);
if (result.sourceMapText) await writeFile(path.join(root, 'dist/main.js.map'), result.sourceMapText);
for (const name of ['index.html', 'styles.css']) await copyFile(path.join(root, 'apps/station', name), path.join(root, 'dist', name));
console.log('Built local station in dist/.');
