import { useState, useMemo, useRef, useEffect, CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, LineChart, Line, BarChart, Bar } from 'recharts';
import { ChevronDown, ChevronUp, FileText, Table, TrendingUp, TrendingDown, Minus, ChevronLeft, ChevronRight, Calendar, X } from 'lucide-react';
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

const CustomXAxisTick = (props: any) => {
  const { x, y, payload } = props;
  const value = payload.value;
  const match = value.match(/(Mng \d+) \((.+)\)/);
  if (match) {
    const weekLabel = match[1].replace('Mng', 'Minggu');
    const dateLabel = `(${match[2]})`;
    return (
      <g transform={`translate(${x},${y})`}>
        <text x={0} y={0} textAnchor="middle">
          <tspan x={0} dy={10} fontSize={10} fontWeight="bold" fill="var(--color-text-primary)">{weekLabel}</tspan>
          <tspan x={0} dy={12} fontSize={9} fontWeight="normal" fill="var(--color-text-muted)">{dateLabel}</tspan>
        </text>
      </g>
    );
  }
  return (
    <g transform={`translate(${x},${y})`}>
      <text x={0} y={0} dy={10} textAnchor="middle" fill="var(--color-text-muted)" fontSize={10}>
        {value}
      </text>
    </g>
  );
};

