"use strict";

import * as esbuild from 'esbuild'
import {cyclonedxEsbuildPlugin} from '@cyclonedx/cyclonedx-esbuild'

async function build() {
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
    });
    console.log('✅ Build completed successfully!');
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

build();
