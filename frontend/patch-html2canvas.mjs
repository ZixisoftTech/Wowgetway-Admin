import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getFilesRecursively(dir) {
  if (!fs.existsSync(dir)) return [];
  const results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results.push(...getFilesRecursively(filePath));
    } else if (file.endsWith('.js') || file.endsWith('.mjs') || file.endsWith('.cjs')) {
      results.push(filePath);
    }
  }
  return results;
}

const targetDirs = [
  path.resolve(__dirname, 'node_modules/html2canvas'),
  path.resolve(__dirname, 'node_modules/html2pdf.js'),
  path.resolve(__dirname, 'node_modules/.vite')
];

let totalPatched = 0;
const allFiles = targetDirs.flatMap(d => getFilesRecursively(d));

const unminifiedRegex = /throw\s+new\s+Error\s*\(\s*["']Attempting to parse an unsupported color function\s*\\?["']\s*\+\s*[a-zA-Z0-9_$.]+\s*\+\s*["']\\?["']\s*\)\s*;?/g;
const minifiedRegex = /throw\s+new\s+Error\s*\(\s*["']Attempting to parse an unsupported color function[^)]+\)\s*;?/g;

for (const fullPath of allFiles) {
  try {
    let content = fs.readFileSync(fullPath, 'utf8');
    let changed = false;

    if (unminifiedRegex.test(content)) {
      content = content.replace(unminifiedRegex, 'return 0;');
      changed = true;
    }

    if (minifiedRegex.test(content)) {
      content = content.replace(minifiedRegex, 'return 0;');
      changed = true;
    }

    if (changed) {
      fs.writeFileSync(fullPath, content, 'utf8');
      console.log(`[PATCHED] ${path.relative(__dirname, fullPath)}`);
      totalPatched++;
    }
  } catch (err) {
    // Ignore errors for unreadable files
  }
}

console.log(`Total files patched: ${totalPatched}`);
