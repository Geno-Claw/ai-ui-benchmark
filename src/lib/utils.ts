/**
 * Format a cost value (in USD) for display.
 * Returns "—" for undefined/null, uses 4 decimal places for small amounts.
 */
export function formatCost(cost?: number | null): string {
  if (cost === undefined || cost === null) return "—";
  if (cost < 0.01) return `$${cost.toFixed(4)}`;
  return `$${cost.toFixed(2)}`;
}
