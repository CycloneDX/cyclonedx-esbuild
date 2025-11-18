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

// TypeScript application to test esbuild
import { utils as CPUtils } from 'custom-package'

import { Calculator } from './utils';
import { greet } from './interim';

console.log('TypeScript esbuild example with npm');
console.log(greet('World'));

// Example of TypeScript features
const numbers: number[] = [1, 2, 3, 4, 5];
const doubled: number[] = numbers.map((n: number) => n * 2);
console.log('Doubled numbers:', doubled);

// Example with class
const calc = new Calculator();
console.log('5 + 3 =', calc.add(5, 3));
console.log('10 * 4 =', calc.multiply(10, 4));

// Example async/await with types
async function fetchData(): Promise<string> {
  return new Promise((resolve) => {
    setTimeout(() => resolve('Data loaded!'), 100);
  });
}

fetchData().then((data: string) => console.log(data));

console.log(
    'from custom-package:',
    CPUtils.foo()
)
