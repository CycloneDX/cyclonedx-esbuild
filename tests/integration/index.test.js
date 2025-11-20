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

const { spawnSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

const { describe, expect, it } = require('@jest/globals')

const { TB_ROOTDIR } = require('../')
const { version: thisVersion } = require('../../package.json')

const testSetups = [
  {
    dir: 'angular20-yarn',
    purpose: 'functional: angular20 on yarn',
    packageManager: 'yarn',
    results: [ // paths relative to `dir`
      {
        format: 'json',
        file: 'dist/first-app/bom.json'
      },
    ]
  },
  {
    dir: 'esbuild-lowest',
    purpose: 'functional: esbuild lowest',
    packageManager: 'npm',
    results: [ // paths relative to `dir`
      {
        format: 'json',
        file: 'dist/bom.json'
      },
    ]
  },
  {
    dir: 'esbuild-latest',
    purpose: 'functional: esbuild latest',
    packageManager: 'npm',
    results: [ // paths relative to `dir`
      {
        format: 'json',
        file: 'dist/bom.json'
      },
    ]
  },
  {
    dir: 'typescript-npm',
    purpose: 'functional: simple typescript bundling on npm',
    packageManager: 'npm',
    results: [ // paths relative to `dir`
      {
        format: 'json',
        file: 'dist/bom.json'
      },
    ]
  },
  {
    dir: 'typescript-yarn',
    purpose: 'functional: simple typescript bundling on yarn',
    packageManager: 'yarn',
    results: [ // paths relative to `dir`
      {
        format: 'json',
        file: 'dist/bom.json'
      },
    ]
  },
]

describe('integration', () => {
  testSetups.forEach(({ skip: skipTests, purpose, dir, packageManager, results }) => {
    skipTests = !!skipTests
    describe(purpose, () => {
      if (!skipTests) {
        const built = spawnSync(
          packageManager ?? 'npm', ['run', 'build'], {
            cwd: path.join(TB_ROOTDIR, dir),
            stdio: ['ignore', 'pipe', 'pipe'],
            encoding: 'utf8',
            shell: true,
            env: {
              PATH: process.env.PATH,
              CI: '1'
            }
          }
        )
        try {
          expect(built.status).toBe(0)
        } catch (err) {
          if (/should not be used for production|Angular CLI requires a minimum|does not support Node\.js v/.test(built.stderr.toString())) {
            skipTests = true
          } else {
            console.log('purpose: ', purpose, '\n')
            console.log('built', built, '\n')
            throw err
          }
        }
      }

      results.forEach(({ format, file }) => {
        (skipTests
          ? it.skip
          : it
        )(`generated ${format} file: ${file}`, () => {
          const resultFile = path.join(TB_ROOTDIR, dir, file)
          const resultBuffer = fs.readFileSync(resultFile)
          expect(resultBuffer).toBeInstanceOf(Buffer)
          expect(resultBuffer.length).toBeGreaterThan(0)
          const resultReproducible = makeReproducible(format, resultBuffer.toString())
          expect(resultReproducible).toMatchSnapshot()
        })
      })
    })
  })
})

/**
 * @param {string} format
 * @param {*} data
 * @returns {string}
 * @throws {RangeError} if format is unsupported
 */
function makeReproducible (format, data) {
  switch (format.toLowerCase()) {
    case 'xml':
      return makeXmlReproducible(data)
    case 'json':
      return makeJsonReproducible(data)
    default:
      throw new RangeError(`unexpected format: ${format}`)
  }
}

/**
 * @param {string} json
 * @returns {string}
 */
function makeJsonReproducible (json) {
  return json
    .replace(
      // replace metadata.tools[].version
      new RegExp(
        '        {\n' +
                '          "type": "application",\n' +
                '          "name": "esbuild",\n' +
                '          "version": ".+?"\n' +
                '        }'),
      '        {\n' +
            '          "type": "application",\n' +
            '          "name": "esbuild",\n' +
            '          "version": "esbuildVersion-testing"\n' +
            '        }'
    )
    .replace(
      // replace self metadata.tools[].version
      '        "vendor": "@cyclonedx",\n' +
            '        "name": "cyclonedx-esbuild",\n' +
            `        "version": ${JSON.stringify(thisVersion)}`,
      '        "vendor": "@cyclonedx",\n' +
            '        "name": "cyclonedx-esbuild",\n' +
            '        "version": "thisVersion-testing"'
    ).replace(
      // replace self metadata.tools.components[].version
      '          "name": "cyclonedx-esbuild",\n' +
            '          "group": "@cyclonedx",\n' +
            `          "version": ${JSON.stringify(thisVersion)}`,
      '          "name": "cyclonedx-esbuild",\n' +
            '          "group": "@cyclonedx",\n' +
            '          "version": "thisVersion-testing"'
    ).replace(
      // replace cdx-lib metadata.tools[].version
      new RegExp(
        '        "vendor": "@cyclonedx",\n' +
                '        "name": "cyclonedx-library",\n' +
                '        "version": ".+?"'
      ),
      '        "vendor": "@cyclonedx",\n' +
            '        "name": "cyclonedx-library",\n' +
            '        "version": "libVersion-testing"'
    ).replace(
      // replace cdx-lib metadata.tools.components[].version
      new RegExp(
        '          "name": "cyclonedx-library",\n' +
                '          "group": "@cyclonedx",\n' +
                '          "version": ".+?"'
      ),
      '          "name": "cyclonedx-library",\n' +
            '          "group": "@cyclonedx",\n' +
            '          "version": "libVersion-testing"'
    )
}

/**
 * @param {string} xml
 * @returns {string}
 *
 * eslint-disable-next-line no-unused-vars
 */
function makeXmlReproducible (xml) {
  return xml
    .replace(
      // replace esbuild metadata.tools[].version
      new RegExp(
        '        <component type="application">\n' +
                '          <name>esbuild</name>\n' +
                '          <version>.+?</version>\n' +
                '        </component>'),
      '        <component type="application">\n' +
            '          <name>esbuild</name>\n' +
            '          <version>esbuildVersion-testing</version>\n' +
            '        </component>'
    )
    .replace(
      // replace self metadata.tools[].version
      '        <vendor>@cyclonedx</vendor>\n' +
            '        <name>cyclonedx-esbuild</name>\n' +
            `        <version>${thisVersion}</version>`,
      '        <vendor>@cyclonedx</vendor>\n' +
            '        <name>cyclonedx-esbuild</name>\n' +
            '        <version>thisVersion-testing</version>'
    ).replace(
      // replace self metadata.tools.components[].version
      '          <group>@cyclonedx</group>\n' +
            '          <name>cyclonedx-esbuild</name>\n' +
            `          <version>${thisVersion}</version>`,
      '          <group>@cyclonedx</group>\n' +
            '          <name>cyclonedx-esbuild</name>\n' +
            '          <version>thisVersion-testing</version>'
    ).replace(
      // replace cdx-lib metadata.tools[].version
      new RegExp(
        '        <vendor>@cyclonedx</vendor>\n' +
                '        <name>cyclonedx-library</name>\n' +
                '        <version>.+?</version>'
      ),
      '        <vendor>@cyclonedx</vendor>\n' +
            '        <name>cyclonedx-library</name>\n' +
            '        <version>libVersion-testing</version>'
    ).replace(
      // replace cdx-lib metadata.tools.components[].version
      new RegExp(
        '          <group>@cyclonedx</group>\n' +
                '          <name>cyclonedx-library</name>\n' +
                '          <version>.+?</version>'),
      '          <group>@cyclonedx</group>\n' +
            '          <name>cyclonedx-library</name>\n' +
            '          <version>libVersion-testing</version>'
    )
}
