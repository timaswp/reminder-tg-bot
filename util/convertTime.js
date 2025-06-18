import { DateTime } from 'luxon';

export function convertLocalTimeToUTC(localTimeStr, userTimeZone) {
    const [hour, minute] = localTimeStr.split(':').map(Number);

    if (minute > 59 || minute < 0 || hour < 0 || hour > 23) {
        throw new Error('Время указано неверно');
    }

    const localDateTime = DateTime.local()
        .set({
            hour,
            minute,
            second: 0,
            millisecond: 0,
        })
        .setZone(userTimeZone, { keepLocalTime: true });

    const utcDateTime = localDateTime.toUTC();

    return utcDateTime.toJSDate();
}

export function convertUtcToLocalTime(dateUTC, userTimeZone) {
    return DateTime.fromJSDate(dateUTC, { zone: 'utc' })
        .setZone(userTimeZone)
        .toFormat('HH:mm');
}
