# Changelog

All notable changes to this project will be documented in this file.

## unreleased

<!-- add unreleased items here -->

* Added
  * SBOM result now includes a dependency graph ([#11] via [#113], [#155], [#161])  
    The respective dependency graph reflects the built's input graph (i.e., why a component is included in the final bundle).
  * SBOM result now includes components’ `scope` (via [#143])
  * SBOM result may now include excluded, tree‑shaken components ([#142] via [#143])  
    The respective component’s `scope` is properly set to `"excluded"`.
  * Components might have properties following [`cdx:esbuild` Namespace Taxonomy](https://cyclonedx.github.io/cyclonedx-property-taxonomy/cdx/esbuild.html)
    and [`cdx` Namespace Taxonomy](https://cyclonedx.github.io/cyclonedx-property-taxonomy/cdx.html)
    . (via [#143])

[#11]: https://github.com/CycloneDX/cyclonedx-esbuild/issues/11
[#113]: https://github.com/CycloneDX/cyclonedx-esbuild/pull/113
[#142]: https://github.com/CycloneDX/cyclonedx-esbuild/issues/142
[#143]: https://github.com/CycloneDX/cyclonedx-esbuild/pull/143
[#155]: https://github.com/CycloneDX/cyclonedx-esbuild/pull/155
[#161]: https://github.com/CycloneDX/cyclonedx-esbuild/pull/161

## 1.3.1 - 2026-03-18

Maintenance release.

## 1.3.0 - 2026-03-10

* Added
  * CLI option `--build-working-dir <dir>` (via [#87])
* Removed
  * CLI option `--esbuild-working-dir` (via [#87])  
    Considered a fix rather than a breaking change. The option previously broke the CLI, so removing it does not introduce new breakage.

[#87]: https://github.com/CycloneDX/cyclonedx-esbuild/pull/87

## 1.2.0 - 2026-03-10

* Added
  * Plugin option `logLevel` to control own verbosity individually ([#82] via [#86])
* Fixed
  * Better runtime detection ([#82] via [#84])
* Docs
  * Showcase usage as Bun-plugin ([#62], [#82] via [#81], [#83])
* Tests
  * Added testbeds for integration as Bun-plugin ([#62] via [#81])

[#62]: https://github.com/CycloneDX/cyclonedx-esbuild/issues/62
[#81]: https://github.com/CycloneDX/cyclonedx-esbuild/pull/81
[#82]: https://github.com/CycloneDX/cyclonedx-esbuild/issues/82
[#83]: https://github.com/CycloneDX/cyclonedx-esbuild/pull/83
[#84]: https://github.com/CycloneDX/cyclonedx-esbuild/pull/84
[#86]: https://github.com/CycloneDX/cyclonedx-esbuild/pull/86

## 1.1.1 - 2026-03-09

* Fixed
  * Reproducible BomRef values (via [#74])
  * Properly generate PackageURLs for private packages (via [#79])

[#74]: https://github.com/CycloneDX/cyclonedx-esbuild/pull/74
[#79]: https://github.com/CycloneDX/cyclonedx-esbuild/pull/79

## 1.1.0 - 2026-03-03

* Fixed
  * Qualified PackageURLs (via [#65])
* Changed
  * Take care of PackageURL generation ourselves, now (via [#65])  
    Previously, this was done at best-effort by a 3rd-party library.
* Style
  * Applied latest code style (via [#42])
* Dependencies
  * Upgraded runtime-dependency `@cyclonedx/cyclonedx-library@^10.0.0` now, was `@^9.2.0` (via [#65])
  * Added runtime-dependency `packageurl-js@^2.0.1` (via [#65])
  * Added runtime-dependency `spdx-expression-parse@^3.0.1||^4.0.0` (via [#65])

[#42]: https://github.com/CycloneDX/cyclonedx-esbuild/pull/42
[#65]: https://github.com/CycloneDX/cyclonedx-esbuild/pull/65

## 1.0.0 - 2025-11-18

Initial implementation.

* 🔌 **_esbuild_ plugin** for automatic SBOM generation during builds
* 🖥️ **CLI tool** for generating SBOMs from esbuild metafiles
* 🎯 Supports multiple **CycloneDX spec versions** (1.2, 1.3, 1.4, 1.5, 1.6, 1.7)
* 🔍 Extracts components and dependencies from bundled projects
* 📝 **License evidence gathering**
* ✅ **Validates** generated SBOMs against CycloneDX schema
* 🔄 **Reproducible output** option for consistent SBOM generation
* 📊 Works with _TypeScript_, _Angular_, and other modern frameworks
