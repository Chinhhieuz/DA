const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI).then(async () => {
  const Report = require('./models/Report');
  
  const all = await Report.find({ status: 'pending' }).sort({ created_at: -1 }).limit(5);
  all.forEach(r => {
    console.log('---');
    console.log('ID:', r._id.toString().slice(-6));
    console.log('reason:', r.reason);
    console.log('description:', JSON.stringify(r.description));
    console.log('evidence_images:', r.evidence_images);
    console.log('created_at:', r.created_at);
  });
  process.exit();
}).catch(e => {
  console.error(e.message);
  process.exit(1);
});
