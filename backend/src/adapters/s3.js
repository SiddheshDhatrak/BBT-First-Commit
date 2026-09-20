const { S3Client, PutObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

class S3Adapter {
  constructor(config = {}) {
    this.client = new S3Client({
      region: config.AWS_REGION || process.env.AWS_REGION || 'ap-south-1',
    });
    this.invoiceBucket =
      config.INVOICE_BUCKET || process.env.INVOICE_BUCKET || 'rahatsetu-invoices';
    this.proofBucket = config.PROOF_BUCKET || process.env.EVIDENCE_BUCKET || 'rahatsetu-proofs';
  }

  async putObject({ Bucket, Key, Body, ContentType, Metadata }) {
    const command = new PutObjectCommand({
      Bucket,
      Key,
      Body,
      ContentType,
      Metadata,
      ServerSideEncryption: 'AES256',
    });
    await this.client.send(command);
    return { Bucket, Key };
  }

  async getSignedUrl(operation, params, expiresIn = 3600) {
    const command =
      operation === 'putObject'
        ? new PutObjectCommand(params)
        : new (require('@aws-sdk/client-s3').GetObjectCommand)(params);
    return getSignedUrl(this.client, command, { expiresIn });
  }

  async headObject({ Bucket, Key }) {
    const command = new HeadObjectCommand({ Bucket, Key });
    await this.client.send(command);
    return { Bucket, Key };
  }

  magicByteScan(buffer) {
    if (!buffer || buffer.length < 4) return { valid: false, reason: 'File too small' };

    const pdfMagic =
      buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46;
    const pngMagic =
      buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
    const jpegMagic = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;

    if (pdfMagic) return { valid: true, mimeType: 'application/pdf' };
    if (pngMagic) return { valid: true, mimeType: 'image/png' };
    if (jpegMagic) return { valid: true, mimeType: 'image/jpeg' };

    return { valid: false, reason: 'Unsupported file type' };
  }
}

module.exports = { S3Adapter };
