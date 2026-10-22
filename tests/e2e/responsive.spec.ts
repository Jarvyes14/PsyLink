import { expect, test } from '@playwright/test';

const routes = ['/', '/login', '/register', '/discover', '/saved', '/privacy'];
const widths = [320, 375, 768, 1024, 1440];

test('public pages fit common phone, tablet, and desktop widths', async ({ page }) => {
  for (const width of widths) {
    await page.setViewportSize({ width, height: 800 });
    for (const route of routes) {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('main').last()).toBeVisible();
      const overflow = await page.evaluate(() => ({
        viewport: document.documentElement.clientWidth,
        content: document.documentElement.scrollWidth,
        elements: [...document.querySelectorAll('body *')]
          .filter(element => {
            const box = element.getBoundingClientRect();
            return box.width > 0 && box.right > innerWidth + 1;
          })
          .slice(0, 4)
          .map(element => `${element.tagName.toLowerCase()}.${element.className}`),
      }));
      expect(overflow.content, `${route} at ${width}px: ${overflow.elements.join(', ')}`).toBeLessThanOrEqual(overflow.viewport + 1);
    }
  }
});

test('phone navigation keeps exploration and sign in accessible', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto('/discover');
  await expect(page.getByRole('link', { name: 'Explorar profesionales' })).toBeInViewport();
  await expect(page.getByRole('link', { name: /Guardados/ })).toBeInViewport();
  await expect(page.getByRole('link', { name: /Iniciar sesión/ })).toBeInViewport();
});
