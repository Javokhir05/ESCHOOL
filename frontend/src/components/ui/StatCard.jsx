const tones = { blue: 'text-brand', teal: 'text-teal-dark', amber: 'text-amber', violet: 'text-violet' };

export default function StatCard({ value, label, tone = 'blue' }) {
  return (
    <div className="rounded-card border border-line bg-white p-4 shadow-card">
      <p className={`text-3xl font-bold ${tones[tone]}`}>{value}</p>
      <p className="mt-1 text-sm text-ink-muted">{label}</p>
    </div>
  );
}