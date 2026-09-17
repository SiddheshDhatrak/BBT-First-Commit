const { MockS3Adapter } = require('./mock-s3');
const { MockTextractAdapter } = require('./mock-textract');
const { MockBedrockAdapter } = require('./mock-bedrock');
const { VerificationPipeline } = require('./verification-pipeline');

function createAdapters() {
  return {
    s3: new MockS3Adapter(),
    textract: new MockTextractAdapter(),
    bedrock: new MockBedrockAdapter(),
  };
}

module.exports = { createAdapters, MockS3Adapter, MockTextractAdapter, MockBedrockAdapter, VerificationPipeline };