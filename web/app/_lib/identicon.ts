/**
 * Generate a simple identicon from a Solana address
 * Creates a 5x5 grid pattern based on address hash
 */

export function generateIdenticonData(address: string): {
  colors: string[];
  grid: boolean[][];
} {
  // Use first 32 chars of address to generate pattern
  const hash = address.slice(0, 32);

  // Generate color from address
  const hue = parseInt(hash.slice(0, 8), 36) % 360;
  const saturation = 65 + (parseInt(hash.slice(8, 16), 36) % 20); // 65-85%
  const lightness = 55 + (parseInt(hash.slice(16, 24), 36) % 15); // 55-70%

  const primaryColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  const secondaryColor = `hsl(${hue}, ${saturation}%, ${lightness + 15}%)`;

  // Generate 5x5 grid (symmetric)
  const grid: boolean[][] = [];
  for (let row = 0; row < 5; row++) {
    grid[row] = [];
    for (let col = 0; col < 5; col++) {
      // Use symmetry: column 0 = column 4, column 1 = column 3
      const effectiveCol = col > 2 ? 4 - col : col;
      const index = row * 3 + effectiveCol;
      const charCode = hash.charCodeAt(index % hash.length);
      grid[row][col] = charCode % 2 === 0;
    }
  }

  return {
    colors: [primaryColor, secondaryColor],
    grid,
  };
}

/**
 * Chunk a Solana address for better readability
 * Format: AAAA·BBBB·CCCC·...·ZZZZ (first 4, second 4, third 4, ..., last 4)
 */
export function chunkAddress(address: string): string {
  if (address.length < 32) return address;

  const chunks = [];
  // First 3 chunks of 4
  for (let i = 0; i < 12; i += 4) {
    chunks.push(address.slice(i, i + 4));
  }
  // Middle dots
  chunks.push('…');
  // Last chunk of 4
  chunks.push(address.slice(-4));

  return chunks.join('·');
}

/**
 * Get last N characters from address for confirmation
 */
export function getAddressLast4(address: string): string {
  return address.slice(-4).toUpperCase();
}
