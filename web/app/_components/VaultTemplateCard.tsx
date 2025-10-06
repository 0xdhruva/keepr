'use client';

import Link from 'next/link';

export type VaultTier = 'base' | 'plus' | 'premium' | 'lifetime';

interface VaultTemplateCardProps {
  name: string;
  description: string;
  tier: VaultTier;
  price: string;
  badge: string;
  icon: React.ReactNode;
  templateSlug: string;
  colorScheme: 'green' | 'blue' | 'purple' | 'gold';
}

const colorSchemes = {
  green: {
    bg: 'from-neon-green-400 to-neon-green-500',
    badgeBg: 'bg-neon-green-600',
    badgeText: 'text-white',
    text: 'text-neon-green-900',
    iconBg: 'bg-neon-green-500',
    arrow: 'text-neon-green-800',
  },
  blue: {
    bg: 'from-blue-400 to-blue-500',
    badgeBg: 'bg-blue-600',
    badgeText: 'text-white',
    text: 'text-blue-900',
    iconBg: 'bg-blue-500',
    arrow: 'text-blue-800',
  },
  purple: {
    bg: 'from-purple-pink-400 to-purple-pink-500',
    badgeBg: 'bg-purple-pink-600',
    badgeText: 'text-white',
    text: 'text-purple-pink-900',
    iconBg: 'bg-purple-pink-500',
    arrow: 'text-purple-pink-800',
  },
  gold: {
    bg: 'from-amber-400 to-amber-500',
    badgeBg: 'bg-amber-600',
    badgeText: 'text-white',
    text: 'text-amber-900',
    iconBg: 'bg-amber-500',
    arrow: 'text-amber-800',
  },
};

const tierInfo = {
  base: { label: 'Base', color: 'text-gray-700' },
  plus: { label: 'Plus', color: 'text-blue-700' },
  premium: { label: 'Premium', color: 'text-purple-pink-700' },
  lifetime: { label: 'Lifetime', color: 'text-amber-700' },
};

export function VaultTemplateCard({
  name,
  description,
  tier,
  price,
  badge,
  icon,
  templateSlug,
  colorScheme,
}: VaultTemplateCardProps) {
  const colors = colorSchemes[colorScheme];
  const tierData = tierInfo[tier];

  return (
    <Link href={`/create?template=${templateSlug}&tier=${tier}`} className="block group">
      <div className={`relative bg-gradient-to-br ${colors.bg} rounded-2xl p-6 min-w-[280px] w-[280px] h-[220px] flex flex-col shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]`}>
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          {/* Icon */}
          <div className={`w-12 h-12 ${colors.iconBg} bg-white/20 rounded-xl flex items-center justify-center`}>
            {icon}
          </div>

          {/* Badge */}
          <div className={`${colors.badgeBg} ${colors.badgeText} px-3 py-1 rounded-full flex items-center gap-1.5`}>
            <span className="text-xs font-bold">{badge}</span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1">
          <h3 className={`text-xl font-bold ${colors.text} mb-2`}>{name}</h3>
          <p className={`text-sm ${colors.text} opacity-90 line-clamp-2`}>
            {description}
          </p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-white/20">
          <div>
            <div className={`text-xs ${tierData.color} font-semibold uppercase`}>{tierData.label}</div>
            <div className={`text-lg font-bold ${colors.text}`}>{price}</div>
          </div>

          {/* Arrow */}
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center group-hover:bg-white/30 transition-colors">
            <svg className={`w-5 h-5 ${colors.arrow} group-hover:translate-x-0.5 transition-transform`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
    </Link>
  );
}
