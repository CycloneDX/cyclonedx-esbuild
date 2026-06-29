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

import { dirname, resolve } from "node:path";

import type { Builders as FromNodePackageJsonBuilders } from "@cyclonedx/cyclonedx-library/Contrib/FromNodePackageJson"
import type { Utils as LicenseUtils } from "@cyclonedx/cyclonedx-library/Contrib/License"
import { ComponentScope, ComponentType, LicenseAcknowledgement } from "@cyclonedx/cyclonedx-library/Enums"
import type { License } from "@cyclonedx/cyclonedx-library/Models"
import {
  Bom,
  Component,
  ComponentEvidence,
  LicenseRepository,
  NamedLicense,
  Property,
  PropertyRepository,
} from "@cyclonedx/cyclonedx-library/Models"
import type * as esbuild from "esbuild"
import type normalizePackageData from "normalize-package-data"

import type { PackageDescription } from "./_helpers";
import {
  getPackageConfig,
  mkRelativePath,
  mkRelativePathReproducibleHash,
  normalizePackageManifest,
} from "./_helpers";
import type { PackageUrlFactory } from "./factories";
import { LogPrefixes } from "./logger";
import { PropertyNames, PropertyValueBool } from "./properties";

export class BomBuilder {

  readonly componentBuilder: FromNodePackageJsonBuilders.ComponentBuilder
  readonly purlFactory: PackageUrlFactory
  readonly leGatherer: LicenseUtils.LicenseEvidenceGatherer

  constructor(
    componentBuilder: BomBuilder['componentBuilder'],
    purlFactory: BomBuilder['purlFactory'],
    leFetcher: BomBuilder['leGatherer']
  ) {
    this.componentBuilder = componentBuilder
    this.purlFactory = purlFactory
    this.leGatherer = leFetcher
  }

  /* eslint-disable-next-line @typescript-eslint/max-params -- ack */
  public fromMetafile(
    metafile: esbuild.Metafile,
    buildWorkingDir: string,
    collectEvidence: boolean,
    outputReproducible: boolean,
    logger: Console
  ): Bom {
    logger.debug(LogPrefixes.DEBUG, 'metafile:', metafile)
    const bom = new Bom()

    logger.info(LogPrefixes.INFO, 'generating components...')
    const [mainComponent, componentsPkg, componentsVrt] = this.generateComponents(buildWorkingDir, metafile, collectEvidence, logger)
    if ( outputReproducible ) {
      componentsPkg.forEach((component, pkgPath) => {
        /* eslint-disable-next-line no-param-reassign -- ack */
        component.bomRef.value = mkRelativePathReproducibleHash(buildWorkingDir, pkgPath)
      })
    }

    for (const component of componentsPkg.values()) {
      logger.debug(LogPrefixes.DEBUG, 'add to bom.components', component)
      bom.components.add(component)
    }
    for (const component of componentsVrt.values()) {
      logger.debug(LogPrefixes.DEBUG, 'add to bom.components', component)
      bom.components.add(component)
    }

    if (undefined !== mainComponent) {
      mainComponent.scope = undefined
      logger.debug(LogPrefixes.DEBUG, 'set bom.metadata.component', mainComponent)
      bom.metadata.component = mainComponent
      bom.components.delete(mainComponent)
    }

    return bom
  }

