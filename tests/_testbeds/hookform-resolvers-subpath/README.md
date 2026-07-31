# regression bed: `@hookform/resolvers` sub-package

Real-world case for <https://github.com/CycloneDX/cyclonedx-esbuild/issues/181>.

We use a package `@hookform/resolvers/zod` which is shipped as a sub-package of
`@hookform/resolvers`, via a nested manifest at
`node_modules/@hookform/resolvers/zod/package.json`.

This bed imports `@hookform/resolvers/zod`.
