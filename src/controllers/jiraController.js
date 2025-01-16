const axios = require('axios');

const getAccountId = async (auth) => {
    try {
        const response = await axios.get(
            `${process.env.JIRA_DOMAIN}/rest/api/2/myself`,
            { auth }
        );
        console.log('Account info:', {
            displayName: response.data.displayName,
            accountId: response.data.accountId,
            emailAddress: response.data.emailAddress
        });
        return response.data.accountId;
    } catch (error) {
        console.error('Error fetching account info:', error.response?.data);
        throw error;
    }
};

const getPriorityId = async (priorityName, auth) => {
    try {
        const response = await axios.get(
            `${process.env.JIRA_DOMAIN}/rest/api/2/priority`,
            { auth }
        );
        console.log('Available priorities:', response.data.map(p => p.name));
        const priority = response.data.find(p => p.name === priorityName);
        return priority ? priority.id : null;
    } catch (error) {
        console.error('Error fetching priorities:', error.response?.data);
        throw error;
    }
};

const getIssueTypes = async (auth) => {
    try {
        const response = await axios.get(
            `${process.env.JIRA_DOMAIN}/rest/api/2/issuetype`,
            { auth }
        );
        console.log('Available issue types:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error fetching issue types:', error.response?.data);
        throw error;
    }
};

const createJiraTicket = async (req, res) => {
    try {
        const { summary, description, reporter, pageUrl, priority = 'Medium' } = req.body;

        console.log('Request body:', req.body);
        console.log('Creating Jira ticket with data:', {
            summary,
            description,
            reporter,
            pageUrl,
            priority
        });

        console.log('Using Jira config:', {
            domain: process.env.JIRA_DOMAIN,
            email: process.env.JIRA_EMAIL,
            projectKey: process.env.JIRA_PROJECT_KEY,
            hasToken: !!process.env.JIRA_API_TOKEN
        });

        if (!process.env.JIRA_DOMAIN) {
            throw new Error('JIRA_DOMAIN is not configured');
        }

        if (!process.env.JIRA_PROJECT_KEY) {
            throw new Error('JIRA_PROJECT_KEY is not configured');
        }

        if (!process.env.JIRA_EMAIL) {
            throw new Error('JIRA_EMAIL is not configured');
        }

        if (!process.env.JIRA_API_TOKEN) {
            throw new Error('JIRA_API_TOKEN is not configured');
        }

        if (!summary) {
            throw new Error('Summary is required');
        }

        if (!description) {
            throw new Error('Description is required');
        }

        if (!reporter) {
            throw new Error('Reporter is required');
        }

        const auth = {
            username: process.env.JIRA_EMAIL,
            password: process.env.JIRA_API_TOKEN
        };

        // Получаем список типов задач
        const issueTypes = await getIssueTypes(auth);
        console.log('Found issue types:', issueTypes.map(t => t.name));

        // Ищем тип задачи "Задача"
        const taskType = issueTypes.find(t => t.name === "Задача");
        if (!taskType) {
            throw new Error('Task issue type not found');
        }

        // Получаем ID приоритета
        const priorityId = await getPriorityId(priority, auth);
        if (!priorityId) {
            console.warn(`Priority "${priority}" not found, using default priority`);
        }

        // Получаем ID аккаунта
        const accountId = await getAccountId(auth);

        // Формируем расширенное описание
        const fullDescription = `
${description}

Additional Information:
- Page URL: ${pageUrl || 'N/A'}
- Reported by: ${reporter}
- Created via: B-Forms Application
`;

        const jiraTicketData = {
            fields: {
                project: {
                    key: process.env.JIRA_PROJECT_KEY
                },
                summary: summary,
                description: fullDescription,
                issuetype: {
                    id: taskType.id
                },
                reporter: {
                    id: accountId
                }
            }
        };

        // Добавляем приоритет, если он найден
        if (priorityId) {
            jiraTicketData.fields.priority = {
                id: priorityId
            };
        }

        console.log('Sending to Jira:', JSON.stringify(jiraTicketData, null, 2));
        console.log('Jira API URL:', `${process.env.JIRA_DOMAIN}/rest/api/2/issue`);

        const response = await axios.post(
            `${process.env.JIRA_DOMAIN}/rest/api/2/issue`,
            jiraTicketData,
            { auth }
        );

        console.log('Jira response:', response.data);
        res.status(201).json(response.data);
    } catch (error) {
        console.error('Error creating Jira ticket:', {
            message: error.message,
            response: error.response?.data,
            stack: error.stack,
            config: error.config ? {
                url: error.config.url,
                method: error.config.method,
                data: JSON.stringify(error.config.data, null, 2)
            } : undefined
        });

        // Если это ошибка валидации данных
        if (error.message.includes('is required')) {
            return res.status(400).json({ 
                message: 'Validation error',
                error: error.message
            });
        }

        // Если это ошибка от Jira API
        if (error.response?.data) {
            return res.status(error.response.status || 500).json({ 
                message: 'Failed to create Jira ticket',
                error: error.response.data
            });
        }

        // Если это ошибка конфигурации
        if (error.message.includes('is not configured')) {
            return res.status(500).json({ 
                message: 'Server configuration error',
                error: error.message
            });
        }

        // Для всех остальных ошибок
        res.status(500).json({ 
            message: 'Failed to create Jira ticket',
            error: error.message
        });
    }
};

