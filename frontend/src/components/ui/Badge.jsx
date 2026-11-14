// "verified" vs "self-reported" must look different (see project plan).
const tones = {
  blue: 'bg-brand-soft text-brand-dark',
  teal: 'bg-teal-soft text-teal-dark',
  amber: 'bg-amber-soft text-amber',
  violet: 'bg-violet-soft text-violet',
  neutral: 'bg-slate-100 text-ink-muted',
};

export default function Badge({ tone = 'blue', className = '', children }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${tones[tone]} ${className}`}>
      {children}
    </span>
  );
}