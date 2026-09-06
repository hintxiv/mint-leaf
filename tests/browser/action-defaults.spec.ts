import { expect, test, Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'

const actions = [
    { id: '7411', name: 'Heated Split Shot', level: 54 },
    { id: '7412', name: 'Heated Slug Shot', level: 60 },
    { id: '16497', name: 'Auto Crossbow', level: 52 },
    { id: '2876', name: 'Reassemble', level: 10 },
    { id: '16498', name: 'Drill', level: 58 },
    { id: '7414', name: 'Barrel Stabilizer', level: 66 },
]

async function setup(page: Page) {
    const icon = await readFile('public/Balance_Logo-02.png')
    await page.route('**/_next/image?**', route => route.fulfill({ contentType: 'image/png', body: icon }))
    await page.route('https://v2.xivapi.com/**', route => {
        const url = new URL(route.request().url())
        if (url.pathname.includes('/asset/')) return route.fulfill({ contentType: 'image/png', body: icon })
        if (url.pathname.includes('/sheet/')) {
            const id = url.pathname.split('/').pop()!
            return route.fulfill({ json: { fields: { Name: actions.find(action => action.id === id)?.name ?? 'Fixture', Icon: { path_hr1: 'ui/icon/test.tex' } } } })
        }
        const query = url.searchParams.get('query') ?? ''
        const status = url.searchParams.get('sheets') === 'Status'
        const list = status ? [{ id: '99901', name: 'Test status', level: 1 }] : query.includes('~')
            ? actions.filter(action => query.toLowerCase().includes(action.name.toLowerCase())) : actions
        return route.fulfill({ json: { results: list.map(action => ({ row_id: Number(action.id), sheet: status ? 'Status' : 'Action', fields: {
            Name: action.name, Icon: { path_hr1: 'ui/icon/test.tex' }, ClassJobLevel: action.level, IsPlayerAction: true,
        } })), version: 'fixture-version', schema: 'fixture-schema' } })
    })
    await page.addInitScript(({ actions }) => {
        localStorage.setItem('mint-leaf-locale', 'en')
        localStorage.setItem('mint-leaf-job-actions', JSON.stringify({ 'MCH:en': {
            fetchedAt: Date.now(), format: 3, version: 'older-list-revision', actions: actions.map(action => ({
                id: action.id, name: action.name, iconUrl: 'https://v2.xivapi.com/api/asset/test.png',
                isPlayerAction: true, description: null, classJobLevel: action.level,
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
    await page.getByRole('checkbox', { name: 'Prepull?', exact: true }).check()
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
    await page.getByRole('checkbox', { name: 'Use for matching GCDs' }).uncheck()
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
    await expect(page.getByRole('switch')).not.toBeChecked()
    await expect(page.getByTestId('status-row')).toHaveCount(1)
    await page.getByRole('button', { name: 'Add status', exact: true }).click()
    await page.getByRole('combobox').last().fill('Test status')
    await page.getByRole('option', { name: 'Test status' }).click()
    await expect(page.getByTestId('status-row')).toHaveCount(2)
    const second = page.getByTestId('status-row').nth(1)
    await second.locator('summary').click()
    await second.getByRole('spinbutton', { name: 'Test status Duration (s)' }).fill('13')
    await second.locator('input[type=color]').fill('#cc33ee')
    await second.getByRole('checkbox').uncheck()
    await expect(await exported(page)).toHaveValue(/\[99901 0 13 #cc33ee disabled\]/)
    await second.getByRole('checkbox').check()
    for (let i = 0; i < 9; i++) await add(page, 'Heated Split Shot')
    await page.locator('canvas').waitFor()
    await expect(page.locator('canvas')).toHaveAttribute('data-render-state', 'ready')
    // Actual raster must contain both independently colored status lines.
    const colors = await page.locator('canvas').evaluate(element => {
        const canvas = element as HTMLCanvasElement
        const pixels = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data
        const counts = [0, 0]
        for (let i = 0; i < pixels.length; i += 4) {
            if (pixels[i] === 116 && pixels[i + 1] === 214 && pixels[i + 2] === 180) counts[0]++
            if (pixels[i] === 204 && pixels[i + 1] === 51 && pixels[i + 2] === 238) counts[1]++
        }
        return counts
    })
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
    await page.getByTestId('status-row').nth(1).locator('summary').click()
    await expect(page.getByTestId('status-row').nth(1).locator('input[type=color]')).toHaveValue('#cc33ee')
})

test('automatic multiple readiness statuses and imported timing exceptions', async ({ page }) => {
    await setup(page)
    await add(page, 'Barrel Stabilizer')
    await expect(page.getByTestId('status-row')).toHaveCount(2)
    await expect(page.getByRole('checkbox', { name: 'Hypercharged', exact: true })).toBeChecked()
    await expect(page.getByRole('checkbox', { name: 'Full Metal Machinist', exact: true })).toBeChecked()
    const text = await exported(page)
    await text.fill('7411 GCD 2.1 1.8 [3864 0 30 #123456 disabled] [3866 0 30 #abcdef]')
    await page.getByRole('button', { name: 'Apply import', exact: true }).click()
    await add(page, 'Heated Slug Shot')
    await recast(page).fill('2.45')
    await recast(page).blur()
    await expect(text).toHaveValue('7411 GCD 2.1 1.8 [3864 0 30 #123456 disabled] [3866 0 30 #abcdef]\n7412 GCD 2.45 0')
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
