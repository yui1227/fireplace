// 把多檔案的原始碼打包成單一 HTML（dist/fireplace.html），不需要安裝任何套件：
//   node tools/build.mjs
// - CSS 內嵌成 <style>
// - 所有著色器內嵌成 INLINE_SHADERS
// - ES 模組依相依順序串接成一個普通 <script>（移除 import/export）
//   所以各模組最上層的名稱不能重複，腳本會檢查。

import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

// 1. 依 import 順序收集模組（深度優先，相依的先放）
const ordered = [];
const seen = new Set();
function visit(file) {
  if (seen.has(file)) return;
  seen.add(file);
  const code = readFileSync(file, 'utf8');
  for (const m of code.matchAll(/^import\s[^;]*?from\s+['"](.+?)['"];?\s*$/gm)) visit(resolve(dirname(file), m[1]));
  ordered.push({ file, code });
}
visit(join(root, 'src/js/main.js'));

// 2. 去掉 import/export，並檢查最上層名稱是否重複
const declared = new Map();
const parts = ordered.map(({ file, code }) => {
  const name = relative(root, file);
  const body = code
    .replace(/^import\s[^;]*?from\s+['"].+?['"];?\s*$/gm, '')
    .replace(/^export\s+(?=(const|let|function|async|class)\b)/gm, '')
    .replace(/import\.meta\.url/g, 'location.href');
  for (const m of body.matchAll(/^(?:const|let|function|class|async function)\s+([A-Za-z_$][\w$]*)/gm)) {
    if (declared.has(m[1])) throw new Error(`最上層名稱 "${m[1]}" 在 ${declared.get(m[1])} 和 ${name} 重複`);
    declared.set(m[1], name);
  }
  return `// ---- ${name} ----\n${body.trim()}\n`;
});

// 3. 內嵌所有著色器
const shaders = {};
const shaderDir = join(root, 'src/shaders');
(function walk(dir) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p);
    else shaders[relative(shaderDir, p).split('\\').join('/')] = readFileSync(p, 'utf8');
  }
})(shaderDir);

const script = `(() => {\n'use strict';\nconst INLINE_SHADERS = ${JSON.stringify(shaders, null, 1)};\n${parts.join('\n')}})();`;

// 4. 組回 HTML
const source = read('index.html');
const cssTag = /<link rel="stylesheet" href="src\/style.css"\s*\/?>/;
const jsTag = /<script type="module" src="src\/js\/main.js"><\/script>/;
if (!cssTag.test(source) || !jsTag.test(source)) throw new Error('index.html 找不到 style.css 或 main.js 的引用');
const html = source
  .replace(cssTag, () => `<style>\n${read('src/style.css')}</style>`)
  .replace(jsTag, () => `<script>\n${script}\n</script>`);

mkdirSync(join(root, 'dist'), { recursive: true });
writeFileSync(join(root, 'dist/fireplace.html'), html);
console.log(
  `dist/fireplace.html  ${(html.length / 1024).toFixed(1)} KB，${ordered.length} 個模組、${Object.keys(shaders).length} 個著色器`,
);
