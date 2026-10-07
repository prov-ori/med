#!/usr/bin/env node
/* Генерирует логотип, иконки и картинку-превью для соцсетей из tools/brand/render.html.
   Нужен Playwright (npm i -D playwright). Запуск: node tools/make-brand.js */
const fs = require('fs');
const path = require('path');
let chromium;
try { ({ chromium } = require('playwright')); }
catch (e) { ({ chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright')); }

const root = path.join(__dirname, '..');
const page = 'file://' + path.join(__dirname, 'brand', 'render.html');
const out = f => path.join(root, 'assets', 'img', f);

const jobs = [
  { file: 'og-image.png', q: 'mode=og', w: 1200, h: 630 },
  { file: 'logo.png', q: 'mode=mark&size=512', w: 512, h: 512, transparent: true },
  { file: 'icon-512.png', q: 'mode=mark&size=512', w: 512, h: 512, transparent: true },
  { file: 'icon-192.png', q: 'mode=mark&size=192', w: 192, h: 192, transparent: true },
  { file: 'apple-touch-icon.png', q: 'mode=mark&size=180', w: 180, h: 180 },
  { file: 'favicon-32.png', q: 'mode=mark&size=32', w: 32, h: 32, transparent: true },
  { file: 'favicon-16.png', q: 'mode=mark&size=16', w: 16, h: 16, transparent: true }
];

(async () => {
  // В окружениях с прокси шрифты Google грузятся через него.
  const proxy = process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY } : undefined;
  const browser = await chromium.launch({ args: ['--allow-file-access-from-files'], proxy });
  const ctx = await browser.newContext({ ignoreHTTPSErrors: true });
  for (const j of jobs) {
    const p = await ctx.newPage();
    await p.setViewportSize({ width: j.w, height: j.h });
    await p.goto(`${page}?${j.q}`);
    await p.waitForSelector('body[data-ready="1"]', { timeout: 20000 });
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(300);
    await p.screenshot({ path: out(j.file), omitBackground: !!j.transparent, clip: { x: 0, y: 0, width: j.w, height: j.h } });
    await p.close();
    console.log('✓', j.file);
  }
  // SVG-фавикон для современных браузеров
  const p = await ctx.newPage();
  await p.goto(`${page}?mode=mark&size=64`);
  await p.waitForSelector('body[data-ready="1"]');
  fs.writeFileSync(out('favicon.svg'), await p.$eval('svg', s => s.outerHTML));
  console.log('✓ favicon.svg');
  await browser.close();
})();
