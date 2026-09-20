import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, '..')
const dark = join(here, 'app-icon-dark.svg')
const light = join(here, 'app-icon-light.svg')

const jobs = [
  [dark, 'public/apple-touch-icon-120x120.png', 120],
  [dark, 'public/apple-touch-icon-152x152.png', 152],
  [dark, 'public/apple-touch-icon-167x167.png', 167],
  [dark, 'public/apple-touch-icon.png', 180],
  [light, 'public/apple-touch-icon-light.png', 180],
  [dark, 'public/icon-192.png', 192],
  [light, 'public/icon-192-light.png', 192],
  [dark, 'public/icon-512.png', 512],
  [light, 'public/icon-512-light.png', 512],
]

/** Rasterizes design/app-icon-{dark,light}.svg into every public/ PNG the favicon/manifest/apple-touch-icons need -- run after editing either source SVG instead of hand-editing a PNG. */
async function generate() {
  for (const [src, out, size] of jobs) {
    await sharp(readFileSync(src), { density: 384 })
      .resize(size, size)
      .png()
      .toFile(join(root, out))
    console.log(`wrote ${out} (${size}x${size})`)
  }
}

generate().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
