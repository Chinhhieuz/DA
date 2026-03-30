const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Account = require('./models/Account');

dotenv.config();

async function verify() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');

  try {
    const users = await Account.find().limit(2);
    if (users.length < 2) {
      console.log('Need at least 2 users for test');
      return;
    }

    const user1 = users[0];
    const user2 = users[1];

    console.log(`Testing follow: ${user1.username} -> ${user2.username}`);
    
    // Clear list first
    user1.following = [];
    user2.followers = [];
    await Promise.all([user1.save(), user2.save()]);

    // Test simulation
    user1.following.push(user2._id);
    user2.followers.push(user1._id);
    await Promise.all([user1.save(), user2.save()]);

    const updatedUser1 = await Account.findById(user1._id);
    console.log('User1 following count:', updatedUser1.following.length);
    if (updatedUser1.following.includes(user2._id)) {
      console.log('SUCCESS: Follow relation saved');
    }

    // Cleanup
    user1.following = [];
    user2.followers = [];
    await Promise.all([user1.save(), user2.save()]);
    console.log('Cleanup done');

  } catch (e) {
    console.error(e);
  } finally {
    await mongoose.connection.close();
  }
}

verify();
