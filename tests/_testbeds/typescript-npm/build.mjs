"use strict";

import * as  esbuild from 'esbuild'
import {cyclonedxEsbuildPlugin} from 'cyclonedx-esbuild'

async function build() {
    try {
        await esbuild.build({
            entryPoints: ['src/index.ts'],
            bundle: true,
            outfile: 'dist/bundle.js',
            platform: 'node',
            format: 'esm',
            sourcemap: true,
            minify: true,
            treeShaking: true,
            target: 'node22',
            plugins: [cyclonedxEsbuildPlugin({
                gatherLicenseTexts: true,
                outputReproducible: true,
                validateResults: true,
                outputFile: 'bom.json',
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
