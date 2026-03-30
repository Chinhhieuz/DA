require('dotenv').config();
const nodemailer = require('nodemailer');

async function testEmail() {
  const mailPassword = (process.env.EMAIL_PASS || '').replace(/\s+/g, '');
  console.log('Using EMAIL_USER:', process.env.EMAIL_USER);
  console.log('Using EMAIL_PASS length:', mailPassword.length);

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: mailPassword
    }
  });

  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_USER,
      subject: 'Test Email Notification',
      text: 'This is a test email to verify credentials.'
    });
    console.log('Success!', info.response);
  } catch (err) {
    console.error('Error sending email:');
    console.error(err);
  }
}

testEmail();
