// No preflight reset is loaded in this scoped CSS file, so native <button> chrome
// (default border/background) is otherwise left un-overridden — border-0/bg-transparent
// baseline here, variants opt back into a real border explicitly where they want one.
const VARIANTS = {
  primary: 'border-0 bg-nia-orange text-white hover:bg-nia-orange-dark disabled:bg-nia-border disabled:text-nia-text-faint',
  secondary: 'border border-nia-border bg-white text-nia-navy-dark hover:bg-nia-panel disabled:opacity-50',
  ghost: 'border-0 bg-transparent text-nia-text-muted hover:text-nia-navy-dark hover:bg-nia-panel-alt disabled:opacity-50',
  danger: 'border border-nia-error/40 bg-white text-nia-error hover:bg-nia-error/10 disabled:opacity-50',
};

const SIZES = {
  sm: 'px-3 py-1.5 text-xs gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
};

const ICON_SIZES = {
  sm: 'p-1.5',
  md: 'p-2',
};

export default function Button({
  as: As = 'button',
  variant = 'secondary',
  size = 'md',
  icon = false,
  className = '',
  children,
  ...props
}) {
  const sizeCls = icon ? ICON_SIZES[size] : SIZES[size];
  return (
    <As
      className={`inline-flex items-center justify-center rounded-nia-btn font-semibold whitespace-nowrap transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-nia-orange/40 ${VARIANTS[variant]} ${sizeCls} ${className}`}
      {...props}
    >
      {children}
    </As>
  );
}
