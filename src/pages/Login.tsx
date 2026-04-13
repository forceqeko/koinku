import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import { Sun, Moon } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from '../components/Toast';

export default function Login() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) navigate('/', { replace: true });
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      if (isRegister) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        toast.success('Registrasi berhasil! Silakan masuk dengan akun baru Anda.');
        setIsRegister(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat masuk dengan Google.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4">
      <button
        onClick={toggleTheme}
        className="absolute top-5 right-5 p-2 rounded-lg bg-surface border border-line text-text-muted hover:text-text-primary transition-colors"
      >
        {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>

      <div className="w-full max-w-[380px]">
        <div className="mb-8 flex flex-col items-center sm:items-start">
          <img src="/icon.svg" alt="Koin Ku" className="w-12 h-12 mb-4" />
          <h1 className="text-xl font-semibold text-text-primary text-center sm:text-left">{isRegister ? 'Daftar Koin Ku' : 'Masuk ke Koin Ku'}</h1>
          <p className="text-text-muted text-sm mt-1 text-center sm:text-left">{isRegister ? 'Buat akun Anda gratis.' : 'Kelola keuangan Anda dengan mudah.'}</p>
        </div>

        <div className="card p-6">
          {error && <div className="p-3 mb-4 text-[13px] text-danger bg-danger-muted border border-danger/20 rounded-md">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[13px] font-medium text-text-secondary mb-1.5">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="input" required />
            </div>
            <div>
              <label className="block text-[13px] font-medium text-text-secondary mb-1.5">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="input" required minLength={6} />
            </div>
            <button type="submit" disabled={loading} className="btn btn-primary w-full">
              {loading ? 'Memproses...' : isRegister ? 'Daftar' : 'Masuk'}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-line"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-3 bg-surface text-text-muted text-[12px]">Atau lanjutkan dengan</span>
            </div>
          </div>

          <button onClick={handleGoogleLogin} type="button" className="btn bg-bg border border-line w-full flex items-center justify-center gap-2 hover:bg-surface-hover text-text-primary text-[13px] h-10">
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Google
          </button>

          <div className="mt-5 text-center">
            <button onClick={() => setIsRegister(!isRegister)} className="text-[13px] text-text-muted hover:text-text-primary">
              {isRegister ? 'Sudah punya akun? Masuk' : 'Belum punya akun? Daftar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
