const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
    // Create a transporter using SMTP
    const transporter = nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE || 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    const mailOptions = {
        from: `Seat Booking App <${process.env.EMAIL_USER}>`,
        to: options.email,
        subject: options.subject,
        html: options.message, // Assuming we pass HTML messages
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log('Message sent: %s', info.messageId);
        return info;
    } catch (error) {
        console.error('Error sending email:', error);
        throw new Error('Email could not be sent');
    }
};

module.exports = sendEmail;
