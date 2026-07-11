import mongoose from 'mongoose';
import { Property, PropertyRooms, PropertyGallery } from './models.js';

const MONGODB_URI = 'mongodb+srv://Wowgateway947:Wowgateway%40947@cluster0.h57w0ve.mongodb.net/wow_gateways?retryWrites=true&w=majority&appName=Cluster0';

async function verify() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB Atlas');

  // Find properties matching 'Saktim'
  const properties = await Property.find({ name: /Saktim/i, deleted: false });
  console.log(`\nFound ${properties.length} matching properties:`);
  for (const p of properties) {
    console.log(`- Property: ${p.name} (${p._id})`);
    
    const gallery = await PropertyGallery.findOne({ propertyId: p._id });
    if (gallery) {
      console.log('  GallerycoverImage length:', gallery.coverImage ? gallery.coverImage.length : 0);
      console.log('  GallerycoverImage (first 100 chars):', gallery.coverImage ? gallery.coverImage.substring(0, 100) : 'none');
      console.log('  Gallery images type:', typeof gallery.images, Array.isArray(gallery.images) ? 'Array' : 'Not Array');
      console.log('  Gallery images length:', gallery.images ? gallery.images.length : 0);
      if (gallery.images && gallery.images.length > 0) {
        console.log('  First image object:', JSON.stringify(gallery.images[0]).substring(0, 200));
      }
    } else {
      console.log('  No gallery found.');
    }

    const rooms = await PropertyRooms.find({ propertyId: p._id });
    console.log(`  Rooms count: ${rooms.length}`);
    for (const r of rooms) {
      console.log(`  * Room category: ${r.roomCategoryName} (${r._id})`);
      console.log('    Room images type:', typeof r.images, Array.isArray(r.images) ? 'Array' : 'Not Array');
      console.log('    Room images length:', r.images ? r.images.length : 0);
      if (r.images && r.images.length > 0) {
        console.log('    First room image (first 100 chars):', r.images[0].substring(0, 100));
      }
    }
  }

  await mongoose.disconnect();
}

verify().catch(err => {
  console.error(err);
  process.exit(1);
});
