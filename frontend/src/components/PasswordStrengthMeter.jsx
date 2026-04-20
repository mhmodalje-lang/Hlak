/**
 * BARBER HUB - PasswordStrengthMeter (v3.7)
 * Live, inline feedback for password fields.
 * Mirrors backend policy: >=8 chars AND at least one digit (hard requirements).
 * Bonus signals (uppercase, symbol, length >=12) bump the strength score
 * from "Good" to "Strong" to guide users without blocking them.
 */
import React, { useMemo } from 'react';
import { Check, X } from 'lucide-react';

export function getPasswordRules(password) {
  const p = password || '';
  return {
    minLength: p.length >= 8,
    hasDigit: /\d/.test(p),
    hasUpper: /[A-Z]/.test(p),
    hasSymbol: /[!@#$%^&*()_+\-={}[\]|:;"'<>,.?/~`\\]/.test(p),
    longEnough: p.length >= 12,
  };
}

export function getPasswordScore(password) {
  const r = getPasswordRules(password);
  let score = 0;
  if (r.minLength) score += 1;
  if (r.hasDigit) score += 1;
  if (r.hasUpper) score += 1;
  if (r.hasSymbol) score += 1;
  if (r.longEnough) score += 1;
  return score; // 0..5
}

export function isPasswordValid(password) {
  const r = getPasswordRules(password);
  return r.minLength && r.hasDigit;
}

const PasswordStrengthMeter = ({ password = '', language = 'ar' }) => {
  const isRTL = language === 'ar';
  const rules = useMemo(() => getPasswordRules(password), [password]);
  const score = useMemo(() => getPasswordScore(password), [password]);
  const valid = rules.minLength && rules.hasDigit;

  const labels = language === 'ar'
    ? {
        weak: 'ضعيفة',
        fair: 'متوسطة',
        good: 'جيدة',
        strong: 'قوية',
        strongest: 'قوية جداً',
        minLength: '٨ أحرف على الأقل',
        hasDigit: 'يحتوي على رقم',
        hasUpper: 'حرف كبير (موصى به)',
        hasSymbol: 'رمز خاص (موصى به)',
        longEnough: '١٢ حرف أو أكثر (ممتاز)',
      }
    : {
        weak: 'Weak',
        fair: 'Fair',
        good: 'Good',
        strong: 'Strong',
        strongest: 'Excellent',
        minLength: 'At least 8 characters',
        hasDigit: 'Contains a number',
        hasUpper: 'Uppercase letter (recommended)',
        hasSymbol: 'Special symbol (recommended)',
        longEnough: '12+ characters (excellent)',
      };

  const strengthLabel = [labels.weak, labels.weak, labels.fair, labels.good, labels.strong, labels.strongest][score];
  const strengthColor = [
    '#8B1E1E', '#8B1E1E', '#C07B1F', '#D4AF37', '#2E8B57', '#1E6B3A'
  ][score];

  if (!password) return null;

  return (
    <div
      className="mt-2 rounded-xl p-3"
      style={{
        background: 'rgba(20, 14, 10, 0.55)',
        border: '1px solid rgba(212, 175, 55, 0.22)',
        backdropFilter: 'blur(8px)',
        direction: isRTL ? 'rtl' : 'ltr',
      }}
      aria-live="polite"
    >
      {/* Score bar (5 segments) */}
      <div className="flex items-center gap-2 mb-2">
        <div className="flex-1 grid grid-cols-5 gap-1">
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className="h-1.5 rounded-full transition-all duration-300"
              style={{
                background: i < score ? strengthColor : 'rgba(255,255,255,0.08)',
                boxShadow: i < score ? `0 0 8px ${strengthColor}66` : 'none',
              }}
            />
          ))}
        </div>
        <span className="text-xs font-semibold" style={{ color: strengthColor, minWidth: '60px', textAlign: isRTL ? 'left' : 'right' }}>
          {strengthLabel}
        </span>
      </div>

      {/* Rules checklist */}
      <ul className="space-y-1 text-xs">
        <RuleRow ok={rules.minLength} required label={labels.minLength} />
        <RuleRow ok={rules.hasDigit} required label={labels.hasDigit} />
        <RuleRow ok={rules.hasUpper} label={labels.hasUpper} />
        <RuleRow ok={rules.hasSymbol} label={labels.hasSymbol} />
        <RuleRow ok={rules.longEnough} label={labels.longEnough} />
      </ul>

      {!valid && (
        <p className="mt-2 text-[10px]" style={{ color: 'rgba(255,200,200,0.8)' }}>
          {language === 'ar'
            ? 'يجب استيفاء الشروط المميزة بـ★ قبل المتابعة'
            : 'The required (★) rules must be met before continuing'}
        </p>
      )}
    </div>
  );
};

const RuleRow = ({ ok, required = false, label }) => (
  <li className="flex items-center gap-2">
    <span
      className="inline-flex items-center justify-center rounded-full w-4 h-4 shrink-0"
      style={{
        background: ok ? 'rgba(46,139,87,0.2)' : 'rgba(255,255,255,0.05)',
        border: `1px solid ${ok ? '#2E8B57' : 'rgba(255,255,255,0.15)'}`,
      }}
    >
      {ok ? <Check className="w-3 h-3" style={{ color: '#2E8B57' }} /> : <X className="w-3 h-3" style={{ color: 'rgba(255,255,255,0.3)' }} />}
    </span>
    <span style={{ color: ok ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.55)' }}>
      {required && <span style={{ color: '#D4AF37' }}>★ </span>}
      {label}
    </span>
  </li>
);

export default PasswordStrengthMeter;
