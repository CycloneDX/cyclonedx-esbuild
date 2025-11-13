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

import {existsSync, mkdirSync, openSync} from "node:fs";
import {dirname, resolve} from "node:path";

import * as CDX from "@cyclonedx/cyclonedx-library"
import type * as esbuild from 'esbuild';

import {makeToolCs, ValidationError, writeAllSync} from "./_helpers";
import {BomBuilder} from "./builders";
import {LogPrefixes, makeConsoleLogger} from "./logger";

/** @public */
export const PLUGIN_NAME = 'cyclonedx-esbuild'

/** @public */
export interface CycloneDxEsbuildPluginOptions {
  // IMPORTANT: keep the table in the `README` in sync!

  /**
   * Which version of {@link https://github.com/CycloneDX/specification | CycloneDX spec} to use.
   *
   * @defaultValue `"1.6"`
   */
  specVersion?: `${CDX.Spec.Version}` | CDX.Spec.Version

  /**
   * Path to the output file.
   *
   * @remarks
   *
   * Specifies a relative file path that will be resolved into an absolute path based on the build configuration.
   * ```js
   * path.resolve(
   *   build.initialOptions.absWorkingDir || process.cwd(),
   *   build.initialOptions.outdir || dirname(build.initialOptions.outfile ?? ''),
   *   outputFile
   * )
   * ```
   *
   * @defaultValue `"bom.json"`
   */
  outputFile?: string

  /**
   * Whether to go the extra mile and make the output reproducible.
   * This requires more resources, and might result in loss of time- and random-based-values.
   *
   * @defaultValue `false`
   */
  outputReproducible?: boolean

  /**
   * Search for license files in components and include them as license evidence.
   * This feature is experimental.
   *
   * @defaultValue `false`
   */
  gatherLicenseTexts?: boolean

  /**
   * Set the MainComponent's type.
   * See {@link https://cyclonedx.org/docs/1.7/json/#metadata_component_type | the list of valid values}.
   *
   * @defaultValue `"application"`
   */
  mcType?: `${CDX.Enums.ComponentType}` | CDX.Enums.ComponentType

  /**
   * Validate resulting BOM before outputting.
   * Validation is skipped, if requirements not met. See the README.
   *
   * @remarks
   *
   * If `false`, then the system will try to validate the BOM result whatsoever.
   * If `true`, then the system will try to validate the BOM result whatsoever.
   * If `undefined`, then the system will try to validate the BOM result only if the needed dependencies are installed.
   *
   * @defaultValue `undefined`
   */
  validate?: boolean | undefined
}

