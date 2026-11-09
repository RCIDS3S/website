export const CALENDAR_TIME_ZONE = 'America/New_York';
const dateFormatter = new Intl.DateTimeFormat('en-CA', {timeZone: CALENDAR_TIME_ZONE, year:'numeric', month:'2-digit', day:'2-digit'});
export function easternDateKey(value) {
  const parts = dateFormatter.formatToParts(new Date(value));
  const part = (name) => parts.find((p) => p.type === name).value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
export function monthCells(year, month) {
  const leading = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const count = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const size = Math.ceil((leading + count) / 7) * 7;
  return Array.from({length:size}, (_, index) => {
    const day = index - leading + 1;
    return day < 1 || day > count ? null : `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  });
}
