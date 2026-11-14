const variants = {
  primary: 'bg-brand text-white hover:bg-brand-dark',
  secondary: 'bg-white text-navy border border-line hover:bg-surface',
  ghost: 'text-brand hover:bg-brand-soft',
  danger: 'bg-white text-red-600 border border-red-200 hover:bg-red-50',
};
const sizes = { sm: 'h-8 px-3 text-sm', md: 'h-10 px-4 text-sm', lg: 'h-12 px-6 text-base' };

export default function Button({ variant = 'primary', size = 'md', className = '', as: Tag = 'button', ...props }) {
  return (
    <Tag
      className={`inline-flex items-center justify-center gap-2 rounded-control font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    />
  );
}