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

import { cyclonedxEsbuildPlugin } from '@cyclonedx/cyclonedx-esbuild'
import * as esbuild from 'esbuild'

async function build () {
  try {
    await esbuild.build({
      entryPoints: ['src/index.js'],
      bundle: true,
      outfile: 'dist/app.js',
      platform: 'browser',
      format: 'cjs',
      sourcemap: true,
      minify: true,
      treeShaking: true,
      target: 'es2020',
      plugins: [cyclonedxEsbuildPlugin({
        gatherLicenseTexts: true,
        outputReproducible: true,
        validateResults: true,
        outputFile: '.well-known/sbom',
      })],
      logLevel: 'debug',
    })
    console.log('✅ Build completed successfully!')
  } catch (error) {
    console.error('❌ Build failed:', error)
    process.exit(1)
  }
}

build()
