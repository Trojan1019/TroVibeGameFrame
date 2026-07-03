import React from 'react';
import { Plus } from 'lucide-react';

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ');

interface ShellScreenProps {
  children: React.ReactNode;
  className?: string;
}

export const ShellScreen: React.FC<ShellScreenProps> = ({ children, className }) => (
  <div
    className={cx(
      'relative w-full h-full overflow-hidden text-[var(--shell-ink)]',
      className,
    )}
    style={{
      backgroundImage: [
        'linear-gradient(180deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 24%)',
        'radial-gradient(circle at 18% 18%, rgba(255,255,255,0.52) 0, rgba(255,255,255,0.52) 10%, transparent 10.5%)',
        'radial-gradient(circle at 82% 20%, rgba(230,238,247,0.72) 0, rgba(230,238,247,0.72) 8%, transparent 8.5%)',
        'radial-gradient(circle at 12% 82%, rgba(245,248,252,0.85) 0, rgba(245,248,252,0.85) 12%, transparent 12.5%)',
        'linear-gradient(180deg, var(--shell-sky) 0%, var(--shell-field-light) 54%, var(--shell-field-dark) 100%)',
      ].join(','),
    }}
  >
    <div className="pointer-events-none absolute inset-0 opacity-40" style={{ backgroundImage: 'linear-gradient(rgba(142,158,177,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(142,158,177,0.08) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[28%] bg-[linear-gradient(180deg,rgba(255,255,255,0)_0%,rgba(188,206,226,0.18)_100%)]" />
    <div className="relative z-10 h-full">{children}</div>
  </div>
);

interface ShellPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  tone?: 'paper' | 'mint' | 'wood';
}

export const ShellPanel = React.forwardRef<HTMLDivElement, ShellPanelProps>(function ShellPanel(
  {
    tone = 'paper',
    className,
    children,
    ...props
  },
  ref,
) {
  const toneClass =
    tone === 'mint'
      ? 'bg-[linear-gradient(180deg,#f8fbff_0%,#eef4fb_100%)]'
      : tone === 'wood'
      ? 'bg-[linear-gradient(180deg,#4b6179_0%,#364a61_100%)] text-white'
      : 'bg-[linear-gradient(180deg,var(--shell-paper-strong)_0%,var(--shell-paper)_100%)]';

  return (
    <div
      ref={ref}
      className={cx(
        'rounded-[26px] border border-[rgba(83,101,122,0.16)] shadow-[0_14px_32px_rgba(38,54,72,0.12)]',
        toneClass,
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
});

interface ShellTitleProps {
  children: React.ReactNode;
  className?: string;
}

export const ShellTitle: React.FC<ShellTitleProps> = ({ children, className }) => (
  <div
    className={cx(
      'inline-flex items-center justify-center rounded-full border border-[rgba(83,101,122,0.14)] bg-[linear-gradient(180deg,#f8fbff_0%,#eef4fb_100%)] px-5 py-1.5 text-[13px] font-black text-[var(--shell-ink)] shadow-[0_8px_18px_rgba(38,54,72,0.08)]',
      className,
    )}
  >
    {children}
  </div>
);

interface ShellButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'neutral' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export const ShellButton: React.FC<ShellButtonProps> = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className,
  children,
  ...props
}) => {
  const variantClass =
    variant === 'secondary'
      ? 'bg-[linear-gradient(180deg,#4b6179_0%,#364a61_100%)] text-white shadow-[0_10px_24px_rgba(38,54,72,0.22)]'
      : variant === 'neutral'
      ? 'bg-[linear-gradient(180deg,var(--shell-paper-strong)_0%,#eef4fb_100%)] text-[var(--shell-ink)] shadow-[0_10px_24px_rgba(38,54,72,0.10)]'
      : variant === 'danger'
      ? 'bg-[linear-gradient(180deg,#f38f8d_0%,#df6867_100%)] text-white shadow-[0_10px_24px_rgba(188,89,87,0.22)]'
      : variant === 'success'
      ? 'bg-[linear-gradient(180deg,#d8f0dc_0%,#a9ddb4_100%)] text-[#305c3b] shadow-[0_10px_24px_rgba(76,133,91,0.18)]'
      : 'bg-[linear-gradient(180deg,#6ea3ff_0%,#5c8df6_100%)] text-white shadow-[0_12px_24px_rgba(92,141,246,0.24)]';

  const sizeClass =
    size === 'sm'
      ? 'min-h-10 rounded-[18px] px-4 text-[13px]'
      : size === 'lg'
      ? 'min-h-14 rounded-[24px] px-5 text-[16px]'
      : 'min-h-12 rounded-[20px] px-4 text-[14px]';

  return (
    <button
      className={cx(
        'inline-flex items-center justify-center gap-2 border border-[rgba(83,101,122,0.16)] font-black transition-all hover:brightness-[1.02] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50',
        sizeClass,
        variantClass,
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
};

interface ShellWalletChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  value: React.ReactNode;
  accent?: 'gold' | 'pink';
  showAdd?: boolean;
}

export const ShellWalletChip = React.forwardRef<HTMLButtonElement, ShellWalletChipProps>(function ShellWalletChip({
  icon,
  value,
  accent = 'gold',
  showAdd = true,
  className,
  children,
  ...props
}, ref) {
  return (
  <button
    ref={ref}
    className={cx(
      'inline-flex items-center gap-1.5 rounded-full border border-[rgba(83,101,122,0.16)] bg-[linear-gradient(180deg,var(--shell-paper-strong)_0%,var(--shell-paper)_100%)] py-1 pl-2 pr-1.5 text-[13px] font-black text-[var(--shell-ink)] shadow-[0_8px_18px_rgba(38,54,72,0.08)] transition-all hover:brightness-[1.02] active:scale-[0.99]',
      accent === 'pink' && 'bg-[linear-gradient(180deg,#ffeef4_0%,#ffd5e6_100%)]',
      className,
    )}
    {...props}
  >
    <span className={cx('flex h-7 w-7 items-center justify-center rounded-full', accent === 'pink' ? 'bg-[#ffe3f0]' : 'bg-[#fff0c4]')}>
      {icon}
    </span>
    <span>{value}</span>
    {children}
    {showAdd && (
      <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full border border-[rgba(83,101,122,0.12)] bg-[var(--shell-leaf)] text-white shadow-[0_4px_10px_rgba(92,141,246,0.24)]">
        <Plus className="h-2.5 w-2.5 stroke-[4]" />
      </span>
    )}
  </button>
  );
});

interface ShellIconActionProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode;
  label?: string;
  tone?: 'wood' | 'leaf' | 'sun' | 'sea' | 'rose';
  count?: number;
  dot?: boolean;
}

export const ShellIconAction = React.forwardRef<HTMLButtonElement, ShellIconActionProps>(function ShellIconAction({
  icon,
  label,
  tone = 'wood',
  count,
  dot = false,
  className,
  ...props
}, ref) {
  const toneClass =
    tone === 'leaf'
      ? 'bg-[linear-gradient(180deg,#e7f5ea_0%,#d7ecdc_100%)] text-[#4d9463]'
      : tone === 'sun'
      ? 'bg-[linear-gradient(180deg,#fff4d8_0%,#ffe9bf_100%)] text-[#c58a2f]'
      : tone === 'sea'
      ? 'bg-[linear-gradient(180deg,#e7f1ff_0%,#d6e6ff_100%)] text-[#5f87cc]'
      : tone === 'rose'
      ? 'bg-[linear-gradient(180deg,#ffeaf2_0%,#ffdce8_100%)] text-[#c76a90]'
      : 'bg-[linear-gradient(180deg,#f2f5fb_0%,#e8eef6_100%)] text-[#60758d]';

  return (
    <button
      ref={ref}
      className={cx('group flex flex-col items-center gap-1 active:translate-y-0.5 transition-transform', className)}
      {...props}
    >
      <span
        className={cx(
          'relative flex h-14 w-14 items-center justify-center rounded-[20px] border border-[rgba(83,101,122,0.14)] shadow-[0_10px_22px_rgba(38,54,72,0.10)] transition-transform group-hover:scale-[1.03]',
          toneClass,
        )}
      >
        {icon}
        {(dot || (count ?? 0) > 0) && (
          <span className="absolute -right-1 -top-1 flex min-h-4 min-w-4 items-center justify-center rounded-full border border-white bg-[#ef5d5d] px-1 text-[10px] font-black leading-none text-white">
            {count && count > 0 ? count : ''}
          </span>
        )}
      </span>
      {label && (
        <span className="rounded-full border border-[rgba(83,101,122,0.12)] bg-[rgba(255,255,255,0.92)] px-2.5 py-0.5 text-[13px] font-black text-[var(--shell-ink)] shadow-[0_6px_12px_rgba(38,54,72,0.06)]">
          {label}
        </span>
      )}
    </button>
  );
});

interface ShellStatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
}

export const ShellStatCard: React.FC<ShellStatCardProps> = ({
  label,
  value,
  icon,
  className,
  ...props
}) => (
  <ShellPanel className={cx('p-4', className)} {...props}>
    <div className="flex items-center gap-2">
      {icon ? <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[rgba(255,233,170,0.72)]">{icon}</span> : null}
      <div>
        <div className="text-[12px] font-black text-[var(--shell-ink-soft)]">{label}</div>
        <div className="mt-0.5 text-2xl font-black text-[var(--shell-ink)]">{value}</div>
      </div>
    </div>
  </ShellPanel>
);
