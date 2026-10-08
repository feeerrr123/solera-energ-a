import { Config } from '@remotion/cli/config'
// En el contenedor de Claude: Chromium headless de Playwright. En tu ordenador, borra esta línea.
if (process.env.PLAYWRIGHT_BROWSERS_PATH) Config.setBrowserExecutable('/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell')
Config.setChromiumOpenGlRenderer('swangle')
