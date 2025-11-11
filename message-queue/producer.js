const {Queue} = require('bullmq')

const welcomeEmailJobQueue = new Queue('welcome-emails')

module.exports = { welcomeEmailJobQueue }