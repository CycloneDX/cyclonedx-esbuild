#!/usr/bin/env node

/*!
TODO LICENSE HEADER
*/

'use strict'

const { spawnSync } = require('node:child_process')
const { existsSync } = require('node:fs')
const path = require('node:path')

const { TB_ROOTDIR } = require('./')

const MANAGERS = {
  npm: {
    cmd: 'npm',
    args: ['ci', '--ignore-scripts'],
    dirs: [
      'typescript-npm',
    ]
  },
  yarn: {
    cmd: 'yarn',
    args: ['install', '--immutable', '--mode=skip-build'],
    dirs: [
      'angular20-yarn',
      'typescript-yarn',
    ]
  },
  pnpm: {
    cmd: 'pnpm',
    args: ['install', '--frozen-lockfile', '--ignore-scripts'],
    dirs: []
  },
  bun: {
    cmd: 'bun',
    args: ['install', '--frozen-lockfile', '--no-scripts'],
    dirs: []
  }
}

function setup () {
  for (const [name, config] of Object.entries(MANAGERS)) {
    for (const dir of config.dirs) {
      console.log(`>>> setup with ${name.toUpperCase()}: ${dir}`)
      const testbedPath = path.join(TB_ROOTDIR, dir)

      if (!existsSync(testbedPath)) {
        console.error(`Directory not found: ${dir}`)
        process.exitCode = 1
        continue
      }

      const result = spawnSync(config.cmd, config.args, {
        cwd: testbedPath,
        stdio: 'inherit',
        shell: true
      })
      if (result.status !== 0) {
        console.error(`Failed to setup ${dir}`)
        process.exitCode = 1
      }
    }
  }

  console.log(process.exitCode === 0
    ? 'Setup complete'
    : 'Setup completed with errors')
}

setup()
