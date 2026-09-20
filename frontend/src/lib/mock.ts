// Synthetic demo dataset (mock-first, §22 assumption). Swap with real API later.
export interface Disaster {
  id: string;
  name: string;
  collected: number;
  allocated: number;
  spent: number;
  ngos: number;
  alertsResolved: number;
}

export interface NGO {
  id: string;
  name: string;
  score: number;
  components: { name: string; weight: number; value: number }[];
  programs: number;
  spent: number;
}

export interface Alert {
  id: string;
  title: string;
  severity: "low" | "medium" | "high";
  entity: string;
  disaster: string;
  date: string;
  evidence: { label: string; source: string }[];
  score: number;
}

export const disasters: Disaster[] = [
  { id: "flood-assam-2026", name: "Assam Floods 2026", collected: 48500000, allocated: 39200000, spent: 27400000, ngos: 14, alertsResolved: 62 },
  { id: "cyclone-odisha-2026", name: "Odisha Cyclone 2026", collected: 31200000, allocated: 26800000, spent: 18900000, ngos: 9, alertsResolved: 41 },
  { id: "quake-himachal-2026", name: "Himachal Quake Relief 2026", collected: 22400000, allocated: 18100000, spent: 11200000, ngos: 7, alertsResolved: 28 },
];

export const ngos: NGO[] = [
  {
    id: "ngo-seva-sahyog",
    name: "Seva Sahyog Foundation",
    score: 86,
    components: [
      { name: "Timely reporting", weight: 30, value: 27 },
      { name: "Receipt coverage", weight: 30, value: 26 },
      { name: "Budget discipline", weight: 25, value: 21 },
      { name: "Alert responsiveness", weight: 15, value: 12 },
    ],
    programs: 5,
    spent: 8400000,
  },
  {
    id: "ngo-jan-asha",
    name: "Jan Asha Trust",
    score: 74,
    components: [
      { name: "Timely reporting", weight: 30, value: 22 },
      { name: "Receipt coverage", weight: 30, value: 21 },
      { name: "Budget discipline", weight: 25, value: 19 },
      { name: "Alert responsiveness", weight: 15, value: 12 },
    ],
    programs: 3,
    spent: 5200000,
  },
  {
    id: "ngo-relief-grid",
    name: "Relief Grid Collective",
    score: 62,
    components: [
      { name: "Timely reporting", weight: 30, value: 18 },
      { name: "Receipt coverage", weight: 30, value: 17 },
      { name: "Budget discipline", weight: 25, value: 16 },
      { name: "Alert responsiveness", weight: 15, value: 11 },
    ],
    programs: 4,
    spent: 6100000,
  },
];

export const alerts: Alert[] = [
  {
    id: "ALT-1042",
    title: "Duplicate invoice suspected — same amount, same vendor, 2 days apart",
    severity: "high",
    entity: "Sharma Suppliers · INV-8821 / INV-8834",
    disaster: "Assam Floods 2026",
    date: "2026-09-12",
    score: 0.87,
    evidence: [
      { label: "Deterministic rule DUP-AMT-02 matched (amount ₹48,500 × 2)", source: "rule:DUP-AMT-02" },
      { label: "Invoice hash similarity 0.94", source: "doc:INV-8821" },
      { label: "Bank account shared with 3 other vendors", source: "row:vendor_bank_4412" },
    ],
  },
  {
    id: "ALT-1039",
    title: "Price 32% above district reference band for tarpaulin",
    severity: "medium",
    entity: "NorthEast Traders · INV-7710",
    disaster: "Assam Floods 2026",
    date: "2026-09-10",
    score: 0.58,
    evidence: [
      { label: "Unit price ₹1,320 vs reference ₹1,000 (emergency band ±25%)", source: "stat:price_ref_tarpaulin" },
      { label: "New vendor (<30 days since KYC)", source: "row:vendor_9182" },
    ],
  },
  {
    id: "ALT-1031",
    title: "New vendor first invoice — for context only",
    severity: "low",
    entity: "Brahmaputra Logistics · INV-7602",
    disaster: "Assam Floods 2026",
    date: "2026-09-08",
    score: 0.22,
    evidence: [{ label: "Vendor onboarded 6 days ago; no prior history", source: "row:vendor_9204" }],
  },
];

export const lineageExample = {
  donationId: "DON-5000-0917",
  amount: 5000,
  splits: [
    { category: "Food", amount: 2000, color: "#16509E" },
    { category: "Medical", amount: 1500, color: "#1A9D6B" },
    { category: "Shelter", amount: 1000, color: "#E8952F" },
    { category: "Logistics", amount: 500, color: "#1B7F9C" },
  ],
  timeline: ["Donation received", "Allocated to Assam Floods fund", "Assigned to Seva Sahyog · Food program", "Vendor invoices paid", "Receipts verified"],
};

export const copilotCanned = [
  "Which invoices exceed the emergency price band?",
  "Show vendors sharing a bank account",
  "Summarise high-risk alerts for Assam Floods",
];
