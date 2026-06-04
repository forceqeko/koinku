import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Check, Trash2, Calendar, TrendingUp, TrendingDown, Info, Tag, BookOpen, ToggleLeft, ToggleRight, Layers, ArrowLeft, AlertTriangle } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { formatThousands, parseThousands, fmt } from '../lib/utils';
import clsx from 'clsx';
import type { InvestmentPortfolio } from '../types';

const formatDateSafe = (dateStr: string | null | undefined) => {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  try {
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch (e) {
    return dateStr;
  }
};

interface InvestmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'add' | 'update_value' | 'history' | 'edit' | 'close';
  portfolio?: InvestmentPortfolio | null;
}

export default function InvestmentModal({ isOpen, onClose, mode: initialMode, portfolio }: InvestmentModalProps) {
  const { user } = useAuth();
  const { wishlists, portfolioWishlists, investmentReturns, transactions, refresh, accounts, categories, purposes, sources } = useData();

  // Modal active mode (can switch between history and edit inside the modal)
  const [activeMode, setActiveMode] = useState<'add' | 'update_value' | 'history' | 'edit' | 'close'>(initialMode);

  // Capital Top-up States for Update Value mode
  const [isTopUp, setIsTopUp] = useState(false);
  const [topUpAmountInput, setTopUpAmountInput] = useState('');

  // Sub-tab state for History mode ('performa' or 'modal')
  const [historyTab, setHistoryTab] = useState<'performa' | 'modal'>('performa');

  // Form states
  const [name, setName] = useState('');
  const [instrumentType, setInstrumentType] = useState('');
  const [notes, setNotes] = useState('');
  const [capitalSource, setCapitalSource] = useState<'manual' | 'wishlist'>('manual');
  const [initialCapitalInput, setInitialCapitalInput] = useState('');
  const [currentValueInput, setCurrentValueInput] = useState('');
  const [selectedWishlistIds, setSelectedWishlistIds] = useState<string[]>([]);
  const [isActive, setIsActive] = useState(true);

  // Start date state for new portfolio
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);

  // Update return value states
  const [updateDate, setUpdateDate] = useState(new Date().toISOString().split('T')[0]);
  const [newValueInput, setNewValueInput] = useState('');
  const [updateNotes, setUpdateNotes] = useState('');

  // Liquidation wallet state for Close mode
  const [selectedLiquidationWalletId, setSelectedLiquidationWalletId] = useState('');

  // General states
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Reset or initialize form when portfolio or activeMode changes
  useEffect(() => {
    if (isOpen) {
      setErrorMsg(null);
      setActiveMode(initialMode);
      
      if (initialMode === 'add') {
        setName('');
        setInstrumentType('');
        setNotes('');
        setCapitalSource('manual');
        setInitialCapitalInput('');
        setCurrentValueInput('');
        setSelectedWishlistIds([]);
        setIsActive(true);
        setStartDate(new Date().toISOString().split('T')[0]);
        setIsTopUp(false);
        setTopUpAmountInput('');
        setHistoryTab('performa');
        setSelectedLiquidationWalletId('');
      } else if (portfolio) {
        setName(portfolio.name || '');
        setInstrumentType(portfolio.instrument_type || '');
        setNotes(portfolio.notes || '');
        setIsActive(portfolio.is_active ?? true);

        // Find linked wishlists
        const linked = (portfolioWishlists || [])
          .filter(pw => pw && pw.portfolio_id === portfolio.id)
          .map(pw => pw.wishlist_id);
        
        setSelectedWishlistIds(linked);
        setCapitalSource(linked.length > 0 ? 'wishlist' : 'manual');
        setInitialCapitalInput(formatThousands((portfolio.initial_capital ?? 0).toString()));
        setCurrentValueInput(formatThousands((portfolio.current_value ?? 0).toString()));

        // Prepare default update value form
        setUpdateDate(new Date().toISOString().split('T')[0]);
        setNewValueInput(formatThousands((portfolio.current_value ?? 0).toString()));
        setUpdateNotes('');
        setIsTopUp(false);
        setTopUpAmountInput('');
        setHistoryTab('performa');
        setSelectedLiquidationWalletId(portfolio.liquidation_account_id || '');

        // Find initial return date
        const initialReturn = (investmentReturns || [])
          .filter(r => r && r.portfolio_id === portfolio.id)
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || (a.created_at ? new Date(a.created_at).getTime() : 0) - (b.created_at ? new Date(b.created_at).getTime() : 0));
        
        if (initialReturn.length > 0) {
          setStartDate(initialReturn[0].date);
        } else {
          setStartDate(new Date().toISOString().split('T')[0]);
        }
      }
    }
  }, [isOpen, initialMode, portfolio, portfolioWishlists]);

  // Handle switching to a different mode inside modal (e.g. going from history/edit back and forth)
  const switchMode = (newMode: 'add' | 'update_value' | 'history' | 'edit' | 'close') => {
    setErrorMsg(null);
    setActiveMode(newMode);
  };



  // Calculate dynamic initial capital from selected wishlists
  const calculatedWishlistCapital = (selectedWishlistIds || []).reduce((sum, id) => {
    const wl = (wishlists || []).find(w => w && w.id === id);
    return sum + (wl ? (wl.current_amount ?? 0) : 0);
  }, 0);

  // Find linked wishlists for current portfolio to detect capital source wallet
  const linkedWishlistIdsForWallet = useMemo(() => {
    if (!portfolio) return [];
    return (portfolioWishlists || [])
      .filter(pw => pw && pw.portfolio_id === portfolio.id)
      .map(pw => pw.wishlist_id);
  }, [portfolio, portfolioWishlists]);

  // Find latest saving transaction to get wallet ID
  const latestSaving = useMemo(() => {
    if (!portfolio || linkedWishlistIdsForWallet.length === 0) return null;
    return (transactions || [])
      .filter(t => t.type === 'saving' 
        && t.wishlist_id 
        && linkedWishlistIdsForWallet.includes(t.wishlist_id) 
        && !t.deleted_at)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || (b.created_at ? new Date(b.created_at).getTime() : 0) - (a.created_at ? new Date(a.created_at).getTime() : 0))[0];
  }, [portfolio, linkedWishlistIdsForWallet, transactions]);

  const sourceWalletId = latestSaving?.to_account_id || '';
  const sourceWallet = useMemo(() => {
    return (accounts || []).find(a => a.id === sourceWalletId);
  }, [accounts, sourceWalletId]);

  // Handle toggling wishlist selection
  const handleToggleWishlist = (id: string) => {
    setSelectedWishlistIds(prev => {
      const isSelected = prev.includes(id);
      let updated;
      if (isSelected) {
        updated = prev.filter(wId => wId !== id);
      } else {
        updated = [...prev, id];
      }
      
      // Auto update current value input if we are adding a new portfolio and linking a wishlist
      if (activeMode === 'add') {
        const nextCapital = (updated || []).reduce((sum, wId) => {
          const wl = (wishlists || []).find(w => w && w.id === wId);
          return sum + (wl ? (wl.current_amount ?? 0) : 0);
        }, 0);
        setCurrentValueInput(formatThousands((nextCapital ?? 0).toString()));
      }
      
      return updated;
    });
  };

  // Submit operations
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      if (activeMode === 'add') {
        if (!name.trim()) throw new Error('Nama portofolio wajib diisi');
        if (!instrumentType.trim()) throw new Error('Tipe instrumen wajib diisi');
        
        const cap = capitalSource === 'manual' 
          ? Number(parseThousands(initialCapitalInput)) 
          : calculatedWishlistCapital;
          
        const curVal = Number(parseThousands(currentValueInput));
        if (isNaN(cap) || cap < 0) throw new Error('Modal awal tidak valid');
        if (isNaN(curVal) || curVal < 0) throw new Error('Nilai saat ini tidak valid');

        // 1. Insert portfolio
        const { data: newPort, error: portErr } = await supabase
          .from('investment_portfolios')
          .insert({
            user_id: user.id,
            name: name.trim(),
            instrument_type: instrumentType.trim(),
            initial_capital: cap,
            current_value: curVal,
            notes: notes.trim() || null,
            is_active: true
          })
          .select()
          .single();

        if (portErr) throw portErr;

        // 2. Insert wishlist links if using wishlist capital
        if (capitalSource === 'wishlist' && selectedWishlistIds.length > 0) {
          const wshLinks = selectedWishlistIds.map(wId => ({
            portfolio_id: newPort.id,
            wishlist_id: wId
          }));
          const { error: wshErr } = await supabase
            .from('investment_portfolio_wishlists')
            .insert(wshLinks);
          if (wshErr) throw wshErr;
        }

        // 3. Insert initial investment return entry
        const { error: retErr } = await supabase
          .from('investment_returns')
          .insert({
            user_id: user.id,
            portfolio_id: newPort.id,
            date: startDate,
            value_at_date: curVal,
            notes: 'Modal awal'
          });
        if (retErr) throw retErr;

        await refresh();
        onClose();
      } 
      
      else if (activeMode === 'update_value' && portfolio) {
        const val = Number(parseThousands(newValueInput));
        if (isNaN(val) || val < 0) throw new Error('Nilai investasi tidak valid');
        if (!updateDate) throw new Error('Tanggal wajib dipilih');

        if (isTopUp) {
          const topUpAmt = Number(parseThousands(topUpAmountInput));
          if (isNaN(topUpAmt) || topUpAmt <= 0) throw new Error('Jumlah setoran modal tidak valid');

          // Update both initial_capital and current_value in investment_portfolios
          const { error: portUpdErr } = await supabase
            .from('investment_portfolios')
            .update({ 
              initial_capital: portfolio.initial_capital + topUpAmt,
              current_value: val 
            })
            .eq('id', portfolio.id);
          if (portUpdErr) throw portUpdErr;

          // Insert into investment_returns with prefixed notes
          const { error: retUpdErr } = await supabase
            .from('investment_returns')
            .insert({
              user_id: user.id,
              portfolio_id: portfolio.id,
              date: updateDate,
              value_at_date: val,
              notes: `[TOPUP:${topUpAmt}] ${updateNotes.trim() || 'Setoran modal tambahan'}`
            });
          if (retUpdErr) throw retUpdErr;
        } else {
          // Normal Value Update
          const { error: portUpdErr } = await supabase
            .from('investment_portfolios')
            .update({ current_value: val })
            .eq('id', portfolio.id);
          if (portUpdErr) throw portUpdErr;

          // Insert into investment_returns
          const { error: retUpdErr } = await supabase
            .from('investment_returns')
            .insert({
              user_id: user.id,
              portfolio_id: portfolio.id,
              date: updateDate,
              value_at_date: val,
              notes: updateNotes.trim() || null
            });
          if (retUpdErr) throw retUpdErr;
        }

        await refresh();
        onClose();
      } 
      
      else if (activeMode === 'edit' && portfolio) {
        if (!name.trim()) throw new Error('Nama portofolio wajib diisi');
        if (!instrumentType.trim()) throw new Error('Tipe instrumen wajib diisi');

        // 1. Update portfolio row
        const { error: portEditErr } = await supabase
          .from('investment_portfolios')
          .update({
            name: name.trim(),
            instrument_type: instrumentType.trim(),
            notes: notes.trim() || null,
            is_active: isActive
          })
          .eq('id', portfolio.id);
        if (portEditErr) throw portEditErr;

        // 2. Re-sync wishlist links
        const { error: delLinksErr } = await supabase
          .from('investment_portfolio_wishlists')
          .delete()
          .eq('portfolio_id', portfolio.id);
        if (delLinksErr) throw delLinksErr;

        if (capitalSource === 'wishlist' && selectedWishlistIds.length > 0) {
          const wshLinks = selectedWishlistIds.map(wId => ({
            portfolio_id: portfolio.id,
            wishlist_id: wId
          }));
          const { error: wshErr } = await supabase
            .from('investment_portfolio_wishlists')
            .insert(wshLinks);
          if (wshErr) throw wshErr;
        }

        // 3. Update initial return date
        const initialReturn = investmentReturns
          .filter(r => r.portfolio_id === portfolio.id)
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || (a.created_at ? new Date(a.created_at).getTime() : 0) - (b.created_at ? new Date(b.created_at).getTime() : 0));

        if (initialReturn.length > 0) {
          const { error: updateDateErr } = await supabase
            .from('investment_returns')
            .update({ date: startDate })
            .eq('id', initialReturn[0].id);
          if (updateDateErr) throw updateDateErr;
        }

        await refresh();
        onClose();
      } 
      
      else if (activeMode === 'close' && portfolio) {
        // Determine wallet target/source
        let walletId = '';
        if (capitalSource === 'wishlist') {
          walletId = sourceWalletId || selectedLiquidationWalletId;
          if (!walletId) {
            throw new Error('Dompet sumber tabungan tidak terdeteksi. Silakan pilih dompet tujuan penarikan.');
          }
        } else {
          walletId = selectedLiquidationWalletId;
          if (!walletId) {
            throw new Error('Silakan pilih dompet tujuan penarikan.');
          }
        }

        const effectiveCapital = currentPortfolioEffectiveCapital;
        const curVal = portfolio.current_value;
        const retVal = curVal - effectiveCapital;

        if (capitalSource === 'wishlist') {
          if (retVal > 0) {
            // Get or create income source "Investasi"
            let investasiSourceId = '';
            let sourceObj = (sources || []).find(s => s && s.name.toLowerCase() === 'investasi');
            if (!sourceObj) {
              const { data: newSrc, error: srcErr } = await supabase
                .from('income_sources')
                .insert({ user_id: user.id, name: 'Investasi' })
                .select()
                .single();
              if (srcErr) throw srcErr;
              investasiSourceId = newSrc.id;
            } else {
              investasiSourceId = sourceObj.id;
            }

            // Create income transaction
            const { error: txErr } = await supabase.rpc('create_transaction_atomic', {
              payload: {
                type: 'income',
                to_account_id: walletId,
                source_id: investasiSourceId,
                amount: retVal,
                description: `Keuntungan Likuidasi Investasi: ${portfolio.name}`,
                date: new Date().toISOString().split('T')[0]
              }
            });
            if (txErr) throw txErr;
          } 
          
          else if (retVal < 0) {
            // Get or create expense category "Investasi"
            let investasiCategoryId = '';
            let categoryObj = (categories || []).find(c => c && c.name.toLowerCase() === 'investasi');
            if (!categoryObj) {
              const { data: newCat, error: catErr } = await supabase
                .from('expense_categories')
                .insert({ user_id: user.id, name: 'Investasi' })
                .select()
                .single();
              if (catErr) throw catErr;
              investasiCategoryId = newCat.id;
            } else {
              investasiCategoryId = categoryObj.id;
            }

            // Get or create expense purpose "Kerugian Investasi"
            let kerugianPurposeId = '';
            let purposeObj = (purposes || []).find(p => p && p.name.toLowerCase() === 'kerugian investasi' && p.category_id === investasiCategoryId);
            if (!purposeObj) {
              const { data: newPur, error: purErr } = await supabase
                .from('expense_purposes')
                .insert({ user_id: user.id, category_id: investasiCategoryId, name: 'Kerugian Investasi' })
                .select()
                .single();
              if (purErr) throw purErr;
              kerugianPurposeId = newPur.id;
            } else {
              kerugianPurposeId = purposeObj.id;
            }

            // Reduce wishlists amount proportionally
            const linkedWishlists = (portfolioWishlists || [])
              .filter(pw => pw && pw.portfolio_id === portfolio.id)
              .map(pw => wishlists.find(w => w && w.id === pw.wishlist_id))
              .filter((w): w is NonNullable<typeof w> => !!w);

            const loss = Math.abs(retVal);
            const totalCapital = linkedWishlists.reduce((sum, w) => sum + (w.current_amount || 0), 0);

            for (const w of linkedWishlists) {
              const portion = totalCapital > 0 ? (w.current_amount || 0) / totalCapital : 0;
              const wlLoss = Math.round(portion * loss);
              const nextAmt = Math.max(0, (w.current_amount || 0) - wlLoss);

              const { error: wlUpdErr } = await supabase
                .from('wishlists')
                .update({ current_amount: nextAmt })
                .eq('id', w.id);
              if (wlUpdErr) throw wlUpdErr;
            }

            // Create expense transaction
            const { error: txErr } = await supabase.rpc('create_transaction_atomic', {
              payload: {
                type: 'expense',
                from_account_id: walletId,
                category_id: investasiCategoryId,
                purpose_id: kerugianPurposeId,
                amount: loss,
                description: `Kerugian Likuidasi Investasi: ${portfolio.name}`,
                date: new Date().toISOString().split('T')[0]
              }
            });
            if (txErr) throw txErr;
          }
        } 
        
        else {
          // Manual portfolio
          if (curVal > 0) {
            // Get or create income source "Investasi"
            let investasiSourceId = '';
            let sourceObj = (sources || []).find(s => s && s.name.toLowerCase() === 'investasi');
            if (!sourceObj) {
              const { data: newSrc, error: srcErr } = await supabase
                .from('income_sources')
                .insert({ user_id: user.id, name: 'Investasi' })
                .select()
                .single();
              if (srcErr) throw srcErr;
              investasiSourceId = newSrc.id;
            } else {
              investasiSourceId = sourceObj.id;
            }

            // Create income transaction
            const { error: txErr } = await supabase.rpc('create_transaction_atomic', {
              payload: {
                type: 'income',
                to_account_id: walletId,
                source_id: investasiSourceId,
                amount: curVal,
                description: `Likuidasi Investasi: ${portfolio.name}`,
                date: new Date().toISOString().split('T')[0]
              }
            });
            if (txErr) throw txErr;
          }
        }

        // Insert investment_returns: value_at_date = 0, date = today
        const todayStr = new Date().toISOString().split('T')[0];
        const { error: retUpdErr } = await supabase
          .from('investment_returns')
          .insert({
            user_id: user.id,
            portfolio_id: portfolio.id,
            date: todayStr,
            value_at_date: 0,
            notes: updateNotes.trim() || 'Portofolio ditutup/likuidasi'
          });
        if (retUpdErr) throw retUpdErr;

        // Update investment_portfolios
        const { error: portUpdErr } = await supabase
          .from('investment_portfolios')
          .update({
            is_active: false,
            current_value: 0,
            closed_at: new Date().toISOString(),
            closed_value: curVal,
            liquidation_account_id: walletId
          })
          .eq('id', portfolio.id);
        if (portUpdErr) throw portUpdErr;

        await refresh();
        onClose();
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Terjadi kesalahan sistem');
    } finally {
      setLoading(false);
    }
  };

  // Handle deleting a portfolio with confirmation
  const handleDeletePortfolio = async () => {
    if (!portfolio || !user) return;
    const confirmDelete = window.confirm(
      `Apakah Anda yakin ingin menghapus portofolio "${portfolio.name}"?\nTindakan ini juga akan menghapus riwayat nilai investasinya.`
    );
    if (!confirmDelete) return;

    setLoading(true);
    setErrorMsg(null);
    try {
      const { error: delErr } = await supabase
        .from('investment_portfolios')
        .delete()
        .eq('id', portfolio.id);
      if (delErr) throw delErr;

      await refresh();
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Gagal menghapus portofolio');
    } finally {
      setLoading(false);
    }
  };

  // Handle deleting an individual return history log
  const handleDeleteReturnLog = async (returnId: string) => {
    if (!portfolio) return;
    const confirmDelete = window.confirm('Hapus log nilai investasi ini dari riwayat?');
    if (!confirmDelete) return;

    setLoading(true);
    setErrorMsg(null);
    try {
      // 1. Delete log
      const { error: delErr } = await supabase
        .from('investment_returns')
        .delete()
        .eq('id', returnId);
      if (delErr) throw delErr;

      // 2. Fetch remaining return entries sorted by date/created_at to get latest value
      const { data: remaining, error: fetchErr } = await supabase
        .from('investment_returns')
        .select('*')
        .eq('portfolio_id', portfolio.id)
        .order('date', { ascending: false })
        .order('created_at', { ascending: false });

      if (fetchErr) throw fetchErr;

      // 3. Update current_value of portfolio to latest return log or to effective capital if no logs left
      const nextVal = remaining && remaining.length > 0 
        ? remaining[0].value_at_date 
        : portfolio.initial_capital;

      const { error: updErr } = await supabase
        .from('investment_portfolios')
        .update({ current_value: nextVal })
        .eq('id', portfolio.id);
      if (updErr) throw updErr;

      await refresh();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Gagal menghapus log riwayat');
    } finally {
      setLoading(false);
    }
  };

  // Get list of returns for the current portfolio sorted by date descending, then created_at descending
  const currentReturns = (investmentReturns || [])
    .filter(r => r && r.portfolio_id === (portfolio?.id || ''))
    .sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      if (dateA !== dateB) return dateB - dateA;
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return timeB - timeA;
    });

  // Effective capital for return percentage calculation
  const currentPortfolioEffectiveCapital = portfolio
    ? ((portfolioWishlists || []).filter(pw => pw && pw.portfolio_id === portfolio.id).length > 0
        ? (portfolioWishlists || [])
            .filter(pw => pw && pw.portfolio_id === portfolio.id)
            .reduce((sum, pw) => {
              const wl = (wishlists || []).find(w => w && w.id === pw.wishlist_id);
              return sum + (wl ? wl.current_amount : 0);
            }, 0)
        : (portfolio.initial_capital ?? 0))
    : 0;

  // Get history of capital deposits/top-ups dynamically
  const capitalHistory = useMemo(() => {
    if (!portfolio) return [];

    const linkedWishlistIds = (portfolioWishlists || [])
      .filter(pw => pw && pw.portfolio_id === portfolio.id)
      .map(pw => pw.wishlist_id);

    const isLinked = linkedWishlistIds.length > 0;
    let list: { id: string; date: string; amount: number; label: string; notes: string; is_initial?: boolean }[] = [];

    if (isLinked) {
      // 1. Fetch automatic top-ups (saving transactions to linked wishlists)
      const wishlistSavings = (transactions || [])
        .filter(t => t.type === 'saving' && t.wishlist_id && linkedWishlistIds.includes(t.wishlist_id) && (!t.deleted_at))
        .map(t => {
          const wl = (wishlists || []).find(w => w && w.id === t.wishlist_id);
          return {
            id: t.id,
            date: t.date,
            amount: Number(t.amount || 0),
            label: 'Tabungan Masuk (Otomatis)',
            notes: t.description || `Setor tabungan: ${wl?.name || 'Wishlist'}`
          };
        });

      // 2. Fetch initial return date
      const oldestReturn = (investmentReturns || [])
        .filter(r => r && r.portfolio_id === portfolio.id)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || (a.created_at ? new Date(a.created_at).getTime() : 0) - (b.created_at ? new Date(b.created_at).getTime() : 0))[0];

      if (oldestReturn) {
        const totalSavingsAmt = wishlistSavings.reduce((sum, s) => sum + s.amount, 0);
        const baseModal = Math.max(0, currentPortfolioEffectiveCapital - totalSavingsAmt);
        
        list.push({
          id: oldestReturn.id,
          date: oldestReturn.date,
          amount: (portfolio.initial_capital ?? 0) || oldestReturn.value_at_date || baseModal,
          label: 'Modal Awal Portofolio',
          notes: oldestReturn.notes || 'Modal awal saat menghubungkan tabungan',
          is_initial: true
        });
      }

      list.push(...wishlistSavings);
    } else {
      // Manual Portfolio
      const oldestReturn = (investmentReturns || [])
        .filter(r => r && r.portfolio_id === portfolio.id && (typeof r.notes !== 'string' || !r.notes.startsWith('[TOPUP:')))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || (a.created_at ? new Date(a.created_at).getTime() : 0) - (b.created_at ? new Date(b.created_at).getTime() : 0))[0];

      if (oldestReturn) {
        list.push({
          id: oldestReturn.id,
          date: oldestReturn.date,
          amount: (portfolio.initial_capital ?? 0) || oldestReturn.value_at_date,
          label: 'Modal Awal Portofolio',
          notes: oldestReturn.notes || 'Modal awal input manual',
          is_initial: true
        });
      }

      const manualTopUps = (investmentReturns || [])
        .filter(r => r && r.portfolio_id === portfolio.id && typeof r.notes === 'string' && r.notes.startsWith('[TOPUP:'))
        .map(r => {
          const match = r.notes?.match(/^\[TOPUP:(\d+)\] (.*)$/);
          const amount = match ? Number(match[1]) : 0;
          const cleanNotes = match ? match[2] : (r.notes || '');
          return {
            id: r.id,
            date: r.date,
            amount: amount,
            label: 'Setoran Modal Manual',
            notes: cleanNotes
          };
        });

      list.push(...manualTopUps);
    }

    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [portfolio, portfolioWishlists, transactions, wishlists, investmentReturns, currentPortfolioEffectiveCapital]);

  // Compute historical effective capital at a given date for accurate return calculations.
  // We do NOT use capitalHistory here because it double-counts for linked portfolios:
  // its "Modal Awal" entry already includes pre-creation savings, and those same savings
  // are also listed as individual entries.
  const getCapitalAtDate = useMemo(() => {
    if (!portfolio) return (_date: string) => currentPortfolioEffectiveCapital;

    const linkedWishlistIds = (portfolioWishlists || [])
      .filter(pw => pw && pw.portfolio_id === portfolio.id)
      .map(pw => pw.wishlist_id);

    const isLinked = linkedWishlistIds.length > 0;

    if (isLinked) {
      // For linked portfolios: capital at any date = sum of all saving transactions
      // to the linked wishlists on or before that date.
      const savingTxs = (transactions || [])
        .filter(t => t.type === 'saving' && t.wishlist_id && linkedWishlistIds.includes(t.wishlist_id) && !t.deleted_at)
        .map(t => ({ date: t.date, amount: Number(t.amount || 0) }));

      return (date: string) => {
        const total = savingTxs
          .filter(t => t.date <= date)
          .reduce((sum, t) => sum + t.amount, 0);
        // Fallback to currentPortfolioEffectiveCapital if no savings found (edge case)
        return total > 0 ? total : currentPortfolioEffectiveCapital;
      };
    } else {
      // For manual portfolios: capital at any date = initial_capital + TOPUP entries on or before that date.
      const topUps = (investmentReturns || [])
        .filter(r => r && r.portfolio_id === portfolio.id && typeof r.notes === 'string' && r.notes.startsWith('[TOPUP:'))
        .map(r => {
          const match = r.notes?.match(/^\[TOPUP:(\d+)\]/);
          return { date: r.date, amount: match ? Number(match[1]) : 0 };
        });

      const base = portfolio.initial_capital ?? 0;
      return (date: string) => {
        const topUpTotal = topUps
          .filter(t => t.date <= date)
          .reduce((sum, t) => sum + t.amount, 0);
        return base + topUpTotal;
      };
    }
  }, [portfolio, portfolioWishlists, transactions, investmentReturns, currentPortfolioEffectiveCapital]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
      <div className={clsx(
        "bg-surface border border-line rounded-3xl w-full shadow-2xl animate-scale-in overflow-hidden flex flex-col transition-all duration-300",
        activeMode === 'history' ? "max-w-xl max-h-[85vh]" : "max-w-md max-h-[90vh]"
      )}>
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-line bg-surface-alt/10">
          <div className="flex items-center gap-3">
            {activeMode !== initialMode && (
              <button 
                onClick={() => switchMode(initialMode)} 
                className="p-1.5 text-text-muted hover:text-text-primary hover:bg-surface-hover rounded-xl transition-all"
                title="Kembali"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            <div>
              <h3 className="text-base font-extrabold text-text-primary">
                {activeMode === 'add' && '✨ Tambah Portofolio Baru'}
                {activeMode === 'update_value' && `📊 Update Nilai — ${portfolio?.name}`}
                {activeMode === 'history' && `📈 Riwayat Nilai — ${portfolio?.name}`}
                {activeMode === 'edit' && `⚙️ Pengaturan Portofolio — ${portfolio?.name}`}
                {activeMode === 'close' && `🔒 Tutup Portofolio — ${portfolio?.name}`}
              </h3>
              <p className="text-[11px] text-text-muted mt-0.5">
                {activeMode === 'add' && 'Buat wadah aset investasi Anda'}
                {activeMode === 'update_value' && 'Catat nilai terkini untuk memantau performa'}
                {activeMode === 'history' && 'Lacak perkembangan nilai investasi dari waktu ke waktu'}
                {activeMode === 'edit' && 'Ubah detail atau arsipkan portofolio'}
                {activeMode === 'close' && 'Akhiri portofolio dan cairkan saldo/keuntungan'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-text-muted hover:text-text-primary hover:bg-surface-hover rounded-full transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
          {errorMsg && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs px-4 py-3 rounded-2xl flex items-start gap-2.5 animate-pulse">
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* MODE: ADD or EDIT */}
          {(activeMode === 'add' || activeMode === 'edit') && (
            <form onSubmit={handleSubmit} className="space-y-5">
              
              {/* Name & Instrument Type */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-[13px] font-semibold text-text-secondary">Nama Portofolio</label>
                  <div className="relative">
                    <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <input 
                      type="text" 
                      placeholder="Contoh: Bitcoin, Saham BBCA"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="w-full bg-surface border border-line rounded-2xl pl-10 pr-4 py-3 text-[13px] font-medium text-text-primary placeholder:text-text-muted/60 focus:border-accent focus:ring-1 focus:ring-accent/10 outline-none transition-all"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-[13px] font-semibold text-text-secondary">Tipe Instrumen</label>
                  <div className="relative">
                    <Layers className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <input 
                      type="text" 
                      placeholder="Crypto, Saham, Reksa Dana"
                      value={instrumentType}
                      onChange={e => setInstrumentType(e.target.value)}
                      className="w-full bg-surface border border-line rounded-2xl pl-10 pr-4 py-3 text-[13px] font-medium text-text-primary placeholder:text-text-muted/60 focus:border-accent focus:ring-1 focus:ring-accent/10 outline-none transition-all"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Capital Source Selection */}
              <div className="space-y-2.5">
                <label className="block text-[13px] font-semibold text-text-secondary">Sumber Modal</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setCapitalSource('manual');
                      if (activeMode === 'add') {
                        setInitialCapitalInput('');
                        setCurrentValueInput('');
                      }
                    }}
                    className={clsx(
                      "p-3 rounded-2xl text-[13px] font-bold border transition-all flex flex-col items-center gap-1",
                      capitalSource === 'manual'
                        ? "bg-accent/10 border-accent/30 text-accent shadow-sm"
                        : "bg-surface border-line text-text-secondary hover:bg-surface-hover"
                    )}
                    disabled={activeMode === 'edit'} // Disable switching source on edit to keep data integrity
                  >
                    <span>⌨️ Input Manual</span>
                    <span className="text-[10px] font-normal text-text-muted">Masukkan angka modal sendiri</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCapitalSource('wishlist')}
                    className={clsx(
                      "p-3 rounded-2xl text-[13px] font-bold border transition-all flex flex-col items-center gap-1",
                      capitalSource === 'wishlist'
                        ? "bg-accent/10 border-accent/30 text-accent shadow-sm"
                        : "bg-surface border-line text-text-secondary hover:bg-surface-hover"
                    )}
                    disabled={activeMode === 'edit'}
                  >
                    <span>🎯 Link ke Tabungan</span>
                    <span className="text-[10px] font-normal text-text-muted">Hubungkan ke satu/lebih Wishlist</span>
                  </button>
                </div>
              </div>

              {/* Conditional Capital Forms */}
              {capitalSource === 'manual' ? (
                <div className="space-y-2">
                  <label className="block text-[13px] font-semibold text-text-secondary">Modal Awal (Capital)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[13px] font-extrabold text-text-muted">Rp</span>
                    <input 
                      type="text" 
                      placeholder="0"
                      value={initialCapitalInput}
                      onChange={e => {
                        const val = formatThousands(e.target.value);
                        setInitialCapitalInput(val);
                        if (activeMode === 'add') {
                          setCurrentValueInput(val);
                        }
                      }}
                      className="w-full bg-surface border border-line rounded-2xl pl-10 pr-4 py-3 text-[13px] font-extrabold text-text-primary focus:border-accent focus:ring-1 focus:ring-accent/10 outline-none transition-all text-right"
                      required
                      disabled={activeMode === 'edit'} // Capital is read-only on edit
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3 bg-surface-alt/30 border border-line p-4 rounded-2xl">
                  <div className="flex justify-between items-center">
                    <label className="text-[12px] font-bold text-text-primary">Pilih Tabungan (Wishlist)</label>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/15 text-accent font-semibold">
                      Total: {fmt(calculatedWishlistCapital)}
                    </span>
                  </div>
                  
                  {wishlists.length === 0 ? (
                    <p className="text-[11px] text-text-muted py-2 text-center">Belum ada wishlist terdaftar. Silakan buat wishlist di menu Tabungan dahulu.</p>
                  ) : (
                    <div className="max-h-[160px] overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
                      {wishlists.map(w => {
                        const isSelected = selectedWishlistIds.includes(w.id);
                        
                        // Check if this wishlist is already linked to another portfolio (only relevant when adding or for other portfolios)
                        const otherLinkedLink = portfolioWishlists.find(pw => pw.wishlist_id === w.id && pw.portfolio_id !== portfolio?.id);
                        
                        return (
                          <button
                            key={w.id}
                            type="button"
                            onClick={() => !otherLinkedLink && handleToggleWishlist(w.id)}
                            className={clsx(
                              "w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left",
                              isSelected 
                                ? "bg-accent/10 border-accent/20 text-accent font-bold" 
                                : otherLinkedLink
                                  ? "bg-surface border-line/40 text-text-muted opacity-50 cursor-not-allowed"
                                  : "bg-surface border-line text-text-primary hover:bg-surface-hover"
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <div className={clsx(
                                "w-4 h-4 rounded-md border flex items-center justify-center transition-all",
                                isSelected ? "border-accent bg-accent text-white" : "border-line"
                              )}>
                                {isSelected && <Check className="w-2.5 h-2.5 stroke-[4]" />}
                              </div>
                              <div>
                                <p className="text-[12px] font-bold">{w.name}</p>
                                {otherLinkedLink && (
                                  <p className="text-[9px] text-red-500 font-semibold mt-0.5">Sudah terhubung ke portofolio lain</p>
                                )}
                              </div>
                            </div>
                            <span className="text-[12px] font-extrabold">{fmt(w.current_amount)}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Current Value (Only displayed for Mode Add) */}
              {activeMode === 'add' && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="block text-[13px] font-semibold text-text-secondary">Nilai Investasi Saat Ini</label>
                    <span className="text-[10px] text-text-muted italic">Default = Modal Awal</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[13px] font-extrabold text-text-muted">Rp</span>
                    <input 
                      type="text" 
                      placeholder="0"
                      value={currentValueInput}
                      onChange={e => setCurrentValueInput(formatThousands(e.target.value))}
                      className="w-full bg-surface border border-line rounded-2xl pl-10 pr-4 py-3 text-[13px] font-extrabold text-text-primary focus:border-accent focus:ring-1 focus:ring-accent/10 outline-none transition-all text-right"
                      required
                    />
                  </div>
                </div>
              )}

              {/* Tanggal Mulai (Displayed for Mode Add and Edit) */}
              {(activeMode === 'add' || activeMode === 'edit') && (
                <div className="space-y-2">
                  <label className="block text-[13px] font-semibold text-text-secondary">Tanggal Mulai Investasi</label>
                  <div className="relative">
                    <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                    <input 
                      type="date" 
                      value={startDate}
                      onChange={e => setStartDate(e.target.value)}
                      className="w-full bg-surface border border-line rounded-2xl pl-10 pr-4 py-3 text-[13px] font-bold text-text-primary focus:border-accent focus:ring-1 focus:ring-accent/10 outline-none transition-all"
                      required
                    />
                  </div>
                </div>
              )}

              {/* Notes */}
              <div className="space-y-2">
                <label className="block text-[13px] font-semibold text-text-secondary">Catatan Tambahan (Optional)</label>
                <div className="relative">
                  <BookOpen className="absolute left-3.5 top-3.5 w-4 h-4 text-text-muted" />
                  <textarea 
                    placeholder="Tulis detail investasi, instrumen wallet, atau target..."
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    rows={2}
                    className="w-full bg-surface border border-line rounded-2xl pl-10 pr-4 py-3 text-[13px] font-medium text-text-primary placeholder:text-text-muted/60 focus:border-accent focus:ring-1 focus:ring-accent/10 outline-none transition-all resize-none"
                  />
                </div>
              </div>

              {/* Edit Mode: Archive Toggle */}
              {activeMode === 'edit' && (
                <div className="flex items-center justify-between p-4 bg-surface-alt/20 rounded-2xl border border-line">
                  <div>
                    <h4 className="text-[12px] font-bold text-text-primary">Status Aktif</h4>
                    <p className="text-[10px] text-text-muted">Nonaktifkan untuk mengarsipkan portofolio</p>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setIsActive(!isActive)}
                    className="text-text-secondary hover:text-accent transition-all"
                  >
                    {isActive ? (
                      <ToggleRight className="w-10 h-10 text-accent" />
                    ) : (
                      <ToggleLeft className="w-10 h-10 text-text-muted" />
                    )}
                  </button>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-3 border-t border-line">
                {activeMode === 'edit' && (
                  <button
                    type="button"
                    onClick={handleDeletePortfolio}
                    disabled={loading}
                    className="px-4 py-3 bg-red-500/10 hover:bg-red-500/15 border border-red-500/20 text-red-500 rounded-2xl text-[13px] font-bold transition-all flex items-center justify-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Hapus</span>
                  </button>
                )}
                
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3.5 bg-accent hover:bg-accent-dark text-white rounded-2xl text-[13px] font-extrabold shadow-lg shadow-accent/20 transition-all flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <span>{activeMode === 'add' ? 'Simpan Portofolio' : 'Perbarui Pengaturan'}</span>
                  )}
                </button>
              </div>

            </form>
          )}

          {/* MODE: UPDATE VALUE */}
          {activeMode === 'update_value' && (
            <form onSubmit={handleSubmit} className="space-y-5">
              
              {/* Reference current values */}
              <div className="grid grid-cols-2 gap-3 p-4 bg-surface-alt/30 border border-line rounded-2xl text-[12px]">
                <div className="space-y-0.5">
                  <p className="text-text-muted">Modal (Capital):</p>
                  <p className="font-extrabold text-text-primary">{fmt(currentPortfolioEffectiveCapital)}</p>
                </div>
                <div className="space-y-0.5 text-right">
                  <p className="text-text-muted">Nilai Terakhir:</p>
                  <p className="font-extrabold text-accent">{fmt(portfolio?.current_value || 0)}</p>
                </div>
              </div>

              {/* Date Input */}
              <div className="space-y-2">
                <label className="block text-[13px] font-semibold text-text-secondary">Tanggal Perubahan Nilai</label>
                <div className="relative">
                  <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <input 
                    type="date" 
                    value={updateDate}
                    onChange={e => setUpdateDate(e.target.value)}
                    className="w-full bg-surface border border-line rounded-2xl pl-10 pr-4 py-3 text-[13px] font-bold text-text-primary focus:border-accent focus:ring-1 focus:ring-accent/10 outline-none transition-all"
                    required
                  />
                </div>
              </div>

              {/* New Value Input */}
              <div className="space-y-2">
                <label className="block text-[13px] font-semibold text-text-secondary">Nilai Investasi Baru</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[13px] font-extrabold text-text-muted">Rp</span>
                  <input 
                    type="text" 
                    placeholder="0"
                    value={newValueInput}
                    onChange={e => setNewValueInput(formatThousands(e.target.value))}
                    className="w-full bg-surface border border-line rounded-2xl pl-10 pr-4 py-3 text-[13px] font-extrabold text-text-primary focus:border-accent focus:ring-1 focus:ring-accent/10 outline-none transition-all text-right"
                    required
                  />
                </div>
              </div>

              {/* Return preview */}
              {(() => {
                const inputVal = Number(parseThousands(newValueInput) || 0);
                const diffNominal = inputVal - currentPortfolioEffectiveCapital;
                const diffPercent = currentPortfolioEffectiveCapital > 0 
                  ? (diffNominal / currentPortfolioEffectiveCapital) * 100 
                  : 0;
                
                return (
                  <div className={clsx(
                    "flex items-center justify-between p-4 border rounded-2xl text-[12px] font-bold transition-all",
                    diffNominal >= 0 
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" 
                      : "bg-rose-500/10 border-rose-500/20 text-rose-500"
                  )}>
                    <span className="flex items-center gap-1">
                      {diffNominal >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                      Estimasi Return Baru:
                    </span>
                    <span>
                      {diffNominal >= 0 ? '+' : ''}{fmt(diffNominal)} ({diffNominal >= 0 ? '+' : ''}{diffPercent.toFixed(2)}%)
                    </span>
                  </div>
                );
              })()}

              {/* Optional Manual Top-Up Checkbox (Only for Manual Capital Portfolios) */}
              {capitalSource === 'manual' && (
                <div className="space-y-3 bg-surface-alt/30 border border-line p-4 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => {
                      setIsTopUp(!isTopUp);
                      setTopUpAmountInput('');
                    }}
                    className="flex items-center gap-3 w-full text-left"
                  >
                    <div className={clsx(
                      "w-4 h-4 rounded-md border flex items-center justify-center transition-all",
                      isTopUp ? "border-accent bg-accent text-white" : "border-line bg-surface"
                    )}>
                      {isTopUp && <Check className="w-2.5 h-2.5 stroke-[4]" />}
                    </div>
                    <div>
                      <p className="text-[12px] font-bold text-text-primary">Setor Modal Tambahan (Top-Up)</p>
                      <p className="text-[10px] text-text-muted font-medium">Centang jika Anda menyetor modal segar baru hari ini</p>
                    </div>
                  </button>

                  {isTopUp && (
                    <div className="space-y-1.5 pt-2 border-t border-line/45 animate-fade-in">
                      <label className="block text-[11px] font-bold text-text-secondary">Jumlah Setoran Modal</label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[12px] font-extrabold text-text-muted">Rp</span>
                        <input
                          type="text"
                          placeholder="Masukkan modal masuk..."
                          value={topUpAmountInput}
                          onChange={e => setTopUpAmountInput(formatThousands(e.target.value))}
                          className="w-full bg-surface border border-line rounded-xl pl-9 pr-4 py-2.5 text-[12px] font-extrabold text-text-primary focus:border-accent focus:ring-1 focus:ring-accent/10 outline-none transition-all text-right"
                          required={isTopUp}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Update Notes */}
              <div className="space-y-2">
                <label className="block text-[13px] font-semibold text-text-secondary">Catatan Perubahan (Optional)</label>
                <div className="relative">
                  <BookOpen className="absolute left-3.5 top-3.5 w-4 h-4 text-text-muted" />
                  <textarea 
                    placeholder="Tulis alasan perubahan, e.g. Pasar bullish, Setor dana tambahan..."
                    value={updateNotes}
                    onChange={e => setUpdateNotes(e.target.value)}
                    rows={2}
                    className="w-full bg-surface border border-line rounded-2xl pl-10 pr-4 py-3 text-[13px] font-medium text-text-primary placeholder:text-text-muted/60 focus:border-accent focus:ring-1 focus:ring-accent/10 outline-none transition-all resize-none"
                  />
                </div>
              </div>

              {/* Submit Update */}
              <div className="pt-3 border-t border-line">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-accent hover:bg-accent-dark text-white rounded-2xl text-[13px] font-extrabold shadow-lg shadow-accent/20 transition-all flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <span>Simpan Perubahan Nilai</span>
                  )}
                </button>
              </div>

            </form>
          )}

          {/* MODE: HISTORY LIST */}
          {activeMode === 'history' && (
            <div className="space-y-4">
              
              {/* Stat summary */}
              <div className="grid grid-cols-3 gap-3 p-4 bg-surface-alt/30 border border-line rounded-2xl text-[12px] text-center">
                <div className="space-y-0.5">
                  <p className="text-text-muted text-[10px]">Modal Awal</p>
                  <p className="font-extrabold text-text-primary">{fmt(currentPortfolioEffectiveCapital)}</p>
                </div>
                <div className="space-y-0.5 border-x border-line">
                  <p className="text-text-muted text-[10px]">Nilai Terkini</p>
                  <p className="font-extrabold text-text-primary">{fmt(portfolio?.current_value || 0)}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-text-muted text-[10px]">Total Return</p>
                  {(() => {
                    const retNominal = (portfolio?.current_value || 0) - currentPortfolioEffectiveCapital;
                    const retPercent = currentPortfolioEffectiveCapital > 0 ? (retNominal / currentPortfolioEffectiveCapital) * 100 : 0;
                    return (
                      <p className={clsx("font-extrabold", retNominal >= 0 ? "text-emerald-500" : "text-rose-500")}>
                        {retNominal >= 0 ? '+' : ''}{retPercent.toFixed(1)}%
                      </p>
                    );
                  })()}
                </div>
              </div>

              {/* Sub-Tabs: Performa Aset vs Aliran Modal */}
              <div className="flex bg-surface-alt/25 p-1 rounded-2xl border border-line shadow-sm">
                <button
                  type="button"
                  onClick={() => setHistoryTab('performa')}
                  className={clsx(
                    "flex-1 py-2.5 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1.5",
                    historyTab === 'performa'
                      ? "bg-accent text-bg shadow-md"
                      : "text-text-muted hover:text-text-primary hover:bg-surface-hover/30"
                  )}
                >
                  📈 Performa Aset
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryTab('modal')}
                  className={clsx(
                    "flex-1 py-2.5 rounded-xl text-[11px] font-bold transition-all flex items-center justify-center gap-1.5",
                    historyTab === 'modal'
                      ? "bg-accent text-bg shadow-md"
                      : "text-text-muted hover:text-text-primary hover:bg-surface-hover/30"
                  )}
                >
                  💰 Aliran Modal
                </button>
              </div>

              {/* History Table/List */}
              <div className="border border-line rounded-2xl overflow-hidden bg-surface">
                <div className="px-4 py-3 border-b border-line bg-surface-alt/10 flex justify-between items-center">
                  <span className="text-[11px] font-extrabold text-text-secondary uppercase tracking-wider">
                    {historyTab === 'performa' ? 'Kronologis Riwayat Performa' : 'Histori Aliran Modal'}
                  </span>
                  <span className="text-[10px] text-text-muted">
                    {historyTab === 'performa' ? `${currentReturns.length} log` : `${capitalHistory.length} log`} tercatat
                  </span>
                </div>

                {historyTab === 'performa' ? (
                  currentReturns.length === 0 ? (
                    <div className="py-12 text-center">
                      <p className="text-[12px] text-text-muted font-bold">Belum ada riwayat update nilai.</p>
                    </div>
                  ) : (
                    <div className="max-h-[300px] overflow-y-auto custom-scrollbar divide-y divide-line">
                      {currentReturns.map((item, idx) => {
                        const capitalAtDate = getCapitalAtDate(item.date);
                        const netNominal = item.value_at_date - capitalAtDate;
                        const netPercent = capitalAtDate > 0 ? (netNominal / capitalAtDate) * 100 : 0;
                        const isInitial = idx === currentReturns.length - 1; // last item is the initial log

                        return (
                          <div key={item.id} className="p-4 flex items-center justify-between hover:bg-surface-alt/10 transition-colors">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[12px] font-extrabold text-text-primary">
                                  {formatDateSafe(item.date)}
                                </span>
                                {isInitial && (
                                  <span className="text-[9px] px-1.5 py-0.5 bg-accent/15 text-accent font-semibold rounded-md">Modal Awal</span>
                                )}
                              </div>
                              {item.notes && (
                                <p className="text-[10px] text-text-muted font-medium italic">
                                  {typeof item.notes === 'string' && item.notes.startsWith('[TOPUP:') 
                                    ? `"${item.notes.match(/^\[TOPUP:\d+\] (.*)$/)?.[1] || item.notes}"` 
                                    : `"${item.notes}"`}
                                </p>
                              )}
                            </div>

                            <div className="flex items-center gap-4">
                              <div className="text-right space-y-0.5">
                                <p className="text-[12px] font-extrabold text-text-primary">{fmt(item.value_at_date)}</p>
                                {!isInitial && (
                                  <p className={clsx("text-[10px] font-bold flex items-center justify-end gap-0.5", netNominal >= 0 ? "text-emerald-500" : "text-rose-500")}>
                                    {netNominal >= 0 ? '+' : ''}{netPercent.toFixed(1)}%
                                  </p>
                                )}
                              </div>
                              
                              {!isInitial && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteReturnLog(item.id)}
                                  disabled={loading}
                                  className="p-1.5 text-text-muted hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                  title="Hapus catatan"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )
                ) : (
                  /* RENDERING CAPITAL HISTORY TAB */
                  capitalHistory.length === 0 ? (
                    <div className="py-12 text-center">
                      <p className="text-[12px] text-text-muted font-bold">Belum ada aliran modal tercatat.</p>
                    </div>
                  ) : (
                    <div className="max-h-[300px] overflow-y-auto custom-scrollbar divide-y divide-line">
                      {capitalHistory.map((item) => (
                        <div key={item.id} className="p-4 flex items-center justify-between hover:bg-surface-alt/10 transition-colors">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[12px] font-extrabold text-text-primary">
                                {formatDateSafe(item.date)}
                              </span>
                              <span className={clsx(
                                "text-[9px] px-1.5 py-0.5 font-semibold rounded-md",
                                item.is_initial 
                                  ? "bg-accent/15 text-accent" 
                                  : "bg-emerald-500/15 text-emerald-500"
                              )}>
                                {item.label}
                              </span>
                            </div>
                            {item.notes && (
                              <p className="text-[10px] text-text-muted font-medium italic">"{item.notes}"</p>
                            )}
                          </div>

                          <div className="text-right">
                            <p className={clsx(
                              "text-[12px] font-extrabold",
                              item.is_initial ? "text-text-primary" : "text-emerald-500"
                            )}>
                              {item.is_initial ? '' : '+'}{fmt(item.amount)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                )}
              </div>

              {/* Close Button / Shortcut to update */}
              <div className="flex gap-3 pt-3 border-t border-line">
                <button
                  onClick={() => switchMode('update_value')}
                  className="flex-1 py-3 text-accent hover:bg-accent/5 border border-accent/20 rounded-2xl text-[13px] font-bold transition-all"
                >
                  📊 Catat Nilai Baru
                </button>
                <button
                  onClick={onClose}
                  className="px-6 py-3 bg-surface border border-line text-text-primary rounded-2xl text-[13px] font-bold hover:bg-surface-hover transition-all"
                >
                  Tutup
                </button>
              </div>

            </div>
          )}

          {/* MODE: CLOSE PORTFOLIO */}
          {activeMode === 'close' && portfolio && (
            <form onSubmit={handleSubmit} className="space-y-5">
              
              {/* Summary of Return */}
              <div className="p-4 bg-surface-alt/30 border border-line rounded-2xl text-[12px] space-y-2.5">
                <div className="flex justify-between items-center pb-2 border-b border-line/50">
                  <span className="text-text-muted">Modal Pokok:</span>
                  <span className="font-extrabold text-text-primary">{fmt(currentPortfolioEffectiveCapital)}</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-line/50">
                  <span className="text-text-muted">Nilai Likuidasi (Pasar):</span>
                  <span className="font-extrabold text-text-primary">{fmt(portfolio.current_value)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-text-muted">Estimasi Return:</span>
                  {(() => {
                    const retNominal = portfolio.current_value - currentPortfolioEffectiveCapital;
                    const retPercent = currentPortfolioEffectiveCapital > 0 
                      ? (retNominal / currentPortfolioEffectiveCapital) * 100 
                      : 0;
                    return (
                      <span className={clsx("font-extrabold", retNominal >= 0 ? "text-emerald-500" : "text-rose-500")}>
                        {retNominal >= 0 ? '+' : ''}{fmt(retNominal)} ({retNominal >= 0 ? '+' : ''}{retPercent.toFixed(2)}%)
                      </span>
                    );
                  })()}
                </div>
              </div>

              {/* Liquidation Action Description */}
              <div className="space-y-3.5 bg-surface-alt/35 border border-line p-4 rounded-2xl">
                <h4 className="text-[12px] font-bold text-text-primary flex items-center gap-1.5">
                  🏦 Alokasi Dana Penarikan
                </h4>

                {capitalSource === 'wishlist' ? (
                  <div className="space-y-2.5">
                    {sourceWallet ? (
                      <div className="space-y-1.5">
                        <p className="text-[11px] text-text-secondary font-medium">
                          Dompet sumber tabungan terdeteksi:
                        </p>
                        <div className="p-3 bg-surface border border-line rounded-xl text-[12px] font-extrabold text-text-primary">
                          💳 {sourceWallet.name}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <label className="block text-[11px] font-bold text-text-secondary">
                          ⚠️ Dompet Sumber Tidak Terdeteksi. Pilih Wallet Tujuan:
                        </label>
                        <select
                          value={selectedLiquidationWalletId}
                          onChange={e => setSelectedLiquidationWalletId(e.target.value)}
                          className="w-full bg-surface border border-line rounded-xl px-3 py-2.5 text-[12px] font-bold text-text-primary outline-none focus:border-accent"
                          required
                        >
                          <option value="">-- Pilih Akun --</option>
                          {accounts.filter(a => a.type !== 'investasi').map(a => (
                            <option key={a.id} value={a.id}>
                              {a.name} ({fmt(a.balance)})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Explanatory text */}
                    {(() => {
                      const retVal = portfolio.current_value - currentPortfolioEffectiveCapital;
                      return (
                        <p className="text-[10px] text-text-muted leading-relaxed">
                          {retVal > 0 && `Keuntungan sebesar ${fmt(retVal)} akan otomatis masuk ke dompet di atas sebagai Pemasukan. Modal awal tetap tersimpan di Tabungan.`}
                          {retVal < 0 && `Kerugian sebesar ${fmt(Math.abs(retVal))} akan dipotong dari dompet di atas sebagai Pengeluaran. Saldo Tabungan (Wishlist) juga akan diturunkan secara proporsional.`}
                          {retVal === 0 && `Nilai likuidasi sama dengan modal tabungan. Tidak ada transaksi keuangan (pemasukan/pengeluaran) yang perlu dibuat.`}
                        </p>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <div className="space-y-2">
                      <label className="block text-[11px] font-bold text-text-secondary">
                        Pilih Dompet Tujuan Penarikan:
                      </label>
                      <select
                        value={selectedLiquidationWalletId}
                        onChange={e => setSelectedLiquidationWalletId(e.target.value)}
                        className="w-full bg-surface border border-line rounded-xl px-3 py-2.5 text-[12px] font-bold text-text-primary outline-none focus:border-accent"
                        required
                      >
                        <option value="">-- Pilih Akun --</option>
                        {accounts.filter(a => a.type !== 'investasi').map(a => (
                          <option key={a.id} value={a.id}>
                            {a.name} ({fmt(a.balance)})
                          </option>
                        ))}
                      </select>
                    </div>

                    <p className="text-[10px] text-text-muted leading-relaxed">
                      Seluruh nilai investasi saat ini sebesar <span className="font-extrabold text-text-primary">{fmt(portfolio.current_value)}</span> akan dicairkan dan masuk ke dompet pilihan di atas sebagai Pemasukan.
                    </p>
                  </div>
                )}
              </div>

              {/* Close Notes */}
              <div className="space-y-2">
                <label className="block text-[13px] font-semibold text-text-secondary">Catatan Penutupan (Optional)</label>
                <div className="relative">
                  <BookOpen className="absolute left-3.5 top-3.5 w-4 h-4 text-text-muted" />
                  <textarea 
                    placeholder="Tulis alasan penutupan portofolio ini..."
                    value={updateNotes}
                    onChange={e => setUpdateNotes(e.target.value)}
                    rows={2}
                    className="w-full bg-surface border border-line rounded-2xl pl-10 pr-4 py-3 text-[13px] font-medium text-text-primary placeholder:text-text-muted/60 focus:border-accent focus:ring-1 focus:ring-accent/10 outline-none transition-all resize-none"
                  />
                </div>
              </div>

              {/* Warning alert */}
              <div className="bg-amber-500/10 border border-amber-500/20 text-amber-500 text-[10px] px-3.5 py-2.5 rounded-xl flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  <strong>PENTING:</strong> Tindakan ini tidak dapat dibatalkan. Portofolio akan dinonaktifkan secara permanen dan dipindahkan ke riwayat tab ditutup.
                </span>
              </div>

              {/* Submit / Cancel Buttons */}
              <div className="flex gap-3 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-3 bg-surface border border-line text-text-primary rounded-2xl text-[13px] font-bold hover:bg-surface-hover transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3.5 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl text-[13px] font-extrabold shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <span>Konfirmasi & Tutup Portofolio</span>
                  )}
                </button>
              </div>

            </form>
          )}

        </div>
      </div>
    </div>,
    document.body
  );
}
