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

import * as CDX from "@cyclonedx/cyclonedx-library";
import {Argument, Command, Option} from 'commander'
import type * as esbuild from 'esbuild';

import {loadJsonFile, makeToolCs, ValidationError, writeAllSync} from "./_helpers";
import {BomBuilder} from "./builders";
import {LogPrefixes, makeConsoleLogger} from "./logger";

const OutputStdOut = '-'

interface CommandOptions {
  esbuildWorkingDir: string,
  gatherLicenseTexts: boolean
  outputReproducible: boolean
  specVersion: CDX.Spec.Version
  outputFile: string
  validate: boolean | undefined
  mcType: CDX.Enums.ComponentType
  verbose: number
}

function makeCommand(process_: NodeJS.Process): Command {
  return new Command(
    /* auto-set the name */
  ).description(
    'Create CycloneDX Software Bill of Materials (SBOM) from esbuild metafile.'
  ).addOption(
    new Option(
      '--ewd, --esbuild-working-dir',
      'Working dir used in the esbuild process.'
    ).default(
      process_.cwd(),
      'current working dir'
    )
  ).addOption(
    new Option(
      '--gather-license-texts',
      'Search for license files in components and include them as license evidence.' +
      '\nThis feature is experimental.'
    ).default(false)
  ).addOption(
    new Option(
      '--sv, --spec-version <version>',
      'Which version of CycloneDX spec to use.'
    ).choices(
      Object.keys(CDX.Spec.SpecVersionDict).sort()
    ).default(
      CDX.Spec.Version.v1dot6
    )
  ).addOption(
    new Option(
      '--output-reproducible',
      'Whether to go the extra mile and make the output reproducible.\n' +
      'This requires more resources, and might result in loss of time- and random-based-values.'
    ).env(
      'BOM_REPRODUCIBLE'
    )
  ).addOption(
    new Option(
      '-o, --output-file <file>',
      'Path to the output file.\n' +
      `Set to "${OutputStdOut}" to write to STDOUT.`
    ).default(
      OutputStdOut,
      'write to STDOUT'
    )
  ).addOption(
    new Option(
      '--validate',
      'Validate resulting BOM before outputting.\n' +
      'Validation is skipped, if requirements not met. See the README.'
    ).default(undefined)
  ).addOption(
    new Option(
      '--no-validate',
      'Disable validation of resulting BOM.'
    )
  ).addOption(
    new Option(
      '--mc-type <type>',
      'Type of the main component.'
    ).choices(
      // Object.values(Enums.ComponentType) -- use all possible values
      [ // for the NPM context only the following make sense:
        CDX.Enums.ComponentType.Application,
        CDX.Enums.ComponentType.Firmware,
        CDX.Enums.ComponentType.Library
      ].sort()
    ).default(CDX.Enums.ComponentType.Application)
  ).addOption(
    new Option(
      '-v, --verbose',
      'Increase the verbosity of messages.\n' +
      'Use multiple times to increase the verbosity even more.'
    ).argParser<number>(
      (_, previous) => previous + 1
    ).default(0)
  ).addArgument(
    new Argument(
      '<metafile>',
      'Path to esbuild metafile'
    )
  ).version(
    // that is supposed to be the last option in the list on the help page.
    /* eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion, @typescript-eslint/no-unsafe-member-access -- ack */
    loadJsonFile(resolve(__dirname, '..', 'package.json')).version as string
  ).allowExcessArguments(
    false
  )
}


const enum ExitCode {
  SUCCESS = 0,
  FAILURE = 1,
  INVALID = 2
}

/** @internal **/

/* eslint-disable-next-line complexity -- TODO  */
export async function run(process_: NodeJS.Process): Promise<number> {
  process_.title = 'cyclonedx-esbuild' /* eslint-disable-line  no-param-reassign -- ack */

  const program = makeCommand(process_)
  program.parse(process_.argv)

  const options: CommandOptions = program.opts()
  // all output shall be bound to stdError - stdOut is for result output only
  const logger = makeConsoleLogger(process_.stderr, process_.stderr, options.verbose)
  logger.debug(`${LogPrefixes.DEBUG} options: %j`, options)
  logger.debug(`${LogPrefixes.DEBUG} args: %j`, program.args)

  const serializeSpec = CDX.Spec.SpecVersionDict[options.specVersion]
  if (serializeSpec === undefined) {
    throw new Error(`Unknown specVersion: ${options.specVersion}`)
  }

  const metafile = program.args[0]
  /* eslint-disable @typescript-eslint/strict-boolean-expressions -- need to handle empty string */
  if (!metafile || !existsSync(metafile)) {
    throw new Error(`Missing metafile: ${metafile || '<no input>'}`)
  }
  /* eslint-enable @typescript-eslint/strict-boolean-expressions */

  const cdxComponentBuilder = new CDX.Builders.FromNodePackageJson.ComponentBuilder(
    new CDX.Factories.FromNodePackageJson.ExternalReferenceFactory(),
    new CDX.Factories.LicenseFactory()
  )
  const bomBuilder = new BomBuilder(
    cdxComponentBuilder,
    new CDX.Factories.FromNodePackageJson.PackageUrlFactory('npm'),
    new CDX.Utils.LicenseUtility.LicenseEvidenceGatherer(),
  )

  // region make BOM
  const bom = bomBuilder.fromMetafile(
    /* eslint-disable-next-line  @typescript-eslint/no-unsafe-type-assertion -- ack */
    loadJsonFile(metafile) as esbuild.Metafile,
    options.esbuildWorkingDir,
    options.gatherLicenseTexts,
    logger)
  for (const toolC of makeToolCs(CDX.Enums.ComponentType.Application, cdxComponentBuilder, logger)) {
    bom.metadata.tools.components.add(toolC)
  }
  bom.serialNumber = options.outputReproducible
    ? undefined
    : CDX.Utils.BomUtility.randomSerialNumber()
  bom.metadata.timestamp = options.outputReproducible
    ? undefined
    : new Date()
  if (bom.metadata.component !== undefined) {
    bom.metadata.component.type = options.mcType
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
          `Failed to generate valid BOM"\n` +
          'Please report the issue and provide the npm lock file of the current project to:\n' +
          'https://github.com/CycloneDX/cyclonedx-TODO/issues/new?template=ValidationError-report.md&labels=ValidationError&title=%5BValidationError%5D',
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

  let outputFD: number = process_.stdout.fd
  if (options.outputFile !== OutputStdOut) {
    const outputFPn = resolve(process_.cwd(), options.outputFile)
    logger.debug(LogPrefixes.DEBUG, 'outputFPn:', outputFPn)
    const outputFDir = dirname(outputFPn)
    if (!existsSync(outputFDir)) {
      logger.info(LogPrefixes.INFO, 'creating directory', outputFDir)
      mkdirSync(outputFDir, {recursive: true})
    }
    outputFD = openSync(outputFPn, 'w')
  }
  logger.log(`${LogPrefixes.LOG} writing BOM to: %s`, options.outputFile)
  const written = await writeAllSync(outputFD, serialized)
  logger.info(`${LogPrefixes.INFO} wrote %d bytes to: %s`, written, options.outputFile)

  return written > 0
    ? ExitCode.SUCCESS
    : ExitCode.FAILURE
}
