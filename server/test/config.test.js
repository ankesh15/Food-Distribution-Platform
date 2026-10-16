const { spawnSync } = require('child_process');
function check(env) {
  return spawnSync(process.execPath, ['-e', "require('./server/config/security')"], { cwd: require('path').join(__dirname, '../..'), env: { ...process.env, NODE_ENV: 'production', ...env }, encoding: 'utf8' });
}
test('production rejects missing or placeholder signing keys', () => {
  for (const key of ['', 'short', 'your_jwt_secret_here_min_32_chars']) expect(check({ JWT_SECRET: key, JWT_REFRESH_SECRET: 'independent-refresh-key-at-least-32-bytes' }).status).toBe(1);
});
test('production requires independent signing keys', () => {
  const key = 'same-key-used-for-both-at-least-32-bytes';
  expect(check({ JWT_SECRET: key, JWT_REFRESH_SECRET: key }).status).toBe(1);
});
test('production accepts strong independent signing configuration', () => {
  expect(check({ JWT_SECRET: 'access-key-for-test-at-least-32-bytes', JWT_REFRESH_SECRET: 'independent-refresh-key-at-least-32-bytes' }).status).toBe(0);
});
