"use client";

import { useMemo, useState } from "react";

type TaxpayerType = "general" | "femaleSenior" | "disabled" | "freedomFighter";
type CityType = "dhakaChattogram" | "otherCity" | "otherArea";

type IncomeKey =
  | "salary"
  | "business"
  | "house"
  | "capitalGain"
  | "agriculture"
  | "other";

type IncomeInputs = Record<IncomeKey, number>;

const taxpayerOptions: Array<{
  value: TaxpayerType;
  label: string;
  allowance: number;
}> = [
  { value: "general", label: "General taxpayer", allowance: 375000 },
  { value: "femaleSenior", label: "Female or 65+ taxpayer", allowance: 425000 },
  { value: "disabled", label: "Person with disability", allowance: 500000 },
  { value: "freedomFighter", label: "Gazetted freedom fighter", allowance: 525000 },
];

const cityOptions: Array<{ value: CityType; label: string; minimumTax: number }> = [
  { value: "dhakaChattogram", label: "Dhaka or Chattogram city corporation", minimumTax: 5000 },
  { value: "otherCity", label: "Other city corporation", minimumTax: 4000 },
  { value: "otherArea", label: "Other area", minimumTax: 3000 },
];

const incomeFields: Array<{ key: IncomeKey; label: string; hint: string }> = [
  { key: "salary", label: "Salary income", hint: "Basic, bonus, allowances" },
  { key: "business", label: "Business income", hint: "Profit from trade or profession" },
  { key: "house", label: "House property", hint: "Net rent after allowed expenses" },
  { key: "capitalGain", label: "Capital gain", hint: "Sale of asset or shares" },
  { key: "agriculture", label: "Agriculture income", hint: "Net agricultural income" },
  { key: "other", label: "Other income", hint: "Bank interest, royalty, etc." },
];

const defaultIncome: IncomeInputs = {
  salary: 840000,
  business: 0,
  house: 0,
  capitalGain: 0,
  agriculture: 0,
  other: 30000,
};

const slabRates = [
  { limit: 300000, rate: 0.1 },
  { limit: 400000, rate: 0.15 },
  { limit: 500000, rate: 0.2 },
  { limit: 2000000, rate: 0.25 },
  { limit: Number.POSITIVE_INFINITY, rate: 0.3 },
];

const quickExamples = [
  { label: "New job", salary: 540000, other: 10000, investment: 30000, assets: 1200000 },
  { label: "Mid career", salary: 1200000, other: 45000, investment: 180000, assets: 5500000 },
  { label: "Business owner", salary: 0, business: 2400000, house: 240000, investment: 450000, assets: 18000000 },
];

function formatBDT(value: number) {
  return new Intl.NumberFormat("en-BD", {
    style: "currency",
    currency: "BDT",
    maximumFractionDigits: 0,
  }).format(Math.round(value));
}

function calculateBaseTax(taxableIncome: number, allowance: number) {
  let remaining = Math.max(0, taxableIncome - allowance);
  let total = 0;
  const rows: Array<{ label: string; amount: number; rate: number; tax: number }> = [];

  if (allowance > 0) {
    rows.push({
      label: `First ${formatBDT(allowance)}`,
      amount: Math.min(taxableIncome, allowance),
      rate: 0,
      tax: 0,
    });
  }

  for (const slab of slabRates) {
    if (remaining <= 0) break;

    const amount = Math.min(remaining, slab.limit);
    const tax = amount * slab.rate;
    total += tax;
    rows.push({
      label: slab.limit === Number.POSITIVE_INFINITY ? "Remaining income" : `Next ${formatBDT(slab.limit)}`,
      amount,
      rate: slab.rate,
      tax,
    });
    remaining -= amount;
  }

  return { total, rows };
}

function calculateSurcharge(netAssets: number, taxAfterRebate: number) {
  if (netAssets > 500000000) return taxAfterRebate * 0.35;
  if (netAssets > 200000000) return taxAfterRebate * 0.3;
  if (netAssets > 100000000) return taxAfterRebate * 0.2;
  if (netAssets > 40000000) return taxAfterRebate * 0.1;
  return 0;
}

