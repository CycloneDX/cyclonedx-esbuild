import * as utils from './utils.js';
import {used_private} from './used_private.js';

export function access_used_private() {
    return `access ${used_private()}`;
}

export {utils};
