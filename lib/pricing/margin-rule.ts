export function marginFractionToPercent(value: string | number): string {
  const fraction = typeof value === "number" ? value : Number.parseFloat(value);
  if (!Number.isFinite(fraction)) throw new RangeError("Stored margin must be a finite number.");
  return Number((fraction * 100).toFixed(2)).toString();
}

export function marginPercentToFractionString(percent: number): string {
  if (!Number.isFinite(percent) || percent < 0 || percent > 95) {
    throw new RangeError("Margin must be between 0 and 95 percent.");
  }
  return (percent / 100).toFixed(4);
}
