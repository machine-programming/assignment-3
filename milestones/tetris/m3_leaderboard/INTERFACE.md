
## Leaderboard — Milestone 3 (do not modify)

- When the game ends, ask the player for a name and save their final score, lines and level to a leaderboard on the server. Keep it in memory only.
- The server rejects invalid submissions, such as a missing name or a negative score.
- The leaderboard shows the best scores first, and it updates right after a submission without reloading the page.

## Common Interface — Milestone 3 (do not modify)

In `index.js`, export the app with `module.exports = app`, and only call `listen` when `require.main === module`. Don't add a `"jest"` key to `package.json`, because `jest.config.js` is provided.

### POST /api/score

Request:
```json
{ "name": "Ada", "score": 1200, "lines": 12, "level": 2 }
```
Response **201 Created** with the stored entry, a unique `id`, and an ISO 8601 `timestamp`:
```json
{ "id": 1, "name": "Ada", "score": 1200, "lines": 12, "level": 2, "timestamp": "2026-10-01T12:00:00.000Z" }
```
Invalid input gets **400 Bad Request** with `{ "error": "<message>" }`.

### GET /api/scores

Response **200 OK** with an array of entries:
```json
[{ "id": 1, "name": "Ada", "score": 1200, "lines": 12, "level": 2, "timestamp": "2026-10-01T12:00:00.000Z" }]
```

### DELETE /api/scores

Removes all entries. Response **200 OK** with `{ "message": "All scores deleted" }`.

### Page

- `#leaderboard` is an `ol` or `ul` filled from `GET /api/scores`. Each entry is an `li` with its own `span.lb-name` and `span.lb-score`. Don't use `::before` or `::after` for their text.
- `#score-form` appears at game over, with an `input[name="name"]` and a `button[type="submit"]`. Submitting it posts the final score, lines and level, then refreshes the leaderboard without reloading the page.

The tests are in `tests/m3_leaderboard/`. Run `supertest.run test_file=tests/m3_leaderboard/api.test.js`, and with the server running, `playwright.run test_file=tests/m3_leaderboard/ui.test.js`. Don't modify the provided tests, and keep the earlier tests passing.
