// Explicit operator-only bootstrap. Existing accounts are never promoted or overwritten.
require('dotenv').config();
const mongoose = require('mongoose');
const readline = require('readline/promises');
const User = require('../server/models/User');
function passwordPrompt() {
  if (!process.stdin.isTTY) throw new Error('Run this command in an interactive terminal');
  process.stdout.write('New admin password (8–72 bytes, hidden): ');
  process.stdin.setRawMode(true);
  process.stdin.resume();
  return new Promise((resolve, reject) => {
    let value = '';
    const finish = (error) => {
      process.stdin.removeListener('data', receive);
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdout.write('\n');
      if (error) reject(error); else resolve(value);
    };
    const receive = chunk => {
      for (const character of chunk.toString()) {
        if (character === '\u0003') return finish(new Error('Cancelled'));
        if (character === '\r' || character === '\n') return finish();
        if (character === '\u007f' || character === '\b') value = value.slice(0, -1);
        else if (character >= ' ') value += character;
      }
    };
    process.stdin.on('data', receive);
  });
}
(async () => {
  if (!process.env.MONGODB_URI) throw new Error('Set MONGODB_URI before creating an administrator');
  const prompt = readline.createInterface({ input: process.stdin, output: process.stdout });
  const email = (await prompt.question('Admin email: ')).trim().toLowerCase();
  const firstName = (await prompt.question('First name: ')).trim();
  const lastName = (await prompt.question('Last name: ')).trim();
  prompt.close();
  const password = await passwordPrompt();
  if (password.length < 8 || Buffer.byteLength(password, 'utf8') > 72) throw new Error('Use a password between 8 and 72 UTF-8 bytes');
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 10000 });
  await User.init();
  if (await User.exists({ email })) throw new Error('An account with this email already exists. No changes made.');
  await User.create({ email, password, role: 'admin', profile: { firstName, lastName } });
  console.log('Administrator created. Sign in through the application.');
})().catch(error => { console.error(error.name === 'MongoServerError' ? 'Database operation failed' : error.message); process.exitCode = 1; }).finally(() => mongoose.disconnect());
