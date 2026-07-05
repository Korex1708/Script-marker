const fs = require('fs');

// Client-supplied mimetypes are trivially spoofable — confirm the actual bytes on disk
// are a real image before letting Tesseract (or anything else) touch the file.
function sniffImageType(buf) {
  if (buf.length >= 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'png';
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpeg';
  if (buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  return null;
}
function validateImageFiles(files) {
  for (const f of files) {
    const fd = fs.openSync(f.path, 'r');
    const buf = Buffer.alloc(12);
    fs.readSync(fd, buf, 0, 12, 0);
    fs.closeSync(fd);
    if (!sniffImageType(buf)) return false;
  }
  return true;
}

module.exports = { sniffImageType, validateImageFiles };
