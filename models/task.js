import mongoose from 'mongoose';

const TaskSchema = new mongoose.Schema({
    userId: { type: Number, required: true },
    text: { type: String, required: true },
    remindAt: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now },
});

const model = mongoose.model('Task', TaskSchema);

export default model;
