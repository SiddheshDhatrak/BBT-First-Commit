const { MockS3Adapter } = require('./mock-s3');
const { MockTextractAdapter } = require('./mock-textract');
const { MockBedrockAdapter } = require('./mock-bedrock');
const { S3Adapter } = require('./s3');
const { TextractAdapter } = require('./textract');
const { BedrockAdapter } = require('./bedrock');
const { MLAdapter } = require('./ml');
const { VerificationPipeline } = require('./verification-pipeline');

function createAdapters(config = {}) {
  // Default to mock adapters unless explicitly disabled. Accepts booleans
  // (post-loadConfig) as well as raw "true"/"false" strings.
  const raw = config.FEATURE_MOCK_ADAPTERS;
  const useMock = raw === undefined ? true : raw === true || String(raw).toLowerCase() === 'true';

  if (useMock) {
    return {
      s3: new MockS3Adapter(),
      textract: new MockTextractAdapter(),
      bedrock: new MockBedrockAdapter(),
      ml: new MLAdapter(config),
    };
  }

  return {
    s3: new S3Adapter(config),
    textract: new TextractAdapter(config),
    bedrock: new BedrockAdapter(config),
    ml: new MLAdapter(config),
  };
}

module.exports = {
  createAdapters,
  MockS3Adapter,
  MockTextractAdapter,
  MockBedrockAdapter,
  S3Adapter,
  TextractAdapter,
  BedrockAdapter,
  MLAdapter,
  VerificationPipeline,
};
