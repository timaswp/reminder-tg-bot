import Agenda from 'agenda';
import Task from './models/task.js';
import { decrypt } from './util/encryption.js';

let agenda;

export async function initAgenda(bot) {
    agenda = new Agenda({
        db: { address: process.env.MONGODB_URI, collection: 'agendaJobs' },
    });

    agenda.define('send reminder', async (job) => {
        const { taskId } = job.attrs.data;
        const task = await Task.findById(taskId);
        if (!task || task.sent) return;

        await bot.sendMessage(task.userId, `🔔 Напоминание: ${decrypt(task.text)}`);
        task.sent = true;
        await task.save();
    });

    await agenda.start();

    const tasks = await Task.find({});
    for (let t of tasks) {
        await agenda.schedule(t.remindAt, 'send reminder', { taskId: t._id });
    }
}

export async function scheduleReminder(task) {
    if (!agenda) throw new Error('Agenda не инициализирован!');
    await agenda.schedule(task.remindAt, 'send reminder', { taskId: task._id });
}
