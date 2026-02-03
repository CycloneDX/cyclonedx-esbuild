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
Copyright (c) OWASP Foundation.
*/

import { existsSync, mkdirSync, openSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

import * as CDX from '@cyclonedx/cyclonedx-library'
import type * as esbuild from 'esbuild'

import { makeToolCs, ValidationError, writeAllSync } from './_helpers'
import { BomBuilder } from './builders'
import { LogPrefixes, makeConsoleLogger } from './logger'

/** @public */
export const PLUGIN_NAME = 'cyclonedx-esbuild'

/** @public */
export interface CycloneDxEsbuildPluginOptions {
  specVersion?: `${CDX.Spec.Version}` | CDX.Spec.Version
  outputFile?: string
  outputReproducible?: boolean
  gatherLicenseTexts?: boolean
  mcType?: `${CDX.Enums.ComponentType}` | CDX.Enums.ComponentType
  validate?: boolean | undefined
}

/** @public */
export const cyclonedxEsbuildPlugin = (
  opts: CycloneDxEsbuildPluginOptions = {}
): esbuild.Plugin => ({
  name: PLUGIN_NAME,
  setup(build: esbuild.PluginBuild): void {
    build.initialOptions.metafile = true

    const logger = makeConsoleLogger(
      process.stdout,
      process.stderr,
      LogLevelMap[build.initialOptions.logLevel ?? 'warning']
    )

    const options = {
      gatherLicenseTexts: opts.gatherLicenseTexts ?? false,
      outputReproducible: opts.outputReproducible ?? false,
      specVersion: opts.specVersion ?? CDX.Spec.Version.v1dot6,
      outputFile: opts.outputFile || 'bom.json',
      validate: opts.validate,
      mcType: opts.mcType ?? CDX.Enums.ComponentType.Application
    } as const

    const serializeSpec = CDX.Spec.SpecVersionDict[options.specVersion]
    if (!serializeSpec) {
      throw new Error(`Unknown specVersion: ${options.specVersion}`)
    }

    build.onEnd(async (result: esbuild.BuildResult): Promise<void> => {
      if (!result.metafile) {
        throw new Error('missing result.metafile')
      }

      logger.info(LogPrefixes.INFO, 'start build BOM ...')

      const bom = createBom(result, build, options, logger)
      await writeBom(bom, build, options, serializeSpec, logger)
    })
  }
})

/* -------------------------------------------------------------------------- */
/* Helpers                                                                     */
/* -------------------------------------------------------------------------- */

function createBom(
  result: esbuild.BuildResult,
  build: esbuild.PluginBuild,
  options: Readonly<CycloneDxEsbuildPluginOptions>,
  logger: ReturnType<typeof makeConsoleLogger>
): CDX.Models.Bom {
  const workingDir =
    build.initialOptions.absWorkingDir || process.cwd()

  const componentBuilder =
    new CDX.Builders.FromNodePackageJson.ComponentBuilder(
      new CDX.Factories.FromNodePackageJson.ExternalReferenceFactory(),
      new CDX.Factories.LicenseFactory()
    )

  const bomBuilder = new BomBuilder(
    componentBuilder,
    new CDX.Factories.FromNodePackageJson.PackageUrlFactory('npm'),
    new CDX.Utils.LicenseUtility.LicenseEvidenceGatherer()
  )

  const bom = bomBuilder.fromMetafile(
    result.metafile!,
    workingDir,
    options.gatherLicenseTexts ?? false,
    logger
  )

  bom.metadata.properties ||= new CDX.Models.PropertyRepository()
  bom.metadata.properties.add(
    new CDX.Models.Property(
      'cdx:reproducible',
      options.outputReproducible ? 'true' : 'false'
    )
  )

  bom.metadata.lifecycles.add(CDX.Enums.LifecyclePhase.Build)

  bom.metadata.tools.components.add(
    new CDX.Models.Component(
      CDX.Enums.ComponentType.Application,
      'esbuild',
      { version: build.esbuild?.version }
    )
  )

  for (const tool of makeToolCs(
    CDX.Enums.ComponentType.Library,
    componentBuilder,
    logger
  )) {
    bom.metadata.tools.components.add(tool)
  }

  bom.serialNumber = options.outputReproducible
    ? undefined
    : CDX.Utils.BomUtility.randomSerialNumber()

  bom.metadata.timestamp = options.outputReproducible
    ? undefined
    : new Date()

  if (bom.metadata.component) {
    bom.metadata.component.type =
      options.mcType as CDX.Enums.ComponentType
  }

  return bom
}

async function writeBom(
  bom: CDX.Models.Bom,
  build: esbuild.PluginBuild,
  options: Readonly<CycloneDxEsbuildPluginOptions>,
  serializeSpec: CDX.Spec.SpecVersion,
  logger: ReturnType<typeof makeConsoleLogger>
): Promise<void> {
  const serializer = new CDX.Serialize.JsonSerializer(
    new CDX.Serialize.JSON.Normalize.Factory(serializeSpec)
  )

  const serialized = serializer.serialize(bom, {
    sortLists: options.outputReproducible,
    space: 2
  })

  if (options.validate !== false) {
    const validator = new CDX.Validation.JsonStrictValidator(
      serializeSpec.version
    )
    const errors = await validator.validate(serialized)
    if (errors) {
      throw new ValidationError('Invalid BOM', errors)
    }
  }

  const outputPath = resolve(
    build.initialOptions.absWorkingDir || process.cwd(),
    build.initialOptions.outdir ||
      dirname(build.initialOptions.outfile ?? ''),
    options.outputFile ?? 'bom.json'
  )

  const outputDir = dirname(outputPath)
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true })
  }

  logger.log(LogPrefixes.LOG, 'writing BOM to', options.outputFile)
  await writeAllSync(openSync(outputPath, 'w'), serialized)
}

/**
 * from esbuild.LogLevel to logger level
 */
const LogLevelMap: Record<esbuild.LogLevel, number> = {
  silent: 0,
  error: 1,
  warning: 1,
  info: 2,
  debug: 3,
  verbose: 4
}
