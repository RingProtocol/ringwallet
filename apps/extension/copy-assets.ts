import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '../..')
const distDir = path.resolve(projectRoot, 'dist-extension')

fs.mkdirSync(path.resolve(distDir, 'icons'), { recursive: true })

fs.copyFileSync(
  path.resolve(__dirname, 'manifest.json'),
  path.resolve(distDir, 'manifest.json')
)

fs.copyFileSync(
  path.resolve(__dirname, 'background.js'),
  path.resolve(distDir, 'background.js')
)

const iconsSource = path.resolve(projectRoot, 'public/icons')
const iconsDest = path.resolve(distDir, 'icons')
for (const file of fs.readdirSync(iconsSource)) {
  fs.copyFileSync(path.resolve(iconsSource, file), path.resolve(iconsDest, file))
}

console.log('Extension assets copied to dist-extension/')
