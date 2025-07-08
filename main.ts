#!/usr/bin/env node

import readline from "node:readline";
import chalk from "chalk";
import axios from "axios";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const SUPPORTED = new Set(["NGN", "USD", "EUR"]);
const TAX_RATE: Record<string, number> = { NGN: 0.3, USD: 0.15, EUR: 0.15 };

const formatUSD = (val: number): string => chalk.green(`$${val.toFixed(2)}`);

function formatLocal(val: number, curr: string): string {
  const locale = curr === "NGN" ? "en-NG" : curr === "EUR" ? "de-DE" : "en-US";
  return chalk.blueBright(
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: curr,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(val)
  );
}

const label = (text: string) => chalk.bold.yellow(text.padEnd(30));

async function prompt(q: string) {
  return new Promise<string>((res) => rl.question(chalk.cyan(q), res));
}

async function main() {
  const amountStr = await prompt("Enter Medium payout amount (USD): ");
  const gross = parseFloat(amountStr);
  if (isNaN(gross) || gross <= 0) {
    console.error(chalk.red("Invalid USD amount."));
    process.exit(1);
  }

  const dest = (
    await prompt(`Enter destination currency (${[...SUPPORTED].join(", ")}): `)
  ).toUpperCase();
  if (!SUPPORTED.has(dest)) {
    console.error(chalk.red(`Currency not supported: ${dest}`));
    process.exit(1);
  }

  // Fetch FX rate using free API
  let rate = 1;
  if (dest !== "USD") {
    try {
      const res = await axios.get(`https://open.er-api.com/v6/latest/USD`);
      rate = res.data.rates[dest];
      if (!rate) throw new Error("Rate not found");
    } catch {
      console.error(chalk.red("Failed to fetch exchange rate."));
      process.exit(1);
    }
  }

  // 1. Tax Withholding
  const tax = gross * TAX_RATE[dest];
  const afterTax = gross - tax;

  // 2. Stripe
  const fixed = 2.25;
  const border = afterTax * 0.0025;
  const afterStripe = afterTax - fixed - border;

  // 3. Convert
  const localAmt = afterStripe * rate;

  rl.close();

  console.log("\n" + chalk.underline.bold("💰 Detailed Payout Breakdown"));
  console.log(`${label("Gross (USD)")}: ${formatUSD(gross)}`);

  console.log(
    `${label(`Withholding (${TAX_RATE[dest] * 100}%)`)}: -${formatUSD(tax)}`
  );
  console.log(`${label("After Tax")}: ${formatUSD(afterTax)}\n`);

  console.log(`${label("Stripe Fixed Fee")}: -${formatUSD(fixed)}`);
  console.log(`${label("Cross-border Fee (~0.5%)")}: -${formatUSD(border)}`);
  console.log(`${label("After Stripe")}: ${formatUSD(afterStripe)}\n`);

  console.log(`${label(`FX Rate (1 USD → ${dest})`)}: ${rate.toFixed(2)}`);
  console.log(
    `${label(`Converted (${dest})`)}: ${formatLocal(localAmt, dest)}`
  );
  console.log(
    chalk.bold.green("\n🎉 Final Payout ≈ ") + formatLocal(localAmt, dest)
  );
}

main();
