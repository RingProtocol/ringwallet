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
  path.resolve(projectRoot, 'public/chainid.json'),
  path.resolve(distDir, 'chainid.json')
)

// Recursively copy icons, skipping macOS metadata files
function copyDirRecursive(src: string, dest: string) {
  fs.mkdirSync(dest, { recursive: true })
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (entry.name === '.DS_Store') continue
    const srcPath = path.resolve(src, entry.name)
    const destPath = path.resolve(dest, entry.name)
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath)
    } else {
      fs.copyFileSync(srcPath, destPath)
    }
  }
}

const iconsSource = path.resolve(projectRoot, 'public/icons')
const iconsDest = path.resolve(distDir, 'icons')
copyDirRecursive(iconsSource, iconsDest)

console.warn('Extension assets copied to dist-extension/')
