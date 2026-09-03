#!/usr/bin/env node

import readline from "node:readline";
import chalk from "chalk";
import { fetchExchangeRate } from "@/services/exchange";
import { SUPPORTED, TAX_RATE } from "@/utils/constants";
import { formatLocal } from "@/utils/formatter";

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
});

const formatUSD = (val: number): string => chalk.green(`$${val.toFixed(2)}`);

const label = (text: string) => chalk.bold.yellow(text.padEnd(30));

async function prompt(q: string) {
	return new Promise<string>((res) => rl.question(chalk.cyan(q), res));
}

async function main() {
	const amountStr = await prompt("Enter Medium payout amount (USD): ");
	const gross = parseFloat(amountStr);
	if (Number.isNaN(gross) || gross <= 0) {
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
		const result = await fetchExchangeRate(dest);
		if (result.error) {
			console.error(chalk.red(result.message));
			process.exit(1);
		}
		rate = result.rate;
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

	console.log(`\n${chalk.underline.bold("💰 Detailed Payout Breakdown")}`);
	console.log(`${label("Gross (USD)")}: ${formatUSD(gross)}`);

	console.log(
		`${label(`Withholding (${TAX_RATE[dest] * 100}%)`)}: -${formatUSD(tax)}`,
	);
	console.log(`${label("After Tax")}: ${formatUSD(afterTax)}\n`);

	console.log(`${label("Stripe Fixed Fee")}: -${formatUSD(fixed)}`);
	console.log(`${label("Cross-border Fee (~0.5%)")}: -${formatUSD(border)}`);
	console.log(`${label("After Stripe")}: ${formatUSD(afterStripe)}\n`);

	console.log(`${label(`FX Rate (1 USD → ${dest})`)}: ${rate.toFixed(2)}`);
	console.log(
		`${label(`Converted (${dest})`)}: ${formatLocal(localAmt, dest)}`,
	);
	console.log(
		chalk.bold.green("\n🎉 Final Payout ≈ ") + formatLocal(localAmt, dest),
	);
}

main();
