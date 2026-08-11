// Gera os ícones PNG (192/512) do PWA a partir de public/logo.svg,
// compondo sobre fundo branco. Roda uma vez (via Chromium) e os PNGs são
// versionados no repositório — o build da Netlify não precisa reprocessar.
import { chromium } from 'playwright-core'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const pub = path.resolve(__dirname, '..', 'public')
const svg = fs.readFileSync(path.join(pub, 'logo.svg'), 'utf8')

const exe = process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'
const browser = await chromium.launch({ headless: true, executablePath: exe, args: ['--no-sandbox', '--disable-gpu'] })

for (const size of [512, 192]) {
  const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 })
  await page.setContent(
    `<!doctype html><html><body style="margin:0;background:#fff">
      <div style="width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;background:#fff">
        <div style="width:${Math.round(size * 0.98)}px;height:${Math.round(size * 0.98)}px">${svg}</div>
      </div></body></html>`,
    { waitUntil: 'networkidle' },
  )
  await page.screenshot({ path: path.join(pub, `icon-${size}.png`), clip: { x: 0, y: 0, width: size, height: size } })
  await page.close()
  console.log('gerado icon-' + size + '.png')
}
await browser.close()
