import { useState, useMemo, useRef, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, LineChart, Line } from 'recharts';
import { ChevronDown, FileText, Table, ArrowLeft, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import clsx from 'clsx';
import { useData } from '../context/DataContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { fmt } from '../lib/utils';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const FULL_MONTH_NAMES = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

export default function Report() {
  const { transactions, categories, purposes, accounts } = useData();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [isYearPickerOpen, setIsYearPickerOpen] = useState(false);
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
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
        const expense = mTx.reduce((sum, t) => {
          if (t.type === 'expense' || t.type === 'bill') return sum + Number(t.amount);
          return sum;
        }, 0);
        return { name, fullName: FULL_MONTH_NAMES[idx], month: idx, isSelected, Pemasukan: income, Pengeluaran: expense };
      });
      return result;
    }

    const result = MONTH_NAMES.map((name, idx) => {
      const monthTx = yearTx.filter(t => new Date(t.date).getMonth() === idx);
      const income = monthTx
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + Number(t.amount), 0);
      const expense = monthTx.reduce((sum, t) => {
        if (t.type === 'expense' || t.type === 'bill') return sum + Number(t.amount);
        return sum;
      }, 0);
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
    filteredTx.forEach(t => {
      if (t.type === 'expense' && t.category_id) {
        const cat = categories.find((c: any) => c.id === t.category_id);
        const catName = cat?.name || 'Lainnya';
        categoryMap.set(catName, (categoryMap.get(catName) || 0) + Number(t.amount));
      }
    });
    return Array.from(categoryMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredTx, categories]);

  const expenseByPurpose = useMemo(() => {
    const purposeMap = new Map<string, number>();
    filteredTx.forEach(t => {
      if (t.type === 'expense' && t.purpose_id) {
        const pur = purposes.find((p: any) => p.id === t.purpose_id);
        const purName = pur?.name || 'Lainnya';
        purposeMap.set(purName, (purposeMap.get(purName) || 0) + Number(t.amount));
      }
    });
    return Array.from(purposeMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredTx, purposes]);

  const summary = useMemo(() => {
    const totalIncome = filteredTx.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
    const totalExpense = filteredTx.reduce((sum, t) => {
      if (t.type === 'expense' || t.type === 'bill') return sum + Number(t.amount);
      return sum;
    }, 0);
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
          totalExpense: prevMonthTx.reduce((sum, t) => {
            if (t.type === 'expense' || t.type === 'bill') return sum + Number(t.amount);
            return sum;
          }, 0),
          totalSaving: prevMonthTx.filter(t => t.type === 'saving').reduce((sum, t) => sum + Number(t.amount), 0),
        }
      : {
          totalIncome: prevYearTx.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0),
          totalExpense: prevYearTx.reduce((sum, t) => {
            if (t.type === 'expense' || t.type === 'bill') return sum + Number(t.amount);
            return sum;
          }, 0),
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

    return {
      totalIncome, totalExpense, totalSaving, totalTransfer, totalBill, remaining,
      expensePercent, savingPercent, billPercent, transferPercent, remainingPercent,
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
    const periodLabel = selectedMonth !== null ? `${FULL_MONTH_NAMES[selectedMonth]} ${selectedYear}` : `Tahun ${selectedYear}`;

    doc.setFontSize(18);
    doc.setTextColor(40);
    doc.text('Laporan Keuangan', pageWidth / 2, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.text(periodLabel, pageWidth / 2, 28, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Dicetak: ${format(new Date(), 'dd MMMM yyyy', { locale: id })}`, pageWidth / 2, 34, { align: 'center' });
    doc.setDrawColor(200);
    doc.line(20, 40, pageWidth - 20, 40);

    doc.setFontSize(14);
    doc.text(selectedMonth !== null ? 'Ringkasan Bulanan' : 'Ringkasan Tahunan', 20, 50);
    autoTable(doc, {
      startY: 55,
      head: [['Deskripsi', 'Jumlah']],
      body: [
        ['Total Pemasukan', fmt(summary.totalIncome)],
        ['Total Pengeluaran', fmt(summary.totalExpense)],
        ['Total Tabungan', fmt(summary.totalSaving)],
        ['Rata-rata Pemasukan/Bulan', fmt(summary.avgMonthlyIncome)],
        ['Rata-rata Pengeluaran/Bulan', fmt(summary.avgMonthlyExpense)],
        ['Bulan Terbaik', `${summary.bestMonth.name} (${fmt(summary.bestMonth.Pemasukan)})`],
        ['Pengeluaran Tertinggi', `${summary.worstMonth.name} (${fmt(summary.worstMonth.Pengeluaran)})`],
      ],
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
    });

    doc.setFontSize(14);
    doc.text('Pengeluaran per Kategori', 20, doc.lastAutoTable.finalY + 15);
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 20,
      head: [['Kategori', 'Jumlah', 'Persentase']],
      body: expenseByCategory.map(c => [c.name, fmt(c.value), `${((c.value / totalExpense) * 100).toFixed(1)}%`]),
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
    });

    doc.save(`Laporan_Keuangan_${selectedYear}${selectedMonth !== null ? `_${FULL_MONTH_NAMES[selectedMonth]}` : ''}.pdf`);
  };

  const exportToExcel = () => {
    const periodLabel = selectedMonth !== null ? `${FULL_MONTH_NAMES[selectedMonth]} ${selectedYear}` : `${selectedYear}`;
    const csvContent = [
      ['LAPORAN KEUANGAN', periodLabel],
      [''],
      [selectedMonth !== null ? 'RINGKASAN BULANAN' : 'RINGKASAN TAHUNAN'],
      ['Deskripsi', 'Jumlah'],
      ['Total Pemasukan', summary.totalIncome],
      ['Total Pengeluaran', summary.totalExpense],
      ['Total Tabungan', summary.totalSaving],
      ['Rata-rata Pemasukan/Bulan', summary.avgMonthlyIncome],
      ['Rata-rata Pengeluaran/Bulan', summary.avgMonthlyExpense],
      [''],
      ['PENGELUARAN PER KATEGORI'],
      ['Kategori', 'Jumlah', 'Persentase'],
      ...expenseByCategory.map(c => [c.name, c.value, `${((c.value / totalExpense) * 100).toFixed(1)}%`]),
      [''],
      ['TREN BULANAN'],
      ['Bulan', 'Pemasukan', 'Pengeluaran'],
      ...monthData.map(m => [m.name, m.Pemasukan, m.Pengeluaran]),
      [''],
      ['DETAIL TRANSAKSI'],
      ['Tanggal', 'Tipe', 'Deskripsi', 'Jumlah'],
      ...filteredTx.map(t => [format(new Date(t.date), 'yyyy-MM-dd'), t.type, t.description, Number(t.amount)]),
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Laporan_Keuangan_${selectedYear}${selectedMonth !== null ? `_${FULL_MONTH_NAMES[selectedMonth]}` : ''}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 space-y-5 max-w-[1200px] mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {selectedMonth !== null && (
            <button
              onClick={handleBackToYearly}
              className="w-10 h-10 rounded-xl bg-surface border border-line flex items-center justify-center hover:bg-surface-hover hover:border-accent/40 transition-all"
            >
              <ArrowLeft className="w-4 h-4 text-text-primary" />
            </button>
          )}
          <h1 className="text-lg font-bold text-text-primary">
            {selectedMonth !== null ? `${FULL_MONTH_NAMES[selectedMonth]} ${selectedYear}` : 'Laporan Keuangan'}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportToPDF} className="btn btn-outline text-[12px] flex items-center gap-1.5 px-3 py-2">
            <FileText className="w-4 h-4" /> PDF
          </button>
          <button onClick={exportToExcel} className="btn btn-outline text-[12px] flex items-center gap-1.5 px-3 py-2">
            <Table className="w-4 h-4" /> Excel
          </button>
          <div className="relative" ref={monthPickerRef}>
            <button
              onClick={() => setIsMonthPickerOpen(!isMonthPickerOpen)}
              className="bg-surface border border-line px-4 py-2.5 rounded-2xl flex items-center gap-2 shadow-sm hover:border-accent/40 transition-all font-bold text-[13px] text-text-primary justify-between group h-[46px] min-w-[120px]"
            >
              <span>{selectedMonth !== null ? FULL_MONTH_NAMES[selectedMonth] : 'Pilih Bulan'}</span>
              <ChevronDown className={clsx("w-4 h-4 text-text-muted transition-transform duration-300", isMonthPickerOpen && "rotate-180")} />
            </button>

            {isMonthPickerOpen && (
              <div className="absolute top-full right-0 mt-2 z-30 w-[180px] bg-surface border border-line rounded-2xl shadow-2xl overflow-hidden animate-scale-in p-1">
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
              className="bg-surface border border-line px-5 py-2.5 rounded-2xl flex items-center gap-3 shadow-sm hover:border-accent/40 transition-all font-bold text-[13px] text-text-primary justify-between group h-[46px]"
            >
              <span>Tahun {selectedYear}</span>
              <ChevronDown className={clsx("w-4 h-4 text-text-muted transition-transform duration-300", isYearPickerOpen && "rotate-180")} />
            </button>

            {isYearPickerOpen && (
              <div className="absolute top-full right-0 mt-2 z-30 w-[160px] bg-surface border border-line rounded-2xl shadow-2xl overflow-hidden animate-scale-in p-1">
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
            <p className="text-[10px] text-text-muted font-medium uppercase tracking-wider mb-1">Sisa / Defisit</p>
            <p className={`text-[14px] md:text-[15px] font-bold ${summary.totalIncome - summary.totalExpense >= 0 ? 'text-success' : 'text-danger'}`}>
              {fmt(summary.totalIncome - summary.totalExpense)}
            </p>
            <div className="mt-1">
              <span className={clsx("text-[10px] font-medium", savingsRate >= 20 ? 'text-success' : savingsRate >= 10 ? 'text-warning' : 'text-danger')}>
                Tabung {savingsRate.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

<div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
          <div className="card p-3">
            <p className="text-[10px] text-text-muted font-medium">Rata-rata Masuk/Bulan</p>
            <p className="text-[12px] font-bold text-success">{fmt(summary.avgMonthlyIncome)}</p>
            {selectedMonth === null && <p className="text-[9px] text-text-muted">dari {summary.divisor} bulan berdata</p>}
          </div>
          <div className="card p-3">
            <p className="text-[10px] text-text-muted font-medium">Rata-rata Keluar/Bulan</p>
            <p className="text-[12px] font-bold text-danger">{fmt(summary.avgMonthlyExpense)}</p>
            {selectedMonth === null && <p className="text-[9px] text-text-muted">dari {summary.divisor} bulan berdata</p>}
          </div>
          <div className="card p-3">
            <p className="text-[10px] text-text-muted font-medium">Rata-rata Keluar/{selectedMonth !== null ? 'Bulan' : 'Tahun'}</p>
            <p className="text-[12px] font-bold text-danger">{fmt(summary.avgMonthlyExpense)}</p>
          </div>
          <div className="card p-3">
            <p className="text-[10px] text-text-muted font-medium">{selectedMonth !== null ? 'Bulan' : 'Bulan Terbaik'}</p>
            <p className="text-[12px] font-bold text-success">{summary.bestMonth?.name || '-'}</p>
          </div>
          <div className="card p-3">
            <p className="text-[10px] text-text-muted font-medium">Top Kategori</p>
            <p className="text-[12px] font-bold text-accent truncate">{summary.topExpenseCategory}</p>
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
            <p className="text-[10px] text-text-muted mb-4">Distribusi kemana uang Anda pergi dari total pemasukan</p>

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

                {cashFlow.remaining > 0 && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
                      <span className="text-[11px] font-bold text-success">3</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[11px] font-medium text-text-primary">Sisa (Belum Terpakai)</span>
                        <span className="text-[12px] font-bold text-success">{fmt(cashFlow.remaining)} <span className="text-[10px] font-normal text-text-muted">({cashFlow.remainingPercent.toFixed(1)}%)</span></span>
                      </div>
                      <div className="h-2 bg-surface-alt rounded-full overflow-hidden">
                        <div className="h-full bg-success/60 rounded-full transition-all duration-500" style={{ width: `${Math.min(cashFlow.remainingPercent, 100)}%` }} />
                      </div>
                    </div>
                  </div>
                )}

                {cashFlow.remaining < 0 && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-danger/10 flex items-center justify-center shrink-0">
                      <span className="text-[11px] font-bold text-danger">!</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[11px] text-danger font-medium">Defisit {fmt(Math.abs(cashFlow.remaining))} — Pengeluaran melebihi pemasukan</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-2 pt-3 border-t border-line">
                <div className="h-4 rounded-full overflow-hidden flex bg-surface-alt">
                  {cashFlow.expensePercent > 0 && (
                    <div className="h-full bg-danger transition-all duration-500" style={{ width: `${Math.min(cashFlow.expensePercent, 100)}%` }} title={`Pengeluaran: ${cashFlow.expensePercent.toFixed(1)}%`} />
                  )}
                  {cashFlow.savingPercent > 0 && (
                    <div className="h-full bg-accent transition-all duration-500" style={{ width: `${Math.min(cashFlow.savingPercent, 100)}%` }} title={`Tabungan: ${cashFlow.savingPercent.toFixed(1)}%`} />
                  )}
                  {cashFlow.remainingPercent > 0 && (
                    <div className="h-full bg-success/60 transition-all duration-500" style={{ width: `${Math.min(cashFlow.remainingPercent, 100)}%` }} title={`Sisa: ${cashFlow.remainingPercent.toFixed(1)}%`} />
                  )}
                </div>
                <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-danger" />
                    <span className="text-[10px] text-text-muted">Pengeluaran</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-accent" />
                    <span className="text-[10px] text-text-muted">Tabungan</span>
                  </div>
                  {cashFlow.remainingPercent > 0 && (
                    <div className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-success/60" />
                      <span className="text-[10px] text-text-muted">Sisa</span>
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
            <h3 className="text-[13px] font-semibold text-text-primary mb-1">Rincian per Tujuan Pengeluaran</h3>
            {selectedMonth !== null && (
              <p className="text-[10px] text-text-muted mb-3">Periode: {FULL_MONTH_NAMES[selectedMonth]} {selectedYear}</p>
            )}
            <div className="space-y-3">
              {expenseByPurpose.slice(0, 8).map((p, idx) => {
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
          </div>
        )}
      </div>
    </div>
  );
}
