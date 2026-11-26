import {configResponse} from '../../lib/config.mjs';
export const onRequestGet=({env})=>configResponse(env);
