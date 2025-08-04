const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

mongoose.connect(process.env.MONGO_URI);

(async () => {
  const exists = await User.findOne({ email: 'admin@example.com' });
  if (!exists) {
    const user = new User({
      email: 'admin@example.com',
      password: 'admin123'
    });
    await user.save();
    console.log('✅ Admin user seeded');
  } else {
    console.log('Admin user already exists');
  }
  mongoose.disconnect();
})();