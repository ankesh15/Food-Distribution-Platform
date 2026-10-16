import axios from 'axios';
import { api } from './AuthContext';
jest.mock('axios', () => {
  const client = jest.fn(config => Promise.resolve({ config, data: { ok: true } }));
  client.interceptors = { request: { use: jest.fn() }, response: { use: jest.fn() } };
  return { create: jest.fn(() => client), post: jest.fn() };
});
const rejectResponse = api.interceptors.response.use.mock.calls[0][1];
beforeEach(() => { localStorage.clear(); axios.post.mockReset(); api.mockClear(); });
const unauthorized = (url, retry = false) => ({ config: { url, headers: {}, _retry: retry }, response: { status: 401 } });
test('incorrect login credentials never trigger a refresh of an older session', async () => {
  localStorage.setItem('refreshToken', 'old-refresh');
  await expect(rejectResponse(unauthorized('/auth/login'))).rejects.toBeDefined();
  expect(axios.post).not.toHaveBeenCalled();
});
test('concurrent unauthorized requests share a single refresh and retry once', async () => {
  localStorage.setItem('refreshToken', 'old-refresh');
  let finish;
  axios.post.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const first = rejectResponse(unauthorized('/users/profile'));
  const second = rejectResponse(unauthorized('/users/summary'));
  finish({ data: { accessToken: 'new-access', refreshToken: 'new-refresh' } });
  await Promise.all([first, second]);
  expect(axios.post).toHaveBeenCalledTimes(1);
  expect(api).toHaveBeenCalledTimes(2);
  expect(api.mock.calls[0][0]).toEqual(expect.objectContaining({ _retry: true, headers: { Authorization: 'Bearer new-access' } }));
  expect(localStorage.getItem('refreshToken')).toBe('new-refresh');
});
test('a retried unauthorized request cannot refresh repeatedly', async () => {
  await expect(rejectResponse(unauthorized('/users/profile', true))).rejects.toBeDefined();
  expect(axios.post).not.toHaveBeenCalled();
});
test('rejected refresh clears credentials and announces session expiry', async () => {
  const expired = jest.fn(); window.addEventListener('auth-expired', expired);
  localStorage.setItem('accessToken', 'old-access'); localStorage.setItem('refreshToken', 'old-refresh');
  axios.post.mockRejectedValue({ response: { status: 401 } });
  await expect(rejectResponse(unauthorized('/users/profile'))).rejects.toBeDefined();
  expect(localStorage.getItem('accessToken')).toBeNull(); expect(expired).toHaveBeenCalledTimes(1);
  window.removeEventListener('auth-expired', expired);
});
test('temporary network failures retain the session for a later retry', async () => {
  localStorage.setItem('refreshToken', 'old-refresh'); axios.post.mockRejectedValue(new Error('Network unavailable'));
  await expect(rejectResponse(unauthorized('/users/profile'))).rejects.toBeDefined();
  expect(localStorage.getItem('refreshToken')).toBe('old-refresh');
});
