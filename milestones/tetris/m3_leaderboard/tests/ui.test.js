const { test, expect } = require('@playwright/test');

// These tests share the server's in-memory leaderboard.
test.describe.configure({ mode: 'serial' });

test.beforeEach(async ({ page, request }) => {
  expect((await request.delete('/api/scores')).status()).toBe(200);
  // Seed before navigation; loading the leaderboard need not involve polling.
  expect((await request.post('/api/score', {
    data: { name: 'Ada', score: 1200, lines: 12, level: 2 },
  })).status()).toBe(201);
  await page.goto('/?test=1');
  await expect.poll(() => page.evaluate(() => typeof window.__tetris?.reset)).toBe('function');
  await page.evaluate(() => window.__tetris.reset(42));
});

test('the leaderboard displays an entry posted through the API', async ({ page }) => {
  const leaderboard = page.locator('#leaderboard');
  await expect(leaderboard).toBeVisible();
  const row = leaderboard.locator('li').filter({
    has: page.locator('.lb-name', { hasText: /^Ada$/ }),
  });
  await expect(row.locator('.lb-name')).toBeVisible();
  await expect(row.locator('.lb-score')).toBeVisible();
  await expect(row.locator('.lb-score')).toHaveText('1200');
});

test('game over allows submitting a name that appears without reloading', async ({ page }) => {
  const state = await page.evaluate(() => {
    const game = window.__tetris;
    for (let drop = 0; drop < 1000 && !game.getState().gameOver; drop++) {
      game.hardDrop();
    }
    return game.getState();
  });
  expect(state.gameOver, 'Expected game over within 1000 unmoved hard drops').toBe(true);
  expect(state.active).toBeNull();
  const form = page.locator('#score-form');
  await expect(form).toBeVisible();
  await form.locator('input[name="name"]').fill('Grace');
  // This test-owned marker is lost if submission replaces the document.
  await page.evaluate(() => { window.__tetrisConformanceDocumentMarker = 'same-document'; });
  await form.locator('button[type="submit"]').click();
  await expect(page.locator('#leaderboard .lb-name').filter({ hasText: /^Grace$/ })).toBeVisible();
  expect(await page.evaluate(() => window.__tetrisConformanceDocumentMarker)).toBe('same-document');
});