export default function Report() {
  const { transactions, categories, purposes, accounts } = useData();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | null>(new Date().getMonth());
  const [isYearPickerOpen, setIsYearPickerOpen] = useState(false);
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [showAllPurposes, setShowAllPurposes] = useState(false);

  const [heatmapYear, setHeatmapYear] = useState(new Date().getFullYear());
  const [heatmapMonth, setHeatmapMonth] = useState(new Date().getMonth());
  const [calendarDetailDate, setCalendarDetailDate] = useState<string | null>(null);
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

    // Sinkronisasi otomatis bulan/tahun Kalender Pengeluaran (Saran 2)
    if (selectedMonth !== null) {
      setHeatmapMonth(selectedMonth);
      setHeatmapYear(selectedYear);
    } else {
      const today = new Date();
      if (selectedYear === today.getFullYear()) {
        setHeatmapMonth(today.getMonth());
      } else {
        setHeatmapMonth(11); // Desember
      }
      setHeatmapYear(selectedYear);
    }
  }, [selectedMonth, selectedYear]);

  const handleMonthClick = (monthIdx: number) => {
    setSelectedMonth(monthIdx);
  };

  const handlePrevMonth = () => {
    if (selectedMonth !== null) {
      if (selectedMonth === 0) {
        setSelectedMonth(11);
        setSelectedYear(selectedYear - 1);
      } else {
        setSelectedMonth(selectedMonth - 1);
      }
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth !== null) {
      if (selectedMonth === 11) {
        setSelectedMonth(0);
        setSelectedYear(selectedYear + 1);
      } else {
        setSelectedMonth(selectedMonth + 1);
      }
    }
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

    if (selectedMonth !== null) {
      return {
        incomeChange: calcChange(summary.totalIncome, prevPeriodSummary.totalIncome),
        expenseChange: calcChange(summary.totalExpense, prevPeriodSummary.totalExpense),
        savingChange: calcChange(summary.totalSaving, prevPeriodSummary.totalSaving),
        prevPeriodLabel,
      };
    }

    // Yearly Mode: Normalize by number of active months (divisor) to prevent data gap distortion
    const currentYearDivisor = summary.divisor;
    const currentYearAvgIncome = summary.totalIncome / currentYearDivisor;
    const currentYearAvgExpense = summary.totalExpense / currentYearDivisor;
    const currentYearAvgSaving = summary.totalSaving / currentYearDivisor;

    // Calculate active months in previous year
    const prevYearMonthsWithData = new Set<number>();
    prevYearTx.forEach(t => {
      const d = new Date(t.date);
      const income = t.type === 'income' ? Number(t.amount) : 0;
      const expense = expenseAmount(t);
      const saving = t.type === 'saving' ? Number(t.amount) : 0;
      if (income > 0 || expense > 0 || saving > 0) {
        prevYearMonthsWithData.add(d.getMonth());
      }
    });
    const prevYearDivisor = Math.max(prevYearMonthsWithData.size, 1);
    const prevYearAvgIncome = prevPeriodSummary.totalIncome / prevYearDivisor;
    const prevYearAvgExpense = prevPeriodSummary.totalExpense / prevYearDivisor;
    const prevYearAvgSaving = prevPeriodSummary.totalSaving / prevYearDivisor;

    return {
      incomeChange: calcChange(currentYearAvgIncome, prevYearAvgIncome),
      expenseChange: calcChange(currentYearAvgExpense, prevYearAvgExpense),
      savingChange: calcChange(currentYearAvgSaving, prevYearAvgSaving),
      prevPeriodLabel,
      isNormalized: true,
      currentYearDivisor,
      prevYearDivisor,
    };
  }, [selectedMonth, selectedYear, summary, prevMonthTx, prevYearTx]);

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

  const dailySpending = useMemo(() => {
    const map = new Map<string, number>();
    filteredTx.forEach(t => {
      const key = format(new Date(t.date), 'yyyy-MM-dd');
      map.set(key, (map.get(key) || 0) + expenseAmount(t));
    });
    const entries = Array.from(map.entries()).map(([date, amount]) => ({ date, amount }));
    const maxAmount = entries.length > 0 ? Math.max(...entries.map(e => e.amount)) : 0;
    return { entries, maxAmount, lookup: map };
  }, [filteredTx]);

  const weeklySpendingChartData = useMemo(() => {
    if (selectedMonth === null) return [];
    const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
    const weeklySums = [0, 0, 0, 0, 0];

    for (let day = 1; day <= daysInMonth; day++) {
      const dateKey = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const amount = dailySpending.lookup.get(dateKey) || 0;

      if (day <= 7) {
        weeklySums[0] += amount;
      } else if (day <= 14) {
        weeklySums[1] += amount;
      } else if (day <= 21) {
        weeklySums[2] += amount;
      } else if (day <= 28) {
        weeklySums[3] += amount;
      } else {
        weeklySums[4] += amount;
      }
    }

    const numWeeks = daysInMonth > 28 ? 5 : 4;
    const data = [];
    for (let w = 0; w < numWeeks; w++) {
      let dateRange = '';
      if (w === 0) dateRange = '1-7';
      else if (w === 1) dateRange = '8-14';
      else if (w === 2) dateRange = '15-21';
      else if (w === 3) dateRange = '22-28';
      else if (w === 4) dateRange = daysInMonth === 29 ? '29' : `29-${daysInMonth}`;

      data.push({
        name: `Mng ${w + 1} (${dateRange})`,
        'Pengeluaran': weeklySums[w],
      });
    }
    return data;
  }, [selectedMonth, selectedYear, dailySpending]);

  const calendarDateTx = useMemo(() => {
    if (!calendarDetailDate) return [];
    return transactions.filter(t => format(new Date(t.date), 'yyyy-MM-dd') === calendarDetailDate);
  }, [transactions, calendarDetailDate]);

  const formattedCalendarDate = useMemo(() => {
    if (!calendarDetailDate) return '';
    try {
      return format(new Date(calendarDetailDate), 'EEEE, d MMMM yyyy', { locale: id });
    } catch {
      return calendarDetailDate;
    }
  }, [calendarDetailDate]);

  const calendarDateSpendingTotal = useMemo(() => {
    return sumExpense(calendarDateTx);
  }, [calendarDateTx]);

  const calendarDateSpendingByPurpose = useMemo(() => {
    const purposeMap = new Map<string, number>();
    let adminFeeTotal = 0;
    
    calendarDateTx.forEach(t => {
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
  }, [calendarDateTx, purposes]);

  // Saran 1: Filter data transaksi terpisah khusus untuk Kalender Pengeluaran (heatmap)
  const heatmapTx = useMemo(() => {
    return transactions.filter(t => {
      const d = new Date(t.date);
      return d.getFullYear() === heatmapYear && d.getMonth() === heatmapMonth;
    });
  }, [transactions, heatmapYear, heatmapMonth]);

  const heatmapDailySpending = useMemo(() => {
    const map = new Map<string, number>();
    heatmapTx.forEach(t => {
      const key = format(new Date(t.date), 'yyyy-MM-dd');
      map.set(key, (map.get(key) || 0) + expenseAmount(t));
    });
    const entries = Array.from(map.entries()).map(([date, amount]) => ({ date, amount }));
    const maxAmount = entries.length > 0 ? Math.max(...entries.map(e => e.amount)) : 0;
    return { entries, maxAmount, lookup: map };
  }, [heatmapTx]);

  const heatmapData = useMemo(() => {
    const year = heatmapYear;
    const month = heatmapMonth;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfWeek = new Date(year, month, 1).getDay();
    const startOffset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
    const weeks: (number | null)[][] = [];
    let currentWeek: (number | null)[] = [];
    for (let i = 0; i < startOffset; i++) {
      currentWeek.push(null);
    }
    for (let day = 1; day <= daysInMonth; day++) {
      currentWeek.push(day);
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push(null);
      }
      weeks.push(currentWeek);
    }
    return { year, month, weeks, daysInMonth };
  }, [heatmapYear, heatmapMonth]);

  const getHeatAmount = (day: number | null) => {
    if (day === null) return null;
    const key = `${String(heatmapData.year).padStart(4, '0')}-${String(heatmapData.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return heatmapDailySpending.lookup.get(key) ?? 0;
  };

  const heatTier = (amount: number | null): 0 | 1 | 2 | 3 | 4 | -1 => {
    if (amount === null) return -1;
    if (amount === 0) return 0;

    const low = Number(localStorage.getItem('heat_low') || 50000);
    const medium = Number(localStorage.getItem('heat_medium') || 150000);
    const high = Number(localStorage.getItem('heat_high') || 300000);

    if (amount <= low) return 1;
    if (amount <= medium) return 2;
    if (amount <= high) return 3;
    return 4;
  };

  const heatStyle = (tier: number): CSSProperties => {
    if (tier === -1) return { background: 'transparent' };
    return {
      backgroundColor: `var(--heat-${tier}-bg)`,
      color: `var(--heat-${tier}-fg)`,
    };
  };

  const heatMonthLabel = `${FULL_MONTH_NAMES[heatmapMonth]} ${heatmapYear}`;

  const heatStats = useMemo(() => {
    const today = new Date();
    const isCurrentMonth = heatmapData.year === today.getFullYear() && heatmapData.month === today.getMonth();
    const todayDay = today.getDate();

    const allDays: { day: number; amount: number }[] = [];
    heatmapData.weeks.flat().forEach(day => {
      if (day === null) return;
      if (isCurrentMonth && day > todayDay) return;
      const key = `${String(heatmapData.year).padStart(4, '0')}-${String(heatmapData.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const amount = heatmapDailySpending.lookup.get(key) ?? 0;
      allDays.push({ day, amount });
    });
    const total = allDays.reduce((sum, d) => sum + d.amount, 0);
    const activeDays = allDays.filter(d => d.amount > 0);
    const avgPerDay = activeDays.length > 0 ? total / activeDays.length : 0;
    const peakDay = allDays.reduce((max, d) => (d.amount > max.amount ? d : max), { day: 0, amount: 0 });

    // Weekday vs Weekend
    let weekdayTotal = 0, weekendTotal = 0, weekdayCount = 0, weekendCount = 0;
    allDays.forEach(({ day, amount }) => {
      const dow = new Date(heatmapData.year, heatmapData.month, day).getDay();
      const isWeekend = dow === 0 || dow === 6;
      if (isWeekend) { weekendTotal += amount; if (amount > 0) weekendCount++; }
      else { weekdayTotal += amount; if (amount > 0) weekdayCount++; }
    });
    const avgWeekday = weekdayCount > 0 ? weekdayTotal / weekdayCount : 0;
    const avgWeekend = weekendCount > 0 ? weekendTotal / weekendCount : 0;

    // Bucket distribution
    let zeroDays = 0, lowDays = 0, midDays = 0, highDays = 0;
    allDays.forEach(({ amount }) => {
      if (amount === 0) { zeroDays++; return; }
      const ratio = heatmapDailySpending.maxAmount > 0 ? amount / heatmapDailySpending.maxAmount : 0;
      if (ratio < 0.25) lowDays++;
      else if (ratio < 0.75) midDays++;
      else highDays++;
    });

    return {
      total,
      avgPerDay,
      activeDaysCount: activeDays.length,
      totalDays: allDays.length,
      peakDay,
      avgWeekday,
      avgWeekend,
      zeroDays,
      lowDays,
      midDays,
      highDays,
    };
  }, [heatmapData, heatmapDailySpending.lookup, heatmapDailySpending.maxAmount]);

  const heatTotal = heatStats.total;

  const isCurrentHeatMonth = heatmapYear === new Date().getFullYear() && heatmapMonth === new Date().getMonth();
  const heatPeriodDays = isCurrentHeatMonth ? new Date().getDate() : heatmapData.daysInMonth;

  const pokokExpensesTotal = useMemo(() => {
    const pokokExpenses = heatmapTx.filter(t => {
      if (t.type !== 'expense' && t.type !== 'bill') return false;
      const cat = categories.find((c: any) => c.id === t.category_id);
      const catName = (cat?.name || '').toLowerCase();
      const pur = purposes.find((p: any) => p.id === t.purpose_id);
      const purName = (pur?.name || '').toLowerCase();
      
      return (
        catName.includes('pokok') ||
        catName.includes('primer') ||
        catName.includes('makanan') ||
        catName.includes('belanja') ||
        catName.includes('rutin') ||
        purName.includes('pokok') ||
        purName.includes('primer') ||
        purName.includes('makanan') ||
        purName.includes('belanja') ||
        purName.includes('rutin')
      );
    });
    return pokokExpenses.reduce((sum, t) => sum + Number(t.amount), 0);
  }, [heatmapTx, categories, purposes]);

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

  // ── Portofolio & Return Calculations ──

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

    const parseColorToRgb = (cssVarName: string, fallbackRgb: [number, number, number]): [number, number, number] => {
      const tempEl = document.createElement('div');
      tempEl.style.color = `var(${cssVarName})`;
      document.body.appendChild(tempEl);
      const computedColor = getComputedStyle(tempEl).color;
      document.body.removeChild(tempEl);
      
      const match = computedColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (match) {
        return [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
      }
      return fallbackRgb;
    };

    const colors = {
      primary: parseColorToRgb('--primary', [22, 101, 52]),
      primarySoft: parseColorToRgb('--muted', [232, 242, 236]),
      accent: parseColorToRgb('--accent', [201, 162, 39]),
      text: parseColorToRgb('--foreground', [30, 41, 59]),
      muted: parseColorToRgb('--muted-foreground', [100, 116, 139]),
      line: parseColorToRgb('--border', [226, 232, 240]),
      success: parseColorToRgb('--chart-2', [22, 163, 74]),
      danger: parseColorToRgb('--destructive', [220, 38, 38]),
      saving: parseColorToRgb('--chart-3', [8, 145, 178]),
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
        {/* Sisi Kiri: Filter Kontrol */}
        <div className="flex flex-row flex-nowrap items-center gap-1.5 w-full md:w-auto overflow-x-auto no-scrollbar pb-1 md:pb-0">
          {/* Segmented Control untuk Bulanan vs Tahunan */}
          <div className="flex bg-surface p-1 rounded-2xl border border-line shrink-0 h-[46px] shadow-sm">
            <button
              onClick={() => {
                if (selectedMonth === null) {
                  setSelectedMonth(new Date().getMonth());
                }
              }}
              className={clsx(
                "px-3 md:px-4 rounded-xl text-[12px] md:text-[13px] font-bold transition-all shrink-0",
                selectedMonth !== null
                  ? "bg-accent text-bg shadow-md shadow-accent/10 dark:shadow-accent/5"
                  : "text-text-muted hover:text-text-primary hover:bg-surface-hover/50"
              )}
            >
              Bulanan
            </button>
            <button
              onClick={() => setSelectedMonth(null)}
              className={clsx(
                "px-3 md:px-4 rounded-xl text-[12px] md:text-[13px] font-bold transition-all shrink-0",
                selectedMonth === null
                  ? "bg-accent text-bg shadow-md shadow-accent/10 dark:shadow-accent/5"
                  : "text-text-muted hover:text-text-primary hover:bg-surface-hover/50"
              )}
            >
              Tahunan
            </button>
          </div>

          {/* Dropdown Bulan (Hanya muncul jika mode Bulanan / selectedMonth !== null) */}
          {selectedMonth !== null && (
            <>
              <button
                onClick={handlePrevMonth}
                className="h-[46px] w-9 flex-shrink-0 flex items-center justify-center bg-surface border border-line rounded-2xl shadow-sm hover:border-accent/40 text-text-muted hover:text-text-primary transition-all"
                title="Bulan Sebelumnya"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="relative flex-1 md:flex-initial" ref={monthPickerRef}>
                <button
                  onClick={() => setIsMonthPickerOpen(!isMonthPickerOpen)}
                  className="bg-surface border border-line px-3 md:px-5 py-2.5 rounded-2xl flex items-center gap-1.5 md:gap-3 shadow-sm hover:border-accent/40 transition-all font-bold text-[12px] md:text-[13px] text-text-primary justify-between group h-[46px] w-full md:w-[150px] min-w-0"
                >
                  <span className="truncate">{FULL_MONTH_NAMES[selectedMonth]}</span>
                  <ChevronDown className={clsx("w-4 h-4 text-text-muted transition-transform duration-300 flex-shrink-0", isMonthPickerOpen && "rotate-180")} />
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

              <button
                onClick={handleNextMonth}
                className="h-[46px] w-9 flex-shrink-0 flex items-center justify-center bg-surface border border-line rounded-2xl shadow-sm hover:border-accent/40 text-text-muted hover:text-text-primary transition-all"
                title="Bulan Berikutnya"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}

          {/* Dropdown Tahun */}
          <div className="relative flex-1 md:flex-initial" ref={yearPickerRef}>
            <button
              onClick={() => setIsYearPickerOpen(!isYearPickerOpen)}
              className="bg-surface border border-line px-3 md:px-5 py-2.5 rounded-2xl flex items-center gap-1.5 md:gap-3 shadow-sm hover:border-accent/40 transition-all font-bold text-[12px] md:text-[13px] text-text-primary justify-between group h-[46px] w-full md:w-[128px] min-w-0"
            >
              <span className="truncate">Tahun {selectedYear}</span>
              <ChevronDown className={clsx("w-4 h-4 text-text-muted transition-transform duration-300 flex-shrink-0", isYearPickerOpen && "rotate-180")} />
            </button>

            {isYearPickerOpen && (
              <div className="absolute top-full left-0 mt-2 z-30 w-[160px] bg-surface border border-line rounded-2xl shadow-2xl overflow-hidden animate-scale-in p-1">
                <div className="grid grid-cols-1 max-h-[200px] overflow-y-auto custom-scrollbar">
                  {availableYears.map(y => (
                    <button
                      key={y}
                      onClick={() => { setSelectedYear(y); setIsYearPickerOpen(false); }}
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

        {/* Sisi Kanan: Tombol Aksi Export */}
        <div className="flex items-center gap-2 w-full md:w-auto md:justify-end animate-fade-in mt-2 md:mt-0">
          <button
            onClick={exportToPDF}
            className="flex-1 md:flex-initial bg-surface border border-line px-4 py-2.5 rounded-2xl flex items-center justify-center gap-2 shadow-sm hover:border-accent/40 transition-all font-bold text-[12px] md:text-[13px] text-text-primary h-[46px]"
          >
            <FileText className="w-4 h-4" /> PDF
          </button>
          <button
            onClick={exportToExcel}
            className="flex-1 md:flex-initial bg-surface border border-line px-4 py-2.5 rounded-2xl flex items-center justify-center gap-2 shadow-sm hover:border-accent/40 transition-all font-bold text-[12px] md:text-[13px] text-text-primary h-[46px]"
          >
            <Table className="w-4 h-4" /> Excel
          </button>
        </div>
      </div>

      <div ref={reportRef} className="space-y-6">
        {/* SECTION 1: RINGKASAN FINANSIAL UTAMA (Financial Overview Card) */}
        <div className="card p-5 md:p-6 space-y-6 animate-scale-in">
          <div>
            <h3 className="text-[13px] font-bold text-text-primary uppercase tracking-wider">Ringkasan Finansial Utama</h3>
            <p className="text-[10px] text-text-muted mt-0.5">Ikhtisar total transaksi, progres alur kas, dan rata-rata performa saldo Anda.</p>
          </div>

          {/* 4 Kolom KPI Utama (Tanpa Border Individual, Bersih & Elegan) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4 px-2 bg-surface-alt/10 rounded-2xl border border-line/50">
            <div className="text-center md:text-left md:border-r border-line last:border-0 md:px-4 min-w-0">
              <p className="text-[10px] text-text-muted font-semibold uppercase tracking-wider mb-1">Total Pemasukan</p>
              <p className="text-[15px] md:text-[17px] font-bold text-success truncate">{fmt(summary.totalIncome)}</p>
              <div className="mt-1 flex items-center justify-center md:justify-start">
                <ComparisonBadge change={monthOverMonth.incomeChange} label="Pemasukan" />
              </div>
            </div>
            <div className="text-center md:text-left md:border-r border-line last:border-0 md:px-4 min-w-0">
              <p className="text-[10px] text-text-muted font-semibold uppercase tracking-wider mb-1">Total Pengeluaran</p>
              <p className="text-[15px] md:text-[17px] font-bold text-danger truncate">{fmt(summary.totalExpense)}</p>
              <div className="mt-1 flex items-center justify-center md:justify-start">
                <ComparisonBadge change={monthOverMonth.expenseChange} label="Pengeluaran" />
              </div>
            </div>
            <div className="text-center md:text-left md:border-r border-line last:border-0 md:px-4 min-w-0">
              <p className="text-[10px] text-text-muted font-semibold uppercase tracking-wider mb-1">Total Tabungan</p>
              <p className="text-[15px] md:text-[17px] font-bold text-accent truncate">{fmt(summary.totalSaving)}</p>
              <div className="mt-1 flex items-center justify-center md:justify-start">
                <ComparisonBadge change={monthOverMonth.savingChange} label="Tabungan" />
              </div>
            </div>
            <div className="text-center md:text-left md:px-4 min-w-0">
              <p className="text-[10px] text-text-muted font-semibold uppercase tracking-wider mb-1">
                {cashFlow.remaining >= 0 ? 'Sisa Dana' : 'Defisit'}
              </p>
              <p className={`text-[15px] md:text-[17px] font-bold truncate ${cashFlow.remaining >= 0 ? 'text-success' : 'text-danger'}`}>
                {cashFlow.remaining < 0 ? '-' : ''}{fmt(Math.abs(cashFlow.remaining))}
              </p>
              <div className="mt-1 flex items-center justify-center md:justify-start">
                {cashFlow.remaining >= 0 ? (
                  <span className="text-[10px] font-medium text-success whitespace-nowrap">
                    Sisa {cashFlow.remainingPercent.toFixed(0)}% pemasukan
                  </span>
                ) : (
                  <span className="text-[10px] font-medium text-danger whitespace-nowrap">
                    Pengeluaran defisit
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Rata-Rata Bulanan & Perbandingan Tahun/Hari (Khusus Tahunan) */}
          {selectedMonth === null && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2">
              <div className="p-3 bg-surface-alt/20 rounded-xl border border-line/40 min-w-0">
                <p className="text-[10px] text-text-muted font-medium">Rata-rata Masuk/Bulan</p>
                <p className="text-[13px] font-bold text-success mt-0.5 truncate">{fmt(summary.avgMonthlyIncome)}</p>
                <p className="text-[9px] text-text-muted mt-0.5">dari {summary.divisor} bulan</p>
              </div>
              <div className="p-3 bg-surface-alt/20 rounded-xl border border-line/40 min-w-0">
                <p className="text-[10px] text-text-muted font-medium">Rata-rata Keluar/Bulan</p>
                <p className="text-[13px] font-bold text-danger mt-0.5 truncate">{fmt(summary.avgMonthlyExpense)}</p>
                <p className="text-[9px] text-text-muted mt-0.5">dari {summary.divisor} bulan</p>
              </div>
              <div className="p-3 bg-surface-alt/20 rounded-xl border border-line/40 min-w-0">
                <p className="text-[10px] text-text-muted font-medium">Total Keluar/Tahun</p>
                <p className="text-[13px] font-bold text-danger mt-0.5 truncate">{fmt(summary.totalExpense)}</p>
              </div>
              <div className="p-3 bg-surface-alt/20 rounded-xl border border-line/40 min-w-0">
                <p className="text-[10px] text-text-muted font-medium">Puncak Keluar (Bulan)</p>
                <p className="text-[13px] font-bold text-danger mt-0.5 truncate">
                  {summary.worstMonth?.name || '-'}
                </p>
              </div>
            </div>
          )}
          {/* Perbandingan Periode Sebelumnya (Khusus Tahunan) */}
          {selectedMonth === null && (
            <div className="p-3 bg-surface-alt/30 border border-line/50 rounded-xl flex flex-col md:flex-row md:items-center justify-between text-[11px] gap-2">
              <span className="text-text-muted font-semibold">Perbandingan vs Tahun {monthOverMonth.prevPeriodLabel}:</span>
              <div className="flex gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="text-text-secondary">Pemasukan:</span>
                  <ComparisonBadge change={monthOverMonth.incomeChange} label="Pemasukan" />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-text-secondary">Pengeluaran:</span>
                  <ComparisonBadge change={monthOverMonth.expenseChange} label="Pengeluaran" />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-text-secondary">Tabungan:</span>
                  <ComparisonBadge change={monthOverMonth.savingChange} label="Tabungan" />
                </div>
              </div>
            </div>
          )}

          {/* Alur Uang (Cash Flow Progress) */}
          {cashFlow.totalIncome > 0 && (
            <div className="pt-5 border-t border-line space-y-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-1">
                <h4 className="text-[12px] font-bold text-text-primary uppercase tracking-wider">Alur & Progres Arus Kas</h4>
                <span className="text-[9px] font-semibold text-text-muted bg-surface-alt/60 px-2 py-0.5 rounded-full w-fit">
                  Formula: Pemasukan - Pengeluaran - Tabungan = Sisa
                </span>
              </div>

              <div className="space-y-4">
                {/* Total Pemasukan */}
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-success/10 flex items-center justify-center shrink-0">
                    <TrendingUp className="w-4 h-4 text-success" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-semibold text-text-primary">Total Pemasukan</span>
                      <span className="text-[12px] font-bold text-success">{fmt(cashFlow.totalIncome)}</span>
                    </div>
                    <div className="h-2.5 bg-surface-alt rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: '100%', backgroundColor: 'var(--color-success)' }} />
                    </div>
                  </div>
                </div>

                {/* Sub-aliran */}
                <div className="ml-4 border-l border-line pl-4 space-y-3.5">
                  {/* Pengeluaran */}
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-lg bg-danger/10 flex items-center justify-center shrink-0">
                      <TrendingDown className="w-3.5 h-3.5 text-danger" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-medium text-text-primary">Pengeluaran & Tagihan</span>
                        <span className="text-[11px] font-bold text-danger">
                          {fmt(cashFlow.totalExpense)}{' '}
                          <span className="text-[9px] font-normal text-text-muted">({cashFlow.expensePercent.toFixed(0)}%)</span>
                        </span>
                      </div>
                      <div className="h-1.5 bg-surface-alt rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${Math.min(cashFlow.expensePercent, 100)}%`, backgroundColor: 'var(--color-danger)' }} />
                      </div>
                    </div>
                  </div>

                  {/* Tabungan */}
                  {cashFlow.totalSaving > 0 && (
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                        <TrendingUp className="w-3.5 h-3.5 text-accent" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[11px] font-medium text-text-primary">Tabungan disisihkan</span>
                          <span className="text-[11px] font-bold text-accent">
                            {fmt(cashFlow.totalSaving)}{' '}
                            <span className="text-[9px] font-normal text-text-muted">({cashFlow.savingPercent.toFixed(0)}%)</span>
                          </span>
                        </div>
                        <div className="h-1.5 bg-surface-alt rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${Math.min(cashFlow.savingPercent, 100)}%`, backgroundColor: 'var(--color-accent)' }} />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Hasil Bersih */}
                  <div className="flex items-center gap-3">
                    <div className={clsx(
                      "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
                      cashFlow.remaining >= 0 ? "bg-success/10 text-success" : "bg-danger/10 text-danger"
                    )}>
                      {cashFlow.remaining >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-medium text-text-primary">
                          {cashFlow.remaining >= 0 ? 'Sisa Bersih Arus Kas' : 'Defisit Arus Uang'}
                        </span>
                        <span className={clsx(
                          "text-[11px] font-bold",
                          cashFlow.remaining >= 0 ? "text-success" : "text-danger"
                        )}>
                          {cashFlow.remaining < 0 ? '-' : ''}{fmt(Math.abs(cashFlow.remaining))}
                          <span className="text-[9px] font-normal text-text-muted"> ({cashFlow.netFlowPercent.toFixed(0)}%)</span>
                        </span>
                      </div>
                      <div className="h-1.5 bg-surface-alt rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.min(cashFlow.netFlowPercent, 100)}%`,
                            backgroundColor: cashFlow.remaining >= 0 ? 'var(--color-success)' : 'var(--color-danger)'
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* SECTION 2: ASISTEN FINANSIAL PINTAR (Smart Financial Coach Card) */}
        {(() => {
          const isSurplus = cashFlow.remaining >= 0;
          const netRemaining = cashFlow.remaining;
          const topCategory = expenseByCategory[0];
          const topPurpose = expenseByPurpose[0];

          return (
            <div className="card p-5 bg-gradient-to-br from-accent/5 to-accent/10 border border-accent/20 shadow-sm space-y-4 animate-scale-in">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-accent/20 flex items-center justify-center shrink-0">
                  <span className="text-[20px] animate-pulse">🧠</span>
                </div>
                <div>
                  <h3 className="text-[13px] font-bold text-text-primary">Analisis Keuangan</h3>
                </div>
                <div className="ml-auto shrink-0">
                  <span className={clsx(
                    "px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider border",
                    isSurplus ? "bg-success/15 text-success border-success/30" : "bg-danger/15 text-danger border-danger/30"
                  )}>
                    {isSurplus ? '🟢 SURPLUS' : '🔴 DEFISIT'}
                  </span>
                </div>
              </div>

              <div className="text-[12px] text-text-secondary leading-relaxed space-y-3 bg-surface/50 p-4 rounded-xl border border-line">
                <p>
                  Halo! Berdasarkan kalkulasi data, keuangan Anda periode ini berada dalam kondisi {' '}
                  <span className={clsx("font-bold", isSurplus ? "text-success" : "text-danger")}>
                    {isSurplus ? 'Surplus' : 'Defisit'}
                  </span>
                  . Total pendapatan tercatat sebesar <span className="font-semibold text-success">{fmt(summary.totalIncome)}</span>, sedangkan pengeluaran dan tabungan Anda masing-masing menyentuh <span className="font-semibold text-danger">{fmt(summary.totalExpense)}</span> dan <span className="font-semibold text-accent">{fmt(summary.totalSaving)}</span>.
                </p>

                {isSurplus ? (
                  <p>
                    📈 **Keuangan Anda sehat!** Anda memiliki sisa saldo aman sebesar <span className="font-semibold text-success">{fmt(netRemaining)}</span> setelah pengeluaran dan tabungan. Rasio tabungan Anda periode ini menyentuh <span className="font-bold text-accent">{savingsRate.toFixed(1)}%</span>, angka surplus yang sangat baik untuk menjaga ketahanan dana darurat Anda!
                  </p>
                ) : (
                  <p>
                    ⚠️ **Perhatian Khusus!** Dompet Anda mengalami defisit arus kas sebesar <span className="font-semibold text-danger">{fmt(Math.abs(netRemaining))}</span> karena total pengeluaran dan tabungan melampaui pendapatan. Disarankan untuk membatasi konsumsi barang sekunder dan menata kembali rencana keuangan bulan depan.
                  </p>
                )}

                {monthOverMonth.expenseChange !== null && (
                  <p>
                    {monthOverMonth.expenseChange > 0 ? (
                      <span>
                        📊 **Tren Pengeluaran Naik:** Rata-rata pengeluaran bulanan Anda {selectedMonth !== null ? 'bulan' : 'tahun'} ini {' '}
                        <span className="font-semibold text-danger">naik {monthOverMonth.expenseChange.toFixed(1)}%</span> {' '}
                        dibandingkan {selectedMonth !== null ? 'bulan' : 'tahun'} sebelumnya ({monthOverMonth.prevPeriodLabel})
                        {selectedMonth === null && ` (dihitung proporsional dari ${'isNormalized' in monthOverMonth ? (monthOverMonth as any).currentYearDivisor : 0} bulan aktif vs ${'isNormalized' in monthOverMonth ? (monthOverMonth as any).prevYearDivisor : 0} bulan aktif)`}.
                        Cobalah untuk mengevaluasi kembali pos pengeluaran yang tidak mendesak demi menjaga arus kas tetap stabil.
                      </span>
                    ) : monthOverMonth.expenseChange < 0 ? (
                      <span>
                        🎉 **Efisiensi Anggaran Sukses:** Rata-rata pengeluaran bulanan Anda {selectedMonth !== null ? 'bulan' : 'tahun'} ini {' '}
                        <span className="font-semibold text-success">turun {Math.abs(monthOverMonth.expenseChange).toFixed(1)}%</span> {' '}
                        dibandingkan {selectedMonth !== null ? 'bulan' : 'tahun'} sebelumnya ({monthOverMonth.prevPeriodLabel})
                        {selectedMonth === null && ` (dihitung proporsional dari ${'isNormalized' in monthOverMonth ? (monthOverMonth as any).currentYearDivisor : 0} bulan aktif vs ${'isNormalized' in monthOverMonth ? (monthOverMonth as any).prevYearDivisor : 0} bulan aktif)`}.
                        Pencapaian hemat yang sangat luar biasa, pertahankan pola belanja sehat ini!
                      </span>
                    ) : (
                      <span>
                        ⚖️ **Pengeluaran Stabil:** Rata-rata pengeluaran bulanan Anda {selectedMonth !== null ? 'bulan' : 'tahun'} ini stabil, sama persis dengan {selectedMonth !== null ? 'bulan' : 'tahun'} sebelumnya ({monthOverMonth.prevPeriodLabel})
                        {selectedMonth === null && ` (dihitung proporsional dari ${'isNormalized' in monthOverMonth ? (monthOverMonth as any).currentYearDivisor : 0} bulan aktif vs ${'isNormalized' in monthOverMonth ? (monthOverMonth as any).prevYearDivisor : 0} bulan aktif)`}.
                      </span>
                    )}
                  </p>
                )}

                {topCategory && (
                  <p>
                    🍔 Pemicu pengeluaran terbesar bersumber dari kategori <span className="font-semibold text-text-primary">{topCategory.name}</span> sebesar <span className="font-semibold text-danger">{fmt(topCategory.value)}</span> ({((topCategory.value / summary.totalExpense) * 100).toFixed(0)}% dari total pengeluaran). {topCategory.name === 'Makanan' ? 'Mengurangi frekuensi makan di luar di akhir pekan dapat menghemat pengeluaran bulanan Anda secara signifikan.' : 'Cobalah untuk menaruh plafon budget maksimum bulanan khusus untuk kategori tersebut.'}
                  </p>
                )}

                {topPurpose && (
                  <p>
                    🎯 Secara tujuan, alokasi dana terbesar dialihkan untuk <span className="font-semibold text-text-primary">{topPurpose.name}</span> sebesar <span className="font-semibold text-text-primary">{fmt(topPurpose.value)}</span>. Pastikan alokasi ini memiliki nilai urgensi tinggi demi mencegah kebocoran rencana anggaran Anda.
                  </p>
                )}
              </div>
            </div>
          );
        })()}

        {/* SECTION 3: AKTIVITAS & INTENSITAS HARIAN (Daily Activity & Habits Card) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 animate-scale-in">
          {/* Kalender Pengeluaran (Lg: Col Span 2) */}
          <div className="card p-5 lg:col-span-2 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-[13px] font-bold text-text-primary flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-accent" />
                  Kalender & Intensitas Pengeluaran
                </h3>
                <p className="text-[10px] text-text-muted mt-0.5">Intensitas pengeluaran harian • Total {heatMonthLabel}: <span className="font-bold text-text-primary">{fmt(heatTotal)}</span></p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => {
                    if (heatmapMonth === 0) { setHeatmapMonth(11); setHeatmapYear(y => y - 1); }
                    else setHeatmapMonth(m => m - 1);
                  }}
                  className="w-8 h-8 rounded-xl border border-line bg-surface flex items-center justify-center hover:bg-surface-hover transition-all"
                >
                  <ChevronLeft className="w-3.5 h-3.5 text-text-muted" />
                </button>
                <button
                  onClick={() => {
                    if (heatmapMonth === 11) { setHeatmapMonth(0); setHeatmapYear(y => y + 1); }
                    else setHeatmapMonth(m => m + 1);
                  }}
                  className="w-8 h-8 rounded-xl border border-line bg-surface flex items-center justify-center hover:bg-surface-hover transition-all"
                >
                  <ChevronRight className="w-3.5 h-3.5 text-text-muted" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
              {/* Heatmap Grid (Col Span 3) */}
              <div className="md:col-span-3 min-w-0 space-y-3">
                <div className="grid grid-cols-7 text-center">
                  {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map(d => (
                    <span key={d} className="text-[10px] text-text-muted font-medium py-0.5">{d}</span>
                  ))}
                </div>
                <div className="space-y-1.5">
                  {heatmapData.weeks.map((week, wi) => (
                    <div key={wi} className="grid grid-cols-7 gap-1 md:gap-1.5">
                      {week.map((day, di) => {
                        const amount = getHeatAmount(day);
                        const tier = heatTier(amount);
                        if (day === null) return <div key={di} className="aspect-square" />;
                        const today = new Date();
                        const isToday = heatmapYear === today.getFullYear() && heatmapMonth === today.getMonth() && day === today.getDate();
                        const isFuture = heatmapYear === today.getFullYear() && heatmapMonth === today.getMonth() && day > today.getDate();
                        return (
                          <div
                            key={di}
                            title={isFuture ? `${day} ${heatMonthLabel} — belum terjadi` : `${day} ${heatMonthLabel}: ${fmt(amount ?? 0)} (Klik untuk detail)`}
                            style={isFuture ? { background: 'var(--color-surface-alt)', color: 'var(--color-text-muted)', opacity: 0.4 } : heatStyle(tier)}
                            onClick={() => {
                              if (!isFuture) {
                                const dateKey = `${heatmapYear}-${String(heatmapMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                setCalendarDetailDate(dateKey);
                              }
                            }}
                            className={clsx(
                              'aspect-square rounded-lg flex items-center justify-center text-[10px] md:text-[11px] font-semibold transition-all',
                              isFuture ? 'cursor-default border border-dashed border-line' : 'cursor-pointer hover:scale-115 hover:shadow-lg active:scale-95 hover:ring-2 hover:ring-accent/40',
                              tier === 0 && !isFuture && 'border border-line',
                              isToday && 'ring-2 ring-accent ring-offset-1 dark:ring-offset-surface'
                            )}
                          >
                            {day}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>

                <div className="flex items-center flex-wrap gap-x-2 gap-y-1 pt-3 border-t border-line">
                  <span className="text-[8px] text-text-muted font-semibold uppercase mr-1">Skala:</span>
                  <div className="flex items-center gap-1">
                    <div className="w-2.5 h-2.5 rounded-[3px] border border-line" style={{ background: 'var(--heat-0-bg)' }} />
                    <span className="text-[9px] text-text-muted">0</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2.5 h-2.5 rounded-[3px]" style={{ background: 'var(--heat-1-bg)' }} />
                    <span className="text-[9px] text-text-muted">Min</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2.5 h-2.5 rounded-[3px]" style={{ background: 'var(--heat-2-bg)' }} />
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2.5 h-2.5 rounded-[3px]" style={{ background: 'var(--heat-3-bg)' }} />
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2.5 h-2.5 rounded-[3px]" style={{ background: 'var(--heat-4-bg)' }} />
                    <span className="text-[9px] text-text-muted">Max</span>
                  </div>
                </div>
              </div>

              {/* Heatmap Stats (Col Span 2) */}
              <div className="md:col-span-2 space-y-3">
                <div className="rounded-xl bg-surface-alt/40 border border-line p-3 min-w-0">
                  <p className="text-[8px] text-text-muted font-medium uppercase tracking-wider">Rata-rata Pengeluaran per Hari</p>
                  <p className="text-[13px] font-bold text-text-primary mt-0.5 truncate">
                    {fmt(heatPeriodDays > 0 ? heatTotal / heatPeriodDays : 0)}
                  </p>
                  <p className="text-[8px] text-text-muted mt-0.5">Rata-rata dari {heatPeriodDays} hari berjalan</p>
                </div>
                <div className="rounded-xl bg-surface-alt/40 border border-line p-3 min-w-0">
                  <p className="text-[8px] text-text-muted font-medium uppercase tracking-wider">Pengeluaran Puncak</p>
                  <p className="text-[12px] font-bold text-danger mt-0.5 truncate">
                    {heatStats.peakDay.amount > 0 ? fmt(heatStats.peakDay.amount) : '-'}
                  </p>
                  <p className="text-[8px] text-text-muted mt-0.5">
                    {heatStats.peakDay.amount > 0 ? `Tanggal ${heatStats.peakDay.day}` : 'Belum ada data'}
                  </p>
                </div>
                <div className="rounded-xl bg-surface-alt/40 border border-line p-3 min-w-0">
                  <p className="text-[8px] text-text-muted font-medium uppercase tracking-wider">Rata-rata Pokok per Hari</p>
                  <p className="text-[13px] font-bold text-text-primary mt-0.5 truncate">
                    {fmt(heatPeriodDays > 0 ? pokokExpensesTotal / heatPeriodDays : 0)}
                  </p>
                  <p className="text-[8px] text-text-muted mt-0.5">Total Pokok: {fmt(pokokExpensesTotal)}</p>
                </div>

                {/* Pola Belanja: Hari Kerja vs Akhir Pekan */}
                <div className="rounded-xl bg-surface-alt/40 border border-line p-3 min-w-0 space-y-2.5">
                  <p className="text-[8px] text-text-muted font-medium uppercase tracking-wider">Pola Belanja</p>
                  
                  {(() => {
                    const maxVal = Math.max(heatStats.avgWeekday, heatStats.avgWeekend, 1);
                    const weekdayPct = (heatStats.avgWeekday / maxVal) * 100;
                    const weekendPct = (heatStats.avgWeekend / maxVal) * 100;
                    const isWeekendHigher = heatStats.avgWeekend > heatStats.avgWeekday;
                    return (
                      <div className="space-y-2">
                        {/* Hari Kerja */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-semibold text-text-secondary">Senin – Jumat</span>
                            <span className="text-[10px] font-bold text-text-primary truncate ml-1">{fmt(heatStats.avgWeekday)}</span>
                          </div>
                          <div className="h-2 bg-surface-alt rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-700 ease-out"
                              style={{
                                width: `${Math.max(weekdayPct, 4)}%`,
                                backgroundColor: !isWeekendHigher ? 'var(--color-danger)' : 'var(--color-success)',
                              }}
                            />
                          </div>
                        </div>
                        {/* Akhir Pekan */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-semibold text-text-secondary">Sabtu – Minggu</span>
                            <span className="text-[10px] font-bold text-text-primary truncate ml-1">{fmt(heatStats.avgWeekend)}</span>
                          </div>
                          <div className="h-2 bg-surface-alt rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-700 ease-out"
                              style={{
                                width: `${Math.max(weekendPct, 4)}%`,
                                backgroundColor: isWeekendHigher ? 'var(--color-danger)' : 'var(--color-success)',
                              }}
                            />
                          </div>
                        </div>
                        {/* Insight kecil */}
                        <p className="text-[8px] text-text-muted pt-0.5">
                          {heatStats.avgWeekday === 0 && heatStats.avgWeekend === 0
                            ? 'Belum ada data belanja'
                            : isWeekendHigher
                              ? `Akhir pekan ${heatStats.avgWeekday > 0 ? ((heatStats.avgWeekend / heatStats.avgWeekday - 1) * 100).toFixed(0) : '∞'}% lebih boros`
                              : heatStats.avgWeekend > 0
                                ? `Hari kerja ${((heatStats.avgWeekday / heatStats.avgWeekend - 1) * 100).toFixed(0)}% lebih boros`
                                : 'Tidak ada belanja di akhir pekan'}
                        </p>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          </div>

          {/* Transaksi Terbesar (Lg: Col Span 1) */}
          <div className="card p-5 space-y-4">
            <div>
              <h3 className="text-[13px] font-bold text-text-primary">Transaksi Terbesar</h3>
              <p className="text-[10px] text-text-muted mt-0.5">Daftar transaksi tertinggi periode terpilih.</p>
            </div>

            <div className="space-y-4">
              {topTransactions.expenses.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-[9px] text-text-muted font-bold uppercase tracking-wider">Pengeluaran</p>
                  {topTransactions.expenses.slice(0, 3).map((tx, idx) => {
                    const cat = categories.find((c: any) => c.id === tx.category_id);
                    return (
                      <div key={tx.id} className="flex items-center gap-2 text-[11px] border-b border-line/45 pb-1.5 last:border-0 last:pb-0">
                        <span className="w-4 h-4 rounded-full bg-danger/10 text-danger flex items-center justify-center text-[8px] font-bold shrink-0">{idx + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-text-primary truncate">{tx.description}</p>
                          <p className="text-[8px] text-text-muted">{cat?.name || 'Tagihan'}</p>
                        </div>
                        <span className="font-bold text-danger shrink-0">-{fmt(Number(tx.amount))}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-[10px] text-text-muted text-center py-4">Belum ada pengeluaran.</p>
              )}

              {topTransactions.incomes.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-line/45">
                  <p className="text-[9px] text-text-muted font-bold uppercase tracking-wider">Pemasukan</p>
                  {topTransactions.incomes.slice(0, 2).map((tx, idx) => {
                    const acct = accounts.find((a: any) => a.id === tx.to_account_id);
                    return (
                      <div key={tx.id} className="flex items-center gap-2 text-[11px] border-b border-line/45 pb-1.5 last:border-0 last:pb-0">
                        <span className="w-4 h-4 rounded-full bg-success/10 text-success flex items-center justify-center text-[8px] font-bold shrink-0">{idx + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-text-primary truncate">{tx.description}</p>
                          <p className="text-[8px] text-text-muted">{acct?.name || '-'}</p>
                        </div>
                        <span className="font-bold text-success shrink-0">+{fmt(Number(tx.amount))}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SECTION 4: ANALISIS GRAFIK TERPADU (Tren Bulanan & Pie Chart) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 animate-scale-in">
          {/* Tren Arus Kas Bulanan / Tren Pengeluaran Mingguan (Lg: Col Span 2) */}
          <div className="card p-5 lg:col-span-2 space-y-4">
            <div>
              <h3 className="text-[13px] font-bold text-text-primary">
                {selectedMonth !== null ? 'Tren Pengeluaran Mingguan' : 'Tren Arus Kas Bulanan'}
              </h3>
              <p className="text-[10px] text-text-muted mt-0.5">
                {selectedMonth !== null
                  ? `Analisis fluktuasi pengeluaran per minggu Anda pada bulan ${FULL_MONTH_NAMES[selectedMonth]} ${selectedYear}.`
                  : 'Analisis tren pergerakan keluar masuk dana Anda.'}
              </p>
            </div>

            <div className="h-64">
              {selectedMonth !== null ? (
                weeklySpendingChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weeklySpendingChartData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                      <XAxis
                        dataKey="name"
                        tick={<CustomXAxisTick />}
                        tickLine={false}
                        axisLine={false}
                        padding={{ left: 20, right: 20 }}
                        interval={0}
                      />
                      <YAxis
                        tickFormatter={v => v >= 1000000 ? `${(v / 1000000).toFixed(1)}jt` : v >= 1000 ? `${(v / 1000).toFixed(0)}rb` : String(v)}
                        tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip 
                        formatter={(v: number) => fmt(v)} 
                        contentStyle={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', borderRadius: '12px' }}
                        itemStyle={{ color: 'var(--color-text-primary)' }}
                        labelStyle={{ color: 'var(--color-text-muted)' }}
                      />
                      <Bar
                        dataKey="Pengeluaran"
                        fill="var(--chart-5)"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={36}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-text-muted text-[11px]">Belum ada data pengeluaran mingguan.</div>
                )
              ) : (
                monthData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={monthData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }} onClick={(data) => {
                      if (data && data.activeLabel) {
                        const idx = MONTH_NAMES.indexOf(data.activeLabel);
                        if (idx !== -1) handleMonthClick(idx);
                      }
                    }}>
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} tickLine={false} axisLine={false} />
                      <YAxis tickFormatter={v => `${(v / 1000000).toFixed(1)}M`} tick={{ fontSize: 11, fill: 'var(--color-text-muted)' }} tickLine={false} axisLine={false} />
                      <Tooltip 
                        formatter={(v: number) => fmt(v)} 
                        contentStyle={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', borderRadius: '12px' }}
                        itemStyle={{ color: 'var(--color-text-primary)' }}
                        labelStyle={{ color: 'var(--color-text-muted)' }}
                      />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
                      <Line
                        type="monotone"
                        dataKey="Pemasukan"
                        stroke="var(--chart-1)"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="Pengeluaran"
                        stroke="var(--chart-5)"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-text-muted text-[11px]">Belum ada data tren.</div>
                )
              )}
            </div>
          </div>

          {/* Distribusi Kategori (Lg: Col Span 1) */}
          <div className="card p-5 space-y-4">
            <div>
              <h3 className="text-[13px] font-bold text-text-primary">Proporsi Kategori Pengeluaran</h3>
              <p className="text-[10px] text-text-muted mt-0.5">Pembagian persentase pengeluaran per kategori.</p>
            </div>

            <div className="h-48 relative">
              {expenseByCategory.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={expenseByCategory} cx="50%" cy="50%" innerRadius={42} outerRadius={64} paddingAngle={3} dataKey="value" stroke="none">
                        {expenseByCategory.map((_e, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v: number, name: string) => [`${fmt(v)} (${((v / totalExpense) * 100).toFixed(1)}%)`, name]}
                        contentStyle={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)', borderRadius: '12px' }}
                        itemStyle={{ color: 'var(--color-text-primary)' }}
                        labelStyle={{ color: 'var(--color-text-muted)' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ marginBottom: 12 }}>
                    <div className="text-center">
                      <p className="text-[8px] text-text-muted">Total</p>
                      <p className="text-[11px] font-bold text-text-primary truncate max-w-[80px]">{fmt(totalExpense)}</p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="h-full flex items-center justify-center text-text-muted text-[11px]">Belum ada data kategori.</div>
              )}
            </div>

            {/* Keterangan Warna Kategori (Legend) */}
            {expenseByCategory.length > 0 && (
              <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 pt-3 border-t border-line/50">
                {expenseByCategory.map((item, i) => {
                  const percent = totalExpense > 0 ? (item.value / totalExpense) * 100 : 0;
                  return (
                    <div key={item.name} className="flex items-center gap-1.5 text-[10px] font-medium text-text-secondary min-w-[70px] max-w-[120px]">
                      <div
                        className="w-2.5 h-2.5 rounded-[3px] shrink-0"
                        style={{ backgroundColor: COLORS[i % COLORS.length] }}
                      />
                      <span className="truncate" title={item.name}>
                        {item.name}{' '}
                        <span className="text-[8px] text-text-muted font-normal">
                          ({percent.toFixed(0)}%)
                        </span>
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* SECTION 5: RINCIAN TUJUAN PENGELUARAN (Tujuan Breakdown progress) */}
        {expenseByPurpose.length > 0 && (
          <div className="card p-5 mt-4 animate-scale-in">
            <div className="flex items-start justify-between gap-3 mb-1">
              <div>
                <h3 className="text-[13px] font-bold text-text-primary">Rincian per Tujuan Pengeluaran</h3>
                {selectedMonth !== null && (
                  <p className="text-[10px] text-text-muted mt-0.5">Periode: {FULL_MONTH_NAMES[selectedMonth]} {selectedYear}</p>
                )}
              </div>
              <span className="text-[10px] font-semibold text-text-muted bg-surface-alt px-2 py-0.5 rounded-full whitespace-nowrap">
                {expenseByPurpose.length} tujuan
              </span>
            </div>
            <div className="space-y-3.5 mt-3">
              {(showAllPurposes ? expenseByPurpose : expenseByPurpose.slice(0, 8)).map((p, idx) => {
                const percent = totalExpense > 0 ? (p.value / totalExpense) * 100 : 0;
                return (
                  <div key={p.name} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }}>
                      #{idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="font-semibold text-text-primary truncate mr-2">{p.name}</span>
                        <span className="text-text-muted shrink-0">{fmt(p.value)} <span className="text-[9px]">({percent.toFixed(0)}%)</span></span>
                      </div>
                      <div className="h-2 bg-surface-alt rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${percent}%`, backgroundColor: COLORS[idx % COLORS.length] }} />
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
              <span className="text-[12px] font-semibold text-text-primary">Total Pengeluaran per Tujuan</span>
              <span className="text-[13px] font-bold text-text-primary">
                {fmt(expenseByPurpose.reduce((sum, purpose) => sum + purpose.value, 0))}
              </span>
            </div>
          </div>
        )}
      </div>
      {calendarDetailDate && createPortal(
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
          onClick={() => setCalendarDetailDate(null)}
        >
          <div 
            className="bg-surface border border-line rounded-2xl w-full max-w-md overflow-hidden animate-scale-in shadow-2xl flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modal */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-line bg-surface-alt/10">
              <div className="space-y-0.5">
                <p className="text-[9px] text-text-muted font-bold uppercase tracking-wider">Detail Transaksi Kalender</p>
                <h2 className="text-[14px] font-bold text-text-primary">
                  {formattedCalendarDate}
                </h2>
              </div>
              <button 
                onClick={() => setCalendarDetailDate(null)} 
                aria-label="Tutup modal" 
                className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-hover rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Body Scrollable */}
            <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar flex-1">
              {/* Ringkasan Pengeluaran Harian */}
              <div className="flex items-center justify-between p-3.5 bg-surface-alt/20 border border-line rounded-xl">
                <span className="text-[12px] font-semibold text-text-secondary">Total Pengeluaran:</span>
                <span className="text-[14px] font-bold text-danger">{fmt(calendarDateSpendingTotal)}</span>
              </div>

              {/* Daftar Rincian per Tujuan */}
              <div className="space-y-4 pt-1">
                {calendarDateSpendingByPurpose.length > 0 ? (
                  calendarDateSpendingByPurpose.map((p, idx) => {
                    const percent = calendarDateSpendingTotal > 0 ? (p.value / calendarDateSpendingTotal) * 100 : 0;
                    return (
                      <div key={p.name} className="flex items-center gap-3">
                        <div 
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shrink-0 shadow-sm" 
                          style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                        >
                          #{idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between text-[12px] mb-1">
                            <span className="font-semibold text-text-primary truncate mr-2">{p.name}</span>
                            <span className="text-text-muted shrink-0 font-semibold text-[11px]">
                              {fmt(p.value)}{' '}
                              <span className="text-[9px] font-normal">({percent.toFixed(0)}%)</span>
                            </span>
                          </div>
                          <div className="h-2 bg-surface-alt rounded-full overflow-hidden">
                            <div 
                              className="h-full rounded-full transition-all duration-500" 
                              style={{ width: `${percent}%`, backgroundColor: COLORS[idx % COLORS.length] }} 
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center space-y-2">
                    <span className="text-[28px] animate-bounce">🥳</span>
                    <div>
                      <p className="text-[13px] font-bold text-text-primary">Hari Hemat!</p>
                      <p className="text-[11px] text-text-muted mt-0.5">Tidak ada catatan pengeluaran pada tanggal ini.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer Modal */}
            <div className="px-5 py-4 border-t border-line bg-surface-alt/10 flex justify-end">
              <button
                onClick={() => setCalendarDetailDate(null)}
                className="bg-surface-alt/20 hover:bg-surface-alt/30 border border-line/50 font-bold text-[12px] px-4 py-2 rounded-xl transition-all active:scale-[0.98]"
              >
                Kembali
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
      {calendarDetailDate && createPortal(
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in"
          onClick={() => setCalendarDetailDate(null)}
        >
          <div 
            className="bg-surface border border-line rounded-2xl w-full max-w-md overflow-hidden animate-scale-in shadow-2xl flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Modal */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-line bg-surface-alt/10">
              <div className="space-y-0.5">
                <p className="text-[9px] text-text-muted font-bold uppercase tracking-wider">Detail Transaksi Kalender</p>
                <h2 className="text-[14px] font-bold text-text-primary">
                  {formattedCalendarDate}
                </h2>
              </div>
              <button 
                onClick={() => setCalendarDetailDate(null)} 
                aria-label="Tutup modal" 
                className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-hover rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Body Scrollable */}
            <div className="p-6 space-y-5 overflow-y-auto custom-scrollbar flex-1">
              {/* Ringkasan Pengeluaran Harian */}
              <div className="flex items-center justify-between p-3.5 bg-surface-alt/20 border border-line rounded-xl">
                <span className="text-[12px] font-semibold text-text-secondary">Total Pengeluaran:</span>
                <span className="text-[14px] font-bold text-danger">{fmt(calendarDateSpendingTotal)}</span>
              </div>
 
              {/* Daftar Rincian per Tujuan */}
              <div className="space-y-4 pt-1">
                {calendarDateSpendingByPurpose.length > 0 ? (
                  calendarDateSpendingByPurpose.map((p, idx) => {
                    const percent = calendarDateSpendingTotal > 0 ? (p.value / calendarDateSpendingTotal) * 100 : 0;
                    return (
                      <div key={p.name} className="flex items-center gap-3">
                        <div 
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold text-white shrink-0 shadow-sm" 
                          style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                        >
                          #{idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between text-[12px] mb-1">
                            <span className="font-semibold text-text-primary truncate mr-2">{p.name}</span>
                            <span className="text-text-muted shrink-0 font-semibold text-[11px]">
                              {fmt(p.value)}{' '}
                              <span className="text-[9px] font-normal">({percent.toFixed(0)}%)</span>
                            </span>
                          </div>
                          <div className="h-2 bg-surface-alt rounded-full overflow-hidden">
                            <div 
                              className="h-full rounded-full transition-all duration-500" 
                              style={{ width: `${percent}%`, backgroundColor: COLORS[idx % COLORS.length] }} 
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-center space-y-2">
                    <span className="text-[28px] animate-bounce">🥳</span>
                    <div>
                      <p className="text-[13px] font-bold text-text-primary">Hari Hemat!</p>
                      <p className="text-[11px] text-text-muted mt-0.5">Tidak ada catatan pengeluaran pada tanggal ini.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
 
            {/* Footer Modal */}
            <div className="px-5 py-4 border-t border-line bg-surface-alt/10 flex justify-end">
              <button
                onClick={() => setCalendarDetailDate(null)}
                className="bg-surface-alt/20 hover:bg-surface-alt/30 border border-line/50 font-bold text-[12px] px-4 py-2 rounded-xl transition-all active:scale-[0.98]"
              >
                Kembali
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
