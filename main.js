import 'dotenv/config';
import TelegramBot from 'node-telegram-bot-api';
import connectDB from './db.js';
import Task from './models/task.js';
import { initAgenda, scheduleReminder } from './agenda.js';

const token = process.env.TG_TOKEN;

const bot = new TelegramBot(token, { polling: true });

(async () => {
    await connectDB();
    await initAgenda(bot);

    bot.onText(/\/start/, (msg) => {
        bot.sendMessage(
            msg.chat.id,
            `Привет!\nДобавь задачу в формате:\n\n/add купить молоко в 18:30\n\nПосмотреть — /list\nУдалить — /delete <ID>`
        );
    });

    bot.onText(/\/add (.+)/, async (msg, match) => {
        try {
            const chatId = msg.chat.id;
            const input = match[1];
            const [text, timeStr] = input.split(' в ');
            if (!timeStr)
                return bot.sendMessage(
                    chatId,
                    'Неверный формат. Используй: /add купить хлеб в 18:30'
                );

            const [h, m] = timeStr.split(':').map(Number);
            const now = new Date();
            const remindAt = new Date(
                now.getFullYear(),
                now.getMonth(),
                now.getDate(),
                h,
                m
            );
            if (remindAt < now) remindAt.setDate(remindAt.getDate() + 1);

            const task = await Task.create({ userId: chatId, text, remindAt });
            await scheduleReminder(task);

            bot.sendMessage(
                chatId,
                `✅ Задача "${text}" добавлена на ${remindAt.toLocaleString()}`
            );
        } catch (err) {
            console.error(err);
            bot.sendMessage(msg.chat.id, 'Ошибка при добавлении задачи.');
        }
    });

    bot.onText(/\/list/, async (msg) => {
        const tasks = await Task.find({ userId: msg.chat.id });
        if (!tasks.length)
            return bot.sendMessage(msg.chat.id, 'У тебя нет задач.');

        const list = tasks
            .map(
                (t) =>
                    `ID: ${t._id}\n• ${t.text} — ${t.remindAt.toLocaleString()}`
            )
            .join('\n\n');
        bot.sendMessage(msg.chat.id, `📋 Твои задачи:\n\n${list}`);
    });

    bot.onText(/\/delete (.+)/, async (msg, match) => {
        const id = match[1].trim();
        const res = await Task.deleteOne({ _id: id, userId: msg.chat.id });
        bot.sendMessage(
            msg.chat.id,
            res.deletedCount
                ? '❌ Задача удалена'
                : 'Не удалось найти задачу с таким ID'
        );
    });

    bot.onText(/\/help/, (msg) => {
        bot.sendMessage(
            msg.chat.id,
            `Все команды бота:\n/add -\nдобавить задачу в формате\n\n/list -\nпосмотреть список задач\n\n/delete <ID> -\nудалить запланнированную задачу`
        );
    });
})();
