#!/usr/bin/env node

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
      'lowest-esbuild'
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
