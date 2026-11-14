export default function RoleToggle({ value, onChange, label, options }) {
  return (
    <div>
      <p className="mb-1.5 text-sm font-semibold text-navy">{label}</p>
      <div role="radiogroup" aria-label={label} className="grid grid-cols-2 gap-3">
        {options.map((o) => {
          const active = value === o.value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(o.value)}
              className={`h-11 rounded-control border text-sm font-semibold transition-colors ${
                active ? 'border-brand bg-brand-soft text-brand-dark' : 'border-line bg-white text-navy hover:bg-surface'
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}