const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const htmlFiles = [];
const errors = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === 'backups') continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(fullPath);
    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.html')) htmlFiles.push(fullPath);
  }
}

walk(ROOT);

for (const file of htmlFiles) {
  const source = fs.readFileSync(file, 'utf8');
  const relative = path.relative(ROOT, file);
  const openScripts = (source.match(/<script\b/gi) || []).length;
  const closeScripts = (source.match(/<\/script\s*>/gi) || []).length;
  if (openScripts !== closeScripts) {
    errors.push(`${relative}: ${openScripts} opening script tags, ${closeScripts} closing tags.`);
  }

  const scriptPattern = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;
  let scriptMatch;
  while ((scriptMatch = scriptPattern.exec(source))) {
    const attributes = scriptMatch[1];
    const body = scriptMatch[2].trim();
    if (!body || /\bsrc\s*=/i.test(attributes) || /\btype\s*=\s*["'](?:module|application\/ld\+json)["']/i.test(attributes)) continue;
    try {
      new Function(body);
    } catch (error) {
      errors.push(`${relative}: inline script syntax error: ${error.message}`);
    }
  }

  const localReferencePattern = /\b(?:src|href)\s*=\s*(["'])(.*?)\1/gi;
  let referenceMatch;
  while ((referenceMatch = localReferencePattern.exec(source))) {
    const raw = referenceMatch[2].trim();
    if (raw.includes('${')) continue;
    if (!raw || /^(?:[a-z][a-z\d+.-]*:|\/\/|#)/i.test(raw)) continue;
    const pathname = decodeURIComponent(raw.split(/[?#]/, 1)[0]);
    if (!pathname) continue;
    const target = path.resolve(path.dirname(file), pathname);
    if (target !== ROOT && !target.startsWith(`${ROOT}${path.sep}`)) {
      errors.push(`${relative}: local reference escapes the project: ${raw}`);
      continue;
    }
    if (!fs.existsSync(target)) errors.push(`${relative}: local reference is missing: ${raw}`);
  }
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Frontend release checks passed for ${htmlFiles.length} HTML files (inline script syntax, script tag pairs, and local src/href targets).`);
}
