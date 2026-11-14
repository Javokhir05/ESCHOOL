export default function Card({ title, action, className = '', children }) {
  return (
    <section className={`rounded-card border border-line bg-white p-5 shadow-card ${className}`}>
      {(title || action) && (
        <header className="mb-4 flex items-center justify-between gap-3">
          {title && <h3 className="text-base">{title}</h3>}
          {action}
        </header>
      )}
      {children}
    </section>
  );
}