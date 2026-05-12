import { useState, useMemo, useRef, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, LineChart, Line } from 'recharts';
import { ChevronDown, ChevronUp, FileText, Table, ArrowLeft, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import clsx from 'clsx';
import { useData } from '../context/DataContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { fmt } from '../lib/utils';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const FULL_MONTH_NAMES = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

// Admin fees on transfers/savings are real outflows. We count them as
// expense without creating separate rows (Opsi A admin-fee model).
const ADMIN_FEE_BUCKET = 'Biaya Admin';
const expenseAmount = (t: { type: string; amount: number | string; admin_fee?: number | string | null }) => {
  if (t.type === 'expense' || t.type === 'bill') return Number(t.amount);
  if ((t.type === 'transfer' || t.type === 'saving') && t.admin_fee) return Number(t.admin_fee);
  return 0;
};
const sumExpense = (list: { type: string; amount: number | string; admin_fee?: number | string | null }[]) =>
  list.reduce((sum, t) => sum + expenseAmount(t), 0);

export default function Report() {
  const { transactions, categories, purposes, accounts } = useData();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [isYearPickerOpen, setIsYearPickerOpen] = useState(false);
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [showAllPurposes, setShowAllPurposes] = useState(false);
  const yearPickerRef = useRef<HTMLDivElement>(null);
  const monthPickerRef = useRef<HTMLDivElement>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (yearPickerRef.current && !yearPickerRef.current.contains(event.target as Node)) {
        setIsYearPickerOpen(false);
      }
      if (monthPickerRef.current && !monthPickerRef.current.contains(event.target as Node)) {
        setIsMonthPickerOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setShowAllPurposes(false);
  }, [selectedMonth, selectedYear]);

  const handleMonthClick = (monthIdx: number) => {
    setSelectedMonth(monthIdx);
  };

  const handleBackToYearly = () => {
    setSelectedMonth(null);
  };

  const COLORS = [
    'var(--chart-1)',
    'var(--chart-2)',
    'var(--chart-3)',
    'var(--chart-4)',
    'var(--chart-5)',
  ];

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    transactions.forEach(t => {
      years.add(new Date(t.date).getFullYear());
    });
    years.add(new Date().getFullYear());
    return Array.from(years).sort((a, b) => b - a);
  }, [transactions]);

  const yearTx = useMemo(() => {
    return transactions.filter(t => new Date(t.date).getFullYear() === selectedYear);
  }, [transactions, selectedYear]);

  const prevYearTx = useMemo(() => {
    return transactions.filter(t => new Date(t.date).getFullYear() === selectedYear - 1);
  }, [transactions, selectedYear]);

  const filteredTx = useMemo(() => {
    if (selectedMonth === null) return yearTx;
    return yearTx.filter(t => new Date(t.date).getMonth() === selectedMonth);
  }, [yearTx, selectedMonth]);

  const prevMonthTx = useMemo(() => {
    if (selectedMonth === null) return [];
    const prevMonth = selectedMonth === 0 ? 11 : selectedMonth - 1;
    const prevMonthYear = selectedMonth === 0 ? selectedYear - 1 : selectedYear;
    return transactions.filter(t => new Date(t.date).getMonth() === prevMonth && new Date(t.date).getFullYear() === prevMonthYear);
  }, [transactions, selectedMonth, selectedYear]);

  const monthData = useMemo(() => {
    if (selectedMonth !== null) {
      const monthTx = yearTx.filter(t => new Date(t.date).getMonth() === selectedMonth);
      const result = MONTH_NAMES.map((name, idx) => {
        const isSelected = idx === selectedMonth;
        const mTx = isSelected ? monthTx : [];
        const income = mTx
          .filter(t => t.type === 'income')
          .reduce((sum, t) => sum + Number(t.amount), 0);
        const expense = sumExpense(mTx);
        return { name, fullName: FULL_MONTH_NAMES[idx], month: idx, isSelected, Pemasukan: income, Pengeluaran: expense };
      });
      return result;
    }

    const result = MONTH_NAMES.map((name, idx) => {
      const monthTx = yearTx.filter(t => new Date(t.date).getMonth() === idx);
      const income = monthTx
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + Number(t.amount), 0);
      const expense = sumExpense(monthTx);
      return { name, fullName: FULL_MONTH_NAMES[idx], month: idx, isSelected: false, Pemasukan: income, Pengeluaran: expense };
    });

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    const lastMonthWithData = result.reduce((last, m, idx) => {
      if (m.Pemasukan > 0 || m.Pengeluaran > 0) return idx;
      return last;
    }, -1);
    const endMonth = selectedYear === currentYear ? Math.max(currentMonth, lastMonthWithData) : lastMonthWithData;
    return result.slice(0, endMonth + 1);
  }, [yearTx, selectedMonth, selectedYear]);

  const expenseByCategory = useMemo(() => {
    const categoryMap = new Map<string, number>();
    let adminFeeTotal = 0;
    filteredTx.forEach(t => {
      if (t.type === 'expense' && t.category_id) {
        const cat = categories.find((c: any) => c.id === t.category_id);
        const catName = cat?.name || 'Lainnya';
        categoryMap.set(catName, (categoryMap.get(catName) || 0) + Number(t.amount));
      } else if (t.type === 'bill') {
        // Bills were already counted in summary.totalExpense, so include
        // them here to keep category totals consistent with summary.
        categoryMap.set('Tagihan', (categoryMap.get('Tagihan') || 0) + Number(t.amount));
      } else if ((t.type === 'transfer' || t.type === 'saving') && t.admin_fee) {
        adminFeeTotal += Number(t.admin_fee);
      }
    });
    if (adminFeeTotal > 0) {
      categoryMap.set(ADMIN_FEE_BUCKET, adminFeeTotal);
    }
    return Array.from(categoryMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredTx, categories]);

  const expenseByPurpose = useMemo(() => {
    const purposeMap = new Map<string, number>();
    let adminFeeTotal = 0;
    filteredTx.forEach(t => {
      if (t.type === 'expense' && t.purpose_id) {
        const pur = purposes.find((p: any) => p.id === t.purpose_id);
        const purName = pur?.name || 'Lainnya';
        purposeMap.set(purName, (purposeMap.get(purName) || 0) + Number(t.amount));
      } else if (t.type === 'bill') {
        purposeMap.set('Tagihan', (purposeMap.get('Tagihan') || 0) + Number(t.amount));
      } else if ((t.type === 'transfer' || t.type === 'saving') && t.admin_fee) {
        adminFeeTotal += Number(t.admin_fee);
      }
    });
    if (adminFeeTotal > 0) {
      purposeMap.set(ADMIN_FEE_BUCKET, adminFeeTotal);
    }
    return Array.from(purposeMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredTx, purposes]);

  const summary = useMemo(() => {
    const totalIncome = filteredTx.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
    const totalExpense = sumExpense(filteredTx);
    const totalSaving = filteredTx.filter(t => t.type === 'saving').reduce((sum, t) => sum + Number(t.amount), 0);

    let divisor: number;
    if (selectedMonth !== null) {
      divisor = 1;
    } else {
      const activeMonths = monthData.filter(m => m.Pemasukan > 0 || m.Pengeluaran > 0);
      divisor = Math.max(activeMonths.length, 1);
    }
    const avgMonthlyIncome = totalIncome / divisor;
    const avgMonthlyExpense = totalExpense / divisor;
    const topExpenseCategory = expenseByCategory[0]?.name || '-';

    const monthDataForSummary = selectedMonth !== null
      ? [{ name: FULL_MONTH_NAMES[selectedMonth], Pemasukan: 0, Pengeluaran: 0, ...monthData.find(m => m.month === selectedMonth) }]
      : monthData;

    const bestMonth = monthDataForSummary.reduce((best, m) => (m.Pemasukan > best.Pemasukan ? m : best), monthDataForSummary[0] || { name: '-', Pemasukan: 0 });
    const worstMonth = monthDataForSummary.reduce((worst, m) => (m.Pengeluaran > worst.Pengeluaran ? m : worst), monthDataForSummary[0] || { name: '-', Pengeluaran: 0 });

    return { totalIncome, totalExpense, totalSaving, avgMonthlyIncome, avgMonthlyExpense, topExpenseCategory, bestMonth, worstMonth, divisor };
  }, [filteredTx, expenseByCategory, monthData, selectedMonth]);

  const yearAverageExpense = useMemo(() => {
    const activeMonths = monthData.filter(m => m.Pemasukan > 0 || m.Pengeluaran > 0);
    const divisor = Math.max(activeMonths.length, 1);
    const yearExpenseTotal = monthData.reduce((sum, month) => sum + month.Pengeluaran, 0);
    return yearExpenseTotal / divisor;
  }, [monthData]);

  const averageDailyExpense = useMemo(() => {
    if (selectedMonth === null) return 0;
    const today = new Date();
    const isCurrentMonth = selectedYear === today.getFullYear() && selectedMonth === today.getMonth();
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const divisor = isCurrentMonth ? today.getDate() : daysInMonth;
    return divisor > 0 ? summary.totalExpense / divisor : 0;
  }, [selectedMonth, selectedYear, summary.totalExpense]);

  const totalExpense = expenseByCategory.reduce((a, b) => a + b.value, 0);

  const savingsRate = useMemo(() => {
    if (summary.totalIncome === 0) return 0;
    return (summary.totalSaving / summary.totalIncome) * 100;
  }, [summary.totalIncome, summary.totalSaving]);

  const monthOverMonth = useMemo(() => {
    const calcChange = (current: number, prev: number) => {
      if (prev === 0) return null;
      return ((current - prev) / prev) * 100;
    };

    const prevPeriodSummary = selectedMonth !== null
      ? {
          totalIncome: prevMonthTx.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0),
          totalExpense: sumExpense(prevMonthTx),
          totalSaving: prevMonthTx.filter(t => t.type === 'saving').reduce((sum, t) => sum + Number(t.amount), 0),
        }
      : {
          totalIncome: prevYearTx.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0),
          totalExpense: sumExpense(prevYearTx),
          totalSaving: prevYearTx.filter(t => t.type === 'saving').reduce((sum, t) => sum + Number(t.amount), 0),
        };

    const prevPeriodLabel = selectedMonth !== null
      ? `${FULL_MONTH_NAMES[selectedMonth === 0 ? 11 : selectedMonth - 1]} ${selectedMonth === 0 ? selectedYear - 1 : selectedYear}`
      : `${selectedYear - 1}`;

    return {
      incomeChange: calcChange(summary.totalIncome, prevPeriodSummary.totalIncome),
      expenseChange: calcChange(summary.totalExpense, prevPeriodSummary.totalExpense),
      savingChange: calcChange(summary.totalSaving, prevPeriodSummary.totalSaving),
      prevPeriodLabel,
    };
  }, [selectedMonth, selectedYear, summary, prevMonthTx, prevYearTx]);

  const reportInsights = useMemo(() => {
    const periodLabel = selectedMonth !== null ? `${FULL_MONTH_NAMES[selectedMonth]} ${selectedYear}` : `tahun ${selectedYear}`;
    const comparisonLabel = selectedMonth !== null ? 'bulan lalu' : 'tahun lalu';

    const formatChangeText = (label: string, change: number | null) => {
      if (change === null) {
        return {
          tone: 'neutral' as const,
          text: `${label} belum punya data pembanding dari ${comparisonLabel}.`,
        };
      }

      if (Math.abs(change) < 0.1) {
        return {
          tone: 'neutral' as const,
          text: `${label} relatif stabil dibanding ${comparisonLabel}.`,
        };
      }

      const isUp = change > 0;
      return {
        tone: isUp ? ('up' as const) : ('down' as const),
        text: `${label} ${isUp ? 'naik' : 'turun'} ${Math.abs(change).toFixed(1)}% dibanding ${comparisonLabel}.`,
      };
    };

    const expenseCategoryInsight = expenseByCategory[0]
      ? {
          tone: 'neutral' as const,
          text: `Kategori pengeluaran terbesar ${selectedMonth !== null ? 'bulan ini' : `di ${periodLabel}`} adalah ${expenseByCategory[0].name} sebesar ${fmt(expenseByCategory[0].value)}.`,
        }
      : {
          tone: 'neutral' as const,
          text: 'Belum ada kategori pengeluaran pada periode ini.',
        };

    const expensePurposeInsight = expenseByPurpose[0]
      ? {
          tone: 'neutral' as const,
          text: `Tujuan pengeluaran terbesar adalah ${expenseByPurpose[0].name} sebesar ${fmt(expenseByPurpose[0].value)}.`,
        }
      : {
          tone: 'neutral' as const,
          text: 'Belum ada tujuan pengeluaran pada periode ini.',
        };

    const savingsInsight =
      summary.totalIncome > 0
        ? {
            tone: savingsRate >= 20 ? ('up' as const) : ('neutral' as const),
            text: `Anda menabung ${savingsRate.toFixed(1)}% dari total pemasukan ${periodLabel}.`,
          }
        : {
            tone: 'neutral' as const,
            text: `Belum ada pemasukan tercatat pada ${periodLabel}, jadi rasio tabungan belum bisa dihitung.`,
          };

    const netRemaining = summary.totalIncome - summary.totalExpense - summary.totalSaving;

    const netFlowInsight =
      netRemaining >= 0
        ? {
            tone: 'up' as const,
            text: `Periode ini surplus ${fmt(netRemaining)} setelah pengeluaran dan tabungan.`,
          }
        : {
            tone: 'down' as const,
            text: `Periode ini defisit ${fmt(Math.abs(netRemaining))}. Pengeluaran dan tabungan melebihi pemasukan.`,
          };

    return [
      {
        title: 'Perubahan Pemasukan',
        ...formatChangeText('Pemasukan', monthOverMonth.incomeChange),
      },
      {
        title: 'Perubahan Pengeluaran',
        ...formatChangeText('Pengeluaran', monthOverMonth.expenseChange),
      },
      {
        title: 'Kategori Terbesar',
        ...expenseCategoryInsight,
      },
      {
        title: 'Tujuan Terbesar',
        ...expensePurposeInsight,
      },
      {
        title: 'Rasio Tabungan',
        ...savingsInsight,
      },
      {
        title: 'Status Arus Kas',
        ...netFlowInsight,
      },
    ];
  }, [
    selectedMonth,
    selectedYear,
    monthOverMonth.incomeChange,
    monthOverMonth.expenseChange,
    expenseByCategory,
    expenseByPurpose,
    summary.totalIncome,
    summary.totalExpense,
    summary.totalSaving,
    savingsRate,
  ]);

  const topTransactions = useMemo(() => {
    const incomes = filteredTx
      .filter(t => t.type === 'income')
      .sort((a, b) => Number(b.amount) - Number(a.amount))
      .slice(0, 5);

    const expenses = filteredTx
      .filter(t => t.type === 'expense' || t.type === 'bill')
      .sort((a, b) => Number(b.amount) - Number(a.amount))
      .slice(0, 5);

    return { incomes, expenses };
  }, [filteredTx]);

  const cashFlow = useMemo(() => {
    const totalIncome = summary.totalIncome;
    const totalExpense = summary.totalExpense;
    const totalSaving = summary.totalSaving;
    const totalTransfer = filteredTx
      .filter(t => t.type === 'transfer')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const totalBill = filteredTx
      .filter(t => t.type === 'bill')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    const remaining = totalIncome - totalExpense - totalSaving;

    const expensePercent = totalIncome > 0 ? (totalExpense / totalIncome) * 100 : 0;
    const savingPercent = totalIncome > 0 ? (totalSaving / totalIncome) * 100 : 0;
    const billPercent = totalIncome > 0 ? (totalBill / totalIncome) * 100 : 0;
    const transferPercent = totalIncome > 0 ? (totalTransfer / totalIncome) * 100 : 0;
    const remainingPercent = totalIncome > 0 ? Math.max(0, (remaining / totalIncome) * 100) : 0;
    const netFlowPercent = totalIncome > 0 ? (Math.abs(remaining) / totalIncome) * 100 : 0;

    return {
      totalIncome, totalExpense, totalSaving, totalTransfer, totalBill, remaining,
      expensePercent, savingPercent, billPercent, transferPercent, remainingPercent, netFlowPercent,
    };
  }, [filteredTx, summary]);

  const ComparisonBadge = ({ change, label }: { change: number | null; label: string }) => {
    if (change === null) return <span className="text-[10px] text-text-muted">Tidak ada data</span>;
    const isPositive = change > 0;
    const isNegative = change < 0;
    const Icon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;
    const color = label === 'Pengeluaran'
      ? (isPositive ? 'text-danger' : isNegative ? 'text-success' : 'text-text-muted')
      : (isPositive ? 'text-success' : isNegative ? 'text-danger' : 'text-text-muted');

    return (
      <span className={clsx("text-[10px] font-medium flex items-center gap-0.5", color)}>
        <Icon className="w-3 h-3" />
        {isPositive ? '+' : ''}{change.toFixed(1)}%
      </span>
    );
  };

  const exportToPDF = () => {
    const doc = new jsPDF() as any;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const periodLabel = selectedMonth !== null ? `${FULL_MONTH_NAMES[selectedMonth]} ${selectedYear}` : `Tahun ${selectedYear}`;

    const colors = {
      primary: [22, 101, 52] as [number, number, number],
      primarySoft: [232, 242, 236] as [number, number, number],
      accent: [201, 162, 39] as [number, number, number],
      text: [30, 41, 59] as [number, number, number],
      muted: [100, 116, 139] as [number, number, number],
      line: [226, 232, 240] as [number, number, number],
      success: [22, 163, 74] as [number, number, number],
      danger: [220, 38, 38] as [number, number, number],
      saving: [8, 145, 178] as [number, number, number],
    };

    let cursorY = 18;

    const ensureSpace = (needed: number) => {
      if (cursorY + needed <= pageHeight - 18) return;
      doc.addPage();
      cursorY = 18;
    };

    const drawSectionTitle = (title: string, subtitle?: string) => {
      ensureSpace(16);
      doc.setFontSize(13);
      doc.setTextColor(...colors.text);
      doc.text(title, 16, cursorY);
      if (subtitle) {
        doc.setFontSize(9);
        doc.setTextColor(...colors.muted);
        doc.text(subtitle, 16, cursorY + 5);
        cursorY += 11;
        return;
      }
      cursorY += 7;
    };

    const drawMetricCard = (x: number, y: number, w: number, h: number, label: string, value: string, tone: [number, number, number]) => {
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(...colors.line);
      doc.roundedRect(x, y, w, h, 6, 6, 'FD');
      doc.setFillColor(...tone);
      doc.roundedRect(x + 4, y + 4, 10, 10, 3, 3, 'F');
      doc.setFontSize(8);
      doc.setTextColor(...colors.muted);
      doc.text(label.toUpperCase(), x + 18, y + 8);
      doc.setFontSize(12);
      doc.setTextColor(...colors.text);
      doc.text(value, x + 18, y + 16);
    };

    const drawProgressBar = (label: string, value: number, color: [number, number, number]) => {
      ensureSpace(14);
      doc.setFontSize(9);
      doc.setTextColor(...colors.text);
      doc.text(label, 16, cursorY);
      doc.setTextColor(...colors.muted);
      doc.text(`${value.toFixed(1)}%`, pageWidth - 16, cursorY, { align: 'right' });
      doc.setFillColor(241, 245, 249);
      doc.roundedRect(16, cursorY + 3, pageWidth - 32, 4, 2, 2, 'F');
      doc.setFillColor(...color);
      doc.roundedRect(16, cursorY + 3, Math.max(8, ((pageWidth - 32) * Math.min(value, 100)) / 100), 4, 2, 2, 'F');
      cursorY += 12;
    };

    doc.setFillColor(...colors.primary);
    doc.roundedRect(12, 12, pageWidth - 24, 34, 8, 8, 'F');
    doc.setFillColor(...colors.accent);
    doc.circle(pageWidth - 26, 24, 10, 'F');
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text('Koin Ku', 18, 21);
    doc.setFontSize(19);
    doc.text('Laporan Keuangan', 18, 30);
    doc.setFontSize(10);
    doc.setTextColor(226, 232, 240);
    doc.text(periodLabel, 18, 37);
    doc.text(`Dicetak ${format(new Date(), 'dd MMMM yyyy', { locale: id })}`, pageWidth - 18, 37, { align: 'right' });
    cursorY = 56;

    drawSectionTitle('Ringkasan Utama', selectedMonth !== null ? 'Snapshot performa bulan terpilih' : 'Ringkasan performa satu tahun penuh');
    const cardGap = 6;
    const cardWidth = (pageWidth - 32 - cardGap) / 2;
    drawMetricCard(16, cursorY, cardWidth, 22, 'Total Pemasukan', fmt(summary.totalIncome), colors.success);
    drawMetricCard(16 + cardWidth + cardGap, cursorY, cardWidth, 22, 'Total Pengeluaran', fmt(summary.totalExpense), colors.danger);
    cursorY += 26;
    drawMetricCard(16, cursorY, cardWidth, 22, 'Total Tabungan', fmt(summary.totalSaving), colors.saving);
    drawMetricCard(16 + cardWidth + cardGap, cursorY, cardWidth, 22, 'Arus Bersih', fmt(summary.totalIncome - summary.totalExpense - summary.totalSaving), colors.primary);
    cursorY += 30;

    drawSectionTitle('Komposisi Arus Uang', 'Distribusi dari total pemasukan pada periode ini');
    drawProgressBar('Pengeluaran', cashFlow.expensePercent, colors.danger);
    drawProgressBar('Tabungan', cashFlow.savingPercent, colors.saving);
    if (cashFlow.remainingPercent > 0) {
      drawProgressBar('Sisa Dana', cashFlow.remainingPercent, colors.success);
    }

    ensureSpace(34);
    const insightTop = cursorY;
    const insightWidth = (pageWidth - 38) / 2;
    doc.setFillColor(...colors.primarySoft);
    doc.setDrawColor(...colors.line);
    doc.roundedRect(16, insightTop, insightWidth, 28, 6, 6, 'FD');
    doc.roundedRect(22 + insightWidth, insightTop, insightWidth, 28, 6, 6, 'FD');
    doc.setFontSize(9);
    doc.setTextColor(...colors.muted);
    doc.text('Insight Kunci', 22, insightTop + 7);
    doc.text('Insight Tambahan', 28 + insightWidth, insightTop + 7);
    doc.setFontSize(11);
    doc.setTextColor(...colors.text);
    doc.text(`Kategori tertinggi: ${summary.topExpenseCategory}`, 22, insightTop + 15);
    doc.text(`Saving rate: ${savingsRate.toFixed(1)}%`, 22, insightTop + 22);
    doc.text(`Bulan terbaik: ${summary.bestMonth.name}`, 28 + insightWidth, insightTop + 15);
    doc.text(`Puncak pengeluaran: ${summary.worstMonth.name}`, 28 + insightWidth, insightTop + 22);
    cursorY += 36;

    drawSectionTitle('Pengeluaran per Kategori');
    autoTable(doc, {
      startY: cursorY,
      head: [['Kategori', 'Jumlah', 'Persentase']],
      body: expenseByCategory.length > 0
        ? expenseByCategory.map(c => [c.name, fmt(c.value), `${((c.value / totalExpense) * 100).toFixed(1)}%`])
        : [['Belum ada data', '-', '-']],
      theme: 'plain',
      margin: { left: 16, right: 16 },
      styles: {
        fontSize: 9,
        cellPadding: 3,
        textColor: colors.text,
        lineColor: colors.line,
        lineWidth: 0.2,
      },
      headStyles: {
        fillColor: colors.primary,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        1: { halign: 'right' },
        2: { halign: 'right' },
      },
    } as any);
    cursorY = doc.lastAutoTable.finalY + 10;

    drawSectionTitle('Transaksi Terbesar', 'Lima transaksi paling menonjol pada periode ini');
    autoTable(doc, {
      startY: cursorY,
      head: [['Jenis', 'Deskripsi', 'Akun', 'Jumlah']],
      body: [
        ...topTransactions.incomes.map(tx => [
          'Pemasukan',
          tx.description,
          accounts.find((a: any) => a.id === tx.to_account_id)?.name || '-',
          fmt(Number(tx.amount)),
        ]),
        ...topTransactions.expenses.map(tx => [
          tx.type === 'bill' ? 'Tagihan' : 'Pengeluaran',
          tx.description,
          accounts.find((a: any) => a.id === tx.from_account_id)?.name || '-',
          fmt(Number(tx.amount)),
        ]),
      ].slice(0, 10),
      theme: 'plain',
      margin: { left: 16, right: 16 },
      styles: {
        fontSize: 8.5,
        cellPadding: 3,
        textColor: colors.text,
        lineColor: colors.line,
        lineWidth: 0.2,
      },
      headStyles: {
        fillColor: colors.accent,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [250, 250, 250],
      },
      columnStyles: {
        3: { halign: 'right' },
      },
    } as any);
    cursorY = doc.lastAutoTable.finalY + 10;

    drawSectionTitle('Detail Ringkas');
    autoTable(doc, {
      startY: cursorY,
      head: [['Tanggal', 'Tipe', 'Deskripsi', 'Jumlah']],
      body: filteredTx.slice(0, 12).map(t => [
        format(new Date(t.date), 'dd MMM yyyy', { locale: id }),
        t.type,
        t.description,
        fmt(Number(t.amount)),
      ]),
      theme: 'plain',
      margin: { left: 16, right: 16 },
      styles: {
        fontSize: 8.5,
        cellPadding: 3,
        textColor: colors.text,
        lineColor: colors.line,
        lineWidth: 0.2,
      },
      headStyles: {
        fillColor: [71, 85, 105],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
      columnStyles: {
        3: { halign: 'right' },
      },
    } as any);

    const totalPages = doc.getNumberOfPages();
    for (let page = 1; page <= totalPages; page += 1) {
      doc.setPage(page);
      doc.setDrawColor(...colors.line);
      doc.line(16, pageHeight - 12, pageWidth - 16, pageHeight - 12);
      doc.setFontSize(8);
      doc.setTextColor(...colors.muted);
      doc.text('Koin Ku • Laporan otomatis', 16, pageHeight - 7);
      doc.text(`Halaman ${page} / ${totalPages}`, pageWidth - 16, pageHeight - 7, { align: 'right' });
    }

    doc.save(`Laporan_Keuangan_${selectedYear}${selectedMonth !== null ? `_${FULL_MONTH_NAMES[selectedMonth]}` : ''}.pdf`);
  };

  const exportToExcel = () => {
    const periodLabel = selectedMonth !== null ? `${FULL_MONTH_NAMES[selectedMonth]} ${selectedYear}` : `${selectedYear}`;
    const escapeXml = (value: string) =>
      value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');

    const stringCell = (value: string, style = 'Cell') =>
      `<Cell ss:StyleID="${style}"><Data ss:Type="String">${escapeXml(value)}</Data></Cell>`;

    const numberCell = (value: number, style = 'NumberCell') =>
      `<Cell ss:StyleID="${style}"><Data ss:Type="Number">${Number.isFinite(value) ? value : 0}</Data></Cell>`;

    const summaryRows = [
      ['Total Pemasukan', summary.totalIncome],
      ['Total Pengeluaran', summary.totalExpense],
      ['Total Tabungan', summary.totalSaving],
      ['Arus Bersih', summary.totalIncome - summary.totalExpense - summary.totalSaving],
      ['Rata-rata Pemasukan/Bulan', summary.avgMonthlyIncome],
      ['Rata-rata Pengeluaran/Bulan', summary.avgMonthlyExpense],
      ['Saving Rate (%)', Number(savingsRate.toFixed(1))],
    ];

    const insightRows = [
      ['Kategori Tertinggi', summary.topExpenseCategory],
      ['Bulan Terbaik', `${summary.bestMonth.name} (${fmt(summary.bestMonth.Pemasukan)})`],
      ['Puncak Pengeluaran', `${summary.worstMonth.name} (${fmt(summary.worstMonth.Pengeluaran)})`],
      ['Dicetak Pada', format(new Date(), 'dd MMMM yyyy', { locale: id })],
    ];

    const xmlRows = [
      `<Row ss:Height="28">${stringCell('LAPORAN KEUANGAN', 'TitleCell')}${stringCell('')}${stringCell('')}${stringCell('')}</Row>`,
      `<Row ss:Height="22">${stringCell(`Periode: ${periodLabel}`, 'SubtitleCell')}${stringCell('')}${stringCell('')}${stringCell('')}</Row>`,
      `<Row ss:Height="10">${stringCell('')}${stringCell('')}${stringCell('')}${stringCell('')}</Row>`,
      `<Row>${stringCell('RINGKASAN UTAMA', 'SectionCell')}${stringCell('')}${stringCell('')}${stringCell('')}</Row>`,
      `<Row>${stringCell('Metrik', 'HeaderCell')}${stringCell('Nilai', 'HeaderCell')}${stringCell('')}${stringCell('')}</Row>`,
      ...summaryRows.map(([label, value]) => `<Row>${stringCell(String(label))}${numberCell(Number(value))}${stringCell('')}${stringCell('')}</Row>`),
      `<Row ss:Height="10">${stringCell('')}${stringCell('')}${stringCell('')}${stringCell('')}</Row>`,
      `<Row>${stringCell('INSIGHT', 'SectionCell')}${stringCell('')}${stringCell('')}${stringCell('')}</Row>`,
      ...insightRows.map(([label, value]) => `<Row>${stringCell(String(label))}${stringCell(String(value), 'ValueCell')}${stringCell('')}${stringCell('')}</Row>`),
      `<Row ss:Height="10">${stringCell('')}${stringCell('')}${stringCell('')}${stringCell('')}</Row>`,
      `<Row>${stringCell('PENGELUARAN PER KATEGORI', 'SectionCell')}${stringCell('')}${stringCell('')}${stringCell('')}</Row>`,
      `<Row>${stringCell('Kategori', 'HeaderCell')}${stringCell('Jumlah', 'HeaderCell')}${stringCell('Persentase', 'HeaderCell')}${stringCell('')}</Row>`,
      ...(expenseByCategory.length > 0
        ? expenseByCategory.map(c => `<Row>${stringCell(c.name)}${numberCell(c.value)}${stringCell(`${((c.value / totalExpense) * 100).toFixed(1)}%`, 'ValueCell')}${stringCell('')}</Row>`)
        : [`<Row>${stringCell('Belum ada data', 'MutedCell')}${stringCell('-', 'MutedCell')}${stringCell('-', 'MutedCell')}${stringCell('')}</Row>`]),
      `<Row ss:Height="10">${stringCell('')}${stringCell('')}${stringCell('')}${stringCell('')}</Row>`,
      `<Row>${stringCell('TREN BULANAN', 'SectionCell')}${stringCell('')}${stringCell('')}${stringCell('')}</Row>`,
      `<Row>${stringCell('Bulan', 'HeaderCell')}${stringCell('Pemasukan', 'HeaderCell')}${stringCell('Pengeluaran', 'HeaderCell')}${stringCell('')}</Row>`,
      ...monthData.map(m => `<Row>${stringCell(m.fullName || m.name)}${numberCell(m.Pemasukan)}${numberCell(m.Pengeluaran)}${stringCell('')}</Row>`),
      `<Row ss:Height="10">${stringCell('')}${stringCell('')}${stringCell('')}${stringCell('')}</Row>`,
      `<Row>${stringCell('DETAIL TRANSAKSI', 'SectionCell')}${stringCell('')}${stringCell('')}${stringCell('')}</Row>`,
      `<Row>${stringCell('Tanggal', 'HeaderCell')}${stringCell('Tipe', 'HeaderCell')}${stringCell('Deskripsi', 'HeaderCell')}${stringCell('Jumlah', 'HeaderCell')}</Row>`,
      ...filteredTx.map(t => `<Row>${stringCell(format(new Date(t.date), 'yyyy-MM-dd'))}${stringCell(t.type)}${stringCell(t.description)}${numberCell(Number(t.amount))}</Row>`),
    ].join('');

    const workbookXml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:html="http://www.w3.org/TR/REC-html40">
  <Styles>
    <Style ss:ID="Default" ss:Name="Normal">
      <Alignment ss:Vertical="Center"/>
      <Borders/>
      <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#1E293B"/>
      <Interior/>
      <NumberFormat/>
      <Protection/>
    </Style>
    <Style ss:ID="TitleCell">
      <Font ss:FontName="Calibri" ss:Bold="1" ss:Size="16" ss:Color="#166534"/>
    </Style>
    <Style ss:ID="SubtitleCell">
      <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#64748B"/>
    </Style>
    <Style ss:ID="SectionCell">
      <Font ss:FontName="Calibri" ss:Bold="1" ss:Size="11" ss:Color="#FFFFFF"/>
      <Interior ss:Color="#166534" ss:Pattern="Solid"/>
    </Style>
    <Style ss:ID="HeaderCell">
      <Font ss:FontName="Calibri" ss:Bold="1" ss:Size="10" ss:Color="#0F172A"/>
      <Interior ss:Color="#E2E8F0" ss:Pattern="Solid"/>
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#CBD5E1"/>
      </Borders>
    </Style>
    <Style ss:ID="Cell">
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
      </Borders>
    </Style>
    <Style ss:ID="NumberCell">
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
      </Borders>
      <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
      <NumberFormat ss:Format="#,##0"/>
    </Style>
    <Style ss:ID="ValueCell">
      <Borders>
        <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
      </Borders>
      <Font ss:FontName="Calibri" ss:Size="11" ss:Color="#334155"/>
    </Style>
    <Style ss:ID="MutedCell">
      <Font ss:FontName="Calibri" ss:Italic="1" ss:Size="11" ss:Color="#94A3B8"/>
    </Style>
  </Styles>
  <Worksheet ss:Name="Laporan">
    <Table>
      <Column ss:Width="170"/>
      <Column ss:Width="120"/>
      <Column ss:Width="120"/>
      <Column ss:Width="220"/>
      ${xmlRows}
    </Table>
    <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
      <FreezePanes/>
      <FrozenNoSplit/>
      <SplitHorizontal>5</SplitHorizontal>
      <TopRowBottomPane>5</TopRowBottomPane>
      <ActivePane>2</ActivePane>
      <ProtectObjects>False</ProtectObjects>
      <ProtectScenarios>False</ProtectScenarios>
    </WorksheetOptions>
  </Worksheet>
</Workbook>`;

    const blob = new Blob([workbookXml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Laporan_Keuangan_${selectedYear}${selectedMonth !== null ? `_${FULL_MONTH_NAMES[selectedMonth]}` : ''}.xls`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 space-y-5 max-w-[1200px] mx-auto">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center justify-between gap-2 w-full md:flex-1">
          <div className="flex items-center gap-2 min-w-0 shrink-0">
            {selectedMonth !== null && (
              <button
                onClick={handleBackToYearly}
                className="w-[46px] h-[46px] rounded-2xl bg-surface border border-line flex items-center justify-center hover:bg-surface-hover hover:border-accent/40 transition-all shrink-0"
              >
                <ArrowLeft className="w-4 h-4 text-text-primary" />
              </button>
            )}
            <div className="relative" ref={monthPickerRef}>
              <button
                onClick={() => setIsMonthPickerOpen(!isMonthPickerOpen)}
                className="bg-surface border border-line px-4 md:px-5 py-2.5 rounded-2xl flex items-center gap-2 md:gap-3 shadow-sm hover:border-accent/40 transition-all font-bold text-[12px] md:text-[13px] text-text-primary justify-between group h-[46px] min-w-[126px] md:min-w-[170px]"
              >
                <span>{selectedMonth !== null ? FULL_MONTH_NAMES[selectedMonth] : 'Pilih Bulan'}</span>
                <ChevronDown className={clsx("w-4 h-4 text-text-muted transition-transform duration-300", isMonthPickerOpen && "rotate-180")} />
              </button>

              {isMonthPickerOpen && (
                <div className="absolute top-full left-0 mt-2 z-30 w-[180px] bg-surface border border-line rounded-2xl shadow-2xl overflow-hidden animate-scale-in p-1">
                  <div className="grid grid-cols-2 gap-1 max-h-[300px] overflow-y-auto custom-scrollbar">
                    {MONTH_NAMES.map((name, idx) => {
                      const hasData = yearTx.some(t => new Date(t.date).getMonth() === idx);
                      return (
                        <button
                          key={name}
                          onClick={() => { handleMonthClick(idx); setIsMonthPickerOpen(false); }}
                          className={clsx(
                            "px-3 py-2.5 rounded-xl text-left text-[12px] transition-all flex items-center justify-between group",
                            selectedMonth === idx
                              ? "bg-accent text-white font-bold"
                              : hasData
                              ? "text-text-primary hover:bg-surface-hover hover:text-accent font-medium"
                              : "text-text-muted/50 font-medium"
                          )}
                        >
                          {name}
                          {selectedMonth === idx && <div className="w-1.5 h-1.5 rounded-full bg-white opacity-80" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            <div className="relative" ref={yearPickerRef}>
              <button
                onClick={() => setIsYearPickerOpen(!isYearPickerOpen)}
                className="bg-surface border border-line px-4 md:px-5 py-2.5 rounded-2xl flex items-center gap-2 md:gap-3 shadow-sm hover:border-accent/40 transition-all font-bold text-[12px] md:text-[13px] text-text-primary justify-between group h-[46px] min-w-[112px] md:min-w-[128px]"
              >
                <span>Tahun {selectedYear}</span>
                <ChevronDown className={clsx("w-4 h-4 text-text-muted transition-transform duration-300", isYearPickerOpen && "rotate-180")} />
              </button>

              {isYearPickerOpen && (
                <div className="absolute top-full left-0 mt-2 z-30 w-[160px] bg-surface border border-line rounded-2xl shadow-2xl overflow-hidden animate-scale-in p-1">
                  <div className="grid grid-cols-1 max-h-[200px] overflow-y-auto custom-scrollbar">
                    {availableYears.map(y => (
                      <button
                        key={y}
                        onClick={() => { setSelectedYear(y); setIsYearPickerOpen(false); setSelectedMonth(null); }}
                        className={clsx(
                          "w-full px-4 py-2.5 rounded-xl text-left text-[13px] transition-all flex items-center justify-between group",
                          selectedYear === y
                            ? "bg-accent text-white font-bold"
                            : "text-text-primary hover:bg-surface-hover hover:text-accent font-medium"
                        )}
                      >
                        {y}
                        {selectedYear === y && <div className="w-1.5 h-1.5 rounded-full bg-white opacity-80" />}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 min-w-0 shrink-0">
            <button
              onClick={exportToPDF}
              className="bg-surface border border-line px-4 py-2.5 rounded-2xl flex items-center gap-2 shadow-sm hover:border-accent/40 transition-all font-bold text-[12px] md:text-[13px] text-text-primary h-[46px]"
            >
              <FileText className="w-4 h-4" /> PDF
            </button>
            <button
              onClick={exportToExcel}
              className="bg-surface border border-line px-4 py-2.5 rounded-2xl flex items-center gap-2 shadow-sm hover:border-accent/40 transition-all font-bold text-[12px] md:text-[13px] text-text-primary h-[46px]"
            >
              <Table className="w-4 h-4" /> Excel
            </button>
          </div>
        </div>
      </div>

      <div ref={reportRef}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="card p-4">
            <p className="text-[10px] text-text-muted font-medium uppercase tracking-wider mb-1">Total Pemasukan</p>
            <p className="text-[14px] md:text-[15px] font-bold text-success">{fmt(summary.totalIncome)}</p>
            <div className="mt-1">
              <ComparisonBadge change={monthOverMonth.incomeChange} label="Pemasukan" />
            </div>
          </div>
          <div className="card p-4">
            <p className="text-[10px] text-text-muted font-medium uppercase tracking-wider mb-1">Total Pengeluaran</p>
            <p className="text-[14px] md:text-[15px] font-bold text-danger">{fmt(summary.totalExpense)}</p>
            <div className="mt-1">
              <ComparisonBadge change={monthOverMonth.expenseChange} label="Pengeluaran" />
            </div>
          </div>
          <div className="card p-4">
            <p className="text-[10px] text-text-muted font-medium uppercase tracking-wider mb-1">Total Tabungan</p>
            <p className="text-[14px] md:text-[15px] font-bold text-accent">{fmt(summary.totalSaving)}</p>
            <div className="mt-1">
              <ComparisonBadge change={monthOverMonth.savingChange} label="Tabungan" />
            </div>
          </div>
          <div className="card p-4">
            <p className="text-[10px] text-text-muted font-medium uppercase tracking-wider mb-1">
              {cashFlow.remaining >= 0 ? 'Sisa Dana' : 'Defisit'}
            </p>
            <p className={`text-[14px] md:text-[15px] font-bold ${cashFlow.remaining >= 0 ? 'text-success' : 'text-danger'}`}>
              {cashFlow.remaining < 0 ? '-' : ''}{fmt(Math.abs(cashFlow.remaining))}
            </p>
            <div className="mt-1">
              {cashFlow.remaining >= 0 ? (
                <span className="text-[10px] font-medium text-success">
                  Sisa {cashFlow.remainingPercent.toFixed(1)}% setelah pengeluaran & tabungan
                </span>
              ) : (
                <span className="text-[10px] font-medium text-danger">
                  Pengeluaran & tabungan melebihi pemasukan
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="card p-5 mt-4">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h3 className="text-[13px] font-semibold text-text-primary">Insight Otomatis</h3>
              <p className="text-[10px] text-text-muted mt-1">
                Ringkasan cepat untuk membantu membaca kondisi keuangan pada periode terpilih.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {reportInsights.map((item) => {
              const Icon = item.tone === 'up' ? TrendingUp : item.tone === 'down' ? TrendingDown : Minus;
              const toneClass =
                item.tone === 'up'
                  ? 'text-success bg-success/10 border-success/15'
                  : item.tone === 'down'
                    ? 'text-danger bg-danger/10 border-danger/15'
                    : 'text-text-muted bg-surface-alt/30 border-line';

              return (
                <div key={item.title} className="rounded-2xl border border-line bg-surface-alt/10 p-4">
                  <div className="flex items-start gap-3">
                    <div className={clsx('w-9 h-9 rounded-xl border flex items-center justify-center shrink-0', toneClass)}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold text-text-primary">{item.title}</p>
                      <p className="text-[12px] text-text-secondary leading-relaxed mt-1">{item.text}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
          <div className="card p-3">
            <p className="text-[10px] text-text-muted font-medium">Rata-rata Masuk/Bulan</p>
            <p className="text-[12px] font-bold text-success">{fmt(summary.avgMonthlyIncome)}</p>
            {selectedMonth === null && <p className="text-[9px] text-text-muted">dari {summary.divisor} bulan berdata</p>}
          </div>
          <div className="card p-3">
            <p className="text-[10px] text-text-muted font-medium">Rata-rata Pengeluaran per Bulan</p>
            <p className="text-[12px] font-bold text-danger">{fmt(summary.avgMonthlyExpense)}</p>
            {selectedMonth === null && <p className="text-[9px] text-text-muted">dari {summary.divisor} bulan berdata</p>}
          </div>
          <div className="card p-3">
            <p className="text-[10px] text-text-muted font-medium">{selectedMonth !== null ? 'Rata-rata Pengeluaran per Bulan' : 'Total Pengeluaran per Tahun'}</p>
            <p className="text-[12px] font-bold text-danger">{fmt(selectedMonth !== null ? yearAverageExpense : summary.totalExpense)}</p>
            {selectedMonth !== null && <p className="text-[9px] text-text-muted">rata-rata tahun {selectedYear}</p>}
          </div>
          <div className="card p-3">
            <p className="text-[10px] text-text-muted font-medium">
              {selectedMonth !== null ? 'Rata-rata Pengeluaran per Hari' : 'Bulan Pengeluaran Tertinggi'}
            </p>
            <p className="text-[12px] font-bold text-danger">
              {selectedMonth !== null ? fmt(averageDailyExpense) : (summary.worstMonth?.name || '-')}
            </p>
            {selectedMonth !== null && (
              <p className="text-[9px] text-text-muted">
                dibagi {selectedYear === new Date().getFullYear() && selectedMonth === new Date().getMonth()
                  ? `${new Date().getDate()} hari berjalan`
                  : `total ${new Date(selectedYear, selectedMonth + 1, 0).getDate()} hari`}
              </p>
            )}
          </div>
        </div>

        {selectedMonth === null && (
          <div className="card p-4 mt-4 bg-surface-alt/30 border-border/50">
            <p className="text-[10px] text-text-muted font-medium mb-2">vs {monthOverMonth.prevPeriodLabel}</p>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-text-muted">Pemasukan:</span>
                <ComparisonBadge change={monthOverMonth.incomeChange} label="Pemasukan" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-text-muted">Pengeluaran:</span>
                <ComparisonBadge change={monthOverMonth.expenseChange} label="Pengeluaran" />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-text-muted">Tabungan:</span>
                <ComparisonBadge change={monthOverMonth.savingChange} label="Tabungan" />
              </div>
            </div>
          </div>
        )}

        {cashFlow.totalIncome > 0 && (
          <div className="card p-5 mt-4">
            <h3 className="text-[13px] font-semibold text-text-primary mb-4">Alur Uang</h3>
            <p className="text-[10px] text-text-muted mb-4">Ringkasan arus kas pada periode terpilih. Tidak termasuk saldo awal akun.</p>

            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[12px] font-medium text-text-primary">Total Pemasukan</span>
                    <span className="text-[13px] font-bold text-success">{fmt(cashFlow.totalIncome)}</span>
                  </div>
                  <div className="h-3 bg-surface-alt rounded-full overflow-hidden">
                    <div className="h-full bg-success rounded-full" style={{ width: '100%' }} />
                  </div>
                </div>
              </div>

              <div className="ml-5 border-l-2 border-line pl-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-danger/10 flex items-center justify-center shrink-0">
                    <span className="text-[11px] font-bold text-danger">1</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-medium text-text-primary">Pengeluaran{cashFlow.totalBill > 0 ? ' & Tagihan' : ''}</span>
                      <span className="text-[12px] font-bold text-danger">{fmt(cashFlow.totalExpense)} <span className="text-[10px] font-normal text-text-muted">({cashFlow.expensePercent.toFixed(1)}%)</span></span>
                    </div>
                    <div className="h-2 bg-surface-alt rounded-full overflow-hidden">
                      <div className="h-full bg-danger rounded-full transition-all duration-500" style={{ width: `${Math.min(cashFlow.expensePercent, 100)}%` }} />
                    </div>
                  </div>
                </div>

                {cashFlow.totalSaving > 0 && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                      <span className="text-[11px] font-bold text-accent">2</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-medium text-text-primary">Tabungan</span>
                        <span className="text-[12px] font-bold text-accent">{fmt(cashFlow.totalSaving)} <span className="text-[10px] font-normal text-text-muted">({cashFlow.savingPercent.toFixed(1)}%)</span></span>
                      </div>
                      <div className="h-2 bg-surface-alt rounded-full overflow-hidden">
                        <div className="h-full bg-accent rounded-full transition-all duration-500" style={{ width: `${Math.min(cashFlow.savingPercent, 100)}%` }} />
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <div className={clsx(
                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                    cashFlow.remaining >= 0 ? "bg-success/10" : "bg-danger/10"
                  )}>
                    <span className={clsx(
                      "text-[11px] font-bold",
                      cashFlow.remaining >= 0 ? "text-success" : "text-danger"
                    )}>
                      {cashFlow.remaining >= 0 ? '3' : '!'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-medium text-text-primary">
                        {cashFlow.remaining >= 0 ? 'Hasil Bersih Periode' : 'Defisit Periode'}
                      </span>
                      <span className={clsx(
                        "text-[12px] font-bold",
                        cashFlow.remaining >= 0 ? "text-success" : "text-danger"
                      )}>
                        {cashFlow.remaining < 0 ? '-' : ''}{fmt(Math.abs(cashFlow.remaining))}
                        <span className="text-[10px] font-normal text-text-muted">
                          {' '}({cashFlow.netFlowPercent.toFixed(1)}%)
                        </span>
                      </span>
                    </div>
                    <div className="h-2 bg-surface-alt rounded-full overflow-hidden">
                      <div
                        className={clsx(
                          "h-full rounded-full transition-all duration-500",
                          cashFlow.remaining >= 0 ? "bg-success/60" : "bg-danger/70"
                        )}
                        style={{ width: `${Math.min(cashFlow.netFlowPercent, 100)}%` }}
                      />
                    </div>
                    <p className={clsx(
                      "mt-1 text-[10px] font-medium",
                      cashFlow.remaining >= 0 ? "text-success" : "text-danger"
                    )}>
                      {cashFlow.remaining >= 0
                        ? 'Dana periode ini masih tersisa setelah pengeluaran dan tabungan.'
                        : 'Pengeluaran dan tabungan periode ini melebihi total pemasukan.'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-2 pt-3 border-t border-line">
                <div className="rounded-2xl border border-line bg-surface-alt/20 p-3.5 space-y-3">
                  <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                    <span className="text-[11px] font-semibold text-text-primary">Rumus periode</span>
                    <span className="text-[10px] text-text-muted">Pemasukan - Pengeluaran - Tabungan = hasil bersih</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1.1fr] gap-2 items-center">
                    <div className="rounded-xl bg-surface border border-line px-3 py-2">
                      <p className="text-[10px] text-text-muted font-medium">Pemasukan</p>
                      <p className="text-[12px] font-bold text-text-primary">{fmt(cashFlow.totalIncome)}</p>
                    </div>
                    <div className="hidden md:flex items-center justify-center text-text-muted font-bold">-</div>

                    <div className="rounded-xl bg-surface border border-line px-3 py-2">
                      <p className="text-[10px] text-text-muted font-medium">Pengeluaran</p>
                      <p className="text-[12px] font-bold text-text-primary">{fmt(cashFlow.totalExpense)}</p>
                    </div>
                    <div className="hidden md:flex items-center justify-center text-text-muted font-bold">-</div>

                    <div className="rounded-xl bg-surface border border-line px-3 py-2">
                      <p className="text-[10px] text-text-muted font-medium">Tabungan</p>
                      <p className="text-[12px] font-bold text-text-primary">{fmt(cashFlow.totalSaving)}</p>
                    </div>
                    <div className="hidden md:flex items-center justify-center text-text-muted font-bold">=</div>

                    <div className={clsx(
                      'rounded-xl px-3 py-2 border',
                      cashFlow.remaining >= 0
                        ? 'bg-success/10 border-success/20'
                        : 'bg-danger/10 border-danger/20'
                    )}>
                      <p className={clsx(
                        'text-[10px] font-medium',
                        cashFlow.remaining >= 0 ? 'text-success' : 'text-danger'
                      )}>
                        {cashFlow.remaining >= 0 ? 'Sisa Dana' : 'Defisit'}
                      </p>
                      <p className={clsx(
                        'text-[12px] font-bold',
                        cashFlow.remaining >= 0 ? 'text-success' : 'text-danger'
                      )}>
                        {cashFlow.remaining < 0 ? '-' : ''}{fmt(Math.abs(cashFlow.remaining))}
                      </p>
                    </div>
                  </div>

                  <div className="md:hidden text-[11px] font-semibold text-text-primary">
                    {fmt(cashFlow.totalIncome)} - {fmt(cashFlow.totalExpense)} - {fmt(cashFlow.totalSaving)} ={' '}
                    <span className={cashFlow.remaining >= 0 ? 'text-success' : 'text-danger'}>
                      {cashFlow.remaining < 0 ? '-' : ''}{fmt(Math.abs(cashFlow.remaining))}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-3">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-danger" />
                    <span className="text-[10px] text-text-muted">Pengeluaran</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-accent" />
                    <span className="text-[10px] text-text-muted">Tabungan</span>
                  </div>
                  {cashFlow.remaining >= 0 ? (
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-success/60" />
                      <span className="text-[10px] text-text-muted">Sisa</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-danger/70" />
                      <span className="text-[10px] text-text-muted">Defisit</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {(topTransactions.incomes.length > 0 || topTransactions.expenses.length > 0) && (
          <div className="card p-5 mt-4">
            <h3 className="text-[13px] font-semibold text-text-primary mb-4">Transaksi Terbesar</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {topTransactions.expenses.length > 0 && (
                <div>
                  <p className="text-[11px] text-text-muted font-medium uppercase tracking-wider mb-3">Pengeluaran Terbesar</p>
                  <div className="space-y-2">
                    {topTransactions.expenses.map((tx, idx) => {
                      const cat = categories.find((c: any) => c.id === tx.category_id);
                      return (
                        <div key={tx.id} className="flex items-center gap-3 text-[12px]">
                          <span className="w-5 h-5 rounded-full bg-danger/10 text-danger flex items-center justify-center text-[10px] font-bold">{idx + 1}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-text-primary truncate">{tx.description}</p>
                            <p className="text-[10px] text-text-muted">{cat?.name || '-'}</p>
                          </div>
                          <span className="font-bold text-danger">-{fmt(Number(tx.amount))}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {topTransactions.incomes.length > 0 && (
                <div>
                  <p className="text-[11px] text-text-muted font-medium uppercase tracking-wider mb-3">Pemasukan Terbesar</p>
                  <div className="space-y-2">
                    {topTransactions.incomes.map((tx, idx) => {
                      const acct = accounts.find((a: any) => a.id === tx.to_account_id);
                      return (
                        <div key={tx.id} className="flex items-center gap-3 text-[12px]">
                          <span className="w-5 h-5 rounded-full bg-success/10 text-success flex items-center justify-center text-[10px] font-bold">{idx + 1}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-text-primary truncate">{tx.description}</p>
                            <p className="text-[10px] text-text-muted">{acct?.name || '-'}</p>
                          </div>
                          <span className="font-bold text-success">+{fmt(Number(tx.amount))}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-5">
          <div className="card p-5">
            <h3 className="text-[13px] font-semibold text-text-primary mb-1">
              {selectedMonth !== null ? 'Tren Bulanan' : 'Tren Bulanan'}
            </h3>
            {selectedMonth !== null && (
              <p className="text-[10px] text-text-muted mb-3">Melihat data bulan {FULL_MONTH_NAMES[selectedMonth]} saja</p>
            )}
            <p className="text-[10px] text-text-muted mb-3">Klik bulan di chart untuk melihat detail</p>
            <div className="h-64">
              {monthData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }} onClick={(data) => {
                    if (data && data.activeLabel) {
                      const idx = MONTH_NAMES.indexOf(data.activeLabel);
                      if (idx !== -1) handleMonthClick(idx);
                    }
                  }}>
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} tickLine={false} axisLine={false} />
                    <YAxis tickFormatter={v => `${(v / 1000000).toFixed(1)}M`} tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} tickLine={false} axisLine={false} />
                    <Tooltip formatter={(v: number) => fmt(v)} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px' }} />
                    <Line
                      type="monotone"
                      dataKey="Pemasukan"
                      stroke="#22c55e"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="Pengeluaran"
                      stroke="#ef4444"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-text-muted text-sm">Belum ada data.</div>
              )}
            </div>
          </div>

          <div className="card p-5">
            <h3 className="text-[13px] font-semibold text-text-primary mb-1">Distribusi Pengeluaran</h3>
            {selectedMonth !== null && (
              <p className="text-[10px] text-text-muted mb-3">Periode: {FULL_MONTH_NAMES[selectedMonth]} {selectedYear}</p>
            )}
            <div className="h-64 relative">
              {expenseByCategory.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={expenseByCategory} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value" stroke="none">
                        {expenseByCategory.map((_e, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v: number, name: string) => [`${fmt(v)} (${((v / totalExpense) * 100).toFixed(1)}%)`, name]}
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          border: '1px solid oklch(0.9297 0.0128 164.7776)',
                          borderRadius: '12px',
                          boxShadow: '0px 10px 30px 0px hsl(142 76% 10% / 0.10), 0px 2px 4px -1px hsl(142 76% 10% / 0.10)',
                          fontSize: '12px',
                          padding: '8px 12px',
                        }}
                      />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ marginBottom: 25, zIndex: 0 }}>
                    <div className="text-center">
                      <p className="text-[10px] text-text-muted">Total</p>
                      <p className="text-[13px] font-bold text-text-primary">{fmt(totalExpense)}</p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="h-full flex items-center justify-center text-text-muted text-sm">Belum ada data.</div>
              )}
            </div>
          </div>
        </div>

        {expenseByPurpose.length > 0 && (
          <div className="card p-5 mt-4">
            <div className="flex items-start justify-between gap-3 mb-1">
              <div>
                <h3 className="text-[13px] font-semibold text-text-primary">Rincian per Tujuan Pengeluaran</h3>
                {selectedMonth !== null && (
                  <p className="text-[10px] text-text-muted mt-0.5">Periode: {FULL_MONTH_NAMES[selectedMonth]} {selectedYear}</p>
                )}
              </div>
              <span className="text-[10px] font-medium text-text-muted bg-surface-alt px-2 py-0.5 rounded-full whitespace-nowrap">
                {expenseByPurpose.length} tujuan
              </span>
            </div>
            <div className="space-y-3 mt-3">
              {(showAllPurposes ? expenseByPurpose : expenseByPurpose.slice(0, 8)).map((p, idx) => {
                const percent = totalExpense > 0 ? (p.value / totalExpense) * 100 : 0;
                return (
                  <div key={p.name} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold text-white" style={{ backgroundColor: COLORS[idx % COLORS.length].replace('var(--', 'rgba(').replace(')', ', 1)') }}>
                      #{idx + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between text-[12px] mb-1">
                        <span className="font-medium text-text-primary">{p.name}</span>
                        <span className="text-text-muted">{fmt(p.value)} <span className="text-[10px]">({percent.toFixed(1)}%)</span></span>
                      </div>
                      <div className="h-2 bg-surface-alt rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${percent}%`, backgroundColor: COLORS[idx % COLORS.length].startsWith('var') ? '#3b82f6' : COLORS[idx % COLORS.length] }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {expenseByPurpose.length > 8 && (
              <button
                type="button"
                onClick={() => setShowAllPurposes((prev) => !prev)}
                aria-expanded={showAllPurposes}
                className="mt-4 w-full flex items-center justify-center gap-1.5 px-3 py-2 text-[12px] font-semibold text-accent bg-accent/5 hover:bg-accent/10 border border-accent/20 rounded-xl transition-all active:scale-[0.98]"
              >
                {showAllPurposes ? (
                  <>
                    Sembunyikan
                    <ChevronUp className="w-3.5 h-3.5" />
                  </>
                ) : (
                  <>
                    Tampilkan semua ({expenseByPurpose.length - 8} lainnya)
                    <ChevronDown className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            )}
            <div className="mt-4 pt-3 border-t border-line flex items-center justify-between">
              <span className="text-[12px] font-semibold text-text-primary">Total</span>
              <span className="text-[13px] font-bold text-text-primary">
                {fmt(expenseByPurpose.reduce((sum, purpose) => sum + purpose.value, 0))}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
