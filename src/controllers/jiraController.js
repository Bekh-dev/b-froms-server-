const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

// Remove https:// if present in JIRA_DOMAIN
const JIRA_DOMAIN = process.env.JIRA_DOMAIN?.replace('https://', '');
const JIRA_EMAIL = process.env.JIRA_EMAIL;
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;
const JIRA_PROJECT_KEY = process.env.JIRA_PROJECT_KEY;

if (!JIRA_EMAIL || !JIRA_API_TOKEN || !JIRA_DOMAIN || !JIRA_PROJECT_KEY) {
  console.error('Missing required Jira configuration:', {
    JIRA_DOMAIN: !!JIRA_DOMAIN,
    JIRA_EMAIL: !!JIRA_EMAIL,
    JIRA_API_TOKEN: !!JIRA_API_TOKEN,
    JIRA_PROJECT_KEY: !!JIRA_PROJECT_KEY
  });
}

const jiraApi = axios.create({
  baseURL: `https://${JIRA_DOMAIN}/rest/api/3`,
  auth: {
    username: JIRA_EMAIL,
    password: JIRA_API_TOKEN
  },
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  }
});

const getAccountId = async (email) => {
  try {
    console.log('Searching for account ID for email:', email);
    const response = await jiraApi.get(`/user/search?query=${encodeURIComponent(email)}`);
    console.log('Account search response:', response.data);
    
    if (!response.data || response.data.length === 0) {
      console.error('No user found for email:', email);
      return null;
    }
    
    const accountId = response.data[0]?.accountId;
    console.log('Found account ID:', accountId);
    return accountId;
  } catch (error) {
    console.error('Error fetching account ID:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    return null;
  }
};

const getPriorityId = async (priorityName) => {
  try {
    const response = await jiraApi.get('/priority');
    const priorities = response.data;
    const priority = priorities.find(p => p.name === priorityName);
    return priority ? priority.id : '3'; // Default to Medium (3) if not found
  } catch (error) {
    console.error('Error fetching priorities:', error.response?.data || error.message);
    return '3'; // Default to Medium (3) if error
  }
};

const getIssueTypes = async () => {
  try {
    const response = await jiraApi.get('/issuetype');
    return response.data;
  } catch (error) {
    console.error('Error fetching issue types:', error.response?.data || error.message);
    return [];
  }
};

const createJiraTicket = async (req, res) => {
  try {
    const { summary, description, pageUrl, priority = 'Medium' } = req.body;

    if (!JIRA_EMAIL) {
      console.error('JIRA_EMAIL not configured');
      return res.status(500).json({ 
        message: 'Server configuration error',
        error: 'Jira email not configured'
      });
    }

    // Always use JIRA_EMAIL as reporter
    const reporterAccountId = await getAccountId(JIRA_EMAIL);
    console.log('Using reporter:', JIRA_EMAIL, 'with accountId:', reporterAccountId);

    if (!reporterAccountId) {
      return res.status(400).json({ 
        message: 'Reporter not found',
        error: `No Jira account found for email: ${JIRA_EMAIL}. Please check your Jira configuration.`
      });
    }

    // Get priority ID
    const priorityId = await getPriorityId(priority);

    // Get issue types
    const issueTypes = await getIssueTypes();
    const taskType = issueTypes.find(t => t.name === 'Task') || issueTypes[0];
    if (!taskType) {
      throw new Error('No valid issue type found');
    }

    const issueData = {
      fields: {
        project: {
          key: JIRA_PROJECT_KEY
        },
        summary: summary,
        description: {
          type: 'doc',
          version: 1,
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: `${description}\n\nPage URL: ${pageUrl}\nSubmitted by: ${req.body.reporter || 'Anonymous'}`
                }
              ]
            }
          ]
        },
        issuetype: {
          id: taskType.id
        },
        reporter: {
          id: reporterAccountId
        },
        priority: {
          id: priorityId
        }
      }
    };

    console.log('Creating Jira ticket with data:', JSON.stringify(issueData, null, 2));
    const response = await jiraApi.post('/issue', issueData);
    console.log('Jira ticket created:', response.data);
    res.json(response.data);
  } catch (error) {
    console.error('Error creating Jira ticket:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    res.status(error.response?.status || 500).json({
      message: 'Failed to create Jira ticket',
      error: error.response?.data?.errors || error.message
    });
  }
};

const getUserTickets = async (req, res) => {
  try {
    if (!JIRA_EMAIL) {
      console.error('JIRA_EMAIL not configured');
      return res.status(500).json({ 
        message: 'Server configuration error',
        error: 'Jira email not configured'
      });
    }

    // Always use JIRA_EMAIL for fetching tickets
    console.log('Fetching tickets for JIRA_EMAIL:', JIRA_EMAIL);

    // Get account ID for the user
    const accountId = await getAccountId(JIRA_EMAIL);
    console.log('Account ID:', accountId);

    if (!accountId) {
      console.error('User not found for email:', JIRA_EMAIL);
      return res.status(400).json({ 
        message: 'User not found',
        error: `No Jira account found for email: ${JIRA_EMAIL}. Please check your Jira configuration.`
      });
    }

    // Construct JQL query
    const jql = `project = "${JIRA_PROJECT_KEY}" AND reporter = "${accountId}" ORDER BY created DESC`;
    console.log('JQL Query:', jql);

    // Search for issues
    console.log('Searching for issues...');
    const response = await jiraApi.get('/search', {
      params: {
        jql,
        startAt: parseInt(req.query.startAt || 0, 10),
        maxResults: 50,
        fields: 'summary,description,priority,status,created,updated'
      }
    });

    console.log('Jira API Response:', {
      total: response.data.total,
      issuesCount: response.data.issues?.length,
      maxResults: response.data.maxResults,
      startAt: response.data.startAt
    });

    if (!response.data.issues) {
      console.error('No issues array in response:', response.data);
      return res.json({
        total: 0,
        tickets: []
      });
    }

    // Transform the response
    const tickets = response.data.issues.map(issue => {
      console.log('Processing issue:', issue.key);
      return {
        id: issue.id,
        key: issue.key,
        summary: issue.fields.summary || '',
        description: issue.fields.description?.content?.[0]?.content?.[0]?.text || '',
        priority: issue.fields.priority?.name || 'Medium',
        status: issue.fields.status?.name || 'To Do',
        created: issue.fields.created,
        updated: issue.fields.updated
      };
    });

    console.log('Transformed tickets count:', tickets.length);

    const result = {
      total: response.data.total || 0,
      tickets: tickets || []
    };

    console.log('Sending response:', {
      total: result.total,
      ticketsCount: result.tickets.length
    });

    res.json(result);
  } catch (error) {
    console.error('Error fetching tickets:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    res.status(error.response?.status || 500).json({
      message: 'Failed to fetch tickets',
      error: error.response?.data?.errors || error.message
    });
  }
};

module.exports = {
  createJiraTicket,
  getUserTickets
};
