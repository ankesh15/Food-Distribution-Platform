const mockSendMail = jest.fn();
const mockCreateTransport = jest.fn(() => ({ sendMail: mockSendMail }));
jest.mock('nodemailer', () => ({ createTransport: (...args) => mockCreateTransport(...args) }));
const { sendWelcomeEmail, sendDonationNotification, sendPickupReminder } = require('../services/emailService');
beforeEach(() => { jest.clearAllMocks(); process.env.EMAIL_HOST = 'smtp.test'; process.env.EMAIL_USER = 'mail@example.com'; process.env.EMAIL_PASS = 'test-only'; process.env.EMAIL_PORT = '465'; mockSendMail.mockResolvedValue({ accepted: ['person@example.com'] }); });
afterAll(() => { for (const key of ['EMAIL_HOST', 'EMAIL_USER', 'EMAIL_PASS', 'EMAIL_PORT']) delete process.env[key]; });
const donation = { title: '<img src=x onerror=alert(1)>', description: '<script>test</script>', foodType: 'produce', quantity: { amount: 2, unit: 'items' }, pickupWindow: { startTime: new Date(), endTime: new Date() }, location: { address: { street: '<b>street</b>', city: 'Pune', state: 'MH' } } };
test('email templates escape user HTML and require secure port 465 transport', async () => {
  expect(await sendWelcomeEmail('person@example.com', '<script>name</script>')).toBe(true);
  expect(mockSendMail.mock.calls[0][0].html).toContain('&lt;script&gt;name&lt;/script&gt;');
  expect(mockCreateTransport).toHaveBeenCalledWith(expect.objectContaining({ secure: true, port: 465, disableFileAccess: true, disableUrlAccess: true }));
});
test('donation emails accept the recipient array and hide addresses with BCC', async () => {
  expect(await sendDonationNotification([{ email: 'person@example.com' }], donation)).toBe(true);
  const mail = mockSendMail.mock.calls[0][0]; expect(mail.bcc).toEqual(['person@example.com']); expect(mail.html).not.toContain('<img src=x'); expect(mail.html).toContain('&lt;img');
});
test('missing email configuration does not report a successful reminder', async () => {
  delete process.env.EMAIL_HOST;
  expect(await sendPickupReminder(donation, { email: 'person@example.com' })).toBe(false);
  expect(mockSendMail).not.toHaveBeenCalled();
});
test('SMTP failures do not report a successful send', async () => {
  mockSendMail.mockRejectedValue(new Error('SMTP unavailable'));
  expect(await sendPickupReminder(donation, { email: 'person@example.com' })).toBeFalsy();
});
