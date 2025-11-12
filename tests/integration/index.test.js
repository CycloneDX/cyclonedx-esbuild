/*!
TODO LICENSE HEADER
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
                '          "name": "webpack",\n' +
                '          "version": ".+?"\n' +
                '        }'),
      '        {\n' +
            '          "type": "application",\n' +
            '          "name": "webpack",\n' +
            '          "version": "webpackVersion-testing"\n' +
            '        }'
    )
    .replace(
      // replace self metadata.tools[].version
      '        "vendor": "@cyclonedx",\n' +
            '        "name": "webpack-plugin",\n' +
            `        "version": ${JSON.stringify(thisVersion)}`,
      '        "vendor": "@cyclonedx",\n' +
            '        "name": "webpack-plugin",\n' +
            '        "version": "thisVersion-testing"'
    ).replace(
      // replace self metadata.tools.components[].version
      '          "name": "webpack-plugin",\n' +
            '          "group": "@cyclonedx",\n' +
            `          "version": ${JSON.stringify(thisVersion)}`,
      '          "name": "webpack-plugin",\n' +
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
      // replace webpack metadata.tools[].version
      new RegExp(
        '        <component type="application">\n' +
                '          <name>webpack</name>\n' +
                '          <version>.+?</version>\n' +
                '        </component>'),
      '        <component type="application">\n' +
            '          <name>webpack</name>\n' +
            '          <version>webpackVersion-testing</version>\n' +
            '        </component>'
    )
    .replace(
      // replace self metadata.tools[].version
      '        <vendor>@cyclonedx</vendor>\n' +
            '        <name>webpack-plugin</name>\n' +
            `        <version>${thisVersion}</version>`,
      '        <vendor>@cyclonedx</vendor>\n' +
            '        <name>webpack-plugin</name>\n' +
            '        <version>thisVersion-testing</version>'
    ).replace(
      // replace self metadata.tools.components[].version
      '          <group>@cyclonedx</group>\n' +
            '          <name>webpack-plugin</name>\n' +
            `          <version>${thisVersion}</version>`,
      '          <group>@cyclonedx</group>\n' +
            '          <name>webpack-plugin</name>\n' +
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
