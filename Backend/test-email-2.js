require('dotenv').config();
const nodemailer = require('nodemailer');
const fs = require('fs');

async function check() {
  const mailPassword = (process.env.EMAIL_PASS || '').replace(/\s+/g, '');
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
      subject: 'Test From Backend',
      text: 'If you see this, nodemailer works perfectly.'
    });
    fs.writeFileSync('mail-log.txt', JSON.stringify(info, null, 2));
    console.log('Success!');
  } catch (err) {
    fs.writeFileSync('mail-log.txt', 'Error: ' + err.message);
    console.error(err);
  }
}
check();
