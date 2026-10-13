const { test, expect } = require('@playwright/test');

test.beforeEach(async ({ page }) => {
  await page.goto('/?test=1');
  await expect.poll(() => page.evaluate(() => typeof window.__tetris?.reset))
    .toBe('function');
  await page.evaluate(() => window.__tetris.reset(42));
});

async function endGame(page) {
  const state = await page.evaluate(() => {
    const game = window.__tetris;
    for (let drop = 0; drop < 1000 && !game.getState().gameOver; drop++) {
      game.hardDrop();
    }
    return game.getState();
  });
  expect(state.gameOver, 'Expected game over within 1000 unmoved hard drops').toBe(true);
  expect(state.active).toBeNull();
  return state;
}

async function expectCounters(page, state) {
  for (const field of ['score', 'lines', 'level']) {
    expect(Number.isFinite(state[field])).toBe(true);
    await expect(page.locator(`#${field}`)).toBeVisible();
    // Poll textContent directly: the contract says exactly the number,
    // whereas toHaveText normalizes whitespace.
    await expect.poll(() => page.locator(`#${field}`).textContent()).toBe(String(state[field]));
  }
}

async function expectActionsBlocked(page) {
  const observations = await page.evaluate(() => {
    const game = window.__tetris;
    const actions = [
      ['step', []], ['shift', [1]], ['shift', [-1]],
      ['rotate', [1]], ['rotate', [-1]], ['softDrop', []], ['hardDrop', []],
    ];
    return actions.map(([name, args]) => {
      const before = game.getState();
      const result = game[name](...args);
      return { name, before, result, after: game.getState() };
    });
  });
  for (const { name, before, result, after } of observations) {
    expect(result, `${name} while actions are blocked`).toBe(name === 'hardDrop' ? 0 : false);
    for (const field of ['active', 'next', 'settledCells', 'score', 'lines', 'level', 'paused', 'gameOver']) {
      expect(after[field], `${name} must preserve ${field}`).toEqual(before[field]);
    }
  }
}

test('setupClear makes the next hard drop clear lines, remove cells and earn points', async ({ page }) => {
  const { before, after } = await page.evaluate(() => {
    const game = window.__tetris;
    game.setupClear();
    const before = game.getState();
    game.hardDrop();
    return { before, after: game.getState() };
  });
  expect(after.lines).toBeGreaterThanOrEqual(before.lines + 1);
  expect(after.score).toBeGreaterThan(before.score);
  expect(after.settledCells).toBeLessThan(before.settledCells + 4);
  expect(after.settledCells).toBeGreaterThanOrEqual(0);
});

test('a hard drop that clears lines scores more than the same drop without a clear', async ({ page }) => {
  const { plain, clearing } = await page.evaluate(() => {
    const game = window.__tetris;
    // Same seed and same piece; setupClear doesn't change the drop path, only fills a line.
    game.reset(4242);
    const s0 = game.getState().score;
    game.hardDrop();
    const plain = game.getState().score - s0;
    game.reset(4242);
    game.setupClear();
    const s1 = game.getState().score;
    game.hardDrop();
    const clearing = game.getState().score - s1;
    return { plain, clearing };
  });
  expect(clearing).toBeGreaterThan(plain);
});

test('visible counters match state before and after a clear and the next preview is visible', async ({ page }) => {
  await expectCounters(page, await page.evaluate(() => window.__tetris.getState()));
  await expect(page.locator('#next')).toBeVisible();
  const after = await page.evaluate(() => {
    window.__tetris.setupClear();
    window.__tetris.hardDrop();
    return window.__tetris.getState();
  });
  await expectCounters(page, after);
  await expect(page.locator('#next')).toBeVisible();
});

test('pause blocks all piece actions and resume restores play', async ({ page }) => {
  await expect(page.locator('#paused')).toBeHidden();
  await page.evaluate(() => window.__tetris.togglePause());
  await expect.poll(() => page.evaluate(() => window.__tetris.getState().paused)).toBe(true);
  await expect(page.locator('#paused')).toBeVisible();
  await expectActionsBlocked(page);
  await page.evaluate(() => window.__tetris.togglePause());
  await expect.poll(() => page.evaluate(() => window.__tetris.getState().paused)).toBe(false);
  await expect(page.locator('#paused')).toBeHidden();
  expect(await page.evaluate(() => window.__tetris.softDrop())).toBe(true);
});

test('unmoved hard drops eventually end the game and block piece actions', async ({ page }) => {
  await expect(page.locator('#game-over')).toBeHidden();
  await endGame(page);
  await expect(page.locator('#game-over')).toBeVisible();
  await expectActionsBlocked(page);
});

test('the start button starts a fresh game after game over', async ({ page }) => {
  // Earn points first so resetting score and lines is observable.
  await page.evaluate(() => {
    window.__tetris.setupClear();
    window.__tetris.hardDrop();
  });
  await endGame(page);
  await page.locator('#start-btn').click();
  await expect.poll(() => page.evaluate(() => {
    const state = window.__tetris.getState();
    return {
      score: state.score, lines: state.lines, gameOver: state.gameOver,
      paused: state.paused, settledCells: state.settledCells, hasActive: state.active !== null,
    };
  })).toEqual({ score: 0, lines: 0, gameOver: false, paused: false, settledCells: 0, hasActive: true });
  await expect(page.locator('#game-over')).toBeHidden();
  await expect(page.locator('#paused')).toBeHidden();
  await expectCounters(page, await page.evaluate(() => window.__tetris.getState()));
});
