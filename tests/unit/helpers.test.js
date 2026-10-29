/*!
This file is part of CycloneDX generator for esbuild.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

SPDX-License-Identifier: Apache-2.0
Copyright (c) OWASP Foundation. All Rights Reserved.
*/

const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')

const { afterAll, beforeAll, describe, expect, it } = require('@jest/globals')

const { isValidNpmPackageName, getPackageConfig } = require('../../dist/_helpers.js')

describe('isValidNpmPackageName', () => {
  it.each([
    ['unscoped', 'demo-lib', true],
    ['scoped', '@hookform/resolvers', true],
    ['scoped with dots/dashes', '@scope/some.pkg-name', true],
    // legacy subpath resolution stubs — NOT installable packages:
    ['unscoped subpath dir', 'demo-lib/sub', false],
    ['scoped subpath dir', '@hookform/resolvers/zod', false],
    ['scope only', '@scope', false],
    ['windows separator', 'demo-lib\\sub', false],
  ])('%s -> %s is %s', (_desc, name, expected) => {
    expect(isValidNpmPackageName(name)).toBe(expected)
  })
})

describe('getPackageConfig', () => {
  let root

  beforeAll(() => {
    // Mirror node_modules/@hookform/resolvers/{package.json, zod/package.json}:
    // a real package plus a legacy subpath directory shipping its own manifest with a
    // non-installable name.
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'cdx-subpath-'))
    const pkgDir = path.join(root, 'node_modules', 'demo-lib')
    const subDist = path.join(pkgDir, 'sub', 'dist')
    fs.mkdirSync(subDist, { recursive: true })
    fs.writeFileSync(
      path.join(pkgDir, 'package.json'),
      JSON.stringify({ name: 'demo-lib', version: '1.0.0' })
    )
    fs.writeFileSync(
      path.join(pkgDir, 'sub', 'package.json'),
      JSON.stringify({ name: 'demo-lib/sub', version: '9.9.9', private: true })
    )
    fs.writeFileSync(path.join(subDist, 'sub.js'), 'module.exports = {}\n')
  })

  afterAll(() => {
    fs.rmSync(root, { recursive: true, force: true })
  })

  it('attributes a subpath module to the real package, not the subpath stub', () => {
    const subFile = path.join(root, 'node_modules', 'demo-lib', 'sub', 'dist', 'sub.js')
    const pkg = getPackageConfig(subFile)
    expect(pkg).toBeDefined()
    expect(pkg.packageJson.name).toBe('demo-lib')
    expect(pkg.packageJson.version).toBe('1.0.0')
  })
})
