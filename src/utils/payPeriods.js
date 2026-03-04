/**
 * Pure functions for pay period calculations.
 */

function lastDayOfMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function toDateStr(d) {
  return d.toISOString().split('T')[0];
}

function parseDate(str) {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Generate pay periods between startDate and endDate based on pay schedule.
 * @param {Object} paySchedule - { frequency, pay_day, first_pay_date, commission_lag }
 * @param {string} startDate - ISO date string
 * @param {string} endDate - ISO date string
 * @returns {Array<{ period_start: string, period_end: string }>}
 */
export function calculatePayPeriods(paySchedule, startDate, endDate) {
  if (!paySchedule?.frequency || !startDate || !endDate) return [];

  const periods = [];
  const end = parseDate(endDate);

  switch (paySchedule.frequency) {
    case 'weekly': {
      const anchor = parseDate(paySchedule.first_pay_date || startDate);
      let cur = new Date(anchor);
      // Rewind to before startDate
      const start = parseDate(startDate);
      while (cur > start) cur.setDate(cur.getDate() - 7);
      while (cur < start) cur.setDate(cur.getDate() + 7);
      // Now cur is the first period start >= startDate
      // Actually, period_start is the beginning of the period
      let periodStart = new Date(cur);
      periodStart.setDate(periodStart.getDate() - 6); // 7-day period: start is 6 days before pay day
      if (periodStart < start) periodStart = new Date(start);

      // Recalculate: anchor to weekly periods
      let ps = parseDate(paySchedule.first_pay_date || startDate);
      // Go back to find the first period that overlaps with startDate
      while (toDateStr(new Date(ps.getTime() + 6 * 86400000)) < startDate) {
        ps.setDate(ps.getDate() + 7);
      }
      while (toDateStr(ps) <= endDate) {
        const pe = new Date(ps);
        pe.setDate(pe.getDate() + 6);
        const pStart = toDateStr(ps);
        const pEnd = toDateStr(pe);
        if (pEnd >= startDate && pStart <= endDate) {
          periods.push({ period_start: pStart, period_end: pEnd });
        }
        ps.setDate(ps.getDate() + 7);
      }
      break;
    }
    case 'bi-weekly': {
      let ps = parseDate(paySchedule.first_pay_date || startDate);
      while (toDateStr(new Date(ps.getTime() + 13 * 86400000)) < startDate) {
        ps.setDate(ps.getDate() + 14);
      }
      while (toDateStr(ps) <= endDate) {
        const pe = new Date(ps);
        pe.setDate(pe.getDate() + 13);
        const pStart = toDateStr(ps);
        const pEnd = toDateStr(pe);
        if (pEnd >= startDate && pStart <= endDate) {
          periods.push({ period_start: pStart, period_end: pEnd });
        }
        ps.setDate(ps.getDate() + 14);
      }
      break;
    }
    case 'semi-monthly': {
      // 1st–15th and 16th–end-of-month
      let year = parseDate(startDate).getFullYear();
      let month = parseDate(startDate).getMonth();
      while (true) {
        // First half: 1st to 15th
        const h1Start = `${year}-${String(month + 1).padStart(2, '0')}-01`;
        const h1End = `${year}-${String(month + 1).padStart(2, '0')}-15`;
        if (h1Start > endDate) break;
        if (h1End >= startDate) {
          periods.push({ period_start: h1Start, period_end: h1End });
        }

        // Second half: 16th to end of month
        const lastDay = lastDayOfMonth(year, month);
        const h2Start = `${year}-${String(month + 1).padStart(2, '0')}-16`;
        const h2End = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
        if (h2Start > endDate) break;
        if (h2End >= startDate) {
          periods.push({ period_start: h2Start, period_end: h2End });
        }

        month++;
        if (month > 11) { month = 0; year++; }
      }
      break;
    }
    case 'monthly': {
      const payDay = parseInt(paySchedule.pay_day) || 1;
      let year = parseDate(startDate).getFullYear();
      let month = parseDate(startDate).getMonth();
      while (true) {
        const lastDay = lastDayOfMonth(year, month);
        const anchorDay = Math.min(payDay, lastDay);
        const pStart = `${year}-${String(month + 1).padStart(2, '0')}-${String(anchorDay).padStart(2, '0')}`;

        // Period end is day before next anchor
        let nextMonth = month + 1;
        let nextYear = year;
        if (nextMonth > 11) { nextMonth = 0; nextYear++; }
        const nextLastDay = lastDayOfMonth(nextYear, nextMonth);
        const nextAnchor = Math.min(payDay, nextLastDay);
        const peDate = new Date(nextYear, nextMonth, nextAnchor);
        peDate.setDate(peDate.getDate() - 1);
        const pEnd = toDateStr(peDate);

        if (pStart > endDate) break;
        if (pEnd >= startDate) {
          periods.push({ period_start: pStart, period_end: pEnd });
        }

        month++;
        if (month > 11) { month = 0; year++; }
      }
      break;
    }
    default:
      break;
  }

  return periods;
}

/**
 * Get the current pay period containing today.
 */
export function getCurrentPayPeriod(paySchedule) {
  if (!paySchedule?.frequency) return null;
  const today = toDateStr(new Date());
  // Generate periods around today
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const threeMonthsAhead = new Date();
  threeMonthsAhead.setMonth(threeMonthsAhead.getMonth() + 3);

  const periods = calculatePayPeriods(paySchedule, toDateStr(threeMonthsAgo), toDateStr(threeMonthsAhead));
  return periods.find((p) => p.period_start <= today && p.period_end >= today) || null;
}

/**
 * Get the next pay date (period_end of the current period).
 */
export function getNextPayDate(paySchedule) {
  const current = getCurrentPayPeriod(paySchedule);
  return current?.period_end || null;
}

/**
 * Human-readable label for the pay schedule.
 */
export function getPayDayLabel(paySchedule) {
  if (!paySchedule?.frequency) return 'Not configured';
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  switch (paySchedule.frequency) {
    case 'weekly':
      return `Weekly on ${days[paySchedule.pay_day] || paySchedule.pay_day}`;
    case 'bi-weekly':
      return `Bi-weekly on ${days[paySchedule.pay_day] || paySchedule.pay_day}`;
    case 'semi-monthly':
      return '1st & 15th of each month';
    case 'monthly':
      return `Monthly on the ${ordinal(paySchedule.pay_day)}`;
    default:
      return paySchedule.frequency;
  }
}

function ordinal(n) {
  const num = parseInt(n);
  if (!num) return n;
  const s = ['th', 'st', 'nd', 'rd'];
  const v = num % 100;
  return num + (s[(v - 20) % 10] || s[v] || s[0]);
}
