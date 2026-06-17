"use client";

import { useMemo, useState } from "react";

type Tab = "home" | "calculator" | "audit" | "settings";
type TaxpayerId = "general" | "women" | "senior" | "disabled" | "freedomFighter";
type AssessmentType = "regular" | "new";
type IncomePlaceId = "dhaka_chattogram" | "other_city" | "outside_city";
type InvestmentId = "dse" | "sanchaypatra" | "dps" | "mutual" | "insurance";

type SalaryBreakdown = {
  grossSalary: number;
  basicSalary: number;
  houseRent: number;
  medical: number;
  conveyance: number;
  otherAllowances: number;
  yearlyBonus: number;
  totalIncome: number;
  totalExemption: number;
  taxableIncome: number;
};

type TaxBreakdown = {
  label: string;
  amount: number;
  rate: number;
  tax: number;
};

const TAX_YEAR = "২০২৫-২৬";
const maxTotalExemption = 500000;
const maxInvestmentRebate = 1000000;
const incomeBasedInvestmentRebateRate = 0.03;
const investmentRebateRate = 0.15;

const taxpayerTypes: Array<{ id: TaxpayerId; label: string; limit: number; icon: string }> = [
  { id: "general", label: "সাধারণ করদাতা", limit: 375000, icon: "👤" },
  { id: "women", label: "মহিলা করদাতা", limit: 425000, icon: "♀" },
  { id: "senior", label: "সিনিয়র সিটিজেন (৬৫+)", limit: 425000, icon: "65+" },
  { id: "disabled", label: "তৃতীয় লিঙ্গ / প্রতিবন্ধী", limit: 500000, icon: "✓" },
  { id: "freedomFighter", label: "মুক্তিযোদ্ধা / জুলাই যোদ্ধা", limit: 525000, icon: "★" },
];

const incomePlaces: Array<{ id: IncomePlaceId; label: string; minimumTax: number }> = [
  { id: "dhaka_chattogram", label: "ঢাকা ও চট্টগ্রাম সিটি কর্পোরেশন", minimumTax: 5000 },
  { id: "other_city", label: "অন্যান্য সিটি কর্পোরেশন", minimumTax: 4000 },
  { id: "outside_city", label: "সিটি কর্পোরেশনের বাইরে", minimumTax: 3000 },
];

const investmentOptions: Array<{ id: InvestmentId; label: string }> = [
  { id: "dse", label: "DSE শেয়ার" },
  { id: "sanchaypatra", label: "সঞ্চয়পত্র" },
  { id: "dps", label: "DPS (ডিপোজিট পেনশন স্কিম)" },
  { id: "mutual", label: "মিউচুয়াল ফান্ড" },
  { id: "insurance", label: "লাইফ ইন্স্যুরেন্স" },
];

const initialInvestments: Record<InvestmentId, string> = {
  dse: "",
  sanchaypatra: "",
  dps: "",
  mutual: "",
  insurance: "",
};

function toBanglaDigits(value: string | number) {
  const map = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];
  return String(value).replace(/\d/g, (digit) => map[Number(digit)]);
}

function normalizeNumber(value: string, maxLength = 13) {
  const normalized = value
    .replace(/[০-৯]/g, (digit) => String("০১২৩৪৫৬৭৮৯".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/\D/g, "");
  return normalized.slice(0, maxLength);
}

function formatNumber(value: number) {
  return toBanglaDigits(new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Math.round(value || 0)));
}

function formatPercent(value: number) {
  const text = value.toFixed(2).replace(/\.?0+$/, "");
  return `${toBanglaDigits(text)}%`;
}

function parseMoney(value: string) {
  return Number(normalizeNumber(value)) || 0;
}

function calculateSalaryBreakdown(grossSalary: number, yearlyBonus: number): SalaryBreakdown {
  const conveyance = Math.round(grossSalary * 0.05);
  const basicSalary = Math.round((grossSalary - conveyance) / 1.6);
  const houseRent = Math.round(basicSalary * 0.5);
  const medical = Math.round(basicSalary * 0.1);
  const otherAllowances = grossSalary - (basicSalary + houseRent + medical + conveyance);
  const totalIncome = grossSalary * 12 + yearlyBonus;
  const totalExemption = Math.min(Math.round(totalIncome / 3), maxTotalExemption);

  return {
    grossSalary,
    basicSalary,
    houseRent,
    medical,
    conveyance,
    otherAllowances,
    yearlyBonus,
    totalIncome,
    totalExemption,
    taxableIncome: Math.max(0, totalIncome - totalExemption),
  };
}

