# Test: Angular20 with esbuild in yarn setup

This demo/example app was pulled from somewhere in the internets.

----

Angular 17+ uses _esbuild_ to generate theis web-deliverables.

The SBOM is built by analysing the esbuild metafile.  
1. _esbuild_ metafile is emitted with as file `.../stats.json` during Angular's build process if called with the `--stats-json` switch.
2. _esbuild_ metafile is analysed by the `cyclonedx-esbuild` CLI to generate the SBOM.

All the process is setup as a build script in the [`package.json`](package.json):
```jsonc
// package.json
{
  "scripts": {
    "build:ng": "ng build --stats-json",
    "build:sbom": "cyclonedx-esbuild -vvv --gather-license-texts --output-reproducible -o dist/first-app/bom.json dist/first-app/stats.json",
    "build": "yarn run build:ng && yarn run build:sbom"
  }
}
```

Remark: for the sake of development processes in the context of this repository, we call the `.../cyclonedx-esbuild-cli.js` directly.
