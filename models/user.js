import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    timeZone: { type: String, required: true },
});

const model = mongoose.model('User', UserSchema);

export default model;