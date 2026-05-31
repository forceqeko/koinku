// ── Currency Formatter ──
export const fmt = (n: number | string | null | undefined) => {
  const val = typeof n === 'string' ? Number(n) : (n ?? 0);
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(isNaN(val) ? 0 : val);
};

// ── Format number input with thousand separator ──
export const formatThousands = (value: string): string => {
  const num = value.replace(/\D/g, '');
  if (!num) return '';
  return new Intl.NumberFormat('id-ID').format(Number(num));
};

// ── Parse formatted string back to number ──
export const parseThousands = (formatted: string): string => {
  return formatted.replace(/\./g, '');
};
