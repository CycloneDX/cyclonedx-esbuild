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

import {existsSync, mkdirSync, openSync} from "node:fs"
import {dirname, resolve} from "node:path"

import { Utils as BomUtils } from "@cyclonedx/cyclonedx-library/Contrib/Bom"
import {
  Builders as FromNodePackageJsonBuilders,
  Factories as FromNodePackageJsonFactories
} from "@cyclonedx/cyclonedx-library/Contrib/FromNodePackageJson"
import {
  Factories as LicenseFactories,
  Utils as LicenseUtils
} from "@cyclonedx/cyclonedx-library/Contrib/License"
import { ComponentType } from "@cyclonedx/cyclonedx-library/Enums"
import type { Types as SerializeTypes } from "@cyclonedx/cyclonedx-library/Serialize"
import { JSON as SerializeJSON, JsonSerializer } from "@cyclonedx/cyclonedx-library/Serialize"
import { SpecVersionDict, Version as SpecVersion} from "@cyclonedx/cyclonedx-library/Spec"
import { JsonStrictValidator, MissingOptionalDependencyError } from "@cyclonedx/cyclonedx-library/Validation"
import {Argument, Command, Option} from "commander"
import type * as esbuild from 'esbuild'
import spdxExpressionParse from "spdx-expression-parse"

import {loadJsonFile, makeToolCs, ValidationError, writeAllSync} from "./_helpers"
import {BomBuilder} from "./builders"
import {PackageUrlFactory} from "./factories"
import {LogPrefixes, makeConsoleLogger} from "./logger"


const OutputStdOut = '-'

interface CommandOptions {
  esbuildWorkingDir: string,
  gatherLicenseTexts: boolean
  outputReproducible: boolean
  specVersion: SpecVersion
  outputFile: string
  validate: boolean | undefined
  mcType: ComponentType
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
      'Search for license files in components and include them as license evidence.'
    ).default(false)
  ).addOption(
    new Option(
      '--sv, --spec-version <version>',
      'Which version of CycloneDX spec to use.'
    ).choices(
      Object.keys(SpecVersionDict).sort()
    ).default(
      SpecVersion.v1dot6
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
        ComponentType.Application,
        ComponentType.Firmware,
        ComponentType.Library
      ].sort()
    ).default(ComponentType.Application)
  ).addOption(
    new Option(
      '-v, --verbose',
      'Increase the verbosity of messages.\n' +
      'Use multiple times to increase the verbosity even more.'
    ).argParser<number>(
      (_, previous) => previous + 1
    ).default(1)
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


/** @internal */
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

  const serializeSpec = SpecVersionDict[options.specVersion]
  if (serializeSpec === undefined) {
    throw new Error(`Unknown specVersion: ${options.specVersion}`)
  }

  const metafile = program.args[0]
  /* eslint-disable @typescript-eslint/strict-boolean-expressions -- need to handle empty string */
  if (!metafile || !existsSync(metafile)) {
    throw new Error(`Missing metafile: ${metafile || '<no input>'}`)
  }
  /* eslint-enable @typescript-eslint/strict-boolean-expressions */

  const cdxComponentBuilder = new FromNodePackageJsonBuilders.ComponentBuilder(
    new FromNodePackageJsonFactories.ExternalReferenceFactory(),
    new LicenseFactories.LicenseFactory(spdxExpressionParse)
  )
  const bomBuilder = new BomBuilder(
    cdxComponentBuilder,
    new PackageUrlFactory(),
    new LicenseUtils.LicenseEvidenceGatherer(),
  )

  // region make BOM
  const bom = bomBuilder.fromMetafile(
    /* eslint-disable-next-line  @typescript-eslint/no-unsafe-type-assertion -- ack */
    loadJsonFile(metafile) as esbuild.Metafile,
    options.esbuildWorkingDir,
    options.gatherLicenseTexts,
    logger)
  for (const toolC of makeToolCs(ComponentType.Application, cdxComponentBuilder, logger)) {
    bom.metadata.tools.components.add(toolC)
  }
  bom.serialNumber = options.outputReproducible
    ? undefined
    : BomUtils.randomSerialNumber()
  bom.metadata.timestamp = options.outputReproducible
    ? undefined
    : new Date()
  if (bom.metadata.component !== undefined) {
    bom.metadata.component.type = options.mcType
  }
  // endregion make BOM

  const serializer = new JsonSerializer(
    new SerializeJSON.Normalize.Factory(serializeSpec))
  const serializeOptions: SerializeTypes.SerializerOptions & SerializeTypes.NormalizerOptions = {
    sortLists: options.outputReproducible,
    space: 2 // TODO add option to have this configurable
  }
  const serialized = serializer.serialize(bom, serializeOptions)

  if (options.validate !== false) {
    const validator = new JsonStrictValidator(serializeSpec.version)
    try {
      /* eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- expected */
      const validationErrors = await validator.validate(serialized)
      if (validationErrors !== null) {
        logger.debug(LogPrefixes.DEBUG, 'BOM result invalid. details:', validationErrors)
        throw new ValidationError(
          `Failed to generate valid BOM"\n` +
          'Please report the issue and provide the npm lock file of the current project to:\n' +
          'https://github.com/CycloneDX/cyclonedx-esbuild/issues/new?template=ValidationError-report.md&labels=ValidationError&title=%5BValidationError%5D',
          validationErrors
        )
      }
    } catch (err) {
      if (err instanceof MissingOptionalDependencyError && !options.validate) {
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

const enum ExitCode {
  SUCCESS = 0,
  FAILURE = 1,
  INVALID = 2
}
