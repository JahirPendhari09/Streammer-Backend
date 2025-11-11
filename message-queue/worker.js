const { Worker } = require('bullmq')
require('dotenv').config();
const { sendWelcomeMail } = require('../controller/email')

const connection = {
  host: '127.0.0.1',  
  port: 6379,
}

const welcomeEmailWorker = new Worker('welcome-emails', async (job) => {
  try{
    await sendWelcomeMail(job.data.email)
    console.log("The job ",job.id, "has been completed")
    console.log("Welcome email sent to: ", job.data.email)
  }catch(err) {
    console.log("Error in sending Welcome Email: ", err)
  }
}, { 
  connection ,
  limiter: {
    max: 1,          
    duration: 60_000 
  }
})