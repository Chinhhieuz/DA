const mongoose = require('mongoose');
const Comment = require('./models/Comment');

mongoose.connect('mongodb+srv://tochinhhieu12112002_db_user:BYfo4gbSC1rms9kS@server.zwczdgy.mongodb.net/User?retryWrites=true&w=majority')
  .then(async () => {
    console.log('Connected.');
    const count = await Comment.countDocuments();
    console.log('Total comments:', count);
    const comments = await Comment.find().lean();
    console.log(comments);
    process.exit(0);
  });
