import type { BunPlugin } from "bun"
import { type PluginOptions, Plugin} from "./plugin"

export {PLUGIN_NAME} from "./plugin"

export type CycloneDxBundPluginOptions = PluginOptions
export const cyclonedxBunPlugin: (opts?: PluginOptions) => BunPlugin = Plugin
