# Tetris Variant - Build Instructions

<!-- STUDENTS: Fill in the three STUDENT SECTIONs. Leave the provided sections unchanged. -->

## Current Milestone (STUDENT SECTION)

<!-- Which milestone the agent should work on now. Earlier tests must keep passing. -->

Milestone 1: Core Mechanics. Make `tests/m1_core/ui.test.js` pass.

## My Variant (STUDENT SECTION)

<!-- Your game's rules: arena shape and size, where pieces enter, which way they fall, what a line is, what happens after a clear, the randomizer, controls, scoring, and speed. Say what's different from classic Tetris. Add more detail as you release later milestones. -->

Write your variant's rules here.

## Look and Feel (STUDENT SECTION)

<!-- Theme, colors, fonts, layout, animations, and effects. -->

Write your visual style here.

## What Counts as a Tetris — Milestone 1 (do not modify)

Build a single-player Tetris variant in the browser. It must differ from classic Tetris in at least one of: arena shape, entry point, gravity direction, what a line is, or what happens after a clear. A new visual theme isn't enough.

1. The arena is finite and made of cells. Its shape and size are up to you.
2. Pieces are tetrominoes (four cells joined edge to edge). Use all seven shapes: I, O, T, S, Z, J and L.
3. One piece is active at a time. It enters at a place you choose, and the player can always see the next piece.
4. Gravity moves the active piece one cell at a time. Its direction can be fixed, chosen per piece, or depend on position. Gravity gets faster as the game goes on, which you'll add in Milestone 2.
5. The player can move the piece sideways (across gravity), rotate it, soft drop it one cell, and hard drop it all the way. My Variant defines the controls.
6. The active piece never overlaps the arena's edge or settled cells.
7. When the piece can't move any further, it settles and the next piece enters.

## Common Interface — Milestone 1 (do not modify)

Use Node.js, Express, and plain browser JavaScript, with no frontend framework or build step. Serve `public/` statically so that `GET /` returns `public/index.html`. Set `"start": "node index.js"` in `package.json`, and run the server on port 3000.

Expose these methods on `window.__tetris`:

- `reset(seed)`: start a new game with an empty arena. The optional integer seed makes the piece sequence repeatable.
- `getState()`: return a copy of the game state (below).
- `shift(dir)`: move sideways, `-1` one way and `1` the other. Return whether it moved.
- `rotate(dir)`: `1` clockwise, `-1` counter-clockwise. Return whether it rotated.
- `softDrop()`: move one cell along gravity. Return whether it moved.
- `hardDrop()`: move as far as possible and settle. Return the number of cells moved.
- `step()`: one gravity tick. Move one cell, or settle if blocked. Return whether it moved.

`getState()` returns at least:

```js
{
  active: { type: 'T', cells: [[a, b], /* three more cells */] } | null,
  next: 'S',
  settledCells: 0   // number of settled cells in the arena
}
```

Coordinates use your variant's own system, such as `[row, col]` or `[ring, sector]`, in any order. Extra fields are fine. Changing the returned copy must not change the game.

The M1 tests also expect a few things that Milestone 2 completes:
- `togglePause()` and `setupClear()` exist (they can do nothing for now)
- `getState()` includes `lines: 0`, `paused: false` and `gameOver: false`
- when a new piece can't enter, `gameOver` becomes `true` and `active` becomes `null`

With `?test=1` in the URL, turn off automatic gravity. The tests advance the game through the methods above. Show the arena and active piece in a visible `#board`, along with a next-piece preview.

The tests are in `tests/m1_core/ui.test.js`. Run them with `playwright.run test_file=tests/m1_core/ui.test.js` while the server is running. Don't modify the provided tests. Put extra tests in `tests/extra/`. Playwright test files must be named `ui.test.js`, so use subfolders for more than one.
