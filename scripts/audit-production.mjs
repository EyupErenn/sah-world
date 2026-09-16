// Read-only local audit. Never prints matched credential values or private data.
import fs from 'node:fs';
import vm from 'node:vm';
import { execFileSync } from 'node:child_process';
import { gzipSync } from 'node:zlib';

const tracked = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
const sql = tracked.filter(path => path.endsWith('.sql')).map(path => fs.readFileSync(path, 'utf8')).join('\n');
const tables = [...new Set([...sql.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?(\w+)/gi)].map(match => match[1].toLowerCase()))];
const missing = tables.filter(table => !new RegExp(`alter\\s+table\\s+(?:public\\.)?${table}\\s+enable\\s+row\\s+level\\s+security`, 'i').test(sql));
console.log('SQL text inventory (not a live policy/security verification):', tables.length, 'tables; missing explicit ENABLE RLS:', missing);

const secretFiles = [];
for (const file of tracked) {
  if (!/\.(?:tsx?|jsx?|mjs|cjs|json|ya?ml|env|sql)$/.test(file) || !fs.existsSync(file)) continue;
  const text = fs.readFileSync(file, 'utf8');
  let flagged = /(?:sb_secret_[A-Za-z0-9_-]{20,}|ghp_[A-Za-z0-9]{30,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----)/.test(text);
  for (const token of text.matchAll(/eyJ[A-Za-z0-9_-]+\.([A-Za-z0-9_-]+)\.[A-Za-z0-9_-]+/g)) {
    try { if (JSON.parse(Buffer.from(token[1], 'base64url')).role === 'service_role') flagged = true; } catch { /* Not a JWT. */ }
  }
  if (flagged) secretFiles.push(file);
}
console.log('Recognized committed secret patterns (paths only):', secretFiles);
console.log('This pattern scan does not certify all credentials or Git history are clean.');

for (const route of ['page', 'feedback/page', 'kesif/page', 'gizlilik/page', 'admin/feedback/page']) {
  const file = `.next/server/app/${route}_client-reference-manifest.js`;
  if (!fs.existsSync(file)) throw new Error('Run npm run build first. Missing route manifest.');
  const context = {};
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), context);
  const manifest = Object.values(context.__RSC_MANIFEST)[0];
  const build = JSON.parse(fs.readFileSync(`.next/server/app/${route}/build-manifest.json`, 'utf8'));
  const chunks = [...new Set([...build.rootMainFiles, ...Object.values(manifest.entryJSFiles).flat()])];
  let raw = 0, gzip = 0;
  const graphics = [];
  for (const chunk of chunks) {
    const bytes = fs.readFileSync(`.next/${chunk}`);
    raw += bytes.length; gzip += gzipSync(bytes).length;
    // Detect recognizable runtime markers, not merely the word 'three'.
    if (/THREE\.WebGLRenderer|THREE\.REVISION|__r3f|@react-three\/fiber/.test(bytes.toString())) graphics.push(chunk);
  }
  console.log(JSON.stringify({ route, initialManifestChunks: chunks.length, rawKiB: Math.round(raw/1024), gzipKiB: Math.round(gzip/1024), graphicsMarkers: graphics }));
}
console.log('Sizes include shared/error entry chunks; exclude lazy imports, CSS, media and third-party fonts. Not an authenticated network measurement.');
if (secretFiles.length || missing.length) process.exitCode = 1;
