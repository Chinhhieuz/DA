const fs = require('fs');
const mongoose = require('mongoose');
require('dotenv').config();
const authService = require('./services/authService');
const Account = require('./models/Account');

async function testReset() {
  await mongoose.connect(process.env.MONGODB_URI);

  try {
    const resultGenerate = await authService.generateResetPasswordToken('chinhhieu0102@gmail.com');
    const account = await Account.findOne({ email: 'chinhhieu0102@gmail.com' });
    fs.writeFileSync('result.json', JSON.stringify({
      token_saved: !!account.resetPasswordToken,
      token_starts_with: account.resetPasswordToken ? account.resetPasswordToken.substring(0, 10) : 'none',
      expires: account.resetPasswordExpires
    }, null, 2));
  } catch (err) {
    fs.writeFileSync('result.json', JSON.stringify({ error: err.message }, null, 2));
  } finally {
    mongoose.disconnect();
  }
}

testReset();
