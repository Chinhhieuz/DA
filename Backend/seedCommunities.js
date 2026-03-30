const mongoose = require('mongoose');
const Community = require('./models/Community');
require('dotenv').config();

const seedCommunities = [
  {
    name: 'Lập trình',
    description: 'Thảo luận về lập trình, framework và ngôn ngữ lập trình',
    icon: '💻'
  },
  {
    name: 'Cơ sở dữ liệu',
    description: 'SQL, NoSQL, thiết kế và tối ưu hóa cơ sở dữ liệu',
    icon: '🗄️'
  },
  {
    name: 'Trí tuệ nhân tạo',
    description: 'Machine Learning, Deep Learning, NLP và Computer Vision',
    icon: '🤖'
  },
  {
      name: 'Mạng máy tính',
      description: 'TCP/IP, mô hình OSI, bảo mật mạng và hệ thống',
      icon: '🌐'
  }
];

async function seed() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/DA');
        console.log('Connected to MongoDB');

        for (const comm of seedCommunities) {
            await Community.findOneAndUpdate(
                { name: comm.name },
                comm,
                { upsert: true, new: true }
            );
        }

        console.log('Seeded communities successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding:', error);
        process.exit(1);
    }
}

seed();
