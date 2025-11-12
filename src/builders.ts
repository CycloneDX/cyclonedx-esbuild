/*!
TODO LICENSE HEADER
*/

import {dirname, resolve} from "node:path";

import * as CDX from "@cyclonedx/cyclonedx-library";
import type * as esbuild from "esbuild";

import {getPackageDescription, normalizePackageManifest, type PackageDescription} from "./_helpers";
import {LogPrefixes} from "./logger";

export class BomBuilder {

  readonly componentBuilder: CDX.Builders.FromNodePackageJson.ComponentBuilder
  readonly purlFactory: CDX.Factories.FromNodePackageJson.PackageUrlFactory
  readonly leGatherer: CDX.Utils.LicenseUtility.LicenseEvidenceGatherer

  constructor(
    componentBuilder: CDX.Builders.FromNodePackageJson.ComponentBuilder,
    purlFactory: CDX.Factories.FromNodePackageJson.PackageUrlFactory,
    leFetcher: CDX.Utils.LicenseUtility.LicenseEvidenceGatherer
  ) {
    this.componentBuilder = componentBuilder
    this.purlFactory = purlFactory
    this.leGatherer = leFetcher
  }

  public fromMetafile(metafile: esbuild.Metafile, buildWorkingDir: string, collectEvidence: boolean, logger: Console): CDX.Models.Bom {
    logger.debug(LogPrefixes.DEBUG, `metafile:`, metafile)
    const bom = new CDX.Models.Bom()

    logger.info(LogPrefixes.INFO, 'generating components...')
    const components = this.generateComponents(buildWorkingDir, metafile, collectEvidence, logger)
    const rcPath = getPackageDescription(buildWorkingDir)?.path
      ?? buildWorkingDir
    const mainComponent = components.get(rcPath)
    if (undefined !== mainComponent) {
      logger.debug(LogPrefixes.DEBUG, 'set bom.metadata.component', mainComponent)
      bom.metadata.component = mainComponent
      components.delete(rcPath)
    }
    for (const component of new Set(components.values())) {
      logger.debug(LogPrefixes.DEBUG, `add to bom.components`, component)
      bom.components.add(component)
    }

    return bom
  }

  public* getLicenseEvidence(packageDir: string, logger: Console): Generator<CDX.Models.License> {
    const files = this.leGatherer.getFileAttachments(
      packageDir,
      (error: Error): void => {
        /* c8 ignore next 2 */
        logger.info(LogPrefixes.INFO, error.message)
        logger.debug(LogPrefixes.DEBUG, error.message, error)
      }
    )
    try {
      for (const {file, text} of files) {
        yield new CDX.Models.NamedLicense(`file: ${file}`, {text})
      }
    }
      /* c8 ignore next 3 */ catch (e) {
      // generator will not throw before first `.nest()` is called ...
      logger.warn(LogPrefixes.WARN, 'collecting license evidence in', packageDir, 'failed:', e)
    }
  }

  private generateComponents(rootDir: string, metafile: esbuild.Metafile, collectEvidence: boolean, logger: Console): Map<string, CDX.Models.Component> {
    const pkgs = new Map<string, CDX.Models.Component>
    const components = new Map<string, CDX.Models.Component>

    const modulePaths = new Set<string>()
    for (const {inputs, entryPoint} of Object.values(metafile.outputs)) {
      if (entryPoint !== undefined) {
        modulePaths.add(entryPoint)
      }
      for (const [filePath, {bytesInOutput}] of Object.entries(inputs)) {
        if (bytesInOutput > 0) {
          modulePaths.add(filePath)
        }
      }
    }
    logger.debug(LogPrefixes.DEBUG, `used modulePaths:`, modulePaths)

    logger.info(LogPrefixes.INFO, 'start building Components from modules...')
    for (const modulePath of modulePaths) {
      const pkg = getPackageDescription(resolve(rootDir, modulePath))
      if (pkg === undefined) {
        logger.debug('skipped package for', modulePath)
        continue
      }
      let component = pkgs.get(pkg.path)
      if (component === undefined) {
        logger.info(LogPrefixes.INFO, 'try to build new Component from PkgPath:', pkg.path)
        try {
          component = this.makeComponent(pkg, collectEvidence, logger)
        } catch (err) {
          logger.debug(LogPrefixes.DEBUG, 'unexpected error:', err)
          logger.warn(LogPrefixes.WARN, 'skipped Component from PkgPath', pkg.path)
          continue
        }
        logger.debug(LogPrefixes.DEBUG, 'built', component, 'based on', pkg, 'for modulePaths', modulePaths)
        pkgs.set(pkg.path, component)
      }
      components.set(modulePath, component)
    }

    logger.info(LogPrefixes.INFO, `linking Component.dependencies...`)
    this.linkDependencies(metafile, components)

    logger.log(LogPrefixes.LOG, 'done building Components from modules...')
    return pkgs
  }

  /* @ts-expect-error TS6133: -- TODO */
  private linkDependencies(metafile: esbuild.Metafile, modulesComponents: Map<string, CDX.Models.Component>): void {
    // TODO: link deps based on inputs ...
    // idea: take the metadata.input
    // then cut the "externals" and copy their content to all the ones that used it
    // then cut the "unknown" and copy their content to all the ones that used it
    // the rest should all be known components -> so set their dependencies as expected
  }

  /**
   * @throws {@link Error} when no component could be fetched
   */
  private makeComponent(pkg: PackageDescription, collectEvidence: boolean, logger: Console): CDX.Models.Component {
    try {
      // work with a deep copy, because `normalizePackageManifest()` might modify the data
      /* eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- ach */
      const _packageJson = structuredClone(pkg.packageJson)
      normalizePackageManifest(_packageJson)
      pkg.packageJson = _packageJson /* eslint-disable-line  no-param-reassign -- intended  */
    } catch (e) {
      logger.warn(LogPrefixes.WARN, 'normalizePackageJson from PkgPath', pkg.path, 'failed:', e)
    }

    /* eslint-disable-next-line  @typescript-eslint/no-unsafe-argument -- ack */
    const component = this.componentBuilder.makeComponent(pkg.packageJson)
    if (component === undefined) {
      throw new Error(`failed building Component from PkgPath ${pkg.path}`)
    }

    component.licenses.forEach(l => {
      /* eslint-disable no-param-reassign -- intended */
      l.acknowledgement = CDX.Enums.LicenseAcknowledgement.Declared
      /* eslint-enable no-param-reassign -- intended */
    })

    if (collectEvidence) {
      component.evidence = new CDX.Models.ComponentEvidence({
        licenses: new CDX.Models.LicenseRepository(this.getLicenseEvidence(dirname(pkg.path), logger))
      })
    }

    component.purl = this.purlFactory.makeFromComponent(component)
    component.bomRef.value = component.purl?.toString()

    return component
  }
}