function calculateInvestmentRebate(investments: Record<InvestmentId, string>, taxableIncome: number) {
  const totalInvestment = Object.values(investments).reduce((sum, value) => sum + parseMoney(value), 0);
  const rebateByInvestment = totalInvestment * investmentRebateRate;
  const rebateByIncome = taxableIncome * incomeBasedInvestmentRebateRate;
  return {
    totalInvestment,
    rebate: Math.min(rebateByInvestment, rebateByIncome, maxInvestmentRebate),
  };
}

function calculateTax(income: number, taxFreeLimit: number, investmentRebate: number, minimumTax: number) {
  if (income <= taxFreeLimit) {
    return {
      rawTax: 0,
      taxAfterRebate: 0,
      taxableAmount: 0,
      isMinimumTax: false,
      breakdown: [] as TaxBreakdown[],
    };
  }

  const slabs = [
    { size: 300000, rate: 0.1 },
    { size: 400000, rate: 0.15 },
    { size: 500000, rate: 0.2 },
    { size: 2000000, rate: 0.25 },
    { size: Number.MAX_SAFE_INTEGER, rate: 0.3 },
  ];

  let remainingIncome = income - taxFreeLimit;
  let currentStart = taxFreeLimit;
  let rawTax = 0;
  const breakdown: TaxBreakdown[] = [];

  for (const slab of slabs) {
    if (remainingIncome <= 0) break;
    const amount = Math.min(remainingIncome, slab.size);
    const tax = amount * slab.rate;
    rawTax += tax;
    breakdown.push({
      label: `৳${formatNumber(currentStart)} থেকে পরবর্তী ৳${formatNumber(amount)}`,
      amount,
      rate: slab.rate * 100,
      tax,
    });
    remainingIncome -= amount;
    currentStart += amount;
  }

  const taxAfterRebate = rawTax - investmentRebate > minimumTax ? rawTax - investmentRebate : minimumTax;

  return {
    rawTax,
    taxAfterRebate,
    taxableAmount: income - taxFreeLimit,
    isMinimumTax: taxAfterRebate === minimumTax,
    breakdown,
  };
}

function StatPill({ label, value, tone = "ink" }: { label: string; value: string; tone?: "ink" | "green" | "red" | "blue" }) {
  return (
    <div className="stat-pill">
      <span>{label}</span>
      <strong className={`tone-${tone}`}>{value}</strong>
    </div>
  );
}

