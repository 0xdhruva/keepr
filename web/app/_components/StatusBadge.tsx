'use client';

interface StatusBadgeProps {
  status: 'locked' | 'unlocked' | 'released';
  className?: string;
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const styles = {
    locked: 'bg-amber-100 text-amber-700 border-amber-200',
    unlocked: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    released: 'bg-warm-100 text-warm-600 border-warm-200',
  };

  const labels = {
    locked: 'Locked',
    unlocked: 'Ready to Release',
    released: 'Released',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border uppercase tracking-wide ${styles[status]} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${status === 'unlocked' ? 'bg-emerald-500 animate-pulse' : status === 'locked' ? 'bg-amber-500' : 'bg-warm-400'}`} />
      {labels[status]}
    </span>
  );
}
