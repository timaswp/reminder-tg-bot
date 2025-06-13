import NodeGeocoder from 'node-geocoder';
import tzlookup from 'tz-lookup';
import 'dotenv/config';

const geocoder = NodeGeocoder({
    provider: 'openstreetmap',
    userAgent: `remind-me-tg-bot/0.3 (${process.env.USER_AGENT_EMAIL})`
});

async function getTimeZoneByCity(bot, msg) {
    try {
        const res = await geocoder.geocode(msg.text);
        if (res.length === 0) {
            bot.sendMessage(msg.from.id, 'Город не найден');
            throw new Error('Город не найден');
        }
        const { latitude, longitude } = res[0];
        const timezone = tzlookup(latitude, longitude);
        return timezone;
    } catch (err) {
        bot.sendMessage(msg.from.id, `Произошла ошибка: ${err}`);
    }
}

export default getTimeZoneByCity;
