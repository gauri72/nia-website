const { createMollieClient } = require('@mollie/api-client');

if (!process.env.MOLLIE_API_KEY) {
  throw new Error('MOLLIE_API_KEY environment variable is not set');
}

const mollieClient = createMollieClient({ apiKey: process.env.MOLLIE_API_KEY });

module.exports = mollieClient;
