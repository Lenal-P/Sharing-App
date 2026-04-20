const fs = require('fs');
const path = require('path');

const loadConfigPath = path.join(
  __dirname,
  '..',
  'node_modules',
  'metro-config',
  'src',
  'loadConfig.js'
);

if (!fs.existsSync(loadConfigPath)) {
  console.log('patch-metro: metro-config not found, skipping');
  process.exit(0);
}

let content = fs.readFileSync(loadConfigPath, 'utf8');

const target = 'const configModule = await import(absolutePath);';
const replacement =
  'const configModule = await import(process.platform === "win32" ? "file:///" + absolutePath.replace(/\\\\/g, "/") : absolutePath);';

if (content.includes(replacement)) {
  console.log('patch-metro: already patched');
  process.exit(0);
}

if (!content.includes(target)) {
  console.log('patch-metro: target string not found, skipping');
  process.exit(0);
}

content = content.replace(target, replacement);
fs.writeFileSync(loadConfigPath, content, 'utf8');
console.log('patch-metro: patched successfully');
