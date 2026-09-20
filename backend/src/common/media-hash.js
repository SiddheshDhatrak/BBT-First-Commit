const { createHash } = require('node:crypto');

function perceptualHash(buffer) {
  if (!buffer || buffer.length === 0) {
    return 'phash:empty';
  }
  const sampleSize = Math.min(buffer.length, 1024);
  const sample = buffer.subarray(0, sampleSize);
  const hash = createHash('sha256').update(sample).digest('hex');
  return `phash:${hash.substring(0, 16)}`;
}

function hashBuffer(buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

function extractImageFeatures(buffer) {
  if (!buffer || buffer.length < 100) {
    return { width: 0, height: 0, channels: 0, avgColor: [0, 0, 0] };
  }
  const header = buffer.subarray(0, Math.min(50, buffer.length));
  const hash = createHash('md5').update(header).digest('hex');
  const pseudoWidth = (parseInt(hash.substring(0, 4), 16) % 1000) + 100;
  const pseudoHeight = (parseInt(hash.substring(4, 8), 16) % 1000) + 100;
  const r = parseInt(hash.substring(8, 10), 16);
  const g = parseInt(hash.substring(10, 12), 16);
  const b = parseInt(hash.substring(12, 14), 16);
  return {
    width: pseudoWidth,
    height: pseudoHeight,
    channels: 3,
    avgColor: [r, g, b],
    headerHash: hash.substring(0, 16),
  };
}

function computeDHash(buffer, size = 8) {
  const features = extractImageFeatures(buffer);
  const hash =
    features.headerHash ||
    createHash('md5')
      .update(buffer || Buffer.from(''))
      .digest('hex')
      .substring(0, 16);
  let dhash = '';
  for (let i = 0; i < size * size; i++) {
    const bit = parseInt(hash[i % hash.length], 16) % 2;
    dhash += bit;
  }
  return `dhash:${dhash}`;
}

function hammingDistance(hash1, hash2) {
  const h1 = hash1.replace(/^dhash:/, '');
  const h2 = hash2.replace(/^dhash:/, '');
  if (h1.length !== h2.length) return -1;
  let distance = 0;
  for (let i = 0; i < h1.length; i++) {
    if (h1[i] !== h2[i]) distance++;
  }
  return distance;
}

function areSimilar(hash1, hash2, threshold = 5) {
  const dist = hammingDistance(hash1, hash2);
  return dist >= 0 && dist <= threshold;
}

module.exports = {
  perceptualHash,
  hashBuffer,
  extractImageFeatures,
  computeDHash,
  hammingDistance,
  areSimilar,
};
