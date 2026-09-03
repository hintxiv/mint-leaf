import { expect, test } from '@playwright/test'

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
