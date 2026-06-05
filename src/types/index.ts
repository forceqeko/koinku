/**
 * Type definitions for Koin Ku - Financial Tracker
 * Point 17 Fix: Replace all `any[]` with proper TypeScript interfaces
 */

// ============================================
// ENUM TYPES
// ============================================

export type TransactionType = 'income' | 'expense' | 'saving' | 'transfer' | 'bill';

export type AccountType = 'bank' | 'ewallet' | 'cash' | 'investasi';

// ============================================
// BASE INTERFACE (Common fields)
// ============================================

export interface BaseEntity {
  id: string;
  created_at?: string;
  updated_at?: string;
  user_id: string;
}

// ============================================
// ACCOUNT ENTITY
// ============================================

export interface Account extends BaseEntity {
  name: string;
  balance: number;
  initial_balance?: number | null;
  type: AccountType;
  icon_url?: string | null;
}

// ============================================
// INCOME SOURCE ENTITY
// ============================================

export interface IncomeSource extends BaseEntity {
  name: string;
}

// ============================================
// EXPENSE CATEGORY ENTITY
// ============================================

export interface ExpenseCategory extends BaseEntity {
  name: string;
}

// ============================================
// EXPENSE PURPOSE ENTITY
// ============================================

export interface ExpensePurpose extends BaseEntity {
  name: string;
  category_id: string;
}

// ============================================
// WISHLIST ENTITY
// ============================================

export interface Wishlist extends BaseEntity {
  name: string;
  target_amount: number;
  current_amount: number;
  is_closed?: boolean;
  closed_at?: string | null;
}

// ============================================
// INVESTMENT PORTFOLIO ENTITY
// ============================================

export interface InvestmentPortfolio extends BaseEntity {
  name: string;
  instrument_type: string;
  initial_capital: number;
  current_value: number;
  notes?: string | null;
  is_active: boolean;
  closed_at?: string | null;
  closed_value?: number | null;
  liquidation_account_id?: string | null;
}

// ============================================
// INVESTMENT PORTFOLIO WISHLIST JUNCTION ENTITY
// ============================================

export interface InvestmentPortfolioWishlist {
  id: string;
  portfolio_id: string;
  wishlist_id: string;
  created_at?: string;
}

// ============================================
// INVESTMENT RETURN ENTITY
// ============================================

export interface InvestmentReturn {
  id: string;
  user_id: string;
  portfolio_id: string;
  date: string;
  value_at_date: number;
  notes?: string | null;
  created_at?: string;
}

// ============================================
// BILL PURPOSE ENTITY (for recurring bills/tagihan)
// ============================================

export interface BillPurpose extends BaseEntity {
  name: string;
}

// ============================================
// TRANSACTION ENTITY (Point 16: Soft Delete Support)
// ============================================

export interface Transaction extends BaseEntity {
  date: string;
  type: TransactionType;
  description: string;
  amount: number;
  admin_fee?: number | null;
  
  // Account references
  from_account_id?: string | null;
  to_account_id?: string | null;
  
  // Income specific
  income_source_id?: string | null;
  
  // Expense specific
  category_id?: string | null;
  purpose_id?: string | null;
  
  // Saving specific
  wishlist_id?: string | null;
  
  // Bill specific
  bill_purpose_id?: string | null;
  
  // Point 16: Soft delete field
  deleted_at?: string | null;
}

// ============================================
// TRANSACTION WITH RELATIONS (for UI display)
// ============================================

export interface TransactionWithRelations extends Transaction {
  from_account?: Account | null;
  to_account?: Account | null;
  income_source?: IncomeSource | null;
  category?: ExpenseCategory | null;
  purpose?: ExpensePurpose | null;
  wishlist?: Wishlist | null;
}

// ============================================
// DATA CONTEXT STATE
// ============================================

export interface DataState {
  accounts: Account[];
  categories: ExpenseCategory[];
  purposes: ExpensePurpose[];
  sources: IncomeSource[];
  wishlists: Wishlist[];
  transactions: Transaction[];
  portfolios: InvestmentPortfolio[];
  portfolioWishlists: InvestmentPortfolioWishlist[];
  investmentReturns: InvestmentReturn[];
}

// ============================================
// VALIDATION HELPERS (Point 14: Server-side validation helpers)
// ============================================

