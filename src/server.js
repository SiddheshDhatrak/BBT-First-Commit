require('dotenv/config');
const { createApp } = require('./app');
const { loadConfig } = require('./core/config');

const config = loadConfig();
const { server } = createApp({ config });
server.listen(config.PORT, () =>
  console.log(`RahatSetu API listening on http://localhost:${config.PORT}`)
);
