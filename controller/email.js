const nodemailer = require('nodemailer');

require("dotenv").config();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
        user: process.env.GET_GMAIL_USER,
        pass: process.env.GET_GMAIL_PASSWORD
    }
});

transporter.verify((err, success) => {
    if (err) console.error("Transporter Error:", err);
    else console.log("Ready to send emails!");
});

const sendWelcomeMail = async email => {
    try {
        const html = `
        <p>Dear User,</p>
        <p>Welcome to the <strong>Streammer Video Streaming Platform</strong>!</p>
        <p>We're excited to have you on board.</p>
        <h4>Get Started Now:</h4>
        <ul>
            <li>Explore our vast collection of content</li>
            <li>Create your personalized watchlist</li>
            <li>Enjoy high-quality streaming anytime, anywhere</li>
        </ul>
        <p>If you have any questions or need assistance, feel free to contact our support team.</p>
        <p>Happy Streaming!</p>
        <p><strong>Best regards,</strong><br>
        Jahir Pendhari</p>
        `;

        await transporter.sendMail({
            from: process.env.GET_GMAIL_USER,
            to: email,
            subject: 'Welcome to Streammer!',
            html: html
        });
    } catch (err) {
        console.log("Error sending welcome email:", err);
    }
};

const sendOTP = async (email, otp) => {
    try {
        const html = `
        <p>Dear User,</p>
        <p>Your One-Time Password (OTP) is: <strong>${otp}</strong></p>
        <p>This OTP is valid for <strong>5 minutes</strong>. Please do not share it with anyone.</p>
        <p>If you did not request this OTP, please ignore this message or contact our support team.</p>
        <br>
        <p>Happy Streaming!</p>
        <p><strong>Best regards,</strong><br>
        Jahir Pendhari</p>
        `;

        await transporter.sendMail({
            from: process.env.GET_GMAIL_USER,
            to: email,
            subject: 'Your Streammer OTP Code',
            html: html
        });
    } catch (err) {
        console.log("Error sending OTP email:", err);
    }
};

module.exports = { sendWelcomeMail, sendOTP }