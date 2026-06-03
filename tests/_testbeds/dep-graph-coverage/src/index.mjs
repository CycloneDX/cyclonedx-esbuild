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

// Uses custom-package — this will appear in the SBOM with a dependency edge
import { utils } from 'custom-package'

// Imports unused-package but never uses it — tree-shaking should remove all its code,
// yet the package files will still appear in metafile.inputs with bytesInOutput=0.
// This exercises the expansion loop's "component === undefined" branch (entirely tree-shaken package).
import { unused } from 'unused-package'

// External import — exercises the "imp.external === true" branch in linkDependencies
import path from 'node:path'

console.log('dep-graph-coverage testbed')
console.log('custom-package foo:', utils.foo())
console.log('path join:', path.join('a', 'b'))
