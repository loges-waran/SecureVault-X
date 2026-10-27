import React from 'react';
import { ShieldCheck, ShieldAlert, Shield } from 'lucide-react';

interface Props {
  password: string;
}

export const PasswordStrength: React.FC<Props> = ({ password }) => {
  if (!password) return null;

  let score = 0;
  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  // Normalized to 0 - 4
  let strengthLevel = 0;
  let label = 'Very Weak';
  let color = 'bg-rose-500';
  let textColor = 'text-rose-400';

  if (score >= 6) {
    strengthLevel = 4;
    label = 'Military Grade (High Entropy)';
    color = 'bg-emerald-400';
    textColor = 'text-emerald-400';
  } else if (score >= 4) {
    strengthLevel = 3;
    label = 'Strong';
    color = 'bg-cyan-400';
    textColor = 'text-cyan-400';
  } else if (score >= 3) {
    strengthLevel = 2;
    label = 'Moderate';
    color = 'bg-amber-400';
    textColor = 'text-amber-400';
  } else {
    strengthLevel = 1;
    label = 'Weak';
    color = 'bg-rose-500';
    textColor = 'text-rose-400';
  }

  return (
    <div className="mt-2 space-y-1.5 font-mono text-xs">
      <div className="flex justify-between items-center text-slate-400">
        <span className="flex items-center gap-1.5">
          {strengthLevel >= 3 ? (
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
          ) : strengthLevel >= 2 ? (
            <Shield className="w-3.5 h-3.5 text-amber-400" />
          ) : (
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
          )}
          Key Entropy:
        </span>
        <span className={`font-semibold ${textColor}`}>{label}</span>
      </div>

      {/* Strength Bar */}
      <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden flex gap-1">
        <div className={`h-full transition-all duration-300 ${strengthLevel >= 1 ? color : 'bg-transparent'} flex-1`} />
        <div className={`h-full transition-all duration-300 ${strengthLevel >= 2 ? color : 'bg-transparent'} flex-1`} />
        <div className={`h-full transition-all duration-300 ${strengthLevel >= 3 ? color : 'bg-transparent'} flex-1`} />
        <div className={`h-full transition-all duration-300 ${strengthLevel >= 4 ? color : 'bg-transparent'} flex-1`} />
      </div>

      <p className="text-[11px] text-slate-500">
        Derived with Scrypt (N=16384, r=8, p=1). Minimum 12 characters with symbols recommended.
      </p>
    </div>
  );
};
