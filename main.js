import 'dotenv/config';
import TelegramBot from 'node-telegram-bot-api';
import dedent from 'dedent';

import connectDB from './db.js';
import Task from './models/task.js';
import User from './models/user.js';
import { initAgenda, scheduleReminder } from './agenda.js';
import { encrypt, decrypt } from './util/encryption.js';
import getTimeZoneByCity from './util/getTimeZone.js';
import { convertLocalTimeToUTC, convertUtcToLocalTime } from './util/convertTime.js';

const token = process.env.TG_TOKEN;

const bot = new TelegramBot(token, { polling: true });

(async () => {
    await connectDB();
    await initAgenda(bot);

    bot.onText(/\/start/, (msg) => {
        const message = dedent(
            `<b>Привет, ${msg.from.first_name}!</b>

            <i>Это твой помощник для записи задач, чтобы ты ничего не забыл :)</i>

            Укажи, пожалуйста, свой город с большой буквы, чтобы я мог определить твой часовой пояс 🕒
            Например: <b>Баку</b>

            <i>P.S: ты можешь в будущем поменять свой часовой пояс повторной отправкой команды /start.</i>
            Не волнуйся, твои задачи будут сохранены 🫡
            
            <i>Бот находится в процессе разработки. Это beta-версия</i>`
        );

        bot.sendMessage(msg.chat.id, message, { parse_mode: 'HTML' });

        bot.once('message', async (msg) => {
            if (msg.text.startsWith('/')) return;

            const userTimeZone =  await getTimeZoneByCity(bot, msg);

            const existingUser = await User.findOne({ userId: msg.chat.id });

            if (existingUser) {
                try {
                    await User.updateOne(
                        { userId: msg.chat.id },
                        { timeZone: userTimeZone }
                    );
                } catch (error) {
                    bot.sendMessage(msg.chat.id, `Произошла ошибка :(\n${error.message}`);
                }
            } else {
                try {
                    await User.create({ userId: msg.chat.id, timeZone: userTimeZone });
                } catch (error) {
                    bot.sendMessage(msg.chat.id, `Произошла ошибка :(\n${error.message}`);
                }
            }

            bot.sendMessage(msg.chat.id, dedent(
                `Твой часовой пояс - ${userTimeZone}.\n
                Добавь новую задачу в формате:
                /add позвонить другу в 16:30`
            ));
        });
    });

    bot.onText(/\/add\s?(.*)/, async (msg, match) => {
        const existingUser = await User.findOne({ userId: msg.chat.id });

        if (existingUser) {
            try {
                const chatId = msg.chat.id;
                const input = match[1];
                const [text, timeStr] = input.split(' в ');
                if (!timeStr)
                    return bot.sendMessage(
                        chatId,
                        'Неверный формат. Используй: /add купить хлеб в 18:30'
                    );
    
                const now = new Date();
                const remindAt = convertLocalTimeToUTC(timeStr, existingUser.timeZone);
                if (remindAt < now) remindAt.setDate(remindAt.getDate() + 1);
    
                const task = await Task.create({ userId: chatId, text: encrypt(text), remindAt });
                await scheduleReminder(task);
    
                bot.sendMessage(
                    chatId,
                    `✅ Задача "${text}" добавлена на ${timeStr}`
                );
            } catch (err) {
                console.error(err);
                bot.sendMessage(msg.chat.id, 'Ошибка при добавлении задачи.');
            }
        }


        
    });

    bot.onText(/\/list/, async (msg) => {
        const tasks = await Task.find({ userId: msg.chat.id });
        if (!tasks.length)
            return bot.sendMessage(msg.chat.id, 'У тебя нет задач.');

        const buttons = {
            reset: 'Очистить список задач 🗑❌'
        }

        const user = await User.findOne({ userId: msg.chat.id });

        const list = tasks
            .map(
                (t) =>
                    `ID: ${t._id}\n• ${decrypt(t.text)} — ${convertUtcToLocalTime(t.remindAt, user.timeZone)}`
            )
            .join('\n\n');
        bot.sendMessage(msg.chat.id, `📋 Твои задачи:\n\n${list}`, {
            "reply_markup": {
                "keyboard": [[buttons.reset]]
            }
        });

        bot.once('text', async (msg) => {
            if(msg.text.toString().toLowerCase() === buttons.reset.toLowerCase()) {
                try {
                    await Task.deleteMany({ userId: msg.chat.id });
                    bot.sendMessage(msg.chat.id, 'Список задач успешно очищен!\nЧтобы добавить новую задачу используйте /add', {
                        reply_markup: {
                            remove_keyboard: true
                        }
                    });
                } catch (error) {
                    bot.sendMessage(msg.chat.id, `Произошла ошибка!\n${error.message}`, {
                        reply_markup: {
                            remove_keyboard: true
                        }
                    });
                }
            } else if (msg.text.toString().toLowerCase() === '/list') {
                return;
            } else {
                bot.sendMessage(msg.chat.id, 'Такой команды нет!\nИспользуйте /help', {
                    reply_markup: {
                        remove_keyboard: true
                    }
                });
            }
        });
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
        const message = dedent(
            `<b>Все команды бота:<b>\n
            /start - обновить часовой пояс
            /add - добавить задачу
            /list - посмотреть список задач
            /delete <ID задачи> - удалить запланнированную задачу`
        );
        bot.sendMessage(
            msg.chat.id,
            message
        );
    });
})();
