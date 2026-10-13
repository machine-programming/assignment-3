
## What Counts as a Tetris — Milestone 2 (do not modify)

8. Your variant defines what a line is: a row, a ring, a half-row, and so on. When every cell of a line is filled, the line clears and its cells are removed. Remaining cells may shift, depending on your rules. Clearing lines is the only way cells leave the arena.
9. Clearing lines earns points, and clearing several lines with one piece earns more than clearing them one at a time. Gravity gets faster as the game goes on (rule 4).
10. The game ends when a new piece can't enter the arena. Show a game-over message and stop the pieces.
11. The player can start, pause, resume and restart. Nothing moves while paused. Show the score, lines cleared, level, and next piece.

## Common Interface — Milestone 2 (do not modify)

Keep the Milestone 1 interface. `getState()` now also has:

- `score`: points, starting at 0
- `lines`: lines cleared, starting at 0
- `level`: the current level, starting at 1
- `paused`: whether the game is paused
- `gameOver`: whether the game is over. `active` is `null` when it is.

`togglePause()` pauses or resumes the game. Give it a key too. While the game is paused or over, piece actions change nothing: `shift`, `rotate`, `softDrop` and `step` return `false`, and `hardDrop` returns `0`.

`setupClear()` is a test hook. It arranges the settled cells, and the active piece if needed, so that the next `hardDrop()` completes at least one line. One way to do this: work out where the piece will land, then fill the line that runs across gravity through the piece's farthest landing cells, leaving those cells empty. The piece never has to pass through that line.

The page also needs:

- `#score`, `#lines` and `#level`, whose text is exactly the number (put labels in separate elements)
- a visible `#next` preview
- `#start-btn`, which starts a fresh game, with automatic gravity outside test mode
- `#paused`, visible only while paused
- `#game-over`, visible only when the game is over

The tests are in `tests/m2_rules/ui.test.js`. Run them with `playwright.run test_file=tests/m2_rules/ui.test.js` while the server is running. Don't modify the provided tests, and keep the Milestone 1 tests passing.
