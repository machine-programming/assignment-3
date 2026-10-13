// Variant-independent M3 API tests; install under tests/m3_leaderboard/.
const request = require('supertest');
const app = require('../../index.js');

const entry = { name: 'Ada', score: 1200, lines: 12, level: 2 };

beforeEach(async () => {
  await request(app).delete('/api/scores').expect(200);
});

test('POST stores a valid score and returns its id, name, and score', async () => {
  const response = await request(app).post('/api/score').send(entry).expect(201);
  expect(response.body).toHaveProperty('id');
  expect(response.body).toMatchObject({ name: entry.name, score: entry.score });
});

test('GET returns an array containing a posted entry', async () => {
  const posted = await request(app).post('/api/score').send(entry).expect(201);
  const response = await request(app).get('/api/scores').expect(200);
  expect(Array.isArray(response.body)).toBe(true);
  expect(response.body).toEqual(expect.arrayContaining([
    expect.objectContaining({ id: posted.body.id, name: entry.name, score: entry.score }),
  ]));
});

test('POST rejects a missing name with an error property', async () => {
  const response = await request(app).post('/api/score')
    .send({ score: 1200, lines: 12, level: 2 }).expect(400);
  expect(response.body).toHaveProperty('error');
});

test('GET places a higher score before a lower score', async () => {
  const low = await request(app).post('/api/score')
    .send({ name: 'Lin', score: 100, lines: 1, level: 1 }).expect(201);
  const high = await request(app).post('/api/score').send(entry).expect(201);
  const response = await request(app).get('/api/scores').expect(200);
  expect(Array.isArray(response.body)).toBe(true);
  const lowIndex = response.body.findIndex(item => item.id === low.body.id);
  const highIndex = response.body.findIndex(item => item.id === high.body.id);
  expect(lowIndex).toBeGreaterThanOrEqual(0);
  expect(highIndex).toBeGreaterThanOrEqual(0);
  expect(highIndex).toBeLessThan(lowIndex);
});

test('DELETE removes stored scores', async () => {
  await request(app).post('/api/score').send(entry).expect(201);
  await request(app).delete('/api/scores').expect(200);
  const response = await request(app).get('/api/scores').expect(200);
  expect(response.body).toEqual([]);
});