/** @public */
export const cyclonedxEsbuildPlugin = (opts: CycloneDxEsbuildPluginOptions = {}): esbuild.Plugin => ({
  name: PLUGIN_NAME,
  setup(build: esbuild.PluginBuild): void {
    /* eslint-disable-next-line no-param-reassign -- required */
    build.initialOptions.metafile = true;

    const logger = makeConsoleLogger(process.stdout, process.stderr,
      LogLevelMap[build.initialOptions.logLevel ?? 'warning'] // er act on build-level, so we default alike
    )

    logger.debug(`${LogPrefixes.DEBUG} setup => opt: %j`, opts)
    const options = {
      gatherLicenseTexts: opts.gatherLicenseTexts ?? false,
      outputReproducible: opts.outputReproducible ?? false,
      specVersion: opts.specVersion ?? CDX.Spec.Version.v1dot6,
      /* eslint-disable-next-line  @typescript-eslint/prefer-nullish-coalescing, @typescript-eslint/strict-boolean-expressions -- need to handle empty strings */
      outputFile: opts.outputFile || 'bom.json',
      validate: opts.validate,
      mcType: opts.mcType ?? CDX.Enums.ComponentType.Application
    } as const satisfies CycloneDxEsbuildPluginOptions
    logger.debug(`${LogPrefixes.DEBUG} setup => options: %j`, options)

    const serializeSpec = CDX.Spec.SpecVersionDict[options.specVersion]
    if (serializeSpec === undefined) {
      throw new Error(`Unknown specVersion: ${options.specVersion}`)
    }

    /* eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing, @typescript-eslint/strict-boolean-expressions -- need to handle empty strings */
    const esbuildWorkingDir = build.initialOptions.absWorkingDir || process.cwd()


    build.onEnd(async (result: esbuild.BuildResult): Promise<void> => {
      if (result.metafile === undefined) {
        /* c8 ignore next */
        throw new Error('missing result.metafile')
      }
      logger.info(LogPrefixes.INFO, 'start build BOM ...')

      const cdxExternalReferenceFactory = new CDX.Factories.FromNodePackageJson.ExternalReferenceFactory()
      const cdxLicenseFactory = new CDX.Factories.LicenseFactory()
      const cdxComponentBuilder = new CDX.Builders.FromNodePackageJson.ComponentBuilder(cdxExternalReferenceFactory, cdxLicenseFactory)
      const bomBuilder = new BomBuilder(
        cdxComponentBuilder,
        new CDX.Factories.FromNodePackageJson.PackageUrlFactory('npm'),
        new CDX.Utils.LicenseUtility.LicenseEvidenceGatherer()
      )

      // region make BOM
      const bom = bomBuilder.fromMetafile(
        result.metafile,
        esbuildWorkingDir,
        options.gatherLicenseTexts,
        logger)
      bom.metadata.lifecycles.add(CDX.Enums.LifecyclePhase.Build)
      // TODO bom.metadata.component
      bom.metadata.tools.components.add(new CDX.Models.Component(
        CDX.Enums.ComponentType.Application,
        'esbuild',
        {version: build.esbuild.version}
      ))
      for (const toolC of makeToolCs(CDX.Enums.ComponentType.Library, cdxComponentBuilder, logger)) {
        bom.metadata.tools.components.add(toolC)
      }
      bom.serialNumber = options.outputReproducible
        ? undefined
        : CDX.Utils.BomUtility.randomSerialNumber()
      bom.metadata.timestamp = options.outputReproducible
        ? undefined
        : new Date()
      if (bom.metadata.component !== undefined) {
        /* eslint-disable-next-line  @typescript-eslint/no-unsafe-type-assertion -- ack */
        bom.metadata.component.type = options.mcType as CDX.Enums.ComponentType
      }
      // endregion make BOM

      const serializer = new CDX.Serialize.JsonSerializer(
        new CDX.Serialize.JSON.Normalize.Factory(serializeSpec))
      const serializeOptions: CDX.Serialize.Types.SerializerOptions & CDX.Serialize.Types.NormalizerOptions = {
        sortLists: options.outputReproducible,
        space: 2 // TODO add option to have this configurable
      }
      const serialized = serializer.serialize(bom, serializeOptions)

      if (options.validate !== false) {
        const validator = new CDX.Validation.JsonStrictValidator(serializeSpec.version)
        try {
          /* eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- expected */
          const validationErrors = await validator.validate(serialized)
          if (validationErrors !== null) {
            logger.debug(LogPrefixes.DEBUG, 'BOM result invalid. details:', validationErrors)
            throw new ValidationError(
              `Failed to generate valid BOM "${options.outputFile}"\n` +
              'Please report the issue and provide the npm lock file of the current project to:\n' +
              'https://github.com/CycloneDX/cyclonedx-esbuild/issues/new?template=ValidationError-report.md&labels=ValidationError&title=%5BValidationError%5D',
              validationErrors
            )
          }
        } catch (err) {
          if (err instanceof CDX.Validation.MissingOptionalDependencyError && !options.validate) {
            logger.info(LogPrefixes.INFO, 'skipped validate BOM:', err.message)
          } else {
            logger.error(LogPrefixes.ERROR, 'unexpected error')
            throw err
          }
        }
      }

      const outputFPn = resolve(
        esbuildWorkingDir,
        /* eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing, @typescript-eslint/strict-boolean-expressions -- need to handle empty strings */
        build.initialOptions.outdir || dirname(build.initialOptions.outfile ?? ''),
        options.outputFile)
      logger.debug(LogPrefixes.DEBUG, 'outputFPn:', outputFPn)
      const outputFDir = dirname(outputFPn)
      if (!existsSync(outputFDir)) {
        logger.info(LogPrefixes.INFO, 'creating directory', outputFDir)
        mkdirSync(outputFDir, {recursive: true})
      }
      logger.log(LogPrefixes.LOG, 'writing BOM to', options.outputFile)
      const written = await writeAllSync(openSync(outputFPn, 'w'), serialized);
      logger.info(LogPrefixes.INFO, 'wrote %d bytes to %s', written, options.outputFile)
    });
  }
})

const LogLevelMap: Record<esbuild.LogLevel, number> = {
  'silent': -1,
  'error': 0,
  'warning': 0,
  'info': 2,
  'debug': 3,
  'verbose': 4,
}
