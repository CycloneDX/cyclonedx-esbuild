import type { Plugin as EsbuildPlugin } from "esbuild"
import { type PluginOptions, Plugin} from "./plugin"

export {PLUGIN_NAME} from "./plugin"

export type CycloneDxEsbuildPluginOptions = PluginOptions
export const cyclonedxEsbuildPlugin: (opts?: PluginOptions) => EsbuildPlugin = Plugin


