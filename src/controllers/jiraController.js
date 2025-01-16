import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const JIRA_DOMAIN = process.env.JIRA_DOMAIN;
const JIRA_EMAIL = process.env.JIRA_EMAIL;
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;
const JIRA_PROJECT_KEY = process.env.JIRA_PROJECT_KEY;

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

const getPriorityId = async (priorityName) => {
  try {
    const response = await jiraApi.get('/priority');
    const priorities = response.data;
    const priority = priorities.find(p => p.name === priorityName);
    return priority ? priority.id : '3'; // Default to Medium (3) if not found
  } catch (error) {
    console.error('Error fetching priorities:', error);
    return '3'; // Default to Medium (3) if error
  }
};

const getAccountId = async (email) => {
  try {
    const response = await jiraApi.get(`/user/search?query=${encodeURIComponent(email)}`);
    return response.data[0]?.accountId;
  } catch (error) {
    console.error('Error fetching account ID:', error);
    return null;
  }
};

const getIssueTypes = async () => {
  try {
    const response = await jiraApi.get('/issuetype');
    return response.data;
  } catch (error) {
    console.error('Error fetching issue types:', error);
    return [];
  }
};

const createJiraTicket = async (req, res) => {
  try {
    const { summary, description, reporter, pageUrl, priority = 'Medium' } = req.body;

    // Get account ID for the reporter
    const reporterAccountId = await getAccountId(reporter);

    if (!reporterAccountId) {
      return res.status(400).json({ message: 'Reporter not found' });
    }

    // Get priority ID
    const priorityId = await getPriorityId(priority);

    // Get issue types
    const issueTypes = await getIssueTypes();
    const taskType = issueTypes.find(t => t.name === "Задача");
    if (!taskType) {
      throw new Error('Task issue type not found');
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
                  text: `${description}\n\nPage URL: ${pageUrl}`
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

    const response = await jiraApi.post('/issue', issueData);
    res.json(response.data);
  } catch (error) {
    console.error('Error creating Jira ticket:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      message: 'Failed to create Jira ticket',
      error: error.response?.data || error.message
    });
  }
};

const getUserTickets = async (req, res) => {
  try {
    const { email } = req.params;
    const { startAt = 0 } = req.query;

    console.log('Fetching tickets for email:', email);

    // Get account ID for the user
    const accountId = await getAccountId(email);

    if (!accountId) {
      return res.status(400).json({ message: 'User not found' });
    }

    console.log('Found account ID:', accountId);

    // Construct JQL query
    const jql = `project = "${JIRA_PROJECT_KEY}" AND reporter = "${accountId}" ORDER BY created DESC`;
    console.log('Using JQL:', jql);

    // Search for issues
    const response = await jiraApi.get('/search', {
      params: {
        jql,
        startAt,
        maxResults: 50,
        fields: 'summary,description,priority,status,created,updated'
      }
    });

    console.log('Found tickets:', response.data.total);

    // Transform the response
    const tickets = response.data.issues.map(issue => ({
      id: issue.id,
      key: issue.key,
      summary: issue.fields.summary,
      description: issue.fields.description?.content?.[0]?.content?.[0]?.text || '',
      priority: issue.fields.priority?.name || 'Medium',
      status: issue.fields.status?.name || 'To Do',
      created: issue.fields.created,
      updated: issue.fields.updated
    }));

    res.json({
      total: response.data.total,
      tickets: tickets
    });
  } catch (error) {
    console.error('Error fetching tickets:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      message: 'Failed to fetch tickets',
      error: error.response?.data || error.message
    });
  }
};

module.exports = {
  createJiraTicket,
  getUserTickets
};
