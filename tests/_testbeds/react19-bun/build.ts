import { fileURLToPath } from "url";
import path from "path";

// resolve current script directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// absolute paths
const entryHTML = path.resolve(__dirname, "src/index.html");
const entryTS = path.resolve(__dirname, "src/index.ts");
const outdir = path.resolve(__dirname, "dist");
const metafilePath = path.resolve(outdir, "metafile.json");


/*
const resultHTML = await Bun.build({
  entrypoints: [entryHTML],
  outdir,
  target: "browser",
  sourcemap: "external",
  minify: true,
  define: {
    "process.env.NODE_ENV": '"production"',
  },
  env: "BUN_PUBLIC_*",
});

if (!resultHTML.success) {
  console.error("Build failed: resultHTML");
  for (const log of resultHTML.logs) console.error(log);
  process.exit(1);
}

*/

const resultTS = await Bun.build({
  entrypoints: [entryTS],
  outdir,
  target: "bun",
  sourcemap: "external",
  minify: true,
  define: {
    "process.env.NODE_ENV": '"production"',
  },
  env: "BUN_PUBLIC_*",
  bundle: true,
  metafile: true,
  write: false
});

if (!resultTS.success) {
  console.error("Build failed: resultTS");
  for (const log of resultTS.logs) console.error(log);
  process.exit(1);
}

console.log(resultTS.metafile)

if (resultTS.metafile) {
  await Bun.write(metafilePath, JSON.stringify(resultTS.metafile, null, 2));
}

console.log("Build completed");
