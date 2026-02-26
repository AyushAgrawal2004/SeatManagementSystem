const {
    startOfWeek,
    addWeeks,
    differenceInWeeks,
    getDay,
    setHours,
    setMinutes,
    isBefore,
    subDays
} = require('date-fns');

/**
 * Batch Rules:
 * Batch 1: 
 *   Week 1: Mon, Tue, Wed
 *   Week 2: Thu, Fri
 * Batch 2:
 *   Week 1: Thu, Fri
 *   Week 2: Mon, Tue, Wed
 * 
 * Reference Point: Monday, Feb 23, 2026 is Week 1 (Batch 1: Mon-Wed)
 */

const REFERENCE_DATE = new Date(2026, 1, 23); // Feb 23, 2026 (Monday)

const getBatchForDate = (date) => {
    const dayOfWeek = getDay(date); // 0=Sun, 1=Mon, ..., 5=Fri, 6=Sat

    // Only weekdays are relevant
    if (dayOfWeek === 0 || dayOfWeek === 6) return null;

    const weeksDiff = Math.abs(differenceInWeeks(startOfWeek(date, { weekStartsOn: 1 }), startOfWeek(REFERENCE_DATE, { weekStartsOn: 1 })));
    const isWeek1 = weeksDiff % 2 === 0;

    if (isWeek1) {
        // Week 1: Batch 1 (Mon, Tue, Wed), Batch 2 (Thu, Fri)
        if (dayOfWeek >= 1 && dayOfWeek <= 3) return 1;
        if (dayOfWeek >= 4 && dayOfWeek <= 5) return 2;
    } else {
        // Week 2: Batch 2 (Mon, Tue, Wed), Batch 1 (Thu, Fri)
        if (dayOfWeek >= 1 && dayOfWeek <= 3) return 2;
        if (dayOfWeek >= 4 && dayOfWeek <= 5) return 1;
    }

    return null;
};

const canReleaseSeat = (date, now = new Date()) => {
    // Must cancel before 8 PM of previous night
    const deadline = setMinutes(setHours(subDays(date, 1), 20), 0);
    return isBefore(now, deadline);
};

const canBookFloater = (date, now = new Date()) => {
    // Must book after 3 PM from a day before
    const startTime = setMinutes(setHours(subDays(date, 1), 15), 0);
    return !isBefore(now, startTime);
};

module.exports = {
    getBatchForDate,
    canReleaseSeat,
    canBookFloater
};
