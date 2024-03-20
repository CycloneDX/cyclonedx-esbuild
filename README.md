# CycloneDX SBOM plugin for esbuild

[![shield_license]][license_file]  
[![shield_website]][link_website]
[![shield_slack]][link_slack]
[![shield_groups]][link_discussion]
[![shield_twitter-follow]][link_twitter]

----

Create [CycloneDX] Software Bill of Materials (SBOM) from _[esbuild]_ projects.

## 🚧 🏗️ this project is an early development stage

See the projects issues, discussions, pull requests and milestone for the progress.

- planning/vision: https://github.com/CycloneDX/cyclonedx-esbuild-plugin/discussions/3

Development will happen in branch `1.0-dev`.

Feel free to contribute, write issues, create pull requests, or start discussions.  
Please read the [CONTRIBUTING][contributing_file] file first.

## Requirements

... TBD ...

## Installation

... TBD ...

## Usage

... TBD ...


## Internals

<!-- !!! Undecided whether implementation will be in Go or JS....
This _esbuild_ plugin utilizes the [CycloneDX library][cyclonedx-(js|go)-library] to generate the actual data structures.
-->

 <!-- Besides the class `CycloneDxEsbuildPlugin` and the interface `CycloneDxEsbuildPluginOptions`,  -->
This _esbuild_ plugin does **not** expose any additional _public_ API or classes - all code is intended to be internal and might change without any notice during version upgrades.

## Development & Contributing

Feel free to open issues, bug reports or pull requests.  
See the [CONTRIBUTING][contributing_file] file for details.

## License

Permission to modify and redistribute is granted under the terms of the Apache 2.0 license.  
See the [LICENSE][license_file] file for the full license.


[license_file]: https://github.com/CycloneDX/cyclonedx-esbuild-plugin/blob/1.0-dev/LICENSE
[contributing_file]: https://github.com/CycloneDX/cyclonedx-esbuild-plugin/blob/1.0-dev/CONTRIBUTING.md

[CycloneDX]: https://cyclonedx.org/
[esbuild]: https://esbuild.github.io
[cyclonedx-go-library]: https://github.com/CycloneDX/cyclonedx-go
[cyclonedx-js-library]: https://www.npmjs.com/package/@cyclonedx/cyclonedx-library


[shield_license]: https://img.shields.io/github/license/CycloneDX/cyclonedx-esbuild-plugin?logo=open%20source%20initiative&logoColor=white "license"
[shield_website]: https://img.shields.io/badge/https://-cyclonedx.org-blue.svg "homepage"
[shield_slack]: https://img.shields.io/badge/slack-join-blue?logo=Slack&logoColor=white "slack join"
[shield_groups]: https://img.shields.io/badge/discussion-groups.io-blue.svg "groups discussion"
[shield_twitter-follow]: https://img.shields.io/badge/Twitter-follow-blue?logo=Twitter&logoColor=white "twitter follow"

[link_website]: https://cyclonedx.org/
[link_slack]: https://cyclonedx.org/slack/invite
[link_discussion]: https://groups.io/g/CycloneDX
[link_twitter]: https://twitter.com/CycloneDX_Spec
