# Changelog

All notable changes to this project will be documented in this file.

## unreleased

<!-- add unreleased items here -->

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
