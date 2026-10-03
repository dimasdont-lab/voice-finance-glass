// Збирає docs/index.html: CSS + розмітка + логіка Voice Finance (esbuild → IIFE `VF`) + JS інтерфейсу.
// Запуск: npm run build
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildSync} from 'esbuild';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const r = f => fs.readFileSync(path.join(root, f), 'utf8');

const logic = buildSync({
  entryPoints: [path.join(root, 'src/logic-entry.mjs')],
  bundle: true, format: 'iife', globalName: 'VF', write: false, minify: false, target: 'es2019', logLevel: 'error',
}).outputFiles[0].text;

const logo = 'data:image/jpeg;base64,' + fs.readFileSync(path.join(root, 'src/logo-256.jpg')).toString('base64');
const SPLASH = [[440,956],[430,932],[420,912],[402,874],[393,852],[390,844],[428,926],[375,812]]
  .map(([w, h]) => `<link rel="apple-touch-startup-image" href="assets/splash/s-${w * 3}x${h * 3}.jpg" media="(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)">`).join('\n');
const body = r('src/body.html').replace('__LOGO__', logo);

const html = `<!doctype html>
<html lang="uk"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no">
<meta name="theme-color" content="#050507">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="apple-mobile-web-app-title" content="Voice Finance">
<link rel="manifest" href="manifest.webmanifest">
<link rel="apple-touch-icon" href="assets/apple-touch-icon.png">
<link rel="icon" type="image/png" href="assets/icon-192.png">
${SPLASH}
<script>(function(){try{if(navigator.standalone||matchMedia('(display-mode: standalone)').matches){var d=document.documentElement.style;d.setProperty('--sh',screen.height+'px');d.setProperty('--sw',screen.width+'px');}}catch(e){}})();</script>
<title>Voice Finance</title>
<style>${r('src/style.css')}</style></head><body>
${body}
<script>${logic}</script>
<script>(function(){'use strict';
${r('src/core.js')}
${r('src/engine.js')}
${r('src/tiles.js')}
${r('src/market.js')}
${r('src/ui.js')}
})();</script></body></html>`;

fs.mkdirSync(path.join(root, 'docs'), {recursive: true});
fs.writeFileSync(path.join(root, 'docs/index.html'), html);
console.log('docs/index.html', (html.length / 1024).toFixed(0) + ' KB');
