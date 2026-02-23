# Changelog

All notable changes to this project will be documented in this file.

## unreleased

<!-- add unreleased items here -->

* Refactored
  * Take care of PackageURL generation ourselves, now (via [#])  
    Was done at best-effort by a 3rd-party library.
* Style
  * Applied latest code style (via [#42]) 
* Dependencies
  * Bumped dependency `@cyclonedx/cyclonedx-library@^10.0.0` now, was `@^9.2.0` (via [#]) 
  * Added direct dependency `spdx-expression-parse@^3.0.1||^4.0.0` (via [#])

[#42]: https://github.com/CycloneDX/cyclonedx-esbuild/pull/42
[#]: 

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
