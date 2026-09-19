const { createHash } = require('node:crypto');

class MockS3Adapter {
  constructor() {
    this.buckets = new Map();
  }
  async putObject({ Bucket, Key, Body, ContentType, Metadata }) {
    const bucket = this.buckets.get(Bucket) || new Map();
    bucket.set(Key, {
      Body,
      ContentType,
      Metadata,
      uploadedAt: new Date().toISOString(),
      size: Body?.length || 0,
    });
    this.buckets.set(Bucket, bucket);
    return {
      ETag: createHash('md5')
        .update(Body || '')
        .digest('hex'),
      VersionId: 'mock-version',
    };
  }
  async getObject({ Bucket, Key }) {
    const bucket = this.buckets.get(Bucket);
    if (!bucket || !bucket.has(Key)) throw new Error('NotFound');
    return {
      Body: bucket.get(Key).Body,
      ContentType: bucket.get(Key).ContentType,
      Metadata: bucket.get(Key).Metadata,
    };
  }
  async deleteObject({ Bucket, Key }) {
    const bucket = this.buckets.get(Bucket);
    if (bucket) bucket.delete(Key);
    return { DeleteMarker: true };
  }
  async getSignedUrl(operation, params, expiresIn = 3600) {
    return `https://mock-s3.local/${params.Bucket}/${params.Key}?signed=true&expires=${Date.now() + expiresIn * 1000}`;
  }
  magicByteScan(buffer) {
    if (!buffer || buffer.length < 4) return { valid: false, mime: 'unknown' };
    const header = buffer.subarray(0, 4);
    if (header[0] === 0xff && header[1] === 0xd8) return { valid: true, mime: 'image/jpeg' };
    if (header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4e && header[3] === 0x47)
      return { valid: true, mime: 'image/png' };
    if (header[0] === 0x25 && header[1] === 0x50 && header[2] === 0x44 && header[3] === 0x46)
      return { valid: true, mime: 'application/pdf' };
    return { valid: false, mime: 'unknown' };
  }
}

module.exports = { MockS3Adapter };
