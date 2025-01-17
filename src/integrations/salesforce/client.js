const jsforce = require('jsforce');
const config = require('./config');

class SalesforceClient {
  constructor() {
    this.conn = new jsforce.Connection({
      loginUrl: config.SF_LOGIN_URL,
      version: '58.0' // Добавляем явное указание версии API
    });
  }

  async login() {
    try {
      // Выводим отладочную информацию
      console.log('Attempting to login with:', {
        username: config.SF_USERNAME,
        passwordLength: config.SF_PASSWORD?.length,
        tokenLength: config.SF_SECURITY_TOKEN?.length,
        loginUrl: config.SF_LOGIN_URL
      });

      // Объединяем пароль и токен
      const passwordWithToken = `${config.SF_PASSWORD}${config.SF_SECURITY_TOKEN}`;
      
      await this.conn.login(config.SF_USERNAME, passwordWithToken);
      console.log('Connected to Salesforce successfully');
      return true;
    } catch (error) {
      console.error('Error connecting to Salesforce:', error);
      throw error;
    }
  }

  async createAccount(userData) {
    if (!this.conn.accessToken) {
      await this.login();
    }

    try {
      // Create Account
      const account = await this.conn.sobject('Account').create({
        Name: `${userData.firstName} ${userData.lastName}`,
        Type: 'Customer',
        Industry: 'Technology',
        Description: userData.description || 'B-Forms User'
      });

      if (!account.success) {
        throw new Error('Failed to create Account');
      }

      // Create Contact
      const contact = await this.conn.sobject('Contact').create({
        AccountId: account.id,
        FirstName: userData.firstName,
        LastName: userData.lastName,
        Email: userData.email,
        Phone: userData.phone,
        Title: userData.title
      });

      if (!contact.success) {
        throw new Error('Failed to create Contact');
      }

      return {
        accountId: account.id,
        contactId: contact.id
      };
    } catch (error) {
      console.error('Error in createAccount:', error);
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
