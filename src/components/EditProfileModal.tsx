import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, User, Mail, ShieldAlert, Lock, Check, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { toast } from './Toast';
import clsx from 'clsx';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AVATAR_PRESETS = [
  { id: 'preset1', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80', label: 'Space 3D' },
  { id: 'preset2', url: 'https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=150&auto=format&fit=crop&q=80', label: 'Tech 3D' },
  { id: 'preset3', url: 'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=150&auto=format&fit=crop&q=80', label: 'Gold 3D' },
  { id: 'preset4', url: 'https://images.unsplash.com/photo-1618005198143-e528346d9a59?w=150&auto=format&fit=crop&q=80', label: 'Sphere 3D' },
  { id: 'preset5', url: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=150&auto=format&fit=crop&q=80', label: 'Glass 3D' },
  { id: 'preset6', url: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=150&auto=format&fit=crop&q=80', label: 'Neon 3D' },
];

export default function EditProfileModal({ isOpen, onClose }: EditProfileModalProps) {
  const { user, refreshUser } = useAuth();
  
  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [showAvatar, setShowAvatar] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [emailUpdateSent, setEmailUpdateSent] = useState(false);

  // Detect Google SSO Auth
  const isGoogleUser = 
    user?.app_metadata?.provider === 'google' || 
    user?.app_metadata?.providers?.includes('google') ||
    user?.identities?.some(id => id.provider === 'google');

  // Initialize fields on open
  useEffect(() => {
    if (isOpen && user) {
      setName(user.user_metadata?.name || user.user_metadata?.full_name || '');
      setEmail(user.email || '');
      setAvatarUrl(user.user_metadata?.avatar_url || '');
      setShowAvatar(user.user_metadata?.show_avatar ?? true);
      setErrorMsg(null);
      setEmailUpdateSent(false);
    }
  }, [isOpen, user]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    setErrorMsg(null);

    try {
      const cleanName = name.trim();
      if (!cleanName) throw new Error('Nama lengkap tidak boleh kosong');

      // 1. Update Name, Avatar URL & Show Avatar Metadata
      const { error: metaErr } = await supabase.auth.updateUser({
        data: {
          name: cleanName,
          full_name: cleanName,
          avatar_url: avatarUrl.trim(),
          show_avatar: showAvatar,
        }
      });
      if (metaErr) throw metaErr;

      // 2. Update Email (Only if not a Google User & email actually changed)
      if (!isGoogleUser && email.trim().toLowerCase() !== user.email?.toLowerCase()) {
        const cleanEmail = email.trim().toLowerCase();
        if (!cleanEmail) throw new Error('Email tidak boleh kosong');

        const { error: emailErr } = await supabase.auth.updateUser({
          email: cleanEmail
        });
        if (emailErr) throw emailErr;

        setEmailUpdateSent(true);
      }

      // Sync Context
      await refreshUser();
      
      if (!isGoogleUser && email.trim().toLowerCase() !== user.email?.toLowerCase()) {
        toast.success('Profil diperbarui! Silakan cek email baru Anda untuk konfirmasi perubahan email.');
      } else {
        toast.success('Profil berhasil diperbarui!');
        onClose();
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Terjadi kesalahan saat memperbarui profil');
      toast.error('Gagal memperbarui profil');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
      <div className="bg-surface border border-line rounded-3xl w-full max-w-md overflow-hidden animate-scale-in shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-line bg-surface-alt/10">
          <div>
            <h3 className="text-base font-extrabold text-text-primary">✏️ Edit Profil Anda</h3>
            <p className="text-[11px] text-text-muted mt-0.5">Ubah informasi nama, foto profil, dan email</p>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="p-2 text-text-muted hover:text-text-primary hover:bg-surface-hover rounded-full transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content/Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto custom-scrollbar">
          
          {errorMsg && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs px-4 py-3 rounded-2xl flex items-start gap-2.5 animate-pulse">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {emailUpdateSent && (
            <div className="bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-500 text-xs px-4 py-3 rounded-2xl space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                📧 Link Verifikasi Terkirim!
              </p>
              <p className="font-medium leading-relaxed opacity-90">
                Kami telah mengirimkan tautan konfirmasi ke alamat email baru Anda. Silakan verifikasi email baru tersebut untuk merampungkan proses perubahan email Anda.
              </p>
            </div>
          )}

          {/* Photo Section */}
          <div className="space-y-4 pb-4 border-b border-line">
            <div className="flex items-center gap-4">
              <div className="relative group shrink-0">
                <div className="w-16 h-16 rounded-full bg-accent/10 border-2 border-accent/20 flex items-center justify-center font-bold text-2xl text-accent overflow-hidden shadow-inner">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    (name || 'U').charAt(0).toUpperCase()
                  )}
                </div>
              </div>
              <div className="flex-1 space-y-1">
                <label className="block text-[13px] font-bold text-text-primary">Foto Profil Anda</label>
                <p className="text-[10px] text-text-muted">Pilih dari preset premium 3D atau masukkan URL gambar kustom.</p>
              </div>
            </div>

            {/* Presets Grid */}
            <div className="space-y-2">
              <label className="block text-[11px] font-semibold text-text-secondary">Pilih Preset Avatar 3D</label>
              <div className="grid grid-cols-6 gap-2">
                {AVATAR_PRESETS.map((preset) => {
                  const isSelected = avatarUrl === preset.url;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setAvatarUrl(preset.url)}
                      className={clsx(
                        "relative w-full aspect-square rounded-xl overflow-hidden border-2 transition-all hover:scale-105 active:scale-95",
                        isSelected 
                          ? "border-accent ring-2 ring-accent/15" 
                          : "border-line hover:border-text-muted"
                      )}
                      title={preset.label}
                    >
                      <img src={preset.url} alt={preset.label} className="w-full h-full object-cover" />
                      {isSelected && (
                        <div className="absolute inset-0 bg-accent/10 flex items-center justify-center">
                          <div className="w-4 h-4 rounded-full bg-accent flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 text-white" />
                          </div>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom URL Input */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-semibold text-text-secondary">Atau URL Gambar Kustom</label>
              <div className="relative">
                <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
                <input 
                  type="url"
                  placeholder="https://example.com/foto.jpg"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  className="w-full bg-surface border border-line rounded-xl pl-9 pr-3 py-2 text-[11px] font-semibold text-text-primary placeholder:text-text-muted/60 focus:border-accent focus:ring-1 focus:ring-accent/10 outline-none transition-all"
                />
              </div>
            </div>

            {/* Show Avatar Toggle */}
            <div className="flex items-center justify-between bg-surface-alt/30 border border-line p-3.5 rounded-2xl">
              <div className="space-y-0.5 pr-2">
                <label className="block text-[12px] font-bold text-text-primary">Tampilkan Foto di Dasbor</label>
                <p className="text-[10px] text-text-muted">Aktifkan untuk menampilkan foto profil di dasbor utama.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAvatar(!showAvatar)}
                className={clsx(
                  "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                  showAvatar ? "bg-accent" : "bg-line"
                )}
              >
                <span
                  className={clsx(
                    "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                    showAvatar ? "translate-x-5" : "translate-x-0"
                  )}
                />
              </button>
            </div>
          </div>

          {/* Name Input */}
          <div className="space-y-2">
            <label className="block text-[13px] font-semibold text-text-secondary">Nama Tampilan</label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input 
                type="text" 
                placeholder="Masukkan nama tampilan Anda..."
                value={name}
                onChange={e => setName(e.target.value)}
                maxLength={40}
                className="w-full bg-surface border border-line rounded-2xl pl-10 pr-4 py-3 text-[13px] font-semibold text-text-primary placeholder:text-text-muted/60 focus:border-accent focus:ring-1 focus:ring-accent/10 outline-none transition-all"
                required
              />
            </div>
            <p className="text-[10px] text-text-muted leading-relaxed font-medium">
              Nama ini akan ditampilkan pada dasbor utama dan laporan Anda untuk kenyamanan privasi Anda.
            </p>
          </div>

          {/* Email Input */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="block text-[13px] font-semibold text-text-secondary">Alamat Email</label>
              {isGoogleUser && (
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20 font-bold uppercase tracking-wider flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" /> Google Auth
                </span>
              )}
            </div>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input 
                type="email" 
                placeholder="Masukkan alamat email Anda..."
                value={email}
                onChange={e => !isGoogleUser && setEmail(e.target.value)}
                className={clsx(
                  "w-full border rounded-2xl pl-10 pr-4 py-3 text-[13px] font-semibold outline-none transition-all",
                  isGoogleUser
                    ? "bg-surface-alt/45 border-line/60 text-text-muted cursor-not-allowed"
                    : "bg-surface border-line text-text-primary placeholder:text-text-muted/60 focus:border-accent focus:ring-1 focus:ring-accent/10"
                )}
                required
                disabled={isGoogleUser}
              />
            </div>
            <p className="text-[10px] text-text-muted leading-relaxed font-medium">
              {isGoogleUser 
                ? "Email yang terhubung via Google SSO tidak dapat diubah dari dalam aplikasi demi keamanan." 
                : "Mengubah email akan mengirimkan verifikasi ke alamat email baru Anda sebelum benar-benar diaktifkan."
              }
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-3 border-t border-line">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-3 bg-surface border border-line text-text-primary rounded-2xl text-[13px] font-bold hover:bg-surface-hover transition-all active:scale-[0.98]"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3.5 bg-accent hover:bg-accent-dark text-white rounded-2xl text-[13px] font-extrabold shadow-lg shadow-accent/20 transition-all flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-75"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <span>Simpan Perubahan</span>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>,
    document.body
  );
}
