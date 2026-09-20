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
