import dayjs from 'dayjs';

export const THAI_UTC_OFFSET = 7;

export function thaiNow() {
    return dayjs().utcOffset(THAI_UTC_OFFSET);
}

export function thaiStartOfDay(value?: string | Date) {
    if (!value) {
        return thaiNow().startOf('day');
    }

    if (typeof value === 'string') {
        return dayjs(value).utcOffset(THAI_UTC_OFFSET, true).startOf('day');
    }

    return dayjs(value).utcOffset(THAI_UTC_OFFSET).startOf('day');
}

export function thaiEndOfDay(value?: string | Date) {
    if (!value) {
        return thaiNow().endOf('day');
    }

    if (typeof value === 'string') {
        return dayjs(value).utcOffset(THAI_UTC_OFFSET, true).endOf('day');
    }

    return dayjs(value).utcOffset(THAI_UTC_OFFSET).endOf('day');
}

export function thaiDateKey(value?: string | Date) {
    return thaiStartOfDay(value).format('YYYY-MM-DD');
}
