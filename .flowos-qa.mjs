import { chromium, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const baseURL = process.env.BASE_URL ?? 'http://127.0.0.1:3012'
const artifactDir = resolve('qa-artifacts')
await mkdir(artifactDir, { recursive: true })
const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL ?? 'msedge', headless: true })
const report = { responsive: [], interaction: {}, flow: {}, pageErrors: [], accessibility: [] }

async function ready(page) {
  await expect(page.getByRole('banner', { name: '项目工具栏' }).getByRole('button', { name: '生成', exact: true })).toBeVisible()
}

async function screenshot(page, name) {
  await page.evaluate(async () => {
    await Promise.all(Array.from(document.images).filter((image) => image.loading !== 'lazy').map((image) => image.decode().catch(() => {})))
  })
  await page.screenshot({ path: resolve(artifactDir, name), fullPage: false })
}

try {
  for (const theme of ['light', 'dark']) {
    for (const width of [360, 390, 768, 1280, 1440]) {
      const context = await browser.newContext({ viewport: { width, height: width < 768 ? 844 : 900 }, baseURL })
      await context.addInitScript((value) => localStorage.setItem('flowos:theme', value), theme)
      const page = await context.newPage()
      page.on('pageerror', (error) => report.pageErrors.push(error.message))
      await page.goto('/project/rain-coffee')
      await ready(page)
      const toolbar = page.getByRole('banner', { name: '项目工具栏' })
      await expect(toolbar.getByRole('button', { name: '生成', exact: true })).toBeEnabled()
      // Hit-test the toolbar to detect covering controls, even without document overflow.
      const covered = await toolbar.locator('button:visible').evaluateAll((buttons) => buttons.filter((button) => {
        const rect = button.getBoundingClientRect()
        if (rect.right > innerWidth) return false
        const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)
        return !hit || !button.contains(hit)
      }).map((button) => button.textContent || button.getAttribute('aria-label')))
      expect(covered).toEqual([])
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth)
      expect(scrollWidth).toBeLessThanOrEqual(width)
      if (width < 768) {
        await expect(page.getByLabel('移动端镜头列表')).toBeVisible()
        await expect(page.getByRole('button', { name: '展开任务面板' })).toBeVisible()
        await page.getByRole('button', { name: '展开任务面板' }).click()
        await expect(page.locator('#flowos-job-queue-panel')).toBeVisible()
        await page.getByRole('button', { name: '收起任务面板' }).click()
        await toolbar.getByRole('button', { name: '打开镜头检查器' }).click()
        await expect(page.getByRole('dialog')).toBeVisible()
        await page.keyboard.press('Tab')
        expect(await page.getByRole('dialog').evaluate((el) => el.contains(document.activeElement))).toBe(true)
        await page.keyboard.press('Escape')
        await expect(page.getByRole('dialog')).toHaveCount(0)
      } else {
        const bounds = await page.getByLabel('创作画布', { exact: true }).boundingBox()
        expect(bounds.height).toBeGreaterThan(200)
        await expect(page.getByLabel('画布工具')).toBeVisible()
        await expect(page.getByRole('button', { name: '选择工具' })).toHaveAttribute('aria-pressed', 'true')
        await expect(page.getByRole('button', { name: '展开任务面板' })).toBeVisible()
        if (width >= 1024) await expect(page.getByLabel('画布缩略地图')).toBeVisible()
      }
      await screenshot(page, `phase1-workbench-${theme}-${width}.png`)
      report.responsive.push({ theme, width, scrollWidth, toolbarCovered: covered.length })
      if (width === 390 || width === 1440) {
        const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
        report.accessibility.push({ theme, width, violations: axe.violations.map((v) => ({ id: v.id, impact: v.impact, count: v.nodes.length, examples: v.nodes.slice(0, 3).map((n) => n.html) })) })
      }
      await page.goto('/')
      await expect(page).toHaveURL(/\/home$/)
      await expect(page.getByRole('heading', { name: '开始新创作' })).toBeVisible()
      await expect(page.getByRole('button', { name: '创建方案', exact: true })).toBeEnabled()
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
      await expect(page.locator('.vh-hero-scene')).toBeVisible()
      expect(await page.locator('.vh-hero-scene').evaluate((image) => image.complete && image.naturalWidth > 0)).toBe(true)
      if (width === 390 || width === 1440) {
        const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()
        report.accessibility.push({ page: 'home', theme, width, violations: axe.violations.map((v) => ({ id: v.id, impact: v.impact, examples: v.nodes.slice(0, 3).map((n) => n.html) })) })
      }
      await screenshot(page, `phase1-home-${theme}-${width}.png`)
      await context.close()
    }
  }

  const interactionContext = await browser.newContext({ viewport: { width: 1440, height: 900 }, baseURL })
  const interactionPage = await interactionContext.newPage()
  interactionPage.on('pageerror', (error) => report.pageErrors.push(error.message))
  await interactionPage.goto('/project/rain-coffee')
  await ready(interactionPage)

  await interactionPage.getByRole('button', { name: '展开任务面板' }).click()
  await expect(interactionPage.getByRole('button', { name: '收起任务面板' })).toHaveAttribute('aria-expanded', 'true')
  await interactionPage.getByRole('tab', { name: /时间线/ }).click()
  await expect(interactionPage.getByRole('tab', { name: /时间线/ })).toHaveAttribute('aria-selected', 'true')
  await interactionPage.getByRole('tab', { name: /生成队列/ }).click()
  await expect(interactionPage.getByRole('tab', { name: /生成队列/ })).toHaveAttribute('aria-selected', 'true')
  await interactionPage.getByRole('button', { name: '收起任务面板' }).click()

  const modeNavigation = interactionPage.getByRole('navigation', { name: '工作台模式' })
  for (const label of ['创意规划', '画布', '节点', '分镜', '时间线', '评审']) {
    const modeButton = modeNavigation.getByRole('button', { name: label, exact: true })
    await modeButton.click()
    await expect(modeButton).toHaveAttribute('aria-current', 'page')
  }
  await modeNavigation.getByRole('button', { name: '画布', exact: true }).click()

  await interactionPage.getByRole('button', { name: '平移工具' }).click()
  await expect(interactionPage.getByRole('button', { name: '平移工具' })).toHaveAttribute('aria-pressed', 'true')
  await interactionPage.getByRole('button', { name: '选择工具' }).click()
  await interactionPage.getByRole('button', { name: '整理镜头' }).click()
  await expect(interactionPage.getByText('镜头已恢复为故事节拍布局')).toBeVisible()
  await interactionPage.getByRole('button', { name: '撤销布局' }).click()
  await expect(interactionPage.getByText('已撤销画布布局调整')).toBeVisible()
  await interactionPage.getByRole('button', { name: '重做布局' }).click()
  await expect(interactionPage.getByText('已重做画布布局调整')).toBeVisible()
  await interactionPage.getByLabel('画布缩放').getByRole('button', { name: '适配画布' }).click()
  await expect(interactionPage.getByText(/画布已适配到/)).toBeVisible()
  await interactionPage.getByRole('button', { name: '聚焦所选镜头' }).click()
  await expect(interactionPage.getByText(/已聚焦镜头 01/)).toBeVisible()

  await interactionPage.getByRole('button', { name: '询问创意助手' }).click()
  const agentDialog = interactionPage.getByRole('dialog', { name: '创意导演' })
  await expect(agentDialog).toBeVisible()
  await agentDialog.getByRole('button', { name: '统一雨夜色调' }).click()
  await expect(agentDialog.getByText('已执行：统一雨夜色调')).toBeVisible()
  await agentDialog.getByRole('button', { name: '关闭创意导演' }).click()

  const shotCards = interactionPage.locator('article[aria-label*="个生成结果"]')
  await shotCards.nth(1).click()
  await expect(interactionPage.getByRole('complementary', { name: '镜头检查器' })).toContainText('Shot 02')
  const promptInput = interactionPage.getByLabel(/镜头 2 提示词/)
  const promptBefore = await promptInput.inputValue()
  await interactionPage.getByRole('button', { name: '#雨幕蓝调', exact: true }).click()
  await expect(promptInput).not.toHaveValue(promptBefore)

  const directResultAction = interactionPage.locator('button[aria-label^="打开 "][aria-label$="的最新结果"]').first()
  await expect(directResultAction).toBeVisible()
  await directResultAction.click()
  await expect(interactionPage.getByRole('dialog')).toBeVisible()
  await interactionPage.keyboard.press('Escape')

  await interactionPage.getByRole('button', { name: '更改', exact: true }).click()
  const routerDialog = interactionPage.getByRole('dialog', { name: '选择生成路线' })
  await expect(routerDialog).toBeVisible()
  await routerDialog.getByRole('radio', { name: /最佳质量/ }).click()
  await expect(routerDialog.getByRole('radio', { name: /最佳质量/ })).toHaveAttribute('aria-checked', 'true')
  await routerDialog.getByRole('button', { name: '关闭选择生成路线' }).click()

  await interactionPage.getByRole('banner', { name: '项目工具栏' }).getByRole('button', { name: '生成', exact: true }).click()
  const generationDialog = interactionPage.getByRole('dialog', { name: '确认提交生成任务' })
  await expect(generationDialog).toBeVisible()
  await generationDialog.getByRole('button', { name: '返回调整' }).click()

  const cardsBeforeAdd = await shotCards.count()
  await interactionPage.getByRole('button', { name: '添加镜头' }).click()
  await expect(shotCards).toHaveCount(cardsBeforeAdd + 1)
  await expect(interactionPage.getByText(/已添加到画布/)).toBeVisible()

  const branchButton = interactionPage.getByRole('banner', { name: '项目工具栏' }).getByRole('button', { name: /Main|Branch/ })
  const branchBefore = await branchButton.innerText()
  await branchButton.click()
  await expect(branchButton).not.toHaveText(branchBefore)
  await expect(interactionPage.getByText(/已创建并切换/)).toBeVisible()

  const assetShelf = interactionPage.getByRole('complementary', { name: '资产架' })
  await assetShelf.getByRole('button', { name: '角色', exact: true }).click()
  await expect(assetShelf.getByRole('button', { name: '角色', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await assetShelf.locator('button[draggable="true"]').first().click()
  await expect(interactionPage.getByText(/已作为引用绑定/)).toBeVisible()

  report.interaction = {
    queue: true,
    modes: true,
    canvasTools: true,
    canvasFeedback: true,
    agent: true,
    inspector: true,
    resultAction: true,
    modelRouter: true,
    generationDialog: true,
    addShot: true,
    branch: true,
    assetBinding: true,
  }
  await interactionContext.close()

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, baseURL })
  const page = await context.newPage()
  page.on('pageerror', (error) => report.pageErrors.push(error.message))
  await page.goto('/home')
  await page.getByLabel('输出语言', { exact: true }).selectOption('en-US')
  await page.getByRole('group', { name: '模板分类' }).getByRole('button', { name: '小红书', exact: true }).click()
  await expect(page.locator('.vh-template-card')).toHaveCount(4)
  await page.getByRole('button', { name: '使用模板：小红书种草笔记', exact: true }).last().click()
  await expect(page.getByRole('dialog').getByPlaceholder(/描述受众/)).toHaveValue(/小红书种草笔记/)
  await expect(page.getByRole('dialog').getByLabel('输出语言', { exact: true })).toHaveValue('en-US')
  await expect(page.getByRole('dialog').getByRole('button', { name: /社媒套件/ })).toHaveAttribute('aria-pressed', 'true')
  await page.keyboard.press('Escape')
  await page.getByRole('group', { name: '模板分类' }).getByRole('button', { name: '电商', exact: true }).click()
  await page.locator('.vh-template-grid').getByRole('button', { name: '使用模板：电商主图套装', exact: true }).click()
  await expect(page.getByRole('dialog').getByRole('button', { name: /产品广告/ })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('dialog').getByPlaceholder(/描述受众/)).toHaveValue(/电商商品制作主图套装/)
  await expect(page.getByRole('dialog').getByLabel('输出语言', { exact: true })).toHaveValue('en-US')
  await page.keyboard.press('Escape')
  await page.getByLabel('创作描述', { exact: true }).fill('一组紫夜幻想海报')
  await page.getByLabel('项目类型', { exact: true }).selectOption('social-kit')
  await page.getByRole('button', { name: '创建方案', exact: true }).click()
  await expect(page.getByRole('dialog').getByPlaceholder(/描述受众/)).toHaveValue('一组紫夜幻想海报')
  await expect(page.getByRole('dialog').getByRole('button', { name: /社媒套件/ })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('dialog').getByLabel('输出语言', { exact: true })).toHaveValue('en-US')
  await page.keyboard.press('Escape')
  await page.getByLabel('搜索项目', { exact: true }).first().fill('no-matching-project')
  await expect(page.getByText('没有匹配的项目')).toBeVisible()
  await page.getByRole('button', { name: '新建项目', exact: true }).first().click()
  const dialog = page.getByRole('dialog', { name: '新建项目' })
  await dialog.getByRole('button', { name: /产品广告/ }).click()
  await page.getByPlaceholder('未命名产品广告').fill('第一阶段验收项目')
  await page.getByPlaceholder(/描述受众/).fill('为通勤人群制作一支 30 秒新品广告，强调真实材质和连续镜头。')
  await expect(dialog.getByLabel('输出语言', { exact: true })).toHaveValue('en-US')
  await page.getByRole('button', { name: '创建并规划' }).click()
  await page.waitForURL(/\/project\//)
  const planButton = page.getByRole('button', { name: '生成 6 镜头计划', exact: true })
  await expect(planButton).toBeVisible()
  await page.getByLabel('模型路由', { exact: true }).selectOption('m2')
  await planButton.click()
  for (let i = 0; i < 6; i++) await page.getByRole('button', { name: '确认镜头', exact: true }).first().click()
  await page.getByRole('button', { name: '生成六镜头首轮' }).click()
  const confirm = page.getByRole('dialog', { name: '确认提交生成任务' })
  await expect(confirm.getByRole('button', { name: /确认生成.*72/ })).toBeVisible()
  await confirm.getByRole('button', { name: /确认生成/ }).click()
  await expect(confirm).toHaveCount(0)
  await page.getByRole('button', { name: '展开任务面板' }).click()
  const result = page.getByRole('button', { name: /^查看结果：/ }).filter({ visible: true }).first()
  await expect(result).toBeEnabled({ timeout: 35000 })
  await result.click()
  const detail = page.getByRole('dialog')
  await detail.getByRole('tab', { name: 'Recipe' }).click()
  await expect(detail.getByText('模型版本', { exact: true })).toBeVisible()
  await detail.getByRole('button', { name: 'Add to timeline', exact: true }).click()
  await page.keyboard.press('Escape')
  await page.getByRole('navigation', { name: '工作台模式' }).getByRole('button', { name: '时间线', exact: true }).click()
  await page.getByRole('button', { name: '导出', exact: true }).click()
  await expect(page.getByRole('dialog', { name: '导出当前时间线' })).toBeVisible()
  await screenshot(page, 'phase1-export.png')
  await page.keyboard.press('Escape')
  await page.reload()
  await ready(page)
  const data = await page.evaluate(() => JSON.parse(localStorage.getItem('flowos:projects:v1')))
  const project = data.projects.find((p) => p.name === '第一阶段验收项目')
  expect(project.outputLanguage).toBe('en-US')
  expect(project.shots).toHaveLength(6)
  expect(project.timelineClips.length).toBeGreaterThan(0)
  report.flow = { created: true, planned: true, generated: true, recipe: true, timeline: true, exportDialog: true, persistedAfterReload: true }
  await context.close()

  const blocked = await browser.newContext({ baseURL })
  await blocked.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new Error('Storage is disabled') } }))
  const blockedPage = await blocked.newPage()
  await blockedPage.goto('/home')
  await expect(blockedPage.getByRole('button', { name: '创建方案', exact: true })).toBeEnabled()
  report.flow.storageDeniedLoads = true
  await blocked.close()
  expect(report.pageErrors).toEqual([])
  expect(report.accessibility.flatMap((result) => result.violations)).toEqual([])
} catch (error) {
  report.failure = error.stack
  process.exitCode = 1
} finally {
  await writeFile(resolve(artifactDir, 'phase1-report.json'), JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
  await browser.close()
}
