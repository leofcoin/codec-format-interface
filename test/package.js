import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

test('packed package contains public JavaScript and declaration entry points', () => {
  const directory = fileURLToPath(new URL('..', import.meta.url))
  const manifest = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'))
  assert.equal(manifest.scripts.prepack, 'npm run build')
  // Reuse the build under test; a separate standalone install verifies prepack.
  const [packed] = JSON.parse(execFileSync('npm', ['pack', '--json', '--dry-run', '--ignore-scripts'], {
    cwd: directory, encoding: 'utf8'
  }))
  const files = new Set(packed.files.map(({ path }) => path))
  assert.ok(files.has(manifest.exports['.'].replace(/^\.\//, '')))
  assert.ok(files.has(manifest.typings))
  for (const entry of ['codec', 'codec-hash', 'codec-format-interface', 'basic-interface']) {
    assert.ok(files.has(`exports/${entry}.js`))
    assert.ok(files.has(`exports/${entry}.d.ts`))
  }
})
