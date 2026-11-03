// Rasteriza los iconos PNG y la imagen Open Graph desde los SVG de public/brand.
// Uso: node scripts/brand/rasterizar.mjs  (usa el Chromium de Playwright del entorno)
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
import { readFileSync, mkdirSync, unlinkSync } from 'node:fs';

const b = (f) => readFileSync(`public/brand/${f}`, 'utf8');
const svgPage = (svg, w, h, bg = 'transparent') =>
  `<html><body style="margin:0;background:${bg}"><div style="width:${w}px;height:${h}px">${svg.replace('<svg ', `<svg width="${w}" height="${h}" `)}</div></body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });
async function shot(html, w, h, path, omitBackground = true) {
  await page.setViewportSize({ width: w, height: h });
  await page.setContent(html);
  await page.screenshot({ path, omitBackground, clip: { x: 0, y: 0, width: w, height: h } });
}
mkdirSync('public/icons', { recursive: true });
const baldosa = b('favicon.svg');
const sangre = b('_icono-sangre.svg');
await shot(svgPage(baldosa, 192, 192), 192, 192, 'public/icons/icon-192.png');
await shot(svgPage(baldosa, 512, 512), 512, 512, 'public/icons/icon-512.png');
await shot(svgPage(sangre, 512, 512), 512, 512, 'public/icons/icon-maskable-512.png', false);
await shot(svgPage(baldosa, 180, 180), 180, 180, 'public/apple-touch-icon.png', false);

const logo = b('simvix-home-logotipo-oscuro.svg').replace('<svg ', '<svg style="width:900px;height:auto;display:block" ');
const og = `<html><head><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500&display=swap"></head>
<body style="margin:0;background:#0B1220;font-family:Inter,system-ui,sans-serif">
<div style="width:1200px;height:630px;box-sizing:border-box;padding:96px 96px;display:flex;flex-direction:column;justify-content:space-between;color:#fff">
  ${logo}
  <div>
    <div style="font-size:44px;font-weight:500;line-height:1.2;max-width:960px">Limpieza del hogar con contrato y factura</div>
    <div style="font-size:26px;margin-top:20px;color:#A3AAB8">Parla · Pinto · Fuenlabrada · Getafe · Leganés · sur de Madrid</div>
  </div>
</div></body></html>`;
await page.setViewportSize({ width: 1200, height: 630 });
await page.setContent(og, { waitUntil: 'networkidle' });
await page.screenshot({ path: 'src/app/opengraph-image.png' });
await browser.close();
for (const f of ['_icono-sangre.svg']) unlinkSync(`public/brand/${f}`);
console.log('ok: iconos y Open Graph');
