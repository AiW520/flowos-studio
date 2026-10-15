import fs from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'

const baseUrl = process.env.FLOWOS_BASE_URL || 'http://127.0.0.1:3015'
const artifactDir = path.resolve('artifacts', 'interaction-smoke')
fs.mkdirSync(artifactDir, { recursive: true })

const browser = await chromium.launch({ headless: true, executablePath: findBrowserExecutable() })
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 })
const page = await context.newPage()
const browserErrors = []
const checks = []

page.on('pageerror', (error) => browserErrors.push(`pageerror: ${error.message}`))
page.on('console', (message) => {
  if (message.type() === 'error' && !/hydration-mismatch|caret-color|status of 401/.test(message.text())) browserErrors.push(`console: ${message.text()}`)
})

try {
  await run('全局搜索与通知', async () => {
    await open('/home')
    await page.getByRole('button', { name: '通知' }).click()
    await visible(page.getByText('镜头 03 已生成完成'))
    await page.getByRole('button', { name: '全部已读' }).click()
    await visible(page.getByText('没有新通知'))

    const search = page.getByRole('textbox', { name: '全局搜索' })
    await search.fill('城市里的小小光芒')
    await visible(page.locator('.global-search-results'))
    await page.locator('.global-search-results a').first().click()
    await page.waitForURL('**/project/city-light')
  })

  await run('首页创作入口', async () => {
    await open('/home')
    await page.getByRole('button', { name: /^添加参考/ }).click()
    await visible(page.getByRole('button', { name: /参考：品牌参考/ }))
    await page.getByRole('button', { name: '智能增强' }).click()
    await expectValue(page.locator('.composer textarea'), /主体清晰/)
    await page.getByRole('button', { name: '清新自然' }).click()
    await page.locator('.composer-options').getByRole('button', { name: '电影写实' }).click()
    await visible(page.getByRole('button', { name: '电影写实' }))
    await page.getByRole('button', { name: /图像创作/ }).click()
    await visible(page.getByRole('dialog'))
    await page.getByRole('dialog').getByRole('button', { name: '关闭', exact: true }).click()
  })

  await run('项目筛选与新建', async () => {
    await open('/projects')
    await page.locator('.toolbar').getByRole('button', { name: '筛选' }).click()
    await page.locator('.inline-filter').getByRole('button', { name: '品牌短片' }).click()
    await visible(page.locator('.project-library-card').first())
    await page.locator('.toolbar').getByRole('button', { name: '最近更新' }).click()
    await visible(page.locator('.toolbar').getByRole('button', { name: '按名称' }))
    await page.getByRole('main').getByRole('button', { name: '新建项目' }).click()
    await visible(page.getByRole('dialog'))
    await page.getByRole('button', { name: '取消' }).click()
  })

  await run('资源筛选、收藏与上传', async () => {
    await open('/discover')
    await page.locator('.discover-tabs').getByRole('button', { name: '作品', exact: true }).click()
    await page.locator('.filter-panel').getByRole('checkbox', { name: /写实/ }).check()
    await visible(page.locator('.discover-card').first())
    await page.locator('.discover-card').first().locator('.heart-button').click()
    await page.locator('.discover-card').first().click()
    await page.locator('.detail-panel').getByRole('button', { name: '+ 关注' }).click()
    await visible(page.locator('.detail-panel').getByRole('button', { name: '已关注' }))
    await page.locator('.recipe-box').getByRole('button', { name: /复制/ }).click()
    await visible(page.getByText('创作配方已复制'))
    await page.getByRole('link', { name: '上传资源' }).click()
    await page.waitForURL('**/assets')
    await visible(page.getByRole('heading', { name: '素材库' }))
  })

  await run('模型筛选、对比与供应商', async () => {
    await open('/models')
    await page.locator('.model-category-tabs').getByRole('button', { name: '图像生成', exact: true }).click()
    await page.getByPlaceholder('搜索模型、能力或关键词').fill('Aperture')
    await visible(page.locator('.model-name b', { hasText: 'Aperture Studio X' }))
    await page.getByPlaceholder('搜索模型、能力或关键词').fill('')
    await page.locator('.model-card').first().getByRole('button', { name: '管理' }).click()
    await page.getByRole('dialog', { name: '管理模型' }).getByPlaceholder(/介绍模型擅长/).fill('专项回归：可编辑的模型介绍。')
    await page.getByRole('dialog', { name: '管理模型' }).getByRole('button', { name: '保存模型信息' }).click()
    await visible(page.getByText('专项回归：可编辑的模型介绍。'))
    const compare = page.locator('.model-table input[type="checkbox"]')
    await compare.nth(0).check()
    await compare.nth(1).check()
    await page.getByRole('button', { name: /开始对比/ }).click()
    await visible(page.getByRole('dialog', { name: '模型能力对比' }))
    await page.getByRole('dialog').getByRole('button', { name: '设为默认' }).first().click()
    await visible(page.locator('.toast'))
    await page.getByRole('button', { name: '接入新模型' }).click()
    await page.getByRole('dialog').getByRole('button', { name: '保存并添加模型' }).click()
    await visible(page.locator('.form-error'))
    await page.getByPlaceholder('粘贴供应商 API Key').fill('[REDACTED]')
    await page.getByPlaceholder('例如：Tuzi Image Pro').fill('Tuzi Image Pro')
    await page.getByRole('dialog').getByPlaceholder(/介绍模型擅长/).fill('适合高质量品牌图像和创意视觉生成。')
    await page.getByRole('dialog').getByRole('button', { name: '保存并添加模型' }).click()
    await visible(page.getByText('适合高质量品牌图像和创意视觉生成。'))
  })

  await run('工作流详情、筛选与创建', async () => {
    await open('/workflows')
    await page.getByRole('button', { name: '查看详情' }).first().click()
    await visible(page.locator('.workflow-detail'))
    await page.locator('.tabs').getByRole('button', { name: '图像', exact: true }).click()
    await visible(page.locator('.workflow-card').first())
    await page.getByRole('button', { name: '创建工作流' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('textbox', { name: '工作流名称' }).fill('点击回归工作流')
    await dialog.getByRole('button', { name: '创建并加入资料库' }).click()
    await visible(page.getByText('点击回归工作流'))
  })

  await run('创作者资料、数据与发布', async () => {
    await open('/creator')
    await page.locator('.creator-toolbar').getByRole('button', { name: '近 7 天' }).click()
    await visible(page.getByText('近 7 天 · 浏览与复用趋势'))
    await page.getByRole('button', { name: /查看详情/ }).click()
    await visible(page.getByRole('dialog', { name: '作品表现详情' }))
    await page.getByRole('button', { name: '关闭' }).click()
    await page.getByRole('button', { name: '编辑资料' }).click()
    const dialog = page.getByRole('dialog')
    await dialog.getByRole('textbox', { name: '显示名称' }).fill('林夏测试工作室')
    await dialog.getByRole('button', { name: '保存资料' }).click()
    await visible(page.getByText('创作者资料已保存'))
    await page.getByRole('button', { name: '发布新作品' }).click()
    await page.getByRole('dialog').getByRole('button', { name: '确认发布' }).click()
    await visible(page.getByText('仅预览发布流程，作品未公开发布'))
    const publishSwitch = page.locator('.creator-license-settings input[type="checkbox"]').first()
    const before = await publishSwitch.isChecked()
    await publishSwitch.click()
    if ((await publishSwitch.isChecked()) === before) throw new Error('发布开关状态未变化')
  })

  await run('制作台模式、工具、队列与设置', async () => {
    await open('/project/city-light')
    await page.locator('.studio-modes').getByRole('button', { name: '节点' }).click()
    await visible(page.locator('.node-view'))
    const initialNodes = await page.locator('.react-flow__node').count()
    const initialEdges = await page.locator('.react-flow__edge').count()
    await page.getByRole('button', { name: '添加节点' }).click()
    if (await page.locator('.react-flow__node').count() !== initialNodes + 1) throw new Error('工作流节点未添加')
    await page.locator('.node-editor input').fill('测试处理节点')
    await page.locator('.node-editor').getByRole('button', { name: '保存节点' }).click()
    const testNode = page.locator('.react-flow__node', { hasText: '测试处理节点' })
    await visible(testNode)
    const nodesBeforeAssetDrop = await page.locator('.react-flow__node').count()
    await page.locator('.asset-item').first().dragTo(page.locator('.react-flow__pane'), { targetPosition: { x: 420, y: 320 } })
    if (await page.locator('.react-flow__node').count() !== nodesBeforeAssetDrop + 1) throw new Error('素材未能拖入工作流画布')
    const sourceHandle = await testNode.locator('.source').boundingBox()
    const outputHandle = await page.locator('.react-flow__node', { hasText: '成片输出' }).locator('.target').boundingBox()
    if (!sourceHandle || !outputHandle) throw new Error('节点连接端口不存在')
    await page.mouse.move(sourceHandle.x + sourceHandle.width / 2, sourceHandle.y + sourceHandle.height / 2)
    await page.mouse.down()
    await page.mouse.move(outputHandle.x + outputHandle.width / 2, outputHandle.y + outputHandle.height / 2, { steps: 10 })
    await page.mouse.up()
    if (await page.locator('.react-flow__edge').count() !== initialEdges + 1) throw new Error('工作流节点未建立连接')
    await testNode.click()
    await page.getByRole('button', { name: '复制选中节点' }).click()
    const copiedNodes = await page.locator('.react-flow__node').count()
    await page.getByRole('button', { name: '删除选中节点' }).click()
    if (await page.locator('.react-flow__node').count() !== copiedNodes - 1) throw new Error('工作流节点未删除')
    await page.getByTitle('撤销').click()
    if (await page.locator('.react-flow__node').count() !== copiedNodes) throw new Error('工作流撤销未恢复节点')
    await page.getByTitle('重做').click()
    if (await page.locator('.react-flow__node').count() !== copiedNodes - 1) throw new Error('工作流重做未删除节点')
    await page.locator('.studio-modes').getByRole('button', { name: '时间线' }).click()
    await visible(page.locator('.timeline-view'))
    await page.getByRole('button', { name: /预览/ }).click()
    await page.getByRole('button', { name: '播放预览' }).click()
    await visible(page.getByText(/正在预览/))
    await page.locator('.studio-modes').getByRole('button', { name: '画布' }).click()
    await visible(page.getByTestId('infinite-canvas'))
    await visible(page.getByTestId('infinite-canvas').locator('canvas').first())
    const zoomBefore = await page.locator('.canvas-tools b').innerText()
    await page.locator('.canvas-tools').getByTitle('放大').click()
    const zoomAfter = await page.locator('.canvas-tools b').innerText()
    if (zoomAfter === zoomBefore) throw new Error('画布缩放未生效')
    await page.locator('.canvas-tools').getByTitle('撤销').click()
    await visible(page.getByText('已撤销上一步操作'))
    await page.getByRole('button', { name: '添加资产' }).click()
    await visible(page.getByText('新建素材.png'))
    const initialJobs = await page.locator('.studio-job').count()
    if (initialJobs > 0) {
      await page.locator('.studio-job button').first().click()
      if (await page.locator('.studio-job').count() !== initialJobs - 1) throw new Error('队列取消未生效')
    }
    await page.locator('.inspector-tabs').getByRole('button', { name: '项目设置' }).click()
    await page.locator('.inspector').getByRole('textbox', { name: '项目名称' }).fill('城市灯光测试版')
    await page.getByRole('button', { name: '保存项目设置' }).click()
    await visible(page.locator('.studio-title', { hasText: '城市灯光测试版' }))
    await page.locator('.inspector-tabs').getByRole('button', { name: '风格参考' }).click()
    await page.locator('.reference-option').first().click()
    await visible(page.locator('.reference-option.active'))
    await page.locator('.inspector-tabs').getByRole('button', { name: '镜头设置' }).click()
    await page.getByRole('button', { name: /生成此镜头/ }).click()
    await visible(page.locator('.queue-drawer .studio-job').first())
    await page.getByRole('button', { name: '更多项目操作' }).click()
    await page.getByRole('button', { name: '创建副本' }).click()
    await visible(page.getByText('作品集预览暂不支持复制项目'))
    await page.screenshot({ path: path.join(artifactDir, 'studio-desktop.png'), fullPage: true })
  })

  await run('资产版本、动作与评论', async () => {
    await open('/asset/03')
    await page.locator('.version-strip button').nth(1).click()
    await visible(page.locator('.version-strip button.active'))
    await page.getByRole('button', { name: '收藏' }).click()
    await page.getByRole('button', { name: '下载' }).click()
    await visible(page.getByText('已开始下载'))
    for (const action of ['设为参考', '创建分支', 'Remix']) {
      await page.getByRole('button', { name: action, exact: true }).click()
      await visible(page.locator('.toast'))
    }
    await page.locator('.asset-top-actions').getByRole('button', { name: '预览发布' }).click()
    await visible(page.locator('.toast'))
    await page.getByRole('button', { name: /复制 JSON/ }).click()
    const commentsBefore = await page.locator('.comment-list > div').count()
    await page.getByPlaceholder(/添加评论/).fill('点击回归评论')
    await page.getByRole('button', { name: '发送' }).click()
    if (await page.locator('.comment-list > div').count() !== commentsBefore + 1) throw new Error('评论未添加')
    await visible(page.getByText('点击回归评论'))
  })

  await run('移动端菜单与布局', async () => {
    await page.setViewportSize({ width: 390, height: 844 })
    await open('/home')
    await page.getByRole('button', { name: '打开导航' }).click()
    await visible(page.locator('.sidebar.sidebar-open'))
    await page.getByRole('button', { name: '关闭导航' }).first().click()
    await page.getByRole('button', { name: '新建项目' }).last().click()
    await visible(page.getByRole('dialog'))
    await page.getByRole('dialog').getByRole('button', { name: '关闭', exact: true }).click()
    await page.screenshot({ path: path.join(artifactDir, 'home-mobile.png'), fullPage: true })
    await open('/project/city-light')
    await page.waitForFunction(() => {
      const canvas = document.querySelector('.infinite-canvas canvas')
      if (!(canvas instanceof HTMLCanvasElement) || canvas.width < 300 || canvas.height < 400) return false
      const pixels = canvas.getContext('2d')?.getImageData(0, 0, canvas.width, canvas.height).data
      if (!pixels) return false
      for (let index = 0; index < pixels.length; index += 60) {
        if (pixels[index] < 230 || pixels[index + 1] < 230 || pixels[index + 2] < 230) return true
      }
      return false
    }, undefined, { timeout: 10000 })
    await page.screenshot({ path: path.join(artifactDir, 'studio-mobile.png'), fullPage: true })
  })

  await run('新增工作区路由', async () => {
    for (const route of ['/assets', '/templates', '/tools', '/team', '/brand', '/analytics', '/community', '/settings']) {
      await open(route)
      await visible(page.locator('main.page'))
    }
  })

  await run('素材详情与跨页创作上下文', async () => {
    await page.setViewportSize({ width: 1440, height: 1000 })
    await open('/assets')
    await page.getByPlaceholder('搜索素材、标签或项目').fill('产品特写')
    await page.locator('.asset-library-preview').first().click()
    await page.waitForURL('**/asset/asset-product-closeup')
    await visible(page.getByRole('heading', { name: '产品特写.png' }))
    await page.waitForFunction(() => { const image = document.querySelector('.asset-main-image img'); return image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0 }, { timeout: 15000 })
    const imageLoaded = await page.locator('.asset-main-image img').evaluate((image) => image.complete && image.naturalWidth > 0)
    if (!imageLoaded) throw new Error('产品特写素材图片未加载')

    await open('/assets')
    await page.locator('input[type=file]').setInputFiles({ name: 'upload-check.png', mimeType: 'image/png', buffer: fs.readFileSync(path.resolve('public/media/product-closeup.png')) })
    await visible(page.locator('.asset-library-grid', { hasText: 'upload-check.png' }))
    await page.locator('.asset-library-grid article', { hasText: 'upload-check.png' }).locator('a').click()
    await visible(page.getByRole('heading', { name: 'upload-check.png' }))
    await open('/project/city-light')
    await visible(page.locator('.asset-list', { hasText: 'upload-check.png' }))

    await open('/templates')
    const templateTitle = await page.locator('.template-catalog-grid h3').first().innerText()
    await page.locator('.template-catalog-grid').getByRole('link', { name: /使用此模板/ }).first().click()
    await visible(page.locator('.studio-title', { hasText: templateTitle }))

    await open('/discover')
    const discoveryTitle = await page.locator('.detail-panel h2').innerText()
    await page.getByRole('link', { name: /在 FlowOS 中使用/ }).click()
    await visible(page.locator('.studio-title', { hasText: discoveryTitle }))
  })

  if (browserErrors.length) throw new Error(`浏览器控制台发现异常：\n${browserErrors.join('\n')}`)
  console.log(`UI 冒烟测试通过：${checks.length} 组交互。`)
  for (const check of checks) console.log(`- ${check}`)
  console.log(`截图：${artifactDir}`)
} finally {
  await browser.close()
}

async function run(name, callback) {
  try {
    await callback()
    checks.push(name)
  } catch (error) {
    const slug = name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]+/g, '-').slice(0, 36)
    await page.screenshot({ path: path.join(artifactDir, `failed-${slug}.png`), fullPage: true })
    console.error(`失败步骤：${name}`)
    console.error(`当前地址：${page.url()}`)
    console.error(`页面摘要：${(await page.locator('body').innerText()).slice(0, 1000)}`)
    throw error
  }
}

async function open(route) {
  const response = await page.goto(`${baseUrl}${route}`, { waitUntil: 'domcontentloaded' })
  if (!response?.ok()) throw new Error(`${route} 返回 ${response?.status() ?? '无响应'}`)
  await page.locator('main').first().waitFor({ state: 'visible' })
  await page.waitForFunction(() => document.documentElement.dataset.flowosHydrated === 'true')
}

async function visible(locator) {
  await locator.waitFor({ state: 'visible', timeout: 5000 })
}

async function expectValue(locator, pattern) {
  const value = await locator.inputValue()
  if (!pattern.test(value)) throw new Error(`输入值不符合预期：${value}`)
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
  return candidates.find((candidate) => fs.existsSync(candidate))
}
