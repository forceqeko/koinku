import { useState, useMemo, useRef, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, LineChart, Line } from 'recharts';
import { ChevronDown, FileText, Table, ArrowLeft } from 'lucide-react';
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
  const { transactions, categories, purposes } = useData();
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

  const filteredTx = useMemo(() => {
    if (selectedMonth === null) return yearTx;
    return yearTx.filter(t => new Date(t.date).getMonth() === selectedMonth);
  }, [yearTx, selectedMonth]);

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

    const divisor = selectedMonth !== null ? 1 : 12;
    const avgMonthlyIncome = totalIncome / divisor;
    const avgMonthlyExpense = totalExpense / divisor;
    const topExpenseCategory = expenseByCategory[0]?.name || '-';

    const monthDataForSummary = selectedMonth !== null
      ? [{ name: FULL_MONTH_NAMES[selectedMonth], Pemasukan: 0, Pengeluaran: 0, ...monthData.find(m => m.month === selectedMonth) }]
      : monthData;

    const bestMonth = monthDataForSummary.reduce((best, m) => (m.Pemasukan > best.Pemasukan ? m : best), monthDataForSummary[0] || { name: '-', Pemasukan: 0 });
    const worstMonth = monthDataForSummary.reduce((worst, m) => (m.Pengeluaran > worst.Pengeluaran ? m : worst), monthDataForSummary[0] || { name: '-', Pengeluaran: 0 });

    return { totalIncome, totalExpense, totalSaving, avgMonthlyIncome, avgMonthlyExpense, topExpenseCategory, bestMonth, worstMonth };
  }, [filteredTx, expenseByCategory, monthData, selectedMonth]);

  const totalExpense = expenseByCategory.reduce((a, b) => a + b.value, 0);

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
    <div className="p-4 md:p-6 pb-24 md:pb-6 space-y-5 max-w-[1200px] mx-auto animate-fade-in">
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
          </div>
          <div className="card p-4">
            <p className="text-[10px] text-text-muted font-medium uppercase tracking-wider mb-1">Total Pengeluaran</p>
            <p className="text-[14px] md:text-[15px] font-bold text-danger">{fmt(summary.totalExpense)}</p>
          </div>
          <div className="card p-4">
            <p className="text-[10px] text-text-muted font-medium uppercase tracking-wider mb-1">Total Tabungan</p>
            <p className="text-[14px] md:text-[15px] font-bold text-accent">{fmt(summary.totalSaving)}</p>
          </div>
          <div className="card p-4">
            <p className="text-[10px] text-text-muted font-medium uppercase tracking-wider mb-1">Sisa / Defisit</p>
            <p className={`text-[14px] md:text-[15px] font-bold ${summary.totalIncome - summary.totalExpense >= 0 ? 'text-success' : 'text-danger'}`}>
              {fmt(summary.totalIncome - summary.totalExpense)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
          <div className="card p-3">
            <p className="text-[10px] text-text-muted font-medium">Rata-rata Masuk/{selectedMonth !== null ? 'Bulan' : 'Tahun'}</p>
            <p className="text-[12px] font-bold text-success">{fmt(summary.avgMonthlyIncome)}</p>
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-5">
          <div className="card p-5">
            <h3 className="text-[13px] font-semibold text-text-primary mb-1">
              {selectedMonth !== null ? 'Tren Bulanan' : 'Tren Bulanan'}
            </h3>
            {selectedMonth !== null && (
              <p className="text-[10px] text-text-muted mb-3">Melihat databulan {FULL_MONTH_NAMES[selectedMonth]} saja</p>
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
                      <Tooltip formatter={(v: number) => fmt(v)} />
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ marginBottom: 25 }}>
                    <div className="text-center">
                      <p className="text-[10px] text-text-muted">Total</p>
                      <p className="text-[13px] font-semibold text-text-primary">{fmt(totalExpense)}</p>
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
