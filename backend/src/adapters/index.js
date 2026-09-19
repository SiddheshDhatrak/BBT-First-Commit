const { MockS3Adapter } = require('./mock-s3');
const { MockTextractAdapter } = require('./mock-textract');
const { MockBedrockAdapter } = require('./mock-bedrock');
const { S3Adapter } = require('./s3');
const { TextractAdapter } = require('./textract');
const { BedrockAdapter } = require('./bedrock');
const { VerificationPipeline } = require('./verification-pipeline');

function createAdapters(config = {}) {
  const useMock = config.FEATURE_MOCK_ADAPTERS !== false;

  if (useMock) {
    return {
      s3: new MockS3Adapter(),
      textract: new MockTextractAdapter(),
      bedrock: new MockBedrockAdapter(),
    };
  }

  return {
    s3: new S3Adapter(config),
    textract: new TextractAdapter(config),
    bedrock: new BedrockAdapter(config),
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
  VerificationPipeline,
};
