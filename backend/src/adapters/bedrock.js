const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');

const DEFAULT_MODEL = 'anthropic.claude-3-sonnet-20240229-v1:0';

class BedrockAdapter {
  constructor(config = {}) {
    this.client = new BedrockRuntimeClient({
      region: config.AWS_REGION || process.env.AWS_REGION || 'ap-south-1',
    });
    this.modelId = config.BEDROCK_MODEL_ID || process.env.BEDROCK_MODEL_ID || DEFAULT_MODEL;
  }

  async invokeModel({ body, contentType = 'application/json', accept = 'application/json' }) {
    const command = new InvokeModelCommand({
      ModelId: this.modelId,
      Body: Buffer.from(typeof body === 'string' ? body : JSON.stringify(body)),
      ContentType: contentType,
      Accept: accept,
    });
    const response = await this.client.send(command);
    const responseBody = Buffer.from(response.body).toString('utf-8');
    return { body: responseBody };
  }
}

module.exports = { BedrockAdapter };
