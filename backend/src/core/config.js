const { badRequest } = require('./errors');

const DEFAULTS = {
  NODE_ENV: 'development',
  PORT: 3000,
  LOG_LEVEL: 'info',
  DATABASE_URL: '',
  DATABASE_SSL: 'false',
  AWS_REGION: '',
  COGNITO_USER_POOL_ID: '',
  COGNITO_CLIENT_ID: '',
  EVIDENCE_BUCKET: '',
  REPOSITORY_DRIVER: 'memory',
  FEATURE_DEMO_ROLE_HEADERS: 'true',
  FEATURE_MOCK_ADAPTERS: 'true',
  ML_SERVICE_URL: '',
  ML_TIMEOUT_MS: '5000',
  AGENT_URL: '',
};

function parseBool(value, defaultValue = false) {
  if (value === undefined || value === '') return defaultValue;
  return value === 'true' || value === '1';
}

function parseIntSafe(value, defaultValue) {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? defaultValue : parsed;
}

function loadConfig() {
  const config = {};
  for (const [key, defaultValue] of Object.entries(DEFAULTS)) {
    const envValue = process.env[key];
    config[key] = envValue !== undefined ? envValue : defaultValue;
  }

  config.PORT = parseIntSafe(config.PORT, DEFAULTS.PORT);
  config.FEATURE_DEMO_ROLE_HEADERS = parseBool(config.FEATURE_DEMO_ROLE_HEADERS, true);
  config.FEATURE_MOCK_ADAPTERS = parseBool(config.FEATURE_MOCK_ADAPTERS, true);
  config.DATABASE_SSL = parseBool(config.DATABASE_SSL, false);

  const validDrivers = ['memory', 'postgres'];
  if (!validDrivers.includes(config.REPOSITORY_DRIVER)) {
    throw badRequest(`REPOSITORY_DRIVER must be one of: ${validDrivers.join(', ')}`);
  }

  if (config.REPOSITORY_DRIVER === 'memory' && config.NODE_ENV === 'production') {
    throw badRequest('REPOSITORY_DRIVER=memory is not permitted in production');
  }

  const requiredInProduction = [
    'DATABASE_URL',
    'AWS_REGION',
    'EVIDENCE_BUCKET',
  ];

  const requiredForRealAuth = [
    'COGNITO_USER_POOL_ID',
    'COGNITO_CLIENT_ID',
  ];

  if (config.NODE_ENV === 'production') {
    const missing = requiredInProduction.filter(key => !config[key] || config[key] === '');
    if (missing.length > 0) {
      throw badRequest(
        `Missing required environment variables for production: ${missing.join(', ')}`
      );
    }
    const usingMockAuth = config.FEATURE_DEMO_ROLE_HEADERS || config.FEATURE_MOCK_ADAPTERS;
    const missingAuth = requiredForRealAuth.filter(key => !config[key] || config[key] === '');
    if (missingAuth.length > 0 && !usingMockAuth) {
      throw badRequest(
        `Missing required environment variables for Cognito auth: ${missingAuth.join(', ')}`
      );
    }
  }

  return Object.freeze(config);
}

module.exports = { loadConfig, DEFAULTS };
