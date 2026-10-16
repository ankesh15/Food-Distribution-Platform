const { schedule, drain } = require('../services/backgroundJobs');
test('scheduled provider work runs independently and can be drained before shutdown', async () => {
  let finish;
  let completed = false;
  schedule(() => new Promise(resolve => { finish = () => { completed = true; resolve(); }; }));
  await Promise.resolve();
  expect(completed).toBe(false);
  finish(); await drain(); expect(completed).toBe(true);
});
test('provider failures are contained and do not reject shutdown', async () => {
  const log = jest.spyOn(console, 'error').mockImplementation(() => {});
  schedule(() => Promise.reject(new Error('Provider unavailable')));
  await expect(drain()).resolves.toBeUndefined();
  expect(log).toHaveBeenCalledWith('Background notification failed:', 'Error'); log.mockRestore();
});
