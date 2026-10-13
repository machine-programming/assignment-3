// Jest runs only the API tests; Playwright runs the UI tests (files named ui.test.js).
module.exports = {
  testEnvironment: 'node',
  testPathIgnorePatterns: ['/node_modules/', 'ui\\.test\\.js$'],
};
