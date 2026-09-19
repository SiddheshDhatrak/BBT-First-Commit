require('dotenv/config');
const { createApp } = require('./app');
const { loadConfig } = require('./core/config');

const config = loadConfig();
const { server } = createApp({ config });
server.listen(config.PORT, '0.0.0.0', () =>
  console.log(`RahatSetu API listening on http://0.0.0.0:${config.PORT}`)
);
