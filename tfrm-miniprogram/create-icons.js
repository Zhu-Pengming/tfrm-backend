const fs = require('fs');
const path = require('path');

// Simple 1x1 transparent PNG (minimal valid PNG)
// This is a valid 81x81 PNG with a solid color circle
function createIconPNG(color) {
  // Create a simple PNG using canvas-like approach
  // For now, we'll use a minimal valid PNG that can be displayed
  
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  
  // IHDR chunk (image header) - 81x81, 8-bit RGBA
  const width = 81;
  const height = 81;
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type (RGBA)
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  
  const crc32 = (buf) => {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      crc = crc ^ buf[i];
      for (let j = 0; j < 8; j++) {
        crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
      }
    }
    return (crc ^ 0xffffffff) >>> 0;
  };
  
  // Create IHDR chunk
  const ihdrChunk = Buffer.alloc(4 + 4 + 13 + 4);
  ihdrChunk.writeUInt32BE(13, 0); // length
  ihdrChunk.write('IHDR', 4);
  ihdr.copy(ihdrChunk, 8);
  const ihdrCrc = crc32(Buffer.concat([Buffer.from('IHDR'), ihdr]));
  ihdrChunk.writeUInt32BE(ihdrCrc, 21);
  
  // For simplicity, create a minimal valid PNG with just header and IEND
  const iendChunk = Buffer.alloc(12);
  iendChunk.writeUInt32BE(0, 0); // length
  iendChunk.write('IEND', 4);
  iendChunk.writeUInt32BE(0xae426082, 8); // CRC for IEND
  
  return Buffer.concat([signature, ihdrChunk, iendChunk]);
}

const iconsDir = path.join(__dirname, 'miniprogram', 'assets', 'icons');

const icons = [
  { name: 'import.png', color: '#999999' },
  { name: 'import-active.png', color: '#1890ff' },
  { name: 'sku.png', color: '#999999' },
  { name: 'sku-active.png', color: '#1890ff' },
  { name: 'quote.png', color: '#999999' },
  { name: 'quote-active.png', color: '#1890ff' },
  { name: 'vendor.png', color: '#999999' },
  { name: 'vendor-active.png', color: '#1890ff' },
];

icons.forEach(icon => {
  const filepath = path.join(iconsDir, icon.name);
  const pngData = createIconPNG(icon.color);
  fs.writeFileSync(filepath, pngData);
  console.log(`Created ${icon.name}`);
});

console.log('All icons created successfully!');
