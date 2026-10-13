const { test, expect } = require('@playwright/test');

const methods = [
  'reset', 'getState', 'shift', 'rotate', 'softDrop', 'hardDrop',
  'step', 'togglePause', 'setupClear',
];

// Compare sets of opaque coordinate pairs; never infer axes, adjacency or bounds.
function cellsKey(cells) {
  return cells.map(cell => JSON.stringify(cell)).sort();
}

function expectPiece(active) {
  expect(active).not.toBeNull();
  expect(typeof active.type).toBe('string');
  expect(active.type.length).toBeGreaterThan(0);
  expect(active.cells).toHaveLength(4);
  for (const cell of active.cells) {
    expect(Array.isArray(cell)).toBe(true);
    expect(cell).toHaveLength(2);
  }
  expect(new Set(cellsKey(active.cells)).size).toBe(4);
}

async function sequence(page, seed, pieces = 11) {
  return page.evaluate(({ seed, pieces }) => {
    const game = window.__tetris;
    game.reset(seed);
    const types = [];
    for (let i = 0; i < pieces; i++) {
      const state = game.getState();
      if (state.gameOver || !state.active) break;
      types.push(state.active.type);
      if (i + 1 < pieces) {
        // Spread pieces sideways so small arenas don't end the game before the sequence is read.
        const dir = i % 2 ? 1 : -1;
        for (let k = 0; k < 2 * (i % 4) + 1; k++) if (!game.shift(dir)) break;
        game.hardDrop();
      }
    }
    return types;
  }, { seed, pieces });
}

test.beforeEach(async ({ page }) => {
  await page.goto('/?test=1');
  await expect.poll(() => page.evaluate(() => typeof window.__tetris?.reset))
    .toBe('function');
  await page.evaluate(() => window.__tetris.reset(42));
});

test('the board is visible and the entire common interface is available', async ({ page }) => {
  await expect(page.locator('#board')).toBeVisible();
  for (const method of methods) {
    await expect.poll(() => page.evaluate(name => typeof window.__tetris[name], method))
      .toBe('function');
  }
});

test('reset produces one four-cell piece and an empty, running arena', async ({ page }) => {
  const state = await page.evaluate(() => window.__tetris.getState());
  expectPiece(state.active);
  expect(state.settledCells).toBe(0);
  expect(state.paused).toBe(false);
  expect(state.gameOver).toBe(false);
  expect(typeof state.next).toBe('string');
  expect(state.next.length).toBeGreaterThan(0);
});

test('getState returns an independent copy, including nested cells', async ({ page }) => {
  const { before, after } = await page.evaluate(() => {
    const game = window.__tetris;
    const fields = ['active', 'next', 'settledCells', 'score', 'lines', 'level', 'paused', 'gameOver'];
    const common = state => Object.fromEntries(fields.map(key => [key, state[key]]));
    const state = game.getState();
    const before = JSON.parse(JSON.stringify(common(state)));
    state.active.type = '__mutated__';
    state.active.cells[0][0] = '__mutated__';
    state.active.cells[1] = ['__mutated__', '__mutated__'];
    Reflect.set(state.active.cells, String(state.active.cells.length), ['__extra__', '__extra__']);
    state.active = null;
    state.next = '__mutated__';
    state.settledCells = -100;
    state.score = -100;
    state.lines = -100;
    state.level = -100;
    state.paused = true;
    state.gameOver = true;
    return { before, after: common(game.getState()) };
  });
  expect(after).toEqual(before);
});

test('the same seed reproduces the active-type sequence across up to ten drops', async ({ page }) => {
  for (const seed of [1, 42, 2026]) {
    const first = await sequence(page, seed);
    expect(first.length).toBeGreaterThanOrEqual(2);
    expect(await sequence(page, seed)).toEqual(first);
  }
});

test('different seeds produce different sequences with at most two coincidences', async ({ page }) => {
  const baseline = await sequence(page, 42);
  let coincidences = 0;
  for (const seed of [1, 2, 3, 17, 99, 2026]) {
    const candidate = await sequence(page, seed);
    expect(candidate.length).toBeGreaterThanOrEqual(2);
    // Only actual shared observations count: early game over is not evidence
    // that the randomizer produced a different type sequence.
    const shared = Math.min(baseline.length, candidate.length);
    if (candidate.slice(0, shared).every((type, i) => type === baseline[i])) coincidences++;
  }
  expect(coincidences).toBeLessThanOrEqual(2);
});

test('some seed exposes all seven types within its first fourteen pieces', async ({ page }) => {
  test.skip(process.env.TETRIS_USES_ALL_SEVEN === '0',
    'Explicit variant declaration: this variant does not use all seven types.');
  let best = 0;
  for (let seed = 0; seed < 32; seed++) {
    // Type labels can name natural equivalents; do not require I/O/T/S/Z/J/L.
    best = Math.max(best, new Set(await sequence(page, seed, 14)).size);
    if (best >= 7) break;
  }
  expect(best).toBeGreaterThanOrEqual(7);
});

test('manual gravity advances or settles a piece, with at least one advance', async ({ page }) => {
  let advances = 0;
  for (let tick = 0; tick < 12; tick++) {
    const { before, moved, after } = await page.evaluate(() => {
      const game = window.__tetris;
      const before = game.getState();
      const moved = game.step();
      return { before, moved, after: game.getState() };
    });
    expectPiece(after.active);
    if (moved === true) {
      advances++;
      expect(cellsKey(after.active.cells)).not.toEqual(cellsKey(before.active.cells));
      expect(after.settledCells).toBe(before.settledCells);
    } else {
      expect(moved).toBe(false);
      expect(after.settledCells).toBe(before.settledCells + 4);
      expect(after.active.type).toBe(before.next);
      break;
    }
  }
  expect(advances).toBeGreaterThan(0);
});

