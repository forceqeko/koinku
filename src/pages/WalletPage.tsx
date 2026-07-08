import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { 
  Wallet, 
  Bank, 
  DeviceMobile, 
  Plus, 
  Eye, 
  EyeSlash 
} from '@phosphor-icons/react';
import { fmt } from '../lib/utils';

export default function WalletPage() {
  const { accounts } = useData();
  const navigate = useNavigate();
  const [showBalance, setShowBalance] = useState(() => {
    const saved = localStorage.getItem('showBalance');
    return saved !== null ? JSON.parse(saved) : true;
  });

  const toggleBalance = () => {
    const newValue = !showBalance;
    setShowBalance(newValue);
    localStorage.setItem('showBalance', JSON.stringify(newValue));
  };

  const totalBalance = accounts.reduce((acc, curr) => acc + Number(curr.balance), 0);

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Wallet Summary Card */}
      <div className="card p-6 bg-accent border-accent text-white shadow-lg relative overflow-hidden">
        {/* Abstract background shapes */}
        <div className="absolute right-0 top-0 w-48 h-48 bg-white/10 rounded-full blur-2xl -mr-12 -mt-12 pointer-events-none"></div>
        <div className="absolute left-1/4 bottom-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -ml-16 -mb-16 pointer-events-none"></div>
        
        <div className="relative z-10 space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-8 h-6 rounded bg-white/20 border border-white/30 shrink-0"></div>
              <span className="text-[10px] md:text-[11px] font-bold tracking-wider text-white/80 uppercase">Total Saldo Wallet</span>
            </div>
            <button
              onClick={toggleBalance}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-all text-white/90"
              aria-label={showBalance ? "Sembunyikan saldo" : "Tampilkan saldo"}
            >
              {showBalance ? <EyeSlash size={16} /> : <Eye size={16} />}
            </button>
          </div>
          
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white my-3">
            {showBalance ? fmt(totalBalance) : '••••••'}
          </h2>
          
          <div className="flex items-center justify-between pt-2 text-[11px] text-white/90 font-semibold">
            <span className="bg-white/20 px-3 py-1 rounded-full font-bold text-[10px] text-white">{accounts.length} Akun Terdaftar</span>
            <span>IDR Currency</span>
          </div>
        </div>
      </div>

      {/* Grid Accounts */}
      <div className="card p-5 shadow-sm border-line bg-surface space-y-5">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <h3 className="font-bold text-[15px] text-text-primary flex items-center gap-2">
            <Wallet size={18} weight="duotone" className="text-accent" /> Daftar Akun Anda
          </h3>
          <button 
            onClick={() => navigate('/settings')}
            className="text-[12px] font-bold text-accent hover:text-accent-hover transition-colors flex items-center gap-1"
          >
            <Plus size={14} weight="bold" /> Kelola Akun
          </button>
        </div>
        
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2 sm:gap-3">
          {accounts.map(account => {
            const Icon = account.type === 'bank' ? Bank : account.type === 'ewallet' ? DeviceMobile : Wallet;
            return (
              <div 
                key={account.id} 
                className="bg-surface-alt/30 border border-line p-2.5 sm:p-3.5 rounded-2xl shadow-sm hover:border-accent/40 hover:shadow-md transition-all group flex flex-col justify-between min-h-[85px] sm:min-h-[90px]"
              >
                <div className="flex items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-[6px] sm:rounded-lg bg-surface flex items-center justify-center shrink-0 border border-line">
                    {account.icon_url ? (
                      <img src={account.icon_url} alt={account.name} className="w-3.5 h-3.5 sm:w-4 sm:h-4 object-contain" />
                    ) : (
                      <Icon size={12} className="text-text-muted group-hover:text-accent transition-colors sm:text-[14px]" />
                    )}
                  </div>
                  <span className="font-bold text-[10px] sm:text-[12px] text-text-primary truncate leading-tight">{account.name}</span>
                </div>
                <div>
                  <p className="text-[8px] sm:text-[9px] text-text-muted font-bold uppercase tracking-wider opacity-85 leading-none">Saldo</p>
                  <p className="font-bold text-[11px] sm:text-[13px] text-text-primary mt-0.5 sm:mt-1 truncate">
                    {showBalance ? new Intl.NumberFormat('id-ID', { minimumFractionDigits: 0 }).format(Number(account.balance)) : '••••'}
                  </p>
                </div>
              </div>
            );
          })}
          
          {/* Add New Account Card */}
          <button 
            onClick={() => navigate('/settings')} 
            className="bg-surface-alt/10 flex flex-col items-center justify-center p-2.5 sm:p-3.5 rounded-2xl border-2 border-dashed border-line hover:border-accent/50 hover:bg-accent/5 transition-all min-h-[85px] sm:min-h-[90px] group"
          >
            <div className="flex flex-col items-center gap-1 sm:gap-1.5 text-text-muted group-hover:text-accent transition-colors">
              <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-surface border border-line flex items-center justify-center">
                <Plus size={12} weight="bold" className="sm:text-[14px]" />
              </div>
              <span className="font-bold text-[9px] sm:text-[11px]">Tambah Akun</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
