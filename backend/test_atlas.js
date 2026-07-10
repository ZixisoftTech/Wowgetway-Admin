import mongoose from 'mongoose';

async function test() {
  const uri = 'mongodb+srv://Wowgateway947:Wowgateway%40947@cluster0.h57w0ve.mongodb.net/wow_gateways?retryWrites=true&w=majority&appName=Cluster0';
  console.log('Testing Atlas URI:', uri);
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log('Success! Connected to MongoDB Atlas cluster0!');
    process.exit(0);
  } catch (err) {
    console.error('Failed to connect to cluster0:', err.message);
    process.exit(1);
  }
}

test();