test('soft drop moves a fresh piece', async ({ page }) => {
  const { before, moved, after } = await page.evaluate(() => {
    const game = window.__tetris;
    const before = game.getState();
    const moved = game.softDrop();
    return { before, moved, after: game.getState() };
  });
  expect(moved).toBe(true);
  expectPiece(after.active);
  expect(cellsKey(after.active.cells)).not.toEqual(cellsKey(before.active.cells));
  expect(after.settledCells).toBe(before.settledCells);
});

test('hard drop settles four cells and brings in the next piece', async ({ page }) => {
  const { before, distance, after } = await page.evaluate(() => {
    const game = window.__tetris;
    const before = game.getState();
    const distance = game.hardDrop();
    return { before, distance, after: game.getState() };
  });
  expect(Number.isInteger(distance)).toBe(true);
  expect(distance).toBeGreaterThanOrEqual(0);
  expect(after.lines).toBe(before.lines);
  expect(after.settledCells).toBe(before.settledCells + 4);
  expectPiece(after.active);
  expect(after.active.type).toBe(before.next);
});

test('at least one sideways direction moves and its inverse restores the cells', async ({ page }) => {
  let moves = 0;
  for (const dir of [1, -1]) {
    const { before, moved, shifted, reversed, after } = await page.evaluate(dir => {
      const game = window.__tetris;
      game.reset(42);
      const before = game.getState();
      const moved = game.shift(dir);
      const shifted = game.getState();
      const reversed = moved ? game.shift(-dir) : null;
      return { before, moved, shifted, reversed, after: game.getState() };
    }, dir);
    expect(typeof moved).toBe('boolean');
    expectPiece(shifted.active);
    expect(shifted.settledCells).toBe(before.settledCells);
    if (moved) {
      moves++;
      expect(cellsKey(shifted.active.cells)).not.toEqual(cellsKey(before.active.cells));
      expect(reversed).toBe(true);
    }
    expect(cellsKey(after.active.cells)).toEqual(cellsKey(before.active.cells));
  }
  expect(moves).toBeGreaterThan(0);
});

test('a non-O piece rotates and inverse rotation restores its cells', async ({ page }) => {
  const result = await page.evaluate(() => {
    const game = window.__tetris;
    for (let seed = 0; seed < 32; seed++) {
      game.reset(seed);
      for (let drop = 0; drop < 14; drop++) {
        const before = game.getState();
        if (before.gameOver || !before.active) break;
        if (before.active.type !== 'O') {
          const rotated = game.rotate(1);
          const middle = game.getState();
          const reversed = game.rotate(-1);
          return { before, rotated, middle, reversed, after: game.getState() };
        }
        game.hardDrop();
      }
    }
    return null;
  });
  expect(result, 'No non-O active piece found in the bounded seed search').not.toBeNull();
  expect(result.rotated).toBe(true);
  expectPiece(result.middle.active);
  expect(cellsKey(result.middle.active.cells)).not.toEqual(cellsKey(result.before.active.cells));
  expect(result.middle.settledCells).toBe(result.before.settledCells);
  expect(result.reversed).toBe(true);
  expect(cellsKey(result.after.active.cells)).toEqual(cellsKey(result.before.active.cells));
});

test('repeated drops preserve cell counts except when lines remove cells', async ({ page }) => {
  for (const seed of [1, 42, 2026]) {
    const trace = await page.evaluate(seed => {
      const game = window.__tetris;
      game.reset(seed);
      const trace = [];
      for (let drop = 0; drop < 200; drop++) {
        const before = game.getState();
        if (before.gameOver) break;
        const distance = game.hardDrop();
        trace.push({ before, distance, after: game.getState() });
      }
      return trace;
    }, seed);
    expect(trace.length).toBeGreaterThan(0);
    for (const { before, distance, after } of trace) {
      expectPiece(before.active);
      expect(Number.isInteger(distance)).toBe(true);
      expect(distance).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(after.settledCells)).toBe(true);
      expect(after.settledCells).toBeGreaterThanOrEqual(0);
      expect(after.lines).toBeGreaterThanOrEqual(before.lines);
      if (after.lines === before.lines) {
        // Overwriting occupied cells would normally violate this conservation law.
        expect(after.settledCells).toBe(before.settledCells + 4);
      } else {
        expect(after.settledCells).toBeLessThan(before.settledCells + 4);
      }
      if (after.gameOver) expect(after.active).toBeNull();
      else expectPiece(after.active);
    }
  }
});

test('test mode disables automatic gravity', async ({ page }) => {
  const before = await page.evaluate(() => window.__tetris.getState());
  // Intentional negative timing check: an immediate successful poll would not
  // demonstrate that automatic gravity remains disabled over an interval.
  await page.waitForTimeout(1500);
  const after = await page.evaluate(() => window.__tetris.getState());
  expect(cellsKey(after.active.cells)).toEqual(cellsKey(before.active.cells));
  expect(after.active.type).toBe(before.active.type);
  expect(after.settledCells).toBe(before.settledCells);
});