export default function Home() {
  const [taxpayerType, setTaxpayerType] = useState<TaxpayerType>("general");
  const [city, setCity] = useState<CityType>("dhakaChattogram");
  const [income, setIncome] = useState<IncomeInputs>(defaultIncome);
  const [investment, setInvestment] = useState(100000);
  const [taxPaid, setTaxPaid] = useState(0);
  const [netAssets, setNetAssets] = useState(0);

  const result = useMemo(() => {
    const taxpayer = taxpayerOptions.find((option) => option.value === taxpayerType) ?? taxpayerOptions[0];
    const cityInfo = cityOptions.find((option) => option.value === city) ?? cityOptions[0];
    const totalIncome = Object.values(income).reduce((sum, item) => sum + Math.max(0, item || 0), 0);
    const { total: grossTax, rows } = calculateBaseTax(totalIncome, taxpayer.allowance);
    const maxRebateInvestment = Math.min(totalIncome * 0.2, 10000000);
    const eligibleInvestment = Math.min(Math.max(0, investment || 0), maxRebateInvestment);
    const rebate = Math.min(grossTax, eligibleInvestment * 0.15);
    const taxAfterRebate = Math.max(0, grossTax - rebate);
    const minimumTax = taxAfterRebate > 0 ? cityInfo.minimumTax : 0;
    const payableBeforeSurcharge = Math.max(taxAfterRebate, minimumTax);
    const surcharge = calculateSurcharge(Math.max(0, netAssets || 0), payableBeforeSurcharge);
    const finalTax = payableBeforeSurcharge + surcharge;
    const due = Math.max(0, finalTax - Math.max(0, taxPaid || 0));
    const refund = Math.max(0, Math.max(0, taxPaid || 0) - finalTax);
    const effectiveRate = totalIncome > 0 ? (finalTax / totalIncome) * 100 : 0;
    const monthlyReserve = due / 12;

    return {
      taxpayer,
      cityInfo,
      totalIncome,
      taxableIncome: Math.max(0, totalIncome - taxpayer.allowance),
      grossTax,
      rows,
      maxRebateInvestment,
      eligibleInvestment,
      rebate,
      taxAfterRebate,
      minimumTax,
      payableBeforeSurcharge,
      surcharge,
      finalTax,
      due,
      refund,
      effectiveRate,
      monthlyReserve,
    };
  }, [city, income, investment, netAssets, taxPaid, taxpayerType]);

  const updateIncome = (key: IncomeKey, value: string) => {
    const parsed = Number(value);
    setIncome((current) => ({
      ...current,
      [key]: Number.isFinite(parsed) ? Math.max(0, parsed) : 0,
    }));
  };

  const resetCalculator = () => {
    setTaxpayerType("general");
    setCity("dhakaChattogram");
    setIncome(defaultIncome);
    setInvestment(100000);
    setTaxPaid(0);
    setNetAssets(0);
  };

  const applyExample = (example: (typeof quickExamples)[number]) => {
    setIncome({
      salary: example.salary ?? 0,
      business: example.business ?? 0,
      house: example.house ?? 0,
      capitalGain: 0,
      agriculture: 0,
      other: example.other ?? 0,
    });
    setInvestment(example.investment);
    setNetAssets(example.assets);
    setTaxPaid(0);
  };

  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <header className="site-header">
        <a className="brand" href="#top" aria-label="BD Tax Calculator home">
          <span className="brand-mark">BD</span>
          <span>
            <strong>BDTaxCalculator</strong>
            <small>Web edition</small>
          </span>
        </a>
        <nav aria-label="Primary navigation">
          <a href="#calculator">Calculator</a>
          <a href="#rates">Rates</a>
          <a href="#faq">FAQ</a>
        </nav>
      </header>

      <section className="hero-shell" id="top">
        <div className="hero-copy">
          <p className="eyebrow">Bangladesh income tax estimator</p>
          <h1>Calculate your yearly tax, rebate, minimum tax, and payable amount in one place.</h1>
          <p>
            A web version of BDTaxCalculator for salaried people, freelancers, business owners,
            and families preparing a quick tax estimate before return filing.
          </p>
          <div className="hero-actions">
            <a className="primary-action" href="#calculator">Start calculation</a>
            <button type="button" className="secondary-action" onClick={() => window.print()}>
              Print summary
            </button>
          </div>
        </div>

        <div className="hero-visual" aria-label="Live tax summary preview">
          <div className="summary-strip">
            <span>Estimated payable</span>
            <strong>{formatBDT(result.finalTax)}</strong>
          </div>
          <div className="mini-chart" aria-hidden="true">
            <span style={{ height: "34%" }} />
            <span style={{ height: "58%" }} />
            <span style={{ height: "42%" }} />
            <span style={{ height: "76%" }} />
            <span style={{ height: "50%" }} />
          </div>
          <dl className="hero-metrics">
            <div>
              <dt>Total income</dt>
              <dd>{formatBDT(result.totalIncome)}</dd>
            </div>
            <div>
              <dt>Rebate</dt>
              <dd>{formatBDT(result.rebate)}</dd>
            </div>
            <div>
              <dt>Due now</dt>
              <dd>{formatBDT(result.due)}</dd>
            </div>
          </dl>
        </div>
      </section>

      <section className="calculator-layout" id="calculator" aria-label="Tax calculator">
        <div className="input-panel">
          <div className="section-heading">
            <p className="eyebrow">Calculator</p>
            <h2>Enter annual figures</h2>
          </div>

          <div className="control-group">
            <label htmlFor="taxpayerType">Taxpayer category</label>
            <select
              id="taxpayerType"
              value={taxpayerType}
              onChange={(event) => setTaxpayerType(event.target.value as TaxpayerType)}
            >
              {taxpayerOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label} - tax free up to {formatBDT(option.allowance)}
                </option>
              ))}
            </select>
          </div>

          <div className="control-group">
            <label htmlFor="city">Minimum tax area</label>
            <select id="city" value={city} onChange={(event) => setCity(event.target.value as CityType)}>
              {cityOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label} - {formatBDT(option.minimumTax)}
                </option>
              ))}
            </select>
          </div>

          <div className="income-grid">
            {incomeFields.map((field) => (
              <label className="money-field" key={field.key}>
                <span>
                  {field.label}
                  <small>{field.hint}</small>
                </span>
                <input
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={income[field.key]}
                  onChange={(event) => updateIncome(field.key, event.target.value)}
                />
              </label>
            ))}
          </div>

          <div className="income-grid two-column">
            <label className="money-field">
              <span>
                Eligible investment
                <small>DPS, savings certificate, insurance, approved investment</small>
              </span>
              <input
                type="number"
                min="0"
                inputMode="numeric"
                value={investment}
                onChange={(event) => setInvestment(Math.max(0, Number(event.target.value) || 0))}
              />
            </label>
            <label className="money-field">
              <span>
                Tax already paid
                <small>TDS, advance tax, challan payment</small>
              </span>
              <input
                type="number"
                min="0"
                inputMode="numeric"
                value={taxPaid}
                onChange={(event) => setTaxPaid(Math.max(0, Number(event.target.value) || 0))}
              />
            </label>
            <label className="money-field">
              <span>
                Net assets
                <small>Optional, for surcharge estimate</small>
              </span>
              <input
                type="number"
                min="0"
                inputMode="numeric"
                value={netAssets}
                onChange={(event) => setNetAssets(Math.max(0, Number(event.target.value) || 0))}
              />
            </label>
          </div>

          <div className="quick-row" aria-label="Example profiles">
            {quickExamples.map((example) => (
              <button type="button" key={example.label} onClick={() => applyExample(example)}>
                {example.label}
              </button>
            ))}
            <button type="button" onClick={resetCalculator}>
              Reset
            </button>
          </div>
        </div>

        <aside className="result-panel" aria-label="Tax result">
          <p className="eyebrow">Result</p>
          <h2>{formatBDT(result.finalTax)}</h2>
          <p className="result-note">
            Estimated total tax for {result.taxpayer.label.toLowerCase()} in {result.cityInfo.label.toLowerCase()}.
          </p>

          <dl className="result-list">
            <div>
              <dt>Total income</dt>
              <dd>{formatBDT(result.totalIncome)}</dd>
            </div>
            <div>
              <dt>Taxable after allowance</dt>
              <dd>{formatBDT(result.taxableIncome)}</dd>
            </div>
            <div>
              <dt>Gross tax</dt>
              <dd>{formatBDT(result.grossTax)}</dd>
            </div>
            <div>
              <dt>Investment rebate</dt>
              <dd>-{formatBDT(result.rebate)}</dd>
            </div>
            <div>
              <dt>Minimum tax applied</dt>
              <dd>{formatBDT(result.minimumTax)}</dd>
            </div>
            <div>
              <dt>Surcharge</dt>
              <dd>{formatBDT(result.surcharge)}</dd>
            </div>
            <div className="strong-row">
              <dt>Due after paid tax</dt>
              <dd>{formatBDT(result.due)}</dd>
            </div>
            {result.refund > 0 ? (
              <div className="positive-row">
                <dt>Possible excess paid</dt>
                <dd>{formatBDT(result.refund)}</dd>
              </div>
            ) : null}
          </dl>

          <div className="reserve-box">
            <span>Monthly reserve target</span>
            <strong>{formatBDT(result.monthlyReserve)}</strong>
            <small>Effective rate: {result.effectiveRate.toFixed(2)}%</small>
          </div>
        </aside>
      </section>

      <section className="insight-grid" aria-label="Tax insights">
        <article>
          <span className="tile-icon">%</span>
          <h3>Rebate limit checked</h3>
          <p>
            Investment rebate uses the lower of actual investment and the estimated eligible cap,
            then applies 15% rebate against gross tax.
          </p>
        </article>
        <article>
          <span className="tile-icon">৳</span>
          <h3>Minimum tax handled</h3>
          <p>
            If tax remains payable after rebate, the calculator compares it with the location-based
            minimum tax and applies the higher amount.
          </p>
        </article>
        <article>
          <span className="tile-icon">i</span>
          <h3>Filing ready summary</h3>
          <p>
            Keep the breakdown beside salary certificate, bank interest certificate, and investment
            documents before preparing your return.
          </p>
        </article>
      </section>

      <section className="breakdown-section" id="rates">
        <div className="section-heading">
          <p className="eyebrow">FY 2025-26 slab view</p>
          <h2>How the estimate is calculated</h2>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Slab</th>
                <th>Amount taxed</th>
                <th>Rate</th>
                <th>Tax</th>
              </tr>
            </thead>
            <tbody>
              {result.rows.map((row) => (
                <tr key={`${row.label}-${row.rate}`}>
                  <td>{row.label}</td>
                  <td>{formatBDT(row.amount)}</td>
                  <td>{Math.round(row.rate * 100)}%</td>
                  <td>{formatBDT(row.tax)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="faq-section" id="faq">
        <div className="section-heading">
          <p className="eyebrow">Guidance</p>
          <h2>Before you file</h2>
        </div>
        <div className="faq-grid">
          <details open>
            <summary>Is this an official NBR filing tool?</summary>
            <p>
              No. This is an estimation tool for planning. Use NBR e-Return or a qualified tax
              adviser for final filing and legal decisions.
            </p>
          </details>
          <details>
            <summary>Which tax year does it target?</summary>
            <p>
              The calculator is configured for FY 2025-26 style individual slabs with configurable
              taxpayer allowance and area-based minimum tax.
            </p>
          </details>
          <details>
            <summary>What should I enter as income?</summary>
            <p>
              Enter annual net income for each head. For salary, use the taxable annual amount from
              your employer certificate when available.
            </p>
          </details>
          <details>
            <summary>Can I use it on mobile?</summary>
            <p>
              Yes. The layout is responsive and the number inputs are optimized for phone keyboards.
            </p>
          </details>
        </div>
      </section>
    </main>
  );
}
