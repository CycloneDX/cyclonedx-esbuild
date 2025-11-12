"use strict";

const esbuild = require('esbuild');
const {cyclonedxEsbuildPlugin} = require('cyclonedx-esbuild');

async function build() {
    try {
        await esbuild.build({
            entryPoints: ['src/index.ts'],
            bundle: true,
            outfile: 'dist/bundle.js',
            platform: 'node',
            format: 'cjs',
            sourcemap: true,
            treeShaking: true,
            minify: true,
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
