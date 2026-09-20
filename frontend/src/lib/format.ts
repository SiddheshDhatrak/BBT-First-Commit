// INR formatting with Indian numbering system (§19: ₹8,50,000 not ₹850,000)
export function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("en-IN").format(n);
}

export function maskBank(acct: string): string {
  // Show only last-4 (§20 security)
  if (acct.length <= 4) return `•••• ${acct}`;
  return `•••• •••• ${acct.slice(-4)}`;
}

/** Compact INR: Cr / L / K units for KPIs and tickers. */
export function shortINR(v: number): string {
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(2)} Cr`;
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)} L`;
  if (v >= 1000) return `₹${(v / 1000).toFixed(1)}K`;
  return formatINR(v);
}
