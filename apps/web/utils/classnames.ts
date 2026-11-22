/**
 * Simple utility to conditionally join classNames together.
 */
export function cn(...classes: unknown[]): string {
  return classes.filter(Boolean).join(" ");
}