function IconTile({ children, soft = false }: { children: React.ReactNode; soft?: boolean }) {
  return <span className={soft ? "icon-tile soft" : "icon-tile"}>{children}</span>;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [grossSalary, setGrossSalary] = useState("");
  const [yearlyBonus, setYearlyBonus] = useState("");
  const [taxpayerId, setTaxpayerId] = useState<TaxpayerId>("general");
  const [assessmentType, setAssessmentType] = useState<AssessmentType>("regular");
  const [incomePlaceId, setIncomePlaceId] = useState<IncomePlaceId>("dhaka_chattogram");
  const [investments, setInvestments] = useState<Record<InvestmentId, string>>(initialInvestments);
  const [tin, setTin] = useState("");
  const [auditChecked, setAuditChecked] = useState(false);
  const [themeName, setThemeName] = useState("Classic Green");

  const currentTaxpayer = taxpayerTypes.find((item) => item.id === taxpayerId) ?? taxpayerTypes[0];
  const currentIncomePlace = incomePlaces.find((item) => item.id === incomePlaceId) ?? incomePlaces[0];
  const minimumTax = assessmentType === "new" ? 1000 : currentIncomePlace.minimumTax;
  const salary = useMemo(
    () => calculateSalaryBreakdown(parseMoney(grossSalary), parseMoney(yearlyBonus)),
    [grossSalary, yearlyBonus],
  );
  const investment = useMemo(() => calculateInvestmentRebate(investments, salary.taxableIncome), [investments, salary.taxableIncome]);
  const tax = useMemo(
    () => calculateTax(salary.taxableIncome, currentTaxpayer.limit, investment.rebate, minimumTax),
    [currentTaxpayer.limit, investment.rebate, minimumTax, salary.taxableIncome],
  );
  const monthlyTax = Math.round(tax.taxAfterRebate / 12);
  const yearlyNetIncome = Math.max(0, salary.totalIncome - tax.taxAfterRebate);
  const effectiveRate = salary.totalIncome === 0 ? 0 : (tax.taxAfterRebate * 100) / salary.totalIncome;

  const updateInvestment = (id: InvestmentId, value: string) => {
    setInvestments((current) => ({ ...current, [id]: normalizeNumber(value) }));
  };

  const resetCalculator = () => {
    setGrossSalary("");
    setYearlyBonus("");
    setTaxpayerId("general");
    setAssessmentType("regular");
    setIncomePlaceId("dhaka_chattogram");
    setInvestments(initialInvestments);
  };

  const navItems: Array<{ id: Tab; label: string; icon: string }> = [
    { id: "home", label: "হোম", icon: "⌂" },
    { id: "calculator", label: "ক্যালকুলেটর", icon: "▤" },
    { id: "audit", label: "অডিট", icon: "◈" },
    { id: "settings", label: "সেটিংস", icon: "⚙" },
  ];

  return (
    <main className="web-stage">
      <section className="phone-app" aria-label="Tax Calculator Bd web app">
        {activeTab === "home" ? (
          <div className="screen-content home-screen">
            <div className="top-bar">
              <h1>Tax Calculator Bd</h1>
              <button className="bell-button" type="button" aria-label="নোটিফিকেশন">
                ♢
              </button>
            </div>

            <div className="welcome-copy">
              <h2>স্বাগতম!</h2>
              <p>{TAX_YEAR} করবর্ষের জন্য আপনার ট্যাক্স সারসংক্ষেপ প্রস্তুত আছে।</p>
            </div>

            <button className="service-card" type="button" onClick={() => setActiveTab("calculator")}>
              <div className="service-head">
                <IconTile>▥</IconTile>
                <span className="badge">করবর্ষ {TAX_YEAR}</span>
              </div>
              <h3>ট্যাক্স ক্যালকুলেটর</h3>
              <p>আপনার বর্তমান আয়, বেতন কাঠামো এবং ছাড়ের তথ্য অনুযায়ী আয়কর হিসাব করুন।</p>
              <span className="card-action">এখন হিসাব করুন</span>
            </button>

            <button className="service-card" type="button" onClick={() => setActiveTab("audit")}>
              <div className="service-head">
                <IconTile>盾</IconTile>
                <span className="badge pale">অফলাইন ও প্রাইভেট</span>
              </div>
              <h3>অডিট চেক</h3>
              <p>আপনার TIN অডিটে আছে কি না তা সম্পূর্ণ অফলাইনে দ্রুত যাচাই করুন।</p>
              <span className="card-action">স্ট্যাটাস দেখুন</span>
            </button>

            <div className="service-card compact">
              <div className="service-head">
                <IconTile soft>৳</IconTile>
                <span className="badge">সারসংক্ষেপ</span>
              </div>
              <div className="compact-grid">
                <StatPill label="করযোগ্য আয়" value={formatNumber(salary.taxableIncome)} />
                <StatPill label="প্রদেয় কর" value={formatNumber(tax.taxAfterRebate)} tone="red" />
              </div>
            </div>
          </div>
        ) : null}

        {activeTab === "calculator" ? (
          <div className="screen-content calculator-screen">
            <div className="calc-top">
              <div>
                <h1>আয়কর ক্যালকুলেটর</h1>
                <p>করবর্ষ {TAX_YEAR}</p>
              </div>
              <div className="top-actions">
                <button type="button" onClick={resetCalculator} aria-label="রিসেট">
                  ↻
                </button>
                <button type="button" aria-label="তথ্য">
                  i
                </button>
              </div>
            </div>

            <section className="overview-card">
              <div className="overview-head">
                <span>
                  সারসংক্ষেপ
                  <strong>{currentTaxpayer.label}</strong>
                </span>
                <IconTile soft>▥</IconTile>
              </div>
              <div className="stat-row">
                <StatPill label="করযোগ্য আয়" value={formatNumber(salary.taxableIncome)} />
                <StatPill label="প্রদেয় কর" value={formatNumber(tax.taxAfterRebate)} tone="red" />
                <StatPill label="বিনিয়োগ" value={formatNumber(investment.totalInvestment)} tone="green" />
                <StatPill label="রিবেট" value={formatNumber(investment.rebate)} tone="blue" />
                <StatPill label="কর হার" value={formatPercent(effectiveRate)} tone="green" />
                <StatPill label="মাসিক কর" value={formatNumber(monthlyTax)} tone="red" />
              </div>
            </section>

            <section className="panel-card">
              <div className="section-label">
                <strong>করদাতার শ্রেণী</strong>
                <span>আপনার করদাতার শ্রেণী নির্বাচন করুন</span>
              </div>
              <div className="chip-row">
                {taxpayerTypes.map((type) => (
                  <button
                    className={type.id === taxpayerId ? "choice-chip selected" : "choice-chip"}
                    key={type.id}
                    type="button"
                    onClick={() => setTaxpayerId(type.id)}
                  >
                    <span>{type.icon}</span>
                    {type.label}
                  </button>
                ))}
              </div>
            </section>

            <section className="panel-card">
              <div className="section-label">
                <strong>অ্যাসেসমেন্ট ও আয়ের স্থান</strong>
                <span>ন্যূনতম কর নির্ধারণের জন্য নির্বাচন করুন</span>
              </div>
              <button
                className={assessmentType === "regular" ? "rule-row active" : "rule-row"}
                type="button"
                onClick={() => setAssessmentType("regular")}
              >
                <span>✓</span>
                <b>সাধারণ অ্যাসেসমেন্ট</b>
                <small>ন্যূনতম কর আয়ের স্থানের উপর নির্ভর করবে</small>
              </button>
              <button
                className={assessmentType === "new" ? "rule-row active" : "rule-row"}
                type="button"
                onClick={() => setAssessmentType("new")}
              >
                <span>✓</span>
                <b>নতুন অ্যাসেসমেন্ট</b>
                <small>নতুন অ্যাসেসমেন্টের ন্যূনতম কর {formatNumber(1000)}</small>
              </button>
              <div className="place-list">
                {incomePlaces.map((place) => (
                  <button
                    className={place.id === incomePlaceId ? "rule-row active" : "rule-row"}
                    key={place.id}
                    type="button"
                    onClick={() => setIncomePlaceId(place.id)}
                  >
                    <span>✓</span>
                    <b>{place.label}</b>
                    <small>করমুক্ত সীমা ছাড়ালে ন্যূনতম কর {formatNumber(place.minimumTax)}</small>
                  </button>
                ))}
              </div>
              <p className="notice-pill">
                {assessmentType === "new"
                  ? `ন্যূনতম কর: ${formatNumber(1000)}`
                  : `নির্বাচিত এলাকার ন্যূনতম কর: ${formatNumber(minimumTax)}`}
              </p>
            </section>

            <section className="panel-card">
              <div className="section-label">
                <strong>আয়ের তথ্য</strong>
                <span>মাসিক গ্রস বেতন ও বার্ষিক বোনাস লিখুন</span>
              </div>
              <label className="money-input">
                <span>মাসিক গ্রস বেতন</span>
                <input
                  inputMode="numeric"
                  placeholder="যেমন ৬০,০০০"
                  value={grossSalary ? formatNumber(parseMoney(grossSalary)) : ""}
                  onChange={(event) => setGrossSalary(normalizeNumber(event.target.value))}
                />
              </label>
              <label className="money-input">
                <span>বার্ষিক বোনাস</span>
                <input
                  inputMode="numeric"
                  placeholder="যেমন ১,২০,০০০"
                  value={yearlyBonus ? formatNumber(parseMoney(yearlyBonus)) : ""}
                  onChange={(event) => setYearlyBonus(normalizeNumber(event.target.value))}
                />
              </label>
            </section>

            <section className="panel-card">
              <div className="section-label">
                <strong>বেতন কাঠামো</strong>
                <span>অ্যাপের একই হিসাব অনুযায়ী অটো ব্রেকডাউন</span>
              </div>
              <div className="breakdown-grid">
                <StatPill label="বেসিক" value={formatNumber(salary.basicSalary)} />
                <StatPill label="বাসা ভাড়া" value={formatNumber(salary.houseRent)} />
                <StatPill label="মেডিকেল" value={formatNumber(salary.medical)} />
                <StatPill label="যাতায়াত" value={formatNumber(salary.conveyance)} />
                <StatPill label="মোট আয়" value={formatNumber(salary.totalIncome)} tone="green" />
                <StatPill label="ছাড়" value={formatNumber(salary.totalExemption)} tone="blue" />
              </div>
            </section>

            <section className="panel-card">
              <div className="section-label">
                <strong>বিনিয়োগ রিবেট</strong>
                <span>DSE, সঞ্চয়পত্র, DPS, ফান্ড ও ইন্স্যুরেন্স</span>
              </div>
              {investmentOptions.map((item) => (
                <label className="money-input slim" key={item.id}>
                  <span>{item.label}</span>
                  <input
                    inputMode="numeric"
                    placeholder="০"
                    value={investments[item.id] ? formatNumber(parseMoney(investments[item.id])) : ""}
                    onChange={(event) => updateInvestment(item.id, event.target.value)}
                  />
                </label>
              ))}
              <p className="notice-pill">অর্জিত রিবেট: {formatNumber(investment.rebate)}</p>
            </section>

            <section className="panel-card">
              <div className="section-label">
                <strong>কর ব্রেকডাউন</strong>
                <span>{tax.isMinimumTax ? "ন্যূনতম কর প্রযোজ্য হয়েছে" : "স্ল্যাব অনুযায়ী হিসাব"}</span>
              </div>
              {salary.taxableIncome <= currentTaxpayer.limit ? (
                <div className="tax-free-card">
                  <b>আপনার আয় করমুক্ত সীমার মধ্যে আছে</b>
                  <span>করমুক্ত সীমা: {formatNumber(currentTaxpayer.limit)}</span>
                </div>
              ) : (
                <div className="tax-lines">
                  {tax.breakdown.map((row) => (
                    <div key={row.label}>
                      <span>{row.label}</span>
                      <b>{formatNumber(row.tax)}</b>
                      <small>{formatPercent(row.rate)}</small>
                    </div>
                  ))}
                  <div className="total-line">
                    <span>রিবেট বাদে প্রদেয় কর</span>
                    <b>{formatNumber(tax.taxAfterRebate)}</b>
                  </div>
                  <div className="total-line soft">
                    <span>বার্ষিক কর পরবর্তী আয়</span>
                    <b>{formatNumber(yearlyNetIncome)}</b>
                  </div>
                </div>
              )}
            </section>
          </div>
        ) : null}

        {activeTab === "audit" ? (
          <div className="screen-content audit-screen">
            <div className="calc-top">
              <div>
                <h1>অডিট চেক</h1>
                <p>অফলাইন ও প্রাইভেট</p>
              </div>
              <IconTile soft>盾</IconTile>
            </div>
            <section className="service-card audit-panel">
              <h3>TIN অডিট স্ট্যাটাস</h3>
              <p>আপনার TIN নম্বর লিখে দ্রুত যাচাই করুন। এই ওয়েব ডেমোতে তথ্য আপনার ব্রাউজারেই থাকে।</p>
              <label className="money-input">
                <span>TIN নম্বর</span>
                <input
                  inputMode="numeric"
                  placeholder="১২ সংখ্যার TIN"
                  value={tin}
                  onChange={(event) => {
                    setTin(normalizeNumber(event.target.value, 12));
                    setAuditChecked(false);
                  }}
                />
              </label>
              <button className="card-action" type="button" onClick={() => setAuditChecked(true)}>
                স্ট্যাটাস দেখুন
              </button>
              {auditChecked ? (
                <div className={tin.length === 12 ? "audit-result clear" : "audit-result warn"}>
                  <b>{tin.length === 12 ? "ফরম্যাট ঠিক আছে" : "TIN নম্বর ১২ ডিজিট হওয়া দরকার"}</b>
                  <span>
                    {tin.length === 12
                      ? "অডিট ডাটাসেট সংযুক্ত হলে এখানে মিল পাওয়া/না পাওয়া দেখানো যাবে।"
                      : "সঠিক TIN দিয়ে আবার চেষ্টা করুন।"}
                  </span>
                </div>
              ) : null}
            </section>
          </div>
        ) : null}

        {activeTab === "settings" ? (
          <div className="screen-content settings-screen">
            <div className="calc-top">
              <div>
                <h1>সেটিংস</h1>
                <p>ওয়েব সংস্করণ</p>
              </div>
              <IconTile soft>⚙</IconTile>
            </div>
            <section className="panel-card">
              <div className="section-label">
                <strong>থিম প্যালেট</strong>
                <span>Android app-এর Classic Green look</span>
              </div>
              {["Classic Green", "Olive", "Midnight Black"].map((name) => (
                <button
                  className={themeName === name ? "rule-row active" : "rule-row"}
                  key={name}
                  type="button"
                  onClick={() => setThemeName(name)}
                >
                  <span>✓</span>
                  <b>{name}</b>
                  <small>{name === "Classic Green" ? "বর্তমানে ওয়েব UI এই স্টাইলে বানানো" : "পরবর্তী আপডেটে পুরো থিম বদলাবে"}</small>
                </button>
              ))}
            </section>
            <section className="panel-card">
              <div className="section-label">
                <strong>অ্যাপ তথ্য</strong>
                <span>BDTaxCalculator web edition</span>
              </div>
              <div className="settings-list">
                <span>করবর্ষ</span>
                <b>{TAX_YEAR}</b>
                <span>প্যাকেজ</span>
                <b>com.maruf.bdtaxcalculator</b>
                <span>ভাষা</span>
                <b>বাংলা</b>
              </div>
            </section>
          </div>
        ) : null}

        <nav className="bottom-nav" aria-label="App navigation">
          {navItems.map((item) => (
            <button
              className={activeTab === item.id ? "nav-item active" : "nav-item"}
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
      </section>
    </main>
  );
}
