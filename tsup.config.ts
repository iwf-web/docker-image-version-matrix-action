import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs'],
  sourcemap: true,
  clean: true,
  noExternal: [/.*/] // Include all dependencies in the bundle
})
