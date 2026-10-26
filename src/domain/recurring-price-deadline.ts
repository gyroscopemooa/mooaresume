const seoulDateFormatter = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "numeric",
  day: "numeric",
});

function getSeoulMonthAndDay(now: Date) {
  const parts = seoulDateFormatter.formatToParts(now);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);

  return { month, day };
}

export function getRecurringPriceDeadline(now = new Date()) {
  const { month, day } = getSeoulMonthAndDay(now);

  if (day <= 15) return `${month}월 15일까지`;
  if (day <= 30) return `${month}월 30일까지`;

  const nextMonth = month === 12 ? 1 : month + 1;
  return `${nextMonth}월 15일까지`;
}
