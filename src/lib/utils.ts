// ── Currency Formatter ──
export const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(n);

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
