import { cyclonedxEsbuildPlugin } from "@cyclonedx/cyclonedx-esbuild"

await Bun.build({
  target: "browser",
  minify: true,
  sourcemap: "linked",
  entrypoints: ["./src/index.html"],
  outdir: "./dist",
  metafile: true, // required for `cyclonedxEsbuildPlugin` to work
  plugins: [
    cyclonedxEsbuildPlugin({
      outputReproducible: true,
      gatherLicenseTexts: true,
      mcType: "application",
      outputFile: "bom.json",
    }),
  ],
})

export {}
