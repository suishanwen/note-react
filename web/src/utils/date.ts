// 解析日期：ISO 串（含 T）直接解析；老式 "YYYY-MM-DD HH:mm:ss" 转 / 以兼容 Safari
function parse(input: string): Date {
  const normalized = input.includes('T') ? input : input.replace(/-/g, '/');
  return new Date(normalized);
}

// 格式化为 YYYY-MM-DD HH:mm
export function formatDateTime(input: string | null, withTime = true): string {
  if (!input) return '';
  const date = parse(input);
  if (Number.isNaN(date.getTime())) return input;
  const pad = (n: number) => String(n).padStart(2, '0');
  const ymd = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  if (!withTime) return ymd;
  return `${ymd} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// 相对时间：刚刚 / N 分钟前 / N 小时前 / N 天前，更早回退到日期
export function fromNow(input: string | null): string {
  if (!input) return '';
  const date = parse(input);
  if (Number.isNaN(date.getTime())) return input;
  const diff = Date.now() - date.getTime();
  const min = 60 * 1000;
  const hour = 60 * min;
  const day = 24 * hour;
  if (diff < min) return '刚刚';
  if (diff < hour) return `${Math.floor(diff / min)} 分钟前`;
  if (diff < day) return `${Math.floor(diff / hour)} 小时前`;
  if (diff < 30 * day) return `${Math.floor(diff / day)} 天前`;
  return formatDateTime(input, false);
}
