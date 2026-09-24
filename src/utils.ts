const pad = (value: number) => String(value).padStart(2, "0");

/** HH:mm */
export function formatTime(iso: string): string {
  const date = new Date(iso);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** MM-DD HH:mm */
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** datetime-local 输入框需要的本地时间格式 */
export function toLocalInputValue(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** 相对当前时间的粗略描述，用于检修倒计时 */
export function fromNowLabel(iso: string): string {
  const diffMs = new Date(iso).getTime() - Date.now();
  const hours = Math.round(Math.abs(diffMs) / 3_600_000);
  if (diffMs >= 0) return hours === 0 ? "1小时内" : `${hours}小时后`;
  return `已超${hours}小时`;
}
