# CycloneDX SBOM generator for _esbuild_ and _Bun_

[![shield_npm-version]][link_npm]
[![shield_gh-workflow-test]][link_gh-workflow-test]
[![shield_coverage]][link_codacy]
[![shield_ossf-best-practices]][link_ossf-best-practices]
[![shield_license]][license_file]  
[![shield_website]][link_website]
[![shield_slack]][link_slack]
[![shield_groups]][link_discussion]
[![shield_twitter-follow]][link_twitter]

----

Create _[CycloneDX]_ Software Bill of Materials (SBOM) from projects built with _[esbuild]_ or _[Bun]_.

This package provides:

* a **plugin for _esbuild_-compatible bundlers** — works with _esbuild_ and _Bun_
* a **CLI tool** for generating SBOMs from esbuild-compatible build [metafiles](https://esbuild.github.io/api/#metafile)

The tooling uses the dependency linkage information generated during bundling to create an inventory <!-- and dependency graph -- not yet -- see https://github.com/CycloneDX/cyclonedx-esbuild/issues/11 -->. Only dependencies that are actually included in the final bundle (after [tree-shaking](https://esbuild.github.io/api/#tree-shaking)) are listed.

The resulting SBOM documents follow [official specifications and standards](https://github.com/CycloneDX/specification).

## Features

* 🔌 **Plugin for esbuild-compatible bundlers** (_esbuild_, _Bun_)
* 🖥️ **CLI tool** for generating SBOMs from esbuild-compatible metafiles
* 🎯 Supports multiple **CycloneDX spec versions** (1.2, 1.3, 1.4, 1.5, 1.6, 1.7)
* 🔍 Extracts components and dependencies from bundled projects <!-- dependencies components are gathered, but dependency graph is not yet built -->
* 📝 **License evidence gathering**
* ✅ **Validates** generated SBOMs against CycloneDX schema
* 🔄 **Reproducible output** option for consistent SBOM generation
* 📊 Works with _TypeScript_, _Angular_, and other modern frameworks

## Requirements

One of the following runtimes:

* _Node.js_ `>= 20.18`
* _Bun_ `>= 1.3.6`
 
Some features require optional (peer) dependencies — see `package.json` for version constraints.

* _esbuild_ — required when using the plugin with esbuild
* _ajv_, _ajv-formats_ & _ajv-formats-draft2019_ — required for SBOM JSON result validation

## Installing

Use your preferred package manager and install as a dev-dependency:

```shell
npm install --save-dev @cyclonedx/cyclonedx-esbuild
pnpm add --save-dev @cyclonedx/cyclonedx-esbuild
yarn add --dev @cyclonedx/cyclonedx-esbuild
bun add --dev @cyclonedx/cyclonedx-esbuild
```

## Usage

### Plugin Usage (esbuild and Bun)

The plugin works with **esbuild-compatible bundlers**.  
Since Bun provides a plugin API compatible with esbuild, the same plugin can be used in both environments.

#### Plugin Options & Configuration

<!-- the following table is based on `src/plugin.ts`::`CycloneDxEsbuildPluginOptions` -->

| Name | Type | Default | Description |
|:-----|:----:|:-------:|:------------|
| **`specVersion`** | `{string}`<br/> one of: `"1.2"`, `"1.3"`, `"1.4"`, `"1.5"`, `"1.6"`, `"1.7"` | `"1.6"` |  Which version of [CycloneDX-spec] to use.<br/> Supported values depend on the installed dependency [CycloneDX-javascript-library]. |
| **outputFile** | `{string}` | `"bom.json"` | Path to the output file. |
| **gatherLicenseTexts** | `{boolean}` | `false` | Search for license files in components and include them as license evidence.<br/> This feature is experimental. |
| **outputReproducible** | `{boolean}` | `false` | Whether to go the extra mile and make the output reproducible.<br/> This requires more resources, and might result in loss of time- and random-based-values. |
| **mcType** | `{string}` | `"application"` | Set the MainComponent's type.<br/> See [list of valid values](https://cyclonedx.org/docs/1.7/json/#metadata_component_type). |
| **validate** | `{boolean \| undefined}` | `undefined` | Validate resulting BOM before outputting.<br/> Validation is skipped, if requirements not met. |

#### Plugin Example: esbuild

```javascript
// build.js
const esbuild = require('esbuild');
const { cyclonedxEsbuildPlugin } = require('@cyclonedx/cyclonedx-esbuild');

/** @type {import('@cyclonedx/cyclonedx-esbuild').CycloneDxEsbuildPluginOptions} */
const cyclonedxEsbuildPluginOptions = {
  specVersion: '1.7',
  outputFile: 'bom.json'
}

esbuild.build({
  // ...
  plugins: [
    cyclonedxEsbuildPlugin(cyclonedxEsbuildPluginOptions),
  ]
});
```

See extended [examples].

#### Plugin Example: Bun

Since _Bun_'s plugin API is loosely based on _esbuild_'s, this plugin can also be used in _Bun_ projects that use the built-in bundler (Bun v1.3.6+).

```typescript
// build.ts
import { cyclonedxEsbuildPlugin } from "@cyclonedx/cyclonedx-esbuild"

await Bun.build({
  // ...
  metafile: true, // required for `cyclonedxEsbuildPlugin` to work with Bun
  plugins: [
    cyclonedxEsbuildPlugin({
      outputFile: "bom.json",
      // ...
    }),
  ],
})

export {}
```

See example: [integration with Bun](https://github.com/CycloneDX/cyclonedx-esbuild/tree/main/tests/_testbeds/react19-bun).

### CLI Tool

The Command Line Interface for generating SBOMs from [esbuild metafiles](https://esbuild.github.io/api/#metafile).

#### CLI Call

Calling the CLI depends on the used install method.  
Here are examples for the various package managers and setups:

```shell
npm exec -- cyclonedx-esbuild --help
pnpm exec cyclonedx-esbuild --help
yarn exec cyclonedx-esbuild --help
```

#### CLI Help Page

```text
Usage: cyclonedx-esbuild [options] <metafile>

Create CycloneDX Software Bill of Materials (SBOM) from esbuild-compatible metafile.

Arguments:
  metafile                        Path to esbuild-compatible metafile

Options:
  --ewd, --esbuild-working-dir    Working dir used in the esbuild process.
  --gather-license-texts          Search for license files in components and include them as license evidence.
                                  This feature is experimental. 
                                  (default: false)
  --sv, --spec-version <version>  Which version of CycloneDX spec to use. 
                                  (choices: "1.2", "1.3", "1.4", "1.5", "1.6", "1.7", default: "1.6")
  --output-reproducible           Whether to go the extra mile and make the output reproducible.
                                  This requires more resources, and might result in loss of time- and random-based-values. 
                                  (env: BOM_REPRODUCIBLE)
  -o, --output-file <file>        Path to the output file.
                                  Set to "-" to write to STDOUT.
                                  (default: write to STDOUT)
  --validate                      Validate resulting BOM before outputting.
                                  Validation is skipped, if requirements not met.
  --no-validate                   Disable validation of resulting BOM.
  --mc-type <type>                Type of the main component.
                                  (choices: "application", "firmware", "library", default: "application")
  -v, --verbose                   Increase the verbosity of messages.
                                  Use multiple times to increase the verbosity even more.
  -V, --version                   output the version number
  -h, --help                      display help for command
```

### Use with Angular

For _Angular_ projects using _esbuild_ (Angular 17+), you can generate SBOMs from the build stats.

```jsonc
// package.json
{
  "scripts": {
    "build:app": "ng build --stats-json",
    "build:sbom": "cyclonedx-esbuild --gather-license-texts --output-reproducible -o dist/bom.json dist/stats.json",
    "build": "npm run build:app && npm run build:sbom"
  }
}
```

See an example here: [integration with Angular20](https://github.com/CycloneDX/cyclonedx-esbuild/tree/main/tests/_testbeds/angular20-npm).

## Internals

This tooling utilizes the [CycloneDX library][CycloneDX-javascript-library] to generate the actual data structures.

Besides the class `CycloneDxEsbuildPlugin` and the interface `CycloneDxEsbuildPluginOptions`,  
this _esbuild_ plugin and this tool does **not** expose any additional _public_ API or classes - all code is intended to be internal and might change without any notice during version upgrades.

However, the CLI is stable - you may call it programmatically like:
```javascript
const { execFileSync } = require('child_process')
const { constants: { MAX_LENGTH: BUFFER_MAX_LENGTH } } = require('buffer')
const sbom = JSON.parse(execFileSync(process.execPath, [
    '../path/to/this/package/bin/cyclonedx-esbuild-cli.js',
    '--spec-version', '1.7',
    '--output-file', '-'
    // additional CLI args
], { stdio: ['ignore', 'pipe', 'ignore'], encoding: 'buffer', maxBuffer: BUFFER_MAX_LENGTH }))
```

## Development & Contributing

Feel free to open issues, bug reports or pull requests.  
See the [CONTRIBUTING][contributing_file] file for details.

## License

Permission to modify and redistribute is granted under the terms of the Apache 2.0 license.  
See the [LICENSE][license_file] file for the full license.

[license_file]: https://github.com/CycloneDX/cyclonedx-esbuild/blob/main/LICENSE
[contributing_file]: https://github.com/CycloneDX/cyclonedx-esbuild/blob/main/CONTRIBUTING.md
[examples]: https://github.com/CycloneDX/cyclonedx-esbuild/tree/main/examples

[CycloneDX]: https://cyclonedx.org/
[esbuild]: https://esbuild.github.io
[Bun]: https://bun.com/
[CycloneDX-javascript-library]: https://github.com/CycloneDX/cyclonedx-javascript-library/

[shield_gh-workflow-test]: https://img.shields.io/github/actions/workflow/status/CycloneDX/cyclonedx-esbuild/nodejs.yml?branch=main&logo=GitHub&logoColor=white "tests"
[shield_npm-version]: https://img.shields.io/npm/v/%40cyclonedx%2fcyclonedx-esbuild/latest?label=npm&logo=npm&logoColor=white "npm"
[shield_ossf-best-practices]: https://img.shields.io/cii/percentage/11463?label=OpenSSF%20best%20practices "OpenSSF best practices"
[shield_coverage]: https://img.shields.io/codacy/coverage/4900a38bdc544b2283695447e9513ab5?logo=Codacy&logoColor=white "test coverage"
[shield_license]: https://img.shields.io/github/license/CycloneDX/cyclonedx-esbuild?logo=open%20source%20initiative&logoColor=white "license"
[shield_website]: https://img.shields.io/badge/https://-cyclonedx.org-blue.svg "homepage"
[shield_slack]: https://img.shields.io/badge/slack-join-blue?logo=Slack&logoColor=white "slack join"
[shield_groups]: https://img.shields.io/badge/discussion-groups.io-blue.svg "groups discussion"
[shield_twitter-follow]: https://img.shields.io/badge/Twitter-follow-blue?logo=Twitter&logoColor=white "twitter follow"

[link_website]: https://cyclonedx.org/
[link_gh-workflow-test]: https://github.com/CycloneDX/cyclonedx-esbuild/actions/workflows/nodejs.yml?query=branch%3Amain
[link_codacy]: https://app.codacy.com/gh/CycloneDX/cyclonedx-esbuild/dashboard
[link_ossf-best-practices]: https://www.bestpractices.dev/projects/11463
[link_npm]: https://www.npmjs.com/package/@cyclonedx/cyclonedx-esbuild
[link_slack]: https://cyclonedx.org/slack/invite
[link_discussion]: https://groups.io/g/CycloneDX
[link_twitter]: https://twitter.com/CycloneDX_Spec
