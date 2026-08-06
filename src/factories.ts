/*!
This file is part of CycloneDX generator for esbuild.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

SPDX-License-Identifier: Apache-2.0
Copyright (c) OWASP Foundation. All Rights Reserved.
*/

import { Utils as FromNodePackageJsonUtils } from "@cyclonedx/cyclonedx-library/Contrib/FromNodePackageJson"
import type normalizePackageData from "normalize-package-data"
import type { PurlQualifiers } from "packageurl-js"
import { PackageURL, PurlQualifierNames } from "packageurl-js"

import {isString} from "./_helpers";


export class PackageUrlFactory {

  makeFromPackageJson(packageJson: normalizePackageData.Package): PackageURL | undefined {
    // !REMINDER: even private packages may have a PURL

    let name: string = packageJson.name
    let namespace: string | undefined = undefined
    if ( name.startsWith('@') ) {
      const nameParts = name.split('/')
      namespace = nameParts.shift()
      name = nameParts.join('/')
    }

    const qualifiers: PurlQualifiers = {}
    // "dist" might be used in bundled dependencies' manifests.
    // docs: https://blog.npmjs.org/post/172999548390/new-pgp-machinery
    /* eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- acknowledged */
    const { tarball } = packageJson.dist ?? {}
    if ( isString(tarball) && tarball.length > 5 ) {
      if (!FromNodePackageJsonUtils.defaultRegistryMatcher.test(tarball)) {
        qualifiers[PurlQualifierNames.DownloadUrl] = tarball
      }
    } else if ( typeof packageJson.repository === 'object' ) {
      try {
        const url = new URL(packageJson.repository.url)
        /* @ts-expect-error -- missing type docs */
        const subdir = packageJson.repository.directory /* eslint-disable-line @typescript-eslint/no-unsafe-assignment -- ack */
        if (isString(subdir)) {
          url.hash = subdir
        }
        qualifiers[PurlQualifierNames.VcsUrl] = url.toString()
      } catch {
        /* pass */
      }
    }

    if ( !Object.hasOwn(qualifiers, PurlQualifierNames.DownloadUrl)
      && !Object.hasOwn(qualifiers, PurlQualifierNames.VcsUrl)
      && ( !this._checkPackageNpmjs(packageJson.name)
        /* eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- safety */
        || packageJson.version?.length === 0
      )
    ) {
      // package would not be reachable by PackageURL means
      return undefined
    }

    try {
      // Do not beautify the parameters here, because that is in the domain of PackageURL and its representation.
      // No need to convert an empty "subpath" string to `undefined` and such.
      return new PackageURL(
        'npm',
        namespace,
        name,
        packageJson.version,
        qualifiers,
        undefined
      )
    } catch {
      return undefined
    }
  }

  /**
   * check is package for guidelines of https://npmjs.com/
   *
   * see the docs:
   * - https://docs.npmjs.com/package-name-guidelines
   * - https://docs.npmjs.com/cli/v12/configuring-npm/package-json#name
   * - https://docs.npmjs.com/cli/v12/using-npm/scope#publishing-scoped-packages
   */
  _checkPackageNpmjs(packageName: string): boolean {
    if (packageName.length > 214) {
      // The name must be less than or equal to 214 characters. This includes the scope for scoped packages.
      return false
    }
    if (packageName.startsWith('@')) {
      // scoped package
      if (packageName.match(/\//g)?.length !== 1
        || packageName.startsWith('/')
        || packageName.endsWith('/')
      ) {
        return false
      }
    } else {
      // non-scoped package
      if (packageName.match(/\//g)?.length !== 0) {
        return false
      }
      if (packageName.startsWith('.')
        || packageName.startsWith('_')
      ) {
        // The names of scoped packages can begin with a dot or an underscore. This is not permitted without a scope.
        return false
      }
    }

    // TODO: The name ends up being part of a URL, an argument on the command line, and a folder name. Therefore, the name can't contain any non-URL-safe characters.

    /* skipped - this does not apply to old packages that already existed before this rule.
    if (packageName.toLowerCase() !== packageName) {
      // New packages must not have uppercase letters in the name.
      return false
    }
    */

    return true
  }

}
