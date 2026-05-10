import * as esbuild from 'esbuild'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

await esbuild.build({
  absWorkingDir: root,
  entryPoints: ['public/dappsdk-origin.js'],
  outfile: 'public/dappsdk.js',
  minify: true,
  legalComments: 'none',
})
