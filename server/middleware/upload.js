const multer = require('multer');
const path = require('path');
const fs = require('fs/promises');
const { randomUUID } = require('crypto');
const uploadDir = (process.env.UPLOAD_DIR || path.join(__dirname, '..', 'uploads'));
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 0, parts: 1 },
  fileFilter: (req, file, cb) => ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.mimetype)
    ? cb(null, true) : cb(new Error('Invalid file type. Use JPEG, PNG, WEBP or GIF.'))
});
async function saveImage(file) {
  const data = file.buffer;
  let type;
  if (data.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) type = ['image/png', 'png'];
  else if (data[0] === 255 && data[1] === 216 && data[2] === 255) type = ['image/jpeg', 'jpg'];
  else if (['GIF87a', 'GIF89a'].includes(data.subarray(0, 6).toString())) type = ['image/gif', 'gif'];
  else if (data.subarray(0, 4).toString() === 'RIFF' && data.subarray(8, 12).toString() === 'WEBP') type = ['image/webp', 'webp'];
  if (!type || file.mimetype !== type[0]) throw new Error('Image content does not match the declared file type');
  const filename = `donation-${randomUUID()}.${type[1]}`;
  await fs.mkdir(uploadDir, { recursive: true });
  await fs.writeFile(path.join(uploadDir, filename), data, { flag: 'wx' });
  return `/uploads/${filename}`;
}
module.exports = upload;
module.exports.saveImage = saveImage;
