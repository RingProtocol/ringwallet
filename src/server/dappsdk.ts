/**
 * Single source for the DApp SDK script path.
 * The actual file lives at public/dappsdk.js and is served at /DAPPSDK_SCRIPT_NAME.
 * See docs/dev_delivers/dapp-integration.md for usage.
 */
export const DAPPSDK_SCRIPT_NAME = 'dappsdk.js'

export function dappsdkScriptTag(proxyBase: string): string {
  return `<script src="${proxyBase}/${DAPPSDK_SCRIPT_NAME}"></script>\n`
}
