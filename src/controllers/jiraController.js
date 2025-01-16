const axios = require('axios');

const createJiraTicket = async (req, res) => {
    try {
        const { summary, description, priority, reporter, templateTitle, pageUrl } = req.body;

        // Формируем расширенное описание с дополнительной информацией
        const fullDescription = `
${description}

Additional Information:
- Template: ${templateTitle || 'N/A'}
- Page URL: ${pageUrl || 'N/A'}
- Reporter Email: ${reporter}
`;

        const response = await axios.post(
            `${process.env.JIRA_DOMAIN}/rest/api/2/issue`,
            {
                fields: {
                    project: {
                        key: process.env.JIRA_PROJECT_KEY
                    },
                    summary: summary,
                    description: fullDescription,
                    issuetype: {
                        name: "Task"
                    },
                    priority: {
                        name: priority
                    },
                    reporter: {
                        emailAddress: reporter
                    }
                }
            },
            {
                auth: {
                    username: process.env.JIRA_EMAIL,
                    password: process.env.JIRA_API_TOKEN
                }
            }
        );

        res.status(201).json(response.data);
    } catch (error) {
        console.error('Error creating Jira ticket:', error.response?.data || error.message);
        res.status(500).json({ 
            message: 'Failed to create Jira ticket',
            error: error.response?.data || error.message 
        });
    }
};

const getUserTickets = async (req, res) => {
    try {
        const { email } = req.params;

        const jql = `reporter = "${email}" ORDER BY created DESC`;
        
        const response = await axios.get(
            `${process.env.JIRA_DOMAIN}/rest/api/2/search`,
            {
                params: {
                    jql: jql,
                    maxResults: 50
                },
                auth: {
                    username: process.env.JIRA_EMAIL,
                    password: process.env.JIRA_API_TOKEN
                }
            }
        );

        res.json(response.data);
    } catch (error) {
        console.error('Error fetching Jira tickets:', error.response?.data || error.message);
        res.status(500).json({ 
            message: 'Failed to fetch Jira tickets',
            error: error.response?.data || error.message 
        });
    }
};

module.exports = {
    createJiraTicket,
    getUserTickets
};
