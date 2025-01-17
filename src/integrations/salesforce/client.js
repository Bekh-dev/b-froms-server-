const jsforce = require('jsforce');
const config = require('./config');

class SalesforceClient {
  constructor() {
    this.conn = new jsforce.Connection({
      loginUrl: config.SF_LOGIN_URL
    });
  }

  async login() {
    try {
      await this.conn.login(
        config.SF_USERNAME,
        config.SF_PASSWORD + config.SF_SECURITY_TOKEN
      );
      console.log('Connected to Salesforce');
    } catch (error) {
      console.error('Error connecting to Salesforce:', error);
      throw error;
    }
  }

  async createAccount(userData) {
    try {
      // Create Account
      const account = await this.conn.sobject('Account').create({
        Name: `${userData.firstName} ${userData.lastName}`,
        Type: 'Customer',
        Industry: 'Technology',
        Description: 'B-Forms User'
      });

      // Create Contact
      const contact = await this.conn.sobject('Contact').create({
        AccountId: account.id,
        FirstName: userData.firstName,
        LastName: userData.lastName,
        Email: userData.email,
        Phone: userData.phone,
        Title: userData.title || 'B-Forms User',
        Description: userData.description || 'Created from B-Forms platform'
      });

      return {
        accountId: account.id,
        contactId: contact.id
      };
    } catch (error) {
      console.error('Error creating Salesforce records:', error);
      throw error;
    }
  }

  async updateAccount(accountId, userData) {
    try {
      await this.conn.sobject('Account').update({
        Id: accountId,
        Name: `${userData.firstName} ${userData.lastName}`,
        Description: userData.description
      });
    } catch (error) {
      console.error('Error updating Salesforce account:', error);
      throw error;
    }
  }

  async getAccount(accountId) {
    try {
      const account = await this.conn.sobject('Account')
        .retrieve(accountId);
      return account;
    } catch (error) {
      console.error('Error getting Salesforce account:', error);
      throw error;
    }
  }
}

module.exports = new SalesforceClient();
