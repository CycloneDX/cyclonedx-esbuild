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

import esbuild from 'esbuild'
import {cyclonedxEsbuildPlugin} from '@cyclonedx/cyclonedx-esbuild'

async function build() {
  try {
    const built = await esbuild.build({
      entryPoints: {
        // external entryPoint from a external installed package
        "custom-package.bundle": '@cyclonedx/cyclonedx-eslint-testing-custom-package',
        // external entryPoint from a external file package
        "some-js.bundle": '../../_data/some-js',
      },
      bundle: true,
      outdir: 'dist',
      platform: 'node',
      format: 'esm',
      sourcemap: true,
      minify: true,
      treeShaking: true,
      target: 'esnext',
      plugins: [cyclonedxEsbuildPlugin({
        gatherLicenseTexts: true,
        outputReproducible: true,
        validate: true,
        outputFile: 'bom.json',
      })],
      logLevel: 'debug',
    })
    console.log('✅ Build completed successfully!')
    console.log(JSON.stringify(built.metafile))
  } catch (error) {
    console.error('❌ Build failed:', error)
    process.exit(1)
  }
}

build()
