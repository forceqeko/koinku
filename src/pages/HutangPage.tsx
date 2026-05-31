import { HandCoins } from '@phosphor-icons/react';

export default function HutangPage() {
  return (
    <div className="p-4 md:p-6 min-h-[calc(100vh-144px)] flex items-center justify-center">
      <div className="card max-w-md w-full p-8 text-center bg-surface border border-line shadow-sm space-y-5 animate-scale-in">
        <div className="w-16 h-16 rounded-full bg-accent/5 border border-accent/20 flex items-center justify-center mx-auto text-accent">
          <HandCoins size={32} weight="duotone" className="animate-pulse" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-extrabold text-text-primary">Fitur Hutang & Piutang</h2>
          <p className="text-[12px] text-text-muted leading-relaxed">
            Kami sedang merancang fitur pencatatan hutang dan piutang yang cerdas dan terintegrasi untuk membantu Anda mengelola kewajiban finansial dengan lebih teratur.
          </p>
        </div>
        <div className="pt-2">
          <span className="inline-block text-[11px] font-bold tracking-wider text-accent bg-accent/10 px-3.5 py-1.5 rounded-full uppercase">
            Coming Soon
          </span>
        </div>
      </div>
    </div>
  );
}
