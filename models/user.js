import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
    userId: { type: Number, required: true },
    timeZone: { type: String, required: true },
});

const model = mongoose.model('User', UserSchema);

export default model;