import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { Admin } from '../backend/models.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://chetanprajapat007:chetan007@cluster0.e8sdd.mongodb.net/wowgetway?retryWrites=true&w=majority';

async function check() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  const admins = await Admin.find({});
  console.log('Admins in DB:', admins.map(a => ({ email: a.email, role: a.role })));

  const devAdmin = await Admin.findOne({ email: 'devgateways947@gmail.com' });
  if (devAdmin) {
    console.log('Updating devgateways947@gmail.com password to Gateway@123...');
    devAdmin.passwordHash = await bcrypt.hash('Gateway@123', 10);
    await devAdmin.save();
    console.log('Updated successfully!');
  } else {
    console.log('devgateways947@gmail.com admin not found in MongoDB!');
  }

  await mongoose.disconnect();
}

check().catch(err => {
  console.error(err);
  process.exit(1);
});
