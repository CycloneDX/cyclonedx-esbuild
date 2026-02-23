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

import { Utils } from "@cyclonedx/cyclonedx-library/Contrib/FromNodePackageJson"
import { ExternalReferenceType } from "@cyclonedx/cyclonedx-library/Enums"
import type {Component} from "@cyclonedx/cyclonedx-library/Models"
import {PackageURL, PurlQualifierNames, type PurlQualifiers} from 'packageurl-js'


export class PackageUrlFactory {
  /**
   * This method assumes that the component is built according to spec.
   */
  makeFromComponent (component: Component): PackageURL | undefined {
    const qualifiers: PurlQualifiers = {}
    let subpath: PackageURL['subpath'] = undefined

    // sorting to allow reproducibility: use the last instance for a `extRef.type`, if multiples exist
    for (const extRef of component.externalReferences) {
      const url = extRef.url.toString()
      if (url.length <= 0) {
        continue
      }
      // No further need for validation.
      // According to https://github.com/package-url/purl-spec/blob/master/PURL-TYPES.rst
      // there is no formal requirement to a `..._url`.
      // Everything is possible: URL-encoded, not encoded, with schema, without schema
      /* eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check -- intended */
      switch (extRef.type) {
        case ExternalReferenceType.VCS:
          [qualifiers[PurlQualifierNames.VcsUrl], subpath] = url.split('#', 2)
          break
        case ExternalReferenceType.Distribution:
          qualifiers[PurlQualifierNames.DownloadUrl] = url
          break
      }
    }
    /* eslint-disable-next-line @typescript-eslint/strict-boolean-expressions -- ack */
    if (qualifiers[PurlQualifierNames.DownloadUrl]) {
      /* eslint-disable-next-line @typescript-eslint/no-dynamic-delete -- ack */
      delete qualifiers[PurlQualifierNames.VcsUrl]
      if (Utils.defaultRegistryMatcher.test(qualifiers[PurlQualifierNames.DownloadUrl]))
      {
        /* eslint-disable-next-line @typescript-eslint/no-dynamic-delete -- ack */
        delete qualifiers[PurlQualifierNames.DownloadUrl]
      }
    }

    /* eslint-disable-next-line @typescript-eslint/strict-boolean-expressions -- ack */
    if (qualifiers[PurlQualifierNames.VcsUrl] || qualifiers[PurlQualifierNames.DownloadUrl]) {
      const hashes = component.hashes
      if (hashes.size > 0) {
        qualifiers[PurlQualifierNames.Checksum] = Array.from(
          hashes.sorted(),
          ([hashAlgo, hashCont]) => `${hashAlgo.toLowerCase()}:${hashCont.toLowerCase()}`
        ).join(',')
      }
    }

    try {
      // Do not beautify the parameters here, because that is in the domain of PackageURL and its representation.
      // No need to convert an empty "subpath" string to `undefined` and such.
      return new PackageURL(
        'npm',
        component.group,
        component.name,
        component.version,
        qualifiers,
        subpath
      )
    } catch {
      return undefined
    }
  }

}
