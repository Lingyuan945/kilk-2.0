/**
 * 文件大小格式化：B / KB / MB
 */
export function formatBytes(bytes?: number | string | null): string {
  const size = Number(bytes) || 0;
  if (!size) return '-';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}