  public* getLicenseEvidence(packageDir: string, logger: Console): Generator<License> {
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
        yield new NamedLicense(`file: ${file}`, {text})
      }
    }
      /* c8 ignore next 3 */ catch (e) {
      // generator will not throw before first `.next()` is called ...
      logger.warn(LogPrefixes.WARN, 'collecting license evidence in', packageDir, 'failed:', e)
    }
  }

  private generateComponents(
    rootDir: string,
    metafile: esbuild.Metafile,
    collectEvidence: boolean,
    logger: Console
  ): [Component | undefined, Map<string, Component | DummyComponent>, Map<string, VirtualComponent>] {
    const pkgs = new Map<string, Component | DummyComponent>
    const vrts = new Map<string, VirtualComponent>
    const components = new Map<string, Component>

    const mainPkg = getPackageConfig(rootDir)
    let mainComponent: Component | undefined = undefined
    if (mainPkg !== undefined) {
      try {
        mainComponent = this.makeComponent(mainPkg, collectEvidence, logger)
      } catch (err) {
        logger.debug(LogPrefixes.DEBUG, 'unexpected error:', err)
        logger.warn(LogPrefixes.WARN, 'building new DummyComponent from PkgPath', mainPkg.path)
        mainComponent = new DummyComponent(mkRelativePath(rootDir, mainPkg.path))
      }
      logger.debug(LogPrefixes.DEBUG, 'built', mainComponent, 'based on', mainPkg, 'for rootDir', rootDir)
      pkgs.set(mainPkg.path, mainComponent)
    }

    const modulePathsRequired = new Map<string, boolean>()
    for (const {inputs} of Object.values(metafile.outputs)) {
      for (const [filePath, {bytesInOutput}] of Object.entries(inputs)) {
        const _ov = modulePathsRequired.get(filePath)
        if (_ov === undefined) {
          modulePathsRequired.set(filePath, bytesInOutput > 0)
        } else if (bytesInOutput > 0) {
          modulePathsRequired.set(filePath, true)
        }
      }
    }
    logger.debug(LogPrefixes.DEBUG, 'used modulePathsRequired:', modulePathsRequired)

    logger.info(LogPrefixes.INFO, 'start building Components from modules...')
    for (const [modulePath, moduleRequired] of modulePathsRequired) {
      /* eslint-disable-next-line @typescript-eslint/init-declarations -- ack */
      let component: Component | undefined
      const pkg = getPackageConfig(resolve(rootDir, modulePath))
      if (pkg === undefined) {
        component = vrts.get(modulePath)
        if (component === undefined) {
          logger.info(LogPrefixes.INFO, 'building new VirtualComponent for modulePath:', modulePath)
          component = new VirtualComponent(modulePath)
          // TODO: see if we can pull the associated plugin from the virtual's namespace
          // see https://esbuild.github.io/plugins/
          logger.debug(LogPrefixes.DEBUG, 'built', component, 'as virtual for modulePath', modulePath)
          vrts.set(modulePath, component)
          if (!moduleRequired) {
            component.scope = ComponentScope.Excluded
          }
        }
      } else {
        component = pkgs.get(pkg.path)
        if (component === undefined) {
          logger.info(LogPrefixes.INFO, 'try to build new Component from PkgPath:', pkg.path)
          try {
            component = this.makeComponent(pkg, collectEvidence, logger)
          } catch (err) {
            logger.debug(LogPrefixes.DEBUG, 'unexpected error:', err)
            logger.warn(LogPrefixes.WARN, 'building new DummyComponent from PkgPath', pkg.path)
            component = new DummyComponent(mkRelativePath(rootDir, pkg.path))
          }
          logger.debug(LogPrefixes.DEBUG, 'built', component, 'based on', pkg, 'for modulePath', modulePath)
          pkgs.set(pkg.path, component)
          if (!moduleRequired) {
            component.scope = ComponentScope.Excluded
          }
        }
      }

      if (moduleRequired) {
        component.scope = ComponentScope.Required
      }
      components.set(modulePath, component)
    }

    logger.info(LogPrefixes.INFO, 'linking Components dependencies...')
    this.linkDependencies(rootDir, metafile, mainComponent, components, logger)

    logger.info(LogPrefixes.INFO, 'done building Components from modules...')
    return [mainComponent, pkgs, vrts]
  }

  /* eslint-disable-next-line @typescript-eslint/max-params -- ack */
  private linkDependencies(
    /* @ts-expect-error TS6133 -- TODO */
    rootDir: string,
    /* @ts-expect-error TS6133 -- TODO */
    metafile: esbuild.Metafile,
    /* @ts-expect-error TS6133 -- TODO */
    mainComponent: Component | undefined,
    /* @ts-expect-error TS6133 -- TODO */
    moduleComponents: Map<string, Component>,
    /* @ts-expect-error TS6133 -- TODO */
    logger: Console
  ): void {
    // TODO: link deps based on inputs - https://github.com/CycloneDX/cyclonedx-esbuild/issues/11
    // idea: take the metadata.input
    // then cut the "externals" and copy their content to all the ones that used it
    // then cut the "unknown" and copy their content to all the ones that used it
    // the rest should all be known components -> so set their dependencies as expected
  }

  /**
   * @throws {@link Error} when no component could be fetched
   */
  private makeComponent(pkg: PackageDescription, collectEvidence: boolean, logger: Console): Component {
    try {
      // work with a deep copy, because `normalizePackageManifest()` might modify the data
      /* eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- ach */
      const _packageJson = structuredClone(pkg.packageJson)
      normalizePackageManifest(_packageJson)
      pkg.packageJson = _packageJson /* eslint-disable-line no-param-reassign -- intended */
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
      l.acknowledgement = LicenseAcknowledgement.Declared
      /* eslint-enable no-param-reassign -- intended */
    })

    if (collectEvidence) {
      component.evidence = new ComponentEvidence({
        licenses: new LicenseRepository(this.getLicenseEvidence(dirname(pkg.path), logger))
      })
    }

    /* eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion -- ack */
    component.purl = this.purlFactory.makeFromPackageJson(pkg.packageJson as normalizePackageData.Package)?.toString()

    /* eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- ack */
    component.bomRef.value = `${pkg.packageJson.name}@${pkg.packageJson.version??'*'}`

    return component
  }
}

class VirtualComponent extends Component {
  constructor(name: Component['name']) {
    super(ComponentType.Library, `VirtualComponent ${name}`, {
      bomRef: `VirtualComponent ${name}`,
      description: `This is a virtual component "${name}".`,
      properties: new PropertyRepository([
        new Property(
          PropertyNames.InputIsVirtual,
          PropertyValueBool.True
        )
      ])
    })
  }
}

class DummyComponent extends Component {
  constructor(name: Component['name']) {
    super(ComponentType.Library, `DummyComponent ${name}`, {
      bomRef: `DummyComponent ${name}`,
      description: `This is a dummy component "${name}" that fills the gap where the actual creation failed.`
    })
  }
}
