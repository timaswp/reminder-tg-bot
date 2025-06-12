import mongoose from 'mongoose';

async function connectDB() {
    await mongoose.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
    });
    console.log('✅ MongoDB connected');
}

export default connectDB;
