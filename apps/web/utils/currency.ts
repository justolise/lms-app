/**
 * Currency formatting utilities for Kenya Shillings (KES).
 * Internal monetary values are stored in minor units (cents).
 */

export function formatKes(minorUnits: number | null | undefined): string {
  if (minorUnits === null || minorUnits === undefined) {
    return "KES 0.00";
  }

  const kes = minorUnits / 100;
  return `KES ${kes.toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
