export function initialOf(name: string) {
  return name.length > 1 ? name[1] : (name[0] ?? "?");
}

export function dDayLabel(dueAt: Date | null) {
  if (!dueAt) return null;
  const days = Math.ceil((dueAt.getTime() - Date.now()) / 86400000);
  if (days < 0) return "마감됨";
  if (days === 0) return "오늘 마감";
  return `마감 D-${days}`;
}

export function formatDateTime(d: Date) {
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
}
