# Example: simple usage as an esbuild plugin

This is a showcase how to configure and run the _CycloneDX esbuild_ plugin with _esbuild_.

Se the [build script](build.mjs) for the applied settings.

Example SBOM results are prepared in folder [`sbom-results`](sbom-results/).

This showcase places the CycloneDX SBOM in a pre-defined location, specifically in
`/.well-known/sbom`.
See [draft-ietf-opsawg-sbom-access] for more information on the specification, currently an IETF draft.

## Prerequisite

For development’s sake, the [base project](../../) was built and is ready to run.

## setup 

### npm

```shell
npm i
```

### pnpm

```shell
pnpm i
```

### yarn

```shell
touch yarn.lock
yarn 
```

## usage

use one of these, depending on the setup you used: 

```shell
npm run build
pnpm run build
yarn run build
```

[draft-ietf-opsawg-sbom-access]: https://datatracker.ietf.org/doc/html/draft-ietf-opsawg-sbom-access
