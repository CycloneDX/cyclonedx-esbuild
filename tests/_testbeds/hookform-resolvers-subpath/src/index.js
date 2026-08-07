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

// Importing the "zod" subpath pulls in node_modules/@hookform/resolvers/zod/dist/*.js,
// which is resolved via a legacy subpath-directory manifest at
// node_modules/@hookform/resolvers/zod/package.json (name: "@hookform/resolvers/zod").
import {zodResolver} from '@hookform/resolvers/zod'
import {z} from 'zod'

const schema = z.object({
  name: z.string().min(1),
})

const resolver = zodResolver(schema)

console.log('resolver type:', typeof resolver)
