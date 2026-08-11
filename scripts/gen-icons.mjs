// Gera os ícones do PWA (tela inicial do celular) a partir da logo.
// Fonte: public/logo.png se existir (suba a SUA logo original com esse nome!),
// senão public/logo.svg (versão em vetor). Compõe sobre fundo branco.
// Roda no build (script "prebuild") — inclusive na Netlify.
import sharp from 'sharp'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const pub = path.resolve(__dirname, '..', 'public')

const source = fs.existsSync(path.join(pub, 'logo.png'))
  ? path.join(pub, 'logo.png')
  : path.join(pub, 'logo.svg')

const sizes = [
  { file: 'icon-192.png', size: 192, pad: 0.06 },
  { file: 'icon-512.png', size: 512, pad: 0.06 },
  { file: 'apple-touch-icon.png', size: 180, pad: 0.08 },
]

async function run() {
  for (const { file, size, pad } of sizes) {
    const inner = Math.round(size * (1 - pad * 2))
    const logo = await sharp(source, { density: 384 })
      .resize(inner, inner, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .png()
      .toBuffer()

    await sharp({
      create: { width: size, height: size, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } },
    })
      .composite([{ input: logo, gravity: 'centre' }])
      .png()
      .toFile(path.join(pub, file))
    console.log('gerado', file, `(fonte: ${path.basename(source)})`)
  }
}

run().catch((e) => {
  // Não derruba o build: mantém os ícones já versionados no repositório.
  console.warn('gen-icons: falha ao gerar ícones, mantendo os existentes.', e?.message)
  process.exit(0)
})
