import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'

const fixtures = ['empty', 'ordinary', 'reported', 'dense', 'long-header'] as const

for (const fixture of fixtures) {
    test(`${fixture} fixture has a clean measured layout`, async ({ page }) => {
        await page.goto(`/render-harness?fixture=${fixture}`)
        const harness = page.getByTestId('render-harness')
        await expect(harness).toHaveAttribute('data-ready', 'true', { timeout: 30_000 })
        const diagnostics = JSON.parse(await page.getByTestId('layout-diagnostics').textContent() ?? '{}')
        expect(diagnostics.status).toBe('ready')
        expect(diagnostics.violations).toEqual([])
        const dimensions = await page.locator('canvas').evaluate(canvas => ({
            width: (canvas as HTMLCanvasElement).width + 2,
            height: (canvas as HTMLCanvasElement).height,
        }))
        await page.setViewportSize(dimensions)
        await expect(page.locator('canvas')).toHaveScreenshot(`${fixture}.png`)
    })
}

const rowScenarios = [
    { name: 'dense-two-rows', fixture: 'dense', rows: 2 },
    { name: 'dense-three-rows-zero-gap', fixture: 'dense', rows: 3, spacing: 0 },
    { name: 'ordinary-two-rows-custom-gap', fixture: 'ordinary', rows: 2, spacing: 400 },
    { name: 'long-header-two-rows', fixture: 'long-header', rows: 2 },
    { name: 'nested-buffs-two-rows', fixture: 'nested-buffs', rows: 2 },
    { name: 'nested-buffs-three-rows', fixture: 'nested-buffs', rows: 3 },
]

for (const scenario of rowScenarios) {
    test(`${scenario.name} keeps complete rows in a clean layout`, async ({ page }) => {
        const params = new URLSearchParams({ fixture: scenario.fixture, rows: String(scenario.rows) })
        if (scenario.spacing !== undefined) params.set('spacing', String(scenario.spacing))
        await page.goto(`/render-harness?${params}`)
        await expect(page.getByTestId('render-harness')).toHaveAttribute('data-ready', 'true', { timeout: 30_000 })
        const diagnostics = JSON.parse(await page.getByTestId('layout-diagnostics').textContent() ?? '{}')
        expect(diagnostics.violations).toEqual([])
        const dimensions = await page.locator('canvas').evaluate(canvas => ({
            width: (canvas as HTMLCanvasElement).width + 2,
            height: (canvas as HTMLCanvasElement).height,
        }))
        await page.setViewportSize(dimensions)
        await expect(page.locator('canvas')).toHaveScreenshot(`${scenario.name}.png`)
    })
}

test('row controls update layout and preview/export use the complete canvas', async ({ page }) => {
    await page.goto('/render-harness?fixture=dense&controls=true')
    const ready = () => expect(page.getByTestId('render-harness')).toHaveAttribute('data-ready', 'true')
    await ready()
    const rows = page.getByRole('spinbutton', { name: 'Rows', exact: true })
    const spacing = page.getByRole('spinbutton', { name: 'Row spacing', exact: true })
    await expect(rows).toHaveValue('1')
    await expect(rows).toHaveAttribute('max', '3')
    await expect(spacing).toBeDisabled()
    await expect(page.getByText('Wrap width', { exact: true })).toHaveCount(0)
    await rows.fill('2')
    await rows.press('Tab')
    await expect(spacing).toBeEnabled()
    await ready()
    const defaultHeight = await page.locator('canvas').evaluate(canvas => (canvas as HTMLCanvasElement).height)
    await spacing.fill('0')
    await expect.poll(() => page.locator('canvas').evaluate(canvas => (canvas as HTMLCanvasElement).height)).toBe(defaultHeight - 128)
    await spacing.fill('')
    await expect.poll(() => page.locator('canvas').evaluate(canvas => (canvas as HTMLCanvasElement).height)).toBe(defaultHeight)

    const bitmap = await page.locator('canvas').evaluate(canvas => ({
        width: (canvas as HTMLCanvasElement).width,
        height: (canvas as HTMLCanvasElement).height,
        url: (canvas as HTMLCanvasElement).toDataURL('image/png'),
    }))
    await page.getByRole('button', { name: 'Preview', exact: true }).click()
    const preview = page.getByRole('dialog').getByRole('img', { name: 'Preview' })
    await expect(preview).toHaveAttribute('src', bitmap.url)
    await expect.poll(() => preview.evaluate(img => ({ width: (img as HTMLImageElement).naturalWidth, height: (img as HTMLImageElement).naturalHeight })))
        .toEqual({ width: bitmap.width, height: bitmap.height })
    await page.keyboard.press('Escape')
    const downloadEvent = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Export to PNG' }).click()
    const download = await downloadEvent
    const png = await readFile((await download.path())!)
    expect(png.readUInt32BE(16)).toBe(bitmap.width)
    expect(png.readUInt32BE(20)).toBe(bitmap.height)
    expect(png.toString('base64')).toBe(bitmap.url.split(',')[1])

    for (const [raw, expected] of [['99', '3'], ['-2', '1'], ['1.5', '1'], ['', '1']]) {
        await rows.fill(raw)
        await rows.press('Tab')
        await expect(rows).toHaveValue(expected)
        await ready()
    }
    await expect(spacing).toBeDisabled()
})
