require('dotenv').config();

module.exports = {
  SF_LOGIN_URL: process.env.SF_LOGIN_URL || 'https://login.salesforce.com',
  SF_CLIENT_ID: process.env.SF_CLIENT_ID,
  SF_CLIENT_SECRET: process.env.SF_CLIENT_SECRET,
  SF_USERNAME: process.env.SF_USERNAME,
  SF_PASSWORD: process.env.SF_PASSWORD,
  SF_SECURITY_TOKEN: process.env.SF_SECURITY_TOKEN
};