const getUserTickets = async (req, res) => {
    try {
        const { email } = req.params;
        const { startAt = 0 } = req.query;

        console.log('Fetching tickets for:', {
            email,
            startAt
        });

        if (!email) {
            throw new Error('Email is required');
        }

        const jql = `reporter = "${email}" ORDER BY created DESC`;
        
        console.log('Fetching Jira tickets with JQL:', jql);

        console.log('Using Jira config:', {
            domain: process.env.JIRA_DOMAIN,
            email: process.env.JIRA_EMAIL,
            hasToken: !!process.env.JIRA_API_TOKEN
        });

        if (!process.env.JIRA_DOMAIN) {
            throw new Error('JIRA_DOMAIN is not configured');
        }

        if (!process.env.JIRA_EMAIL) {
            throw new Error('JIRA_EMAIL is not configured');
        }

        if (!process.env.JIRA_API_TOKEN) {
            throw new Error('JIRA_API_TOKEN is not configured');
        }

        const response = await axios.get(
            `${process.env.JIRA_DOMAIN}/rest/api/2/search`,
            {
                params: {
                    jql: jql,
                    maxResults: 50,
                    startAt: parseInt(startAt, 10)
                },
                auth: {
                    username: process.env.JIRA_EMAIL,
                    password: process.env.JIRA_API_TOKEN
                }
            }
        );

        console.log('Jira response:', response.data);
        res.json(response.data);
    } catch (error) {
        console.error('Error fetching Jira tickets:', {
            message: error.message,
            response: error.response?.data,
            stack: error.stack,
            config: error.config ? {
                url: error.config.url,
                method: error.config.method,
                params: error.config.params
            } : undefined
        });

        // Если это ошибка валидации данных
        if (error.message.includes('is required')) {
            return res.status(400).json({ 
                message: 'Validation error',
                error: error.message
            });
        }

        // Если это ошибка от Jira API
        if (error.response?.data) {
            return res.status(error.response.status || 500).json({ 
                message: 'Failed to fetch Jira tickets',
                error: error.response.data
            });
        }

        // Если это ошибка конфигурации
        if (error.message.includes('is not configured')) {
            return res.status(500).json({ 
                message: 'Server configuration error',
                error: error.message
            });
        }

        // Для всех остальных ошибок
        res.status(500).json({ 
            message: 'Failed to fetch Jira tickets',
            error: error.message
        });
    }
};

module.exports = {
    createJiraTicket,
    getUserTickets
};