export interface ValidationError {
  field: string;
  message: string;
}

export interface TransactionValidation {
  isValid: boolean;
  errors: ValidationError[];
}

/**
 * Validate transaction data before sending to server
 * Point 14: Client-side validation that mirrors server-side constraints
 */
export function validateTransaction(data: Partial<Transaction>): TransactionValidation {
  const errors: ValidationError[] = [];

  // Amount must be positive
  if (data.amount === undefined || data.amount === null) {
    errors.push({ field: 'amount', message: 'Jumlah transaksi wajib diisi' });
  } else if (data.amount <= 0) {
    errors.push({ field: 'amount', message: 'Jumlah transaksi harus lebih dari 0' });
  } else if (data.amount > 999999999999) {
    errors.push({ field: 'amount', message: 'Jumlah transaksi terlalu besar' });
  }

  // Description must not be empty
  if (!data.description || data.description.trim().length === 0) {
    errors.push({ field: 'description', message: 'Deskripsi transaksi wajib diisi' });
  } else if (data.description.length > 255) {
    errors.push({ field: 'description', message: 'Deskripsi maksimal 255 karakter' });
  }

  // Type must be valid
  if (!data.type || !['income', 'expense', 'saving', 'transfer', 'bill'].includes(data.type)) {
    errors.push({ field: 'type', message: 'Tipe transaksi tidak valid' });
  }

  // Date must be valid
  if (!data.date) {
    errors.push({ field: 'date', message: 'Tanggal transaksi wajib diisi' });
  } else {
    const dateObj = new Date(data.date);
    if (isNaN(dateObj.getTime())) {
      errors.push({ field: 'date', message: 'Format tanggal tidak valid' });
    }
  }

  // Admin fee must be non-negative if provided
  if (data.admin_fee !== undefined && data.admin_fee !== null && data.admin_fee < 0) {
    errors.push({ field: 'admin_fee', message: 'Biaya admin tidak boleh negatif' });
  }

  // Type-specific validations
  switch (data.type) {
    case 'income':
      if (!data.to_account_id) {
        errors.push({ field: 'to_account_id', message: 'Akun tujuan wajib dipilih untuk pemasukan' });
      }
      break;
    
    case 'expense':
      if (!data.from_account_id) {
        errors.push({ field: 'from_account_id', message: 'Akun sumber wajib dipilih untuk pengeluaran' });
      }
      if (!data.category_id) {
        errors.push({ field: 'category_id', message: 'Kategori wajib dipilih untuk pengeluaran' });
      }
      break;
    
    case 'transfer':
    case 'saving':
      if (!data.from_account_id) {
        errors.push({ field: 'from_account_id', message: 'Akun sumber wajib dipilih' });
      }
      if (!data.to_account_id) {
        errors.push({ field: 'to_account_id', message: 'Akun tujuan wajib dipilih' });
      }
      if (data.from_account_id === data.to_account_id) {
        errors.push({ field: 'to_account_id', message: 'Akun sumber dan tujuan tidak boleh sama' });
      }
      break;
    
    case 'bill':
      if (!data.from_account_id) {
        errors.push({ field: 'from_account_id', message: 'Akun sumber wajib dipilih' });
      }
      if (!data.bill_purpose_id) {
        errors.push({ field: 'bill_purpose_id', message: 'Tujuan tagihan wajib dipilih' });
      }
      break;
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// ============================================
// DATABASE TABLE NAMES (for type-safe queries)
// ============================================

export const TableNames = {
  ACCOUNTS: 'accounts' as const,
  TRANSACTIONS: 'transactions' as const,
  EXPENSE_CATEGORIES: 'expense_categories' as const,
  EXPENSE_PURPOSES: 'expense_purposes' as const,
  INCOME_SOURCES: 'income_sources' as const,
  WISHLISTS: 'wishlists' as const,
  BILL_PURPOSES: 'bill_purposes' as const,
  INVESTMENT_PORTFOLIOS: 'investment_portfolios' as const,
  INVESTMENT_PORTFOLIO_WISHLISTS: 'investment_portfolio_wishlists' as const,
  INVESTMENT_RETURNS: 'investment_returns' as const,
} as const;

export type TableName = typeof TableNames[keyof typeof TableNames];
