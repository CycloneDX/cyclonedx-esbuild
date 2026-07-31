# regression bed: `@hookform/resolvers` legacy subpath-directory manifest

Real-world case for <https://github.com/CycloneDX/cyclonedx-esbuild/issues/181>.

`@hookform/resolvers` ships a nested `package.json` inside each resolver's subpath
directory (e.g. `node_modules/@hookform/resolvers/zod/package.json`) so that bundlers
without `exports`-map support can resolve `@hookform/resolvers/zod` directly. That
manifest declares `"name": "@hookform/resolvers/zod"` (not a valid, installable npm
package name) and `"private": true`.

This bed imports `@hookform/resolvers/zod`, which is enough for `getPackageConfig` to
walk up from the bundled subpath file and pick up that stub manifest.

This snapshot captures *current* behavior; it is intentionally added before any fix, so
that the fix's effect on the emitted SBOM shows up as an explicit snapshot diff.
