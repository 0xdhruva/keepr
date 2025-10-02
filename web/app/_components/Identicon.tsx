'use client';

import { generateIdenticonData } from '../_lib/identicon';

interface IdenticonProps {
  address: string;
  size?: number;
}

export function Identicon({ address, size = 40 }: IdenticonProps) {
  if (!address || address.length < 32) {
    return (
      <div
        className="rounded-lg bg-warm-200 flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <svg
          className="text-warm-400"
          width={size * 0.6}
          height={size * 0.6}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
          />
        </svg>
      </div>
    );
  }

  const { colors, grid } = generateIdenticonData(address);
  const cellSize = size / 5;

  return (
    <div
      className="rounded-lg overflow-hidden shadow-sm"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background */}
        <rect width={size} height={size} fill={colors[1]} />

        {/* Grid pattern */}
        {grid.map((row, rowIndex) =>
          row.map((filled, colIndex) =>
            filled ? (
              <rect
                key={`${rowIndex}-${colIndex}`}
                x={colIndex * cellSize}
                y={rowIndex * cellSize}
                width={cellSize}
                height={cellSize}
                fill={colors[0]}
              />
            ) : null
          )
        )}
      </svg>
    </div>
  );
}
