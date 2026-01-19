import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/knowyourstyle';

async function updateUserSubscription() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const userId = '68739e233b3156a35d810964';

  // Find the subscription for this user
  const Subscription = mongoose.model('Subscription', new mongoose.Schema({}, { strict: false }));
  const subscription: any = await Subscription.findOne({ userId: new mongoose.Types.ObjectId(userId) });
  
  if (!subscription) {
    console.log('No subscription found for user');
    await mongoose.disconnect();
    return;
  }
  
  console.log('Found subscription:', subscription._id, subscription.type);

  // Update user with currentSubscriptionId
  const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
  const result = await User.updateOne(
    { _id: new mongoose.Types.ObjectId(userId) },
    { 
      $set: { 
        currentSubscriptionId: subscription._id,
        isSubscribed: true
      } 
    }
  );
  
  console.log('Update result:', result);

  // Verify
  const user: any = await User.findById(userId);
  console.log('User currentSubscriptionId:', user?.currentSubscriptionId);
  console.log('User isSubscribed:', user?.isSubscribed);

  await mongoose.disconnect();
  console.log('Done');
}

updateUserSubscription().catch(console.error);
