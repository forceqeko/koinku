import { useState, useMemo, useRef, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, LineChart, Line } from 'recharts';
import { ChevronDown, FileText, Table } from 'lucide-react';
import clsx from 'clsx';
import { useData } from '../context/DataContext';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { fmt } from '../lib/utils';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

export default function Report() {
  const { transactions, categories, purposes } = useData();
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isYearPickerOpen, setIsYearPickerOpen] = useState(false);
  const yearPickerRef = useRef<HTMLDivElement>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (yearPickerRef.current && !yearPickerRef.current.contains(event.target as Node)) {
        setIsYearPickerOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  const monthData = useMemo(() => {
    const result = MONTH_NAMES.map((name, idx) => {
      const monthTx = yearTx.filter(t => new Date(t.date).getMonth() === idx);
      const income = monthTx
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + Number(t.amount), 0);
      const expense = monthTx.reduce((sum, t) => {
        if (t.type === 'expense' || t.type === 'bill') return sum + Number(t.amount);
        if ((t.type === 'transfer' || t.type === 'saving') && t.admin_fee) return sum + Number(t.admin_fee);
        return sum;
      }, 0);
      return { name, Pemasukan: income, Pengeluaran: expense, month: idx + 1 };
    });

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    const lastMonthWithData = result.reduce((last, m, idx) => {
      if (m.Pemasukan > 0 || m.Pengeluaran > 0) return idx;
      return last;
    }, -1);
    const endMonth = selectedYear === currentYear ? Math.max(currentMonth, lastMonthWithData) : lastMonthWithData;
    return result.slice(0, endMonth + 1);
  }, [yearTx, selectedYear]);

  const expenseByCategory = useMemo(() => {
    const categoryMap = new Map<string, number>();
    yearTx.forEach(t => {
      if (t.type === 'expense' && t.category_id) {
        const cat = categories.find((c: any) => c.id === t.category_id);
        const catName = cat?.name || 'Lainnya';
        categoryMap.set(catName, (categoryMap.get(catName) || 0) + Number(t.amount));
      }
      if ((t.type === 'transfer' || t.type === 'saving') && Number(t.admin_fee) > 0) {
        categoryMap.set('Biaya Admin', (categoryMap.get('Biaya Admin') || 0) + Number(t.admin_fee));
      }
    });
    return Array.from(categoryMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [yearTx, categories]);

  const expenseByPurpose = useMemo(() => {
    const purposeMap = new Map<string, number>();
    yearTx.forEach(t => {
      if (t.type === 'expense' && t.purpose_id) {
        const pur = purposes.find((p: any) => p.id === t.purpose_id);
        const purName = pur?.name || 'Lainnya';
        purposeMap.set(purName, (purposeMap.get(purName) || 0) + Number(t.amount));
      }
    });
    return Array.from(purposeMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [yearTx, purposes]);

  const yearlySummary = useMemo(() => {
    const totalIncome = yearTx.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
    const totalExpense = yearTx.reduce((sum, t) => {
      if (t.type === 'expense' || t.type === 'bill') return sum + Number(t.amount);
      if ((t.type === 'transfer' || t.type === 'saving') && t.admin_fee) return sum + Number(t.admin_fee);
      return sum;
    }, 0);
    const totalSaving = yearTx.filter(t => t.type === 'saving').reduce((sum, t) => sum + Number(t.amount), 0);
    const avgMonthlyIncome = totalIncome / 12;
    const avgMonthlyExpense = totalExpense / 12;
    const topExpenseCategory = expenseByCategory[0]?.name || '-';
    const bestMonth = monthData.reduce((best, m) => (m.Pemasukan > best.Pemasukan ? m : best), monthData[0] || { name: '-', Pemasukan: 0 });
    const worstMonth = monthData.reduce((worst, m) => (m.Pengeluaran > worst.Pengeluaran ? m : worst), monthData[0] || { name: '-', Pengeluaran: 0 });

    return { totalIncome, totalExpense, totalSaving, avgMonthlyIncome, avgMonthlyExpense, topExpenseCategory, bestMonth, worstMonth };
  }, [yearTx, expenseByCategory, monthData]);

  const totalExpense = expenseByCategory.reduce((a, b) => a + b.value, 0);

  const exportToPDF = () => {
    const doc = new jsPDF() as any;
    const pageWidth = doc.internal.pageSize.getWidth();
    
    doc.setFontSize(18);
    doc.setTextColor(40);
    doc.text('Laporan Keuangan', pageWidth / 2, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`Tahun ${selectedYear}`, pageWidth / 2, 28, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Dicetak: ${format(new Date(), 'dd MMMM yyyy', { locale: id })}`, pageWidth / 2, 34, { align: 'center' });
    doc.setDrawColor(200);
    doc.line(20, 40, pageWidth - 20, 40);

    doc.setFontSize(14);
    doc.text('Ringkasan Tahunan', 20, 50);
    autoTable(doc, {
      startY: 55,
      head: [['Deskripsi', 'Jumlah']],
      body: [
        ['Total Pemasukan', fmt(yearlySummary.totalIncome)],
        ['Total Pengeluaran', fmt(yearlySummary.totalExpense)],
        ['Total Tabungan', fmt(yearlySummary.totalSaving)],
        ['Rata-rata Pemasukan/Bulan', fmt(yearlySummary.avgMonthlyIncome)],
        ['Rata-rata Pengeluaran/Bulan', fmt(yearlySummary.avgMonthlyExpense)],
        ['Bulan Terbaik', `${yearlySummary.bestMonth.name} (${fmt(yearlySummary.bestMonth.Pemasukan)})`],
        ['Pengeluaran Tertinggi', `${yearlySummary.worstMonth.name} (${fmt(yearlySummary.worstMonth.Pengeluaran)})`],
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

    doc.setFontSize(14);
    doc.text('Detail Transaksi', 20, doc.lastAutoTable.finalY + 15);
    const txData = yearTx.slice(0, 50).map(t => [
      format(new Date(t.date), 'dd/MM/yyyy'),
      t.type.toUpperCase(),
      t.description,
      fmt(Number(t.amount)),
    ]);
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 20,
      head: [['Tanggal', 'Tipe', 'Deskripsi', 'Jumlah']],
      body: txData,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
      didDrawPage: (data) => {
        doc.setFontSize(8);
        doc.text(`Halaman ${data.pageNumber}`, pageWidth - 25, doc.internal.pageSize.getHeight() - 10);
      },
    });

    doc.save(`Laporan_Keuangan_${selectedYear}.pdf`);
  };

  const exportToExcel = () => {
    const csvContent = [
      ['LAPORAN KEUANGAN', selectedYear],
      [''],
      ['RINGKASAN TAHUNAN'],
      ['Deskripsi', 'Jumlah'],
      ['Total Pemasukan', yearlySummary.totalIncome],
      ['Total Pengeluaran', yearlySummary.totalExpense],
      ['Total Tabungan', yearlySummary.totalSaving],
      ['Rata-rata Pemasukan/Bulan', yearlySummary.avgMonthlyIncome],
      ['Rata-rata Pengeluaran/Bulan', yearlySummary.avgMonthlyExpense],
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
      ...yearTx.map(t => [format(new Date(t.date), 'yyyy-MM-dd'), t.type, t.description, Number(t.amount)]),
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Laporan_Keuangan_${selectedYear}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 space-y-5 max-w-[1200px] mx-auto animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-text-primary">Laporan Keuangan</h1>
        <div className="flex items-center gap-2">
          <button onClick={exportToPDF} className="btn btn-outline text-[12px] flex items-center gap-1.5 px-3 py-2">
            <FileText className="w-4 h-4" /> PDF
          </button>
          <button onClick={exportToExcel} className="btn btn-outline text-[12px] flex items-center gap-1.5 px-3 py-2">
            <Table className="w-4 h-4" /> Excel
          </button>
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
      </div>

      <div ref={reportRef}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="card p-4">
            <p className="text-[10px] text-text-muted font-medium uppercase tracking-wider mb-1">Total Pemasukan</p>
            <p className="text-[14px] md:text-[15px] font-bold text-success">{fmt(yearlySummary.totalIncome)}</p>
          </div>
          <div className="card p-4">
            <p className="text-[10px] text-text-muted font-medium uppercase tracking-wider mb-1">Total Pengeluaran</p>
            <p className="text-[14px] md:text-[15px] font-bold text-danger">{fmt(yearlySummary.totalExpense)}</p>
          </div>
          <div className="card p-4">
            <p className="text-[10px] text-text-muted font-medium uppercase tracking-wider mb-1">Total Tabungan</p>
            <p className="text-[14px] md:text-[15px] font-bold text-accent">{fmt(yearlySummary.totalSaving)}</p>
          </div>
          <div className="card p-4">
            <p className="text-[10px] text-text-muted font-medium uppercase tracking-wider mb-1">Sisa / Defisit</p>
            <p className={`text-[14px] md:text-[15px] font-bold ${yearlySummary.totalIncome - yearlySummary.totalExpense >= 0 ? 'text-success' : 'text-danger'}`}>
              {fmt(yearlySummary.totalIncome - yearlySummary.totalExpense)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
          <div className="card p-3">
            <p className="text-[10px] text-text-muted font-medium">Rata-rata Masuk/Bulan</p>
            <p className="text-[12px] font-bold text-success">{fmt(yearlySummary.avgMonthlyIncome)}</p>
          </div>
          <div className="card p-3">
            <p className="text-[10px] text-text-muted font-medium">Rata-rata Keluar/Bulan</p>
            <p className="text-[12px] font-bold text-danger">{fmt(yearlySummary.avgMonthlyExpense)}</p>
          </div>
          <div className="card p-3">
            <p className="text-[10px] text-text-muted font-medium">Bulan Terbaik</p>
            <p className="text-[12px] font-bold text-success">{yearlySummary.bestMonth?.name || '-'}</p>
          </div>
          <div className="card p-3">
            <p className="text-[10px] text-text-muted font-medium">Top Kategori</p>
            <p className="text-[12px] font-bold text-accent truncate">{yearlySummary.topExpenseCategory}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-5">
          <div className="card p-5">
            <h3 className="text-[13px] font-semibold text-text-primary mb-5">Tren Pemasukan vs Pengeluaran</h3>
            <div className="h-64">
              {monthData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthData} margin={{ top: 5, right: 5, left: -15, bottom: 0 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} tickLine={false} axisLine={false} />
                    <YAxis tickFormatter={v => `${(v / 1000000).toFixed(1)}M`} tick={{ fontSize: 12, fill: 'var(--color-text-muted)' }} tickLine={false} axisLine={false} />
                    <Tooltip formatter={(v: number) => fmt(v)} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px' }} />
                    <Line type="monotone" dataKey="Pemasukan" stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="Pengeluaran" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-text-muted text-sm">Belum ada data.</div>
              )}
            </div>
          </div>

          <div className="card p-5">
            <h3 className="text-[13px] font-semibold text-text-primary mb-5">Distribusi Pengeluaran</h3>
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
            <h3 className="text-[13px] font-semibold text-text-primary mb-5">Rincian per Tujuan Pengeluaran</h3>
            <div className="space-y-3">
              {expenseByPurpose.slice(0, 8).map((p, idx) => {
                const percent = (p.value / totalExpense) * 100;
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
