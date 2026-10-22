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

test('primary and secondary actions are visually distinct and clearly named', async ({ page }) => {
  await page.goto('/');
  const primary = page.getByRole('link', { name: 'Explorar psicólogos sin cuenta' });
  const secondary = page.getByRole('link', { name: 'Iniciar sesión' });
  await expect(primary).toBeVisible();
  await expect(secondary).toBeVisible();
  await expect(page.getByRole('link', { name: 'Crear perfil profesional' })).toBeVisible();
  const primaryColor = await primary.evaluate(element => getComputedStyle(element).backgroundColor);
  const secondaryColor = await secondary.evaluate(element => getComputedStyle(element).backgroundColor);
  expect(primaryColor).not.toBe(secondaryColor);
  expect(await primary.evaluate(element => element.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
  expect(await secondary.evaluate(element => element.getBoundingClientRect().height)).toBeGreaterThanOrEqual(40);
});
