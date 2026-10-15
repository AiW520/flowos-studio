import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'

const baseUrl = process.env.FLOWOS_BASE_URL || 'http://127.0.0.1:3015'
const outputDir = path.resolve('artifacts', 'visual-qa')
const routes = [
  ['home', '/home'],
  ['projects', '/projects'],
  ['discover', '/discover'],
  ['models', '/models'],
  ['workflows', '/workflows'],
  ['creator', '/creator'],
  ['studio', '/project/city-light'],
  ['asset', '/asset/03'],
]

fs.mkdirSync(outputDir, { recursive: true })

const browser = await chromium.launch({ headless: true, executablePath: findBrowserExecutable() })

try {
  for (const viewport of [
    { name: 'desktop', width: 1440, height: 1000 },
    { name: 'mobile', width: 390, height: 844 },
  ]) {
    const context = await browser.newContext({ viewport, deviceScaleFactor: 1 })
    const page = await context.newPage()
    for (const [name, route] of routes) {
      const response = await page.goto(`${baseUrl}${route}`, { waitUntil: 'networkidle' })
      if (!response?.ok()) throw new Error(`${route} returned ${response?.status() ?? 'no response'}`)
      await page.screenshot({ path: path.join(outputDir, `${name}-${viewport.name}.png`), fullPage: true })
    }
    await context.close()
  }
  console.log(`Captured ${routes.length * 2} screenshots in ${outputDir}`)
} finally {
  await browser.close()
}

function findBrowserExecutable() {
  const localAppData = process.env.LOCALAPPDATA || ''
  const candidates = [
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    path.join(localAppData, 'ms-playwright', 'chromium_headless_shell-1200', 'chrome-headless-shell-win64', 'chrome-headless-shell.exe'),
    path.join(localAppData, 'ms-playwright', 'chromium-1200', 'chrome-win64', 'chrome.exe'),
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ].filter(Boolean)
  const executable = candidates.find((candidate) => fs.existsSync(candidate))
  if (!executable) throw new Error('No compatible Chromium or Edge executable found')
  return executable
}
