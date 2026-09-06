import { expect, test, Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import sharp from 'sharp'

const actions = [
    { id: '7411', name: 'Heated Split Shot', level: 54 },
    { id: '7412', name: 'Heated Slug Shot', level: 60 },
    { id: '16497', name: 'Auto Crossbow', level: 52 },
    { id: '2876', name: 'Reassemble', level: 10 },
    { id: '16498', name: 'Drill', level: 58 },
    { id: '7414', name: 'Barrel Stabilizer', level: 66 },
    { id: '99902', name: 'API spell one', level: 95 },
    { id: '99903', name: 'API spell two', level: 90 },
    { id: '7541', name: 'Second Wind', level: 99 },
]

async function setup(page: Page) {
    const icon = await readFile('public/Balance_Logo-02.png')
    const redStatus = await sharp({ create: { width: 32, height: 32, channels: 4, background: '#280808' } }).png().toBuffer()
    const goldStatus = await sharp({ create: { width: 32, height: 32, channels: 4, background: '#e6b134' } }).png().toBuffer()
    await page.route('**/_next/image?**', route => {
        const source = new URL(route.request().url()).searchParams.get('url') ?? ''
        return route.fulfill({ contentType: 'image/png', body: source.includes('213001') ? redStatus : source.includes('test.tex') ? goldStatus : icon })
    })
    await page.route('https://v2.xivapi.com/**', route => {
        const url = new URL(route.request().url())
        if (url.pathname.includes('/asset/')) return route.fulfill({ contentType: 'image/png', body: icon })
        if (url.pathname.includes('/sheet/')) {
            const id = url.pathname.split('/').pop()!
            return route.fulfill({ json: { fields: { Name: url.pathname.includes('/Status/') ? ({ '851': 'API Reassembled', '3864': 'API Hypercharged', '3866': 'API Full Metal Machinist' }[id] ?? 'API status') : actions.find(action => action.id === id)?.name ?? 'Fixture', Icon: { path_hr1: 'ui/icon/test.tex' }, ActionCategory: { row_id: ['7541', '2876', '7414'].includes(id) ? 4 : 3 }, Recast100ms: id === '16498' ? 200 : 25, Cast100ms: 0 } } })
        }
        const query = url.searchParams.get('query') ?? ''
        const status = url.searchParams.get('sheets') === 'Status'
        const list = status ? [{ id: '99901', name: 'Test status', level: 1 }] : query.includes('~')
            ? actions.filter(action => query.toLowerCase().includes(action.name.toLowerCase())) : actions
        return route.fulfill({ json: { results: list.map(action => ({ row_id: Number(action.id), sheet: status ? 'Status' : 'Action', fields: {
            Name: action.name, Icon: { path_hr1: 'ui/icon/test.tex' }, ClassJobLevel: action.level, IsPlayerAction: true,
            IsRoleAction: action.id === '7541', ActionCategory: { row_id: action.id === '7541' ? 4 : 2 }, Recast100ms: action.id === '16498' ? 200 : 25, Cast100ms: 0,
        } })), version: 'fixture-version', schema: 'fixture-schema' } })
    })
    await page.addInitScript(({ actions }) => {
        localStorage.setItem('mint-leaf-locale', 'en')
        localStorage.setItem('mint-leaf-job-actions', JSON.stringify({ 'MCH:en': {
            fetchedAt: Date.now(), format: 4, version: 'older-list-revision', actions: actions.map(action => ({
                id: action.id, name: action.name, iconUrl: 'https://v2.xivapi.com/api/asset/test.png',
                isPlayerAction: true, description: null, classJobLevel: action.level,
                isRoleAction: action.id === '7541', kind: action.id === '7541' ? 'ogcd' : 'gcd', baseGcdRecastMs: 2500, baseCastTimeMs: 0,
            })),
        } }))
    }, { actions })
    await page.goto('/')
    await page.getByRole('button', { name: 'Job', exact: true }).click()
    await page.getByRole('button', { name: 'Machinist', exact: true }).click()
}
const recast = (page: Page) => page.getByRole('spinbutton', { name: 'Recast Time (s)', exact: true })
const add = (page: Page, name: string) => page.getByRole('button', { name: new RegExp(name) }).first().click()
async function exported(page: Page) {
    if (!await page.getByPlaceholder('Paste your rotation here...').isVisible()) await page.getByText('Import / Export', { exact: true }).click()
    return page.getByPlaceholder('Paste your rotation here...')
}

test('library and search share inherited GCDs across prepull, existing and future actions', async ({ page }) => {
    await setup(page)
    await add(page, 'Heated Split Shot')
    await expect(recast(page)).toHaveValue('2.50')
    expect(await page.evaluate(() => localStorage.getItem('mint-leaf-action-preferences-v1'))).toBeNull()
    await page.getByRole('checkbox', { name: 'Prepull', exact: true }).check()
    await add(page, 'Heated Slug Shot')
    await recast(page).fill('2.45')
    await recast(page).blur()
    await add(page, 'Heated Split Shot')
    await expect(recast(page)).toHaveValue('2.45')
    await add(page, 'Auto Crossbow')
    await expect(recast(page)).toHaveValue('1.50')
    const text = await exported(page)
    await expect(text).toHaveValue(/-5 7411 GCD 2.45 0\n7412 GCD 2.45 0\n7411 GCD 2.45 0\n16497 GCD 1.5 0/)
    // Search uses the same resolver, with list cache kept at an older presentation revision.
    await page.getByRole('combobox').first().fill('Drill')
    await page.getByRole('option', { name: 'Drill' }).click()
    await expect(recast(page)).toHaveValue('2.45')
    await page.getByRole('checkbox', { name: 'Share with matching GCDs' }).uncheck()
    await recast(page).fill('2.3')
    await recast(page).blur()
    await add(page, 'Drill')
    await expect(recast(page)).toHaveValue('2.30')
    await page.getByRole('button', { name: 'Reset to inherited recast' }).click()
    await expect(recast(page)).toHaveValue('2.45')
    await page.screenshot({ path: 'test-results/action-defaults-editor.png', fullPage: true })
})

test('multiple independent status rows persist edits and render in preview and PNG', async ({ page }) => {
    await setup(page)
    await add(page, 'Reassemble')
    await expect(page.getByRole('checkbox', { name: 'API Reassembled', exact: true })).toBeChecked()
    await expect(page.getByRole('radio', { name: 'oGCD', exact: true })).toBeChecked()
    await expect(page.getByTestId('status-row')).toHaveCount(1)
    await page.getByRole('button', { name: 'Add status', exact: true }).click()
    await page.getByRole('combobox').last().fill('Test status')
    await page.getByRole('option', { name: 'Test status' }).click()
    await expect(page.getByTestId('status-row')).toHaveCount(2)
    const second = page.getByTestId('status-row').nth(1)
    await second.getByRole('button', { name: 'Test status Settings' }).click()
    await second.getByRole('spinbutton', { name: 'Test status Duration (s)' }).fill('13')
    await second.getByRole('spinbutton', { name: 'Test status Duration (s)' }).blur()
    await second.locator('input[type=color]').fill('#cc33ee')
    await second.getByRole('checkbox').uncheck()
    await expect(await exported(page)).toHaveValue(/\[99901 0 13 #cc33ee disabled\]/)
    await second.getByRole('checkbox').check()
    const firstColor = page.getByTestId('status-row').first().locator('input[type=color]')
    await expect(firstColor).not.toHaveValue('#74d6b4')
    const automatic = await firstColor.inputValue()
    for (let i = 0; i < 9; i++) await add(page, 'Heated Split Shot')
    await page.locator('canvas').waitFor()
    await expect(page.locator('canvas')).toHaveAttribute('data-render-state', 'ready')
    // Actual raster must contain the icon-derived colour and the independent override.
    const colors = await page.locator('canvas').evaluate((element, automatic) => {
        const canvas = element as HTMLCanvasElement
        const pixels = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data
        const counts = [0, 0]
        const rgb = [1, 3, 5].map(offset => parseInt(automatic.slice(offset, offset + 2), 16))
        for (let i = 0; i < pixels.length; i += 4) {
            if (pixels[i] === rgb[0] && pixels[i + 1] === rgb[1] && pixels[i + 2] === rgb[2]) counts[0]++
            if (pixels[i] === 204 && pixels[i + 1] === 51 && pixels[i + 2] === 238) counts[1]++
        }
        return counts
    }, automatic)
    expect(colors.every(count => count > 100)).toBe(true)
    await page.getByRole('button', { name: 'Preview', exact: true }).click()
    await expect(page.getByRole('dialog').locator('img')).toBeVisible()
    await page.getByRole('button', { name: 'Close preview', exact: true }).click()
    const downloadEvent = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Export to PNG' }).click()
    const download = await downloadEvent
    await download.saveAs('test-results/multiple-statuses.png')
    expect((await readFile('test-results/multiple-statuses.png')).subarray(1, 4).toString()).toBe('PNG')
    await add(page, 'Reassemble')
    await expect(page.getByTestId('status-row')).toHaveCount(2)
    await page.getByTestId('status-row').nth(1).getByRole('button', { name: 'Test status Settings' }).click()
    await expect(page.getByTestId('status-row').nth(1).locator('input[type=color]')).toHaveValue('#cc33ee')
})

test('automatic status colours are readable, distinct, resettable, and round-trip without preference writes', async ({ page }) => {
    await setup(page)
    await add(page, 'Reassemble')
    const rows = page.getByTestId('status-row')
    await rows.first().getByRole('button', { name: 'API Reassembled Settings' }).click()
    const picker = rows.first().locator('input[type=color]')
    await expect(picker).not.toHaveValue('#74d6b4')
    const red = await picker.inputValue()
    const rgb = [1, 3, 5].map(offset => parseInt(red.slice(offset, offset + 2), 16))
    expect(rgb[0]).toBeGreaterThan(rgb[1] * 2)
    const luminance = (hex: string) => [1, 3, 5].map(offset => parseInt(hex.slice(offset, offset + 2), 16) / 255)
        .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
        .reduce((sum, value, i) => sum + value * [0.2126, 0.7152, 0.0722][i], 0)
    expect((luminance(red) + 0.05) / (luminance('#121213') + 0.05)).toBeGreaterThanOrEqual(3)
    expect(await page.evaluate(() => localStorage.getItem('mint-leaf-action-preferences-v1'))).toBeNull()
    await expect(await exported(page)).toHaveValue(/\[851 0 5 auto\]/)
    await picker.fill('#123456')
    await expect(await exported(page)).toHaveValue(/\[851 0 5 #123456\]/)
    await rows.first().getByRole('button', { name: 'Reset to automatic' }).click()
    await expect(picker).toHaveValue(red)
    await page.getByRole('button', { name: 'Add status', exact: true }).click()
    await page.getByRole('combobox').last().fill('Test status')
    await page.getByRole('option', { name: 'Test status' }).click()
    await expect(rows.last().locator('input[type=color]')).not.toHaveValue('#74d6b4')
    expect(await rows.last().locator('input[type=color]').inputValue()).not.toBe(red)
    const text = await exported(page)
    const before = await text.inputValue()
    await page.getByRole('button', { name: 'Apply import', exact: true }).click()
    await expect(text).toHaveValue(before)
    await expect(page.locator('canvas')).toHaveAttribute('data-render-state', 'ready')
})

test('a late icon response cannot overwrite a manually chosen status colour', async ({ page }) => {
    await setup(page)
    let release!: () => void
    let requested!: () => void
    const gate = new Promise<void>(resolve => { release = resolve })
    const loading = new Promise<void>(resolve => { requested = resolve })
    await page.route('**/_next/image?**', async route => {
        if ((new URL(route.request().url()).searchParams.get('url') ?? '').includes('213001')) {
            requested()
            await gate
        }
        await route.fallback()
    })
    try {
        await add(page, 'Reassemble')
        await loading
        const row = page.getByTestId('status-row').first()
        await row.getByRole('button', { name: 'API Reassembled Settings' }).click()
        await row.locator('input[type=color]').fill('#123456')
        release()
        await expect(page.locator('canvas')).toHaveAttribute('data-render-state', 'ready')
        await expect(row.locator('input[type=color]')).toHaveValue('#123456')
        await expect(await exported(page)).toHaveValue(/\[851 0 5 #123456\]/)
    } finally { release() }
})

test('API readiness status names and shared recasts for imported actions', async ({ page }) => {
    await setup(page)
    await add(page, 'Barrel Stabilizer')
    await expect(page.getByTestId('status-row')).toHaveCount(2)
    await expect(page.getByRole('checkbox', { name: 'API Hypercharged', exact: true })).toBeChecked()
    await expect(page.getByRole('checkbox', { name: 'API Full Metal Machinist', exact: true })).toBeChecked()
    const text = await exported(page)
    await text.fill('7411 GCD 2.1 1.8 [3864 0 30 #123456 disabled] [3866 0 30 #abcdef]')
    await page.getByRole('button', { name: 'Apply import', exact: true }).click()
    await add(page, 'Heated Slug Shot')
    await recast(page).fill('2.45')
    await recast(page).blur()
    await expect(text).toHaveValue('7411 GCD 2.45 1.8 [3864 0 30 #123456 disabled] [3866 0 30 #abcdef]\n7412 GCD 2.45 0')
    await expect(page.locator('canvas')).toHaveAttribute('data-render-state', 'ready')
})

test('synthetic catalog cast prefills the editor without mount writes', async ({ page }) => {
    await setup(page)
    await page.goto('/render-harness/defaults')
    await expect(page.getByRole('spinbutton', { name: 'Cast Time (s)', exact: true })).toHaveValue('1.8')
    await expect(recast(page)).toHaveValue('2.50')
    await expect(page.locator('canvas')).toHaveAttribute('data-render-state', 'ready')
    expect(await page.evaluate(() => localStorage.getItem('mint-leaf-action-preferences-v1'))).toBeNull()
    await recast(page).fill('2.45')
    await recast(page).blur()
    await expect(page.getByRole('spinbutton', { name: 'Cast Time (s)', exact: true })).toHaveValue('1.8')
    await page.screenshot({ path: 'test-results/synthetic-cast-editor.png', fullPage: true })
})

test('custom status URLs and names roundtrip after correcting an invalid URL', async ({ page }) => {
    await setup(page)
    await add(page, 'Heated Split Shot')
    await page.getByRole('button', { name: 'Add status', exact: true }).click()
    await page.getByRole('button', { name: 'Custom Buff', exact: true }).click()
    const name = 'My buff - [one, two] 日本語'
    await page.getByPlaceholder('Enter buff name...').fill(name)
    const url = page.getByPlaceholder('Enter custom image URL...')
    await url.fill('invalid')
    await url.fill('https://v2.xivapi.com/my-icons/test.png?x=[a,b]')
    await page.getByRole('button', { name: 'Create', exact: true }).click()
    await expect(page.getByTestId('status-row')).toHaveCount(1)
    const text = await exported(page)
    const original = await text.inputValue()
    expect(original).toContain('custom-v2:')
    await page.getByRole('button', { name: 'Apply import', exact: true }).click()
    await expect(text).toHaveValue(original)
    await expect(page.locator('canvas')).toHaveAttribute('data-render-state', 'ready')
})

test('compact inspector supports keyboard type selection, timing options, removal and reset', async ({ page }) => {
    await setup(page)
    await add(page, 'Reassemble')
    const detail = page.getByTestId('action-detail')
    const ogcd = detail.getByRole('radio', { name: 'oGCD', exact: true })
    await ogcd.focus()
    await page.keyboard.press('ArrowLeft')
    await expect(detail.getByRole('radio', { name: 'GCD', exact: true })).toBeChecked()
    await expect(recast(page)).toHaveValue('2.50')
    await detail.getByRole('radio', { name: 'oGCD', exact: true }).check()
    await detail.getByRole('checkbox', { name: 'Late weave', exact: true }).check()
    await expect(await exported(page)).toHaveValue(/2876 oGCD late/)
    await detail.getByRole('checkbox', { name: 'Prepull', exact: true }).check()
    await expect(detail.getByRole('checkbox', { name: 'Late weave', exact: true })).toHaveCount(0)
    await detail.getByRole('spinbutton', { name: 'Time (s)', exact: true }).fill('-3')
    await detail.getByRole('spinbutton', { name: 'Time (s)', exact: true }).blur()
    await expect(await exported(page)).toHaveValue(/-3 2876 oGCD/)
    const settings = detail.getByRole('button', { name: 'API Reassembled Settings' })
    await expect(settings).toHaveAttribute('aria-expanded', 'false')
    await settings.focus()
    await page.keyboard.press('Enter')
    await expect(settings).toHaveAttribute('aria-expanded', 'true')
    await detail.getByRole('button', { name: 'Remove status: API Reassembled', exact: true }).click()
    await expect(detail.getByTestId('status-row')).toHaveCount(0)
    await detail.getByRole('button', { name: 'Reset to defaults', exact: true }).click()
    await expect(detail.getByTestId('status-row')).toHaveCount(1)
    await expect(detail.getByRole('spinbutton', { name: 'Time (s)', exact: true })).toHaveValue('-3')
})

test('detail pane stays contained with expanded settings and localized long names', async ({ page }) => {
    await setup(page)
    await add(page, 'Barrel Stabilizer')
    const detail = page.getByTestId('action-detail')
    await detail.getByRole('button', { name: 'API Full Metal Machinist Settings' }).click()
    await detail.screenshot({ path: 'test-results/detail-statuses.png' })
    await detail.getByRole('button', { name: 'Add status', exact: true }).click()
    await detail.getByRole('button', { name: 'Custom Buff', exact: true }).click()
    await detail.getByPlaceholder('Enter buff name...').fill('A very long custom status name 日本語 with additional details')
    await detail.getByPlaceholder('Enter custom image URL...').fill('https://v2.xivapi.com/test.png')
    await detail.getByRole('button', { name: 'Create', exact: true }).click()
    await detail.getByRole('button', { name: /A very long custom status name.*Settings/ }).click()
    const contained = async () => {
        expect(await detail.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
        for (const card of await detail.getByTestId('status-row').all()) {
            expect(await card.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
        }
    }
    await contained()
    await page.setViewportSize({ width: 1440, height: 1400 })
    await detail.screenshot({ path: 'test-results/detail-long-status.png' })
    await page.getByRole('button', { name: /^Language/ }).click()
    await page.getByRole('menuitem', { name: 'JP', exact: true }).click()
    await expect(detail.getByRole('button', { name: 'ステータスを追加', exact: true })).toBeVisible()
    await contained()
    await detail.screenshot({ path: 'test-results/detail-japanese.png' })
    await page.setViewportSize({ width: 2160, height: 2100 })
    await page.evaluate(() => { document.documentElement.style.setProperty('zoom', '1.5') })
    await contained()
    await detail.screenshot({ path: 'test-results/detail-japanese-zoom.png' })
})


test('long custom action names wrap without letting encoded IDs dominate the header', async ({ page }) => {
    await setup(page)
    await page.getByRole('button', { name: 'Custom Action', exact: true }).click()
    const name = 'A long custom action name with 日本語 and additional description'
    await page.getByPlaceholder('Enter action name...').fill(name)
    await page.getByPlaceholder('Enter custom image URL...').fill('https://v2.xivapi.com/test.png')
    await page.getByRole('button', { name: 'Create', exact: true }).click()
    const detail = page.getByTestId('action-detail')
    await expect(detail.getByText(name, { exact: true })).toBeVisible()
    expect(await detail.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true)
    await expect(detail.getByRole('checkbox', { name: 'Share with matching GCDs' })).toHaveCount(0)
    await detail.getByRole('button', { name: 'Edit action name', exact: true }).hover()
    await detail.screenshot({ path: 'test-results/detail-long-action.png' })
})

test('numeric edits stay as drafts until committed', async ({ page }) => {
    await setup(page)
    await add(page, 'Heated Split Shot')
    await recast(page).fill('')
    await expect(recast(page)).toHaveValue('')
    await recast(page).pressSequentially('1.')
    await expect(recast(page)).toHaveValue('1.')
    expect(await page.evaluate(() => localStorage.getItem('mint-leaf-action-preferences-v1'))).toBeNull()
    await recast(page).pressSequentially('85')
    await recast(page).press('Enter')
    await expect(recast(page)).toHaveValue('1.85')
    await recast(page).fill('-')
    await expect(recast(page)).toHaveValue('-')
    await recast(page).blur()
    await expect(recast(page)).toHaveValue('1.85')
    await recast(page).fill('99')
    await expect(recast(page)).toHaveValue('99')
    await recast(page).press('Escape')
    await expect(recast(page)).toHaveValue('1.85')
    await recast(page).fill('99')
    await recast(page).blur()
    await expect(recast(page)).toHaveValue('30.00')
})


test('sharing updates differently named API GCDs with the same base recast', async ({ page }) => {
    await setup(page)
    await add(page, 'API spell one')
    await page.getByRole('checkbox', { name: 'Share with matching GCDs' }).uncheck()
    await recast(page).fill('2.1')
    await recast(page).blur()
    await add(page, 'API spell two')
    await recast(page).fill('2.4')
    await recast(page).blur()
    await expect(await exported(page)).toHaveValue('99902 GCD 2.4 0\n99903 GCD 2.4 0')
    await add(page, 'API spell one')
    await expect(recast(page)).toHaveValue('2.40')
})

test('inline name editing commits, cancels and resets', async ({ page }) => {
    await setup(page)
    await add(page, 'Heated Split Shot')
    const detail = page.getByTestId('action-detail')
    const edit = () => detail.getByRole('button', { name: 'Edit action name', exact: true })
    const name = () => detail.getByRole('textbox', { name: 'Action name', exact: true })
    await edit().click()
    await name().fill('My opener')
    await name().press('Enter')
    await expect(detail.getByText('My opener', { exact: true })).toBeVisible()
    await edit().click()
    await name().fill('Discard me')
    await name().press('Escape')
    await expect(detail.getByText('My opener', { exact: true })).toBeVisible()
    await edit().click()
    await name().fill('')
    await name().blur()
    await expect(detail.getByText('My opener', { exact: true })).toBeVisible()
    await add(page, 'Heated Split Shot')
    await expect(detail.getByText('My opener', { exact: true })).toBeVisible()
    await detail.getByRole('button', { name: 'Reset to defaults', exact: true }).click()
    await expect(detail.getByText('Heated Split Shot', { exact: true })).toBeVisible()
})

test('job library sorts job skills before role skills and descending by level, cached and fetched', async ({ page }) => {
    await setup(page)
    const library = page.getByTestId('job-action-library')
    const expected = ['API spell one', 'API spell two', 'Barrel Stabilizer', 'Heated Slug Shot', 'Drill', 'Heated Split Shot', 'Auto Crossbow', 'Reassemble', 'Second Wind']
    await expect(library.getByRole('button')).toHaveText(expected)
    await page.getByRole('button', { name: 'Reload skill list', exact: true }).click()
    await expect(library.getByRole('button')).toHaveText(expected)
    await expect(page.getByRole('button', { name: 'Reload skill list', exact: true })).toBeEnabled()
})

test('import/export accordion supports keyboard toggling and retains draft text', async ({ page }) => {
    await setup(page)
    const summary = page.locator('summary').filter({ hasText: 'Import / Export' })
    const accordion = page.locator('details').filter({ has: summary })
    const text = page.getByRole('textbox', { name: 'Import / Export', exact: true })
    await summary.focus()
    await summary.press('Enter')
    await text.fill('7411 GCD 2.4 0')
    await summary.press('Space')
    await expect(text).toBeHidden()
    await summary.press('Enter')
    await expect(text).toHaveValue('7411 GCD 2.4 0')
    await page.getByRole('button', { name: 'Apply import', exact: true }).click()
    await expect(page.locator('canvas')).toHaveAttribute('data-render-state', 'ready')
    await expect(text).toHaveValue('7411 GCD 2.4 0')
    await accordion.screenshot({ path: 'test-results/import-export-expanded.png' })
    await summary.press('Space')
    await summary.hover()
    await accordion.screenshot({ path: 'test-results/import-export-collapsed.png' })
})
