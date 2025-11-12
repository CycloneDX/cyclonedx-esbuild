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

import {existsSync, readFileSync, writeSync} from "node:fs";
import {dirname, isAbsolute, join, resolve, sep} from "node:path";

import * as CDX from "@cyclonedx/cyclonedx-library"
import normalizePackageData from 'normalize-package-data'

import {LogPrefixes} from "./logger";

export function loadJsonFile(path: string): any {
  return JSON.parse(readFileSync(path, 'utf8'))
  // may be replaced by `require(f, { with: { type: "json" } })`
  // as soon as this spec is properly implemented.
  // see https://github.com/tc39/proposal-import-attributes
}


export async function writeAllSync(fd: number, data: string): Promise<number> {
  const b = Buffer.from(data)
  const l = b.byteLength
  let w = 0
  while (w < l) {
    try {
      w += writeSync(fd, b, w)
    } catch (error: any) {
      /* eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- ack */
      if (error.code !== 'EAGAIN') {
        throw error // forward
      }
      /* eslint-disable-next-line promise/avoid-new -- needed */
      await new Promise((resolve) => {
        setTimeout(resolve, 100)
      })
    }
  }
  return w
}


export function isString(v: any): v is string {
  return typeof v === 'string'
}

export function normalizePackageManifest(data: any, warn?: normalizePackageData.WarnFn): asserts data is normalizePackageData.Package {
  /* eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-member-access -- ack*/
  const oVersion = data.version

  /* eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- ack */
  normalizePackageData(data as normalizePackageData.Input, warn)

  if (isString(oVersion)) {
    // normalizer might have stripped version or sanitized it to SemVer -- we want the original
    /* eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, no-param-reassign -- ack */
    data.version = oVersion.trim()
  }
}

export function isNonNullable<T>(value: T): value is NonNullable<T> {
  // NonNullable: not null and not undefined
  return value !== null && value !== undefined
}

export interface ValidPackageJSON {
  name: string
  version: string
}

export interface PackageDescription<PJ = any> {
  path: string
  packageJson: NonNullable<PJ>
}

export function* makeToolCs(selfCTyp: CDX.Enums.ComponentType, builder: CDX.Builders.FromNodePackageJson.ComponentBuilder, logger: Console): Generator<CDX.Models.Component> {
  const packageJsonPaths: Array<[string, CDX.Enums.ComponentType]> = [
    // this plugin is an optional enhancement, not a standalone application -- use as `Library`
    [resolve(module.path, '..', 'package.json'), selfCTyp]
  ]

  const libs = [
    '@cyclonedx/cyclonedx-library'
  ].map(s => s.split('/', 2))
  const nodeModulePaths = require.resolve.paths('__some_none-native_package__') ?? []
  /* eslint-disable no-labels -- technically needed */
  libsLoop:
    for (const lib of libs) {
      for (const nodeModulePath of nodeModulePaths) {
        const packageJsonPath = resolve(nodeModulePath, ...lib, 'package.json')
        if (existsSync(packageJsonPath)) {
          packageJsonPaths.push([packageJsonPath, CDX.Enums.ComponentType.Library])
          continue libsLoop
        }
      }
    }
  /* eslint-enable no-labels */

  for (const [packageJsonPath, cType] of packageJsonPaths) {
    logger.info(LogPrefixes.INFO, 'try to build new Tool from PkgPath', packageJsonPath)
    /* eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- expected */
    const packageJson: PackageDescription['packageJson'] = loadJsonFile(packageJsonPath) ?? {}
    normalizePackageManifest(
      packageJson,
      w => {
        logger.debug(LogPrefixes.DEBUG, 'normalizePackageJson from PkgPath', packageJsonPath, 'caused:', w)
      }
    )
    const tool = builder.makeComponent(packageJson, cType)
    if (tool !== undefined) {
      yield tool
    }
  }
}

export class ValidationError extends Error {
  readonly details: any

  constructor(message: string, details: any) {
    super(message)
    /* eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- expected */
    this.details = details
  }
}

export const PACKAGE_MANIFEST_FILENAME = 'package.json'

export function getPackageDescription(ppath: string): PackageDescription<ValidPackageJSON> | undefined {
  if (!existsSync(ppath)) {
    return undefined
  }
  const isSubDirOfNodeModules = isSubDirectoryOfNodeModulesFolder(ppath)
  while (isAbsolute(ppath)) {
    const pathToPackageJson = join(ppath, PACKAGE_MANIFEST_FILENAME)
    if (existsSync(pathToPackageJson)) {
      try {
        /* eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- expected */
        const contentOfPackageJson: NonNullable<any> = loadJsonFile(pathToPackageJson) ?? {}
        // only look for valid candidate if we are in a node_modules subdirectory
        if (!isSubDirOfNodeModules || isValidPackageJSON(contentOfPackageJson)) {
          return {
            path: pathToPackageJson,
            /* eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- expected */
            packageJson: contentOfPackageJson
          }
        }
      } catch {
        return undefined
      }
    }

    const nextPath = dirname(ppath)
    if (nextPath === ppath || isNodeModulesFolder(nextPath)) {
      return undefined
    }
    ppath = nextPath /* eslint-disable-line  no-param-reassign -- ack */
  }
  return undefined
}

const NODE_MODULES_FOLDERNAME = 'node_modules'


function isNodeModulesFolder(path: string): boolean {
  return path.endsWith(`${sep}${NODE_MODULES_FOLDERNAME}`)
}

function isSubDirectoryOfNodeModulesFolder(path: string): boolean {
  return path.includes(`${sep}${NODE_MODULES_FOLDERNAME}${sep}`)
}


export function isValidPackageJSON(pkg: any): pkg is ValidPackageJSON {
  // checking for the existence of name and version properties
  // both are required for a valid package.json according to https://docs.npmjs.com/cli/v10/configuring-npm/package-json
  return isNonNullable(pkg)
    /* eslint-disable @typescript-eslint/no-unsafe-member-access -- false-positive */
    && typeof pkg.name === 'string'
    && typeof pkg.version === 'string'
  /* eslint-enable @typescript-eslint/no-unsafe-member-access */
}
