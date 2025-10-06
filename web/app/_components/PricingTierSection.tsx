'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export function PricingTierSection() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isInView, setIsInView] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);
  const sectionRef = useRef<HTMLDivElement>(null);
  const tiers = [
    {
      name: 'Base',
      price: '$1',
      description: 'Simple vaults for basic protection',
      features: [
        'Basic Time-Lock Vault',
        'Simple Travel Safe Vault',
        'USDC + SOL support',
        'One beneficiary',
      ],
      color: 'from-gray-400 to-gray-500',
    },
    {
      name: 'Plus',
      price: '$8',
      description: 'Control & flexibility for active users',
      features: [
        'Advanced Travel Safe',
        'Guardian Recovery',
        'Cancelable Vaults',
        'Multi-asset support',
        'Prepaid gas relaying',
      ],
      color: 'from-blue-500 to-blue-600',
      popular: true,
    },
    {
      name: 'Premium',
      price: '$30',
      description: 'Life & community vaults',
      features: [
        'Multi-beneficiary splits',
        'Legacy with yield tokens',
        'Group savings vaults',
        'Charity donations',
        'Trust fund for children',
      ],
      color: 'from-purple-pink-500 to-purple-pink-600',
    },
    {
      name: 'Lifetime',
      price: '$100+',
      description: 'Enterprise & wealth-tier',
      features: [
        'White glove concierge',
        'Employer / 401k vaults',
        'DeFi insurance pools',
        'Fiat off-ramping',
        'Tax filing support',
      ],
      color: 'from-amber-500 to-amber-600',
    },
  ];

  // Auto-rotate tiers every 4 seconds when in viewport
  useEffect(() => {
    if (!isInView || !autoRotate) return;

    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % tiers.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [isInView, autoRotate, tiers.length]);

  // Intersection Observer to detect when section is in viewport
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsInView(entry.isIntersecting);
        });
      },
      { threshold: 0.3 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handleManualSwitch = useCallback((index: number) => {
    setActiveIndex(index);
    setAutoRotate(false);
    // Re-enable auto-rotate after 10 seconds of no interaction
    setTimeout(() => setAutoRotate(true), 10000);
  }, []);

  return (
    <div ref={sectionRef} className="py-12">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-3">Choose Your Plan</h2>
        <p className="text-gray-600 max-w-2xl mx-auto">
          From simple time-locks to enterprise-grade inheritance planning, Keepr has a vault for every need.
        </p>
      </div>

      {/* Mobile: Single tier carousel */}
      <div className="md:hidden">
        {/* Active Tier Card */}
        <div className="relative bg-white rounded-2xl p-6 border-2 transition-all shadow-lg mx-4 border-blue-500">
          {tiers[activeIndex].popular && (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="px-3 py-1 bg-blue-500 text-white text-xs font-bold rounded-full">
                Popular
              </span>
            </div>
          )}

          <div className={`w-12 h-12 bg-gradient-to-br ${tiers[activeIndex].color} rounded-xl mb-4`} />

          <h3 className="text-2xl font-bold text-gray-900 mb-1">{tiers[activeIndex].name}</h3>
          <div className="text-3xl font-bold text-gray-900 mb-2">{tiers[activeIndex].price}</div>
          <p className="text-sm text-gray-600 mb-4">{tiers[activeIndex].description}</p>

          <ul className="space-y-2 mb-6">
            {tiers[activeIndex].features.map((feature, index) => (
              <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                <svg className="w-5 h-5 text-sage-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span>{feature}</span>
              </li>
            ))}
          </ul>

          <button className="w-full px-4 py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-semibold transition-colors">
            Get Started
          </button>
        </div>

        {/* Navigation Dots */}
        <div className="flex items-center justify-center gap-2 mt-6">
          {tiers.map((tier, index) => (
            <button
              key={tier.name}
              onClick={() => handleManualSwitch(index)}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === activeIndex
                  ? 'w-8 bg-blue-500'
                  : 'w-2 bg-gray-300 hover:bg-gray-400'
              }`}
              aria-label={`View ${tier.name} plan`}
            />
          ))}
        </div>
      </div>

      {/* Desktop: Grid layout */}
      <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {tiers.map((tier) => (
          <div
            key={tier.name}
            className={`relative bg-white rounded-2xl p-6 border-2 transition-all hover:shadow-lg ${
              tier.popular ? 'border-blue-500' : 'border-gray-200'
            }`}
          >
            {tier.popular && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="px-3 py-1 bg-blue-500 text-white text-xs font-bold rounded-full">
                  Popular
                </span>
              </div>
            )}

            <div className={`w-12 h-12 bg-gradient-to-br ${tier.color} rounded-xl mb-4`} />

            <h3 className="text-2xl font-bold text-gray-900 mb-1">{tier.name}</h3>
            <div className="text-3xl font-bold text-gray-900 mb-2">{tier.price}</div>
            <p className="text-sm text-gray-600 mb-4">{tier.description}</p>

            <ul className="space-y-2 mb-6">
              {tier.features.map((feature, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                  <svg className="w-5 h-5 text-sage-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <button className="w-full px-4 py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-semibold transition-colors">
              Get Started
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
