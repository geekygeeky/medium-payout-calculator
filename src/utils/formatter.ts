import chalk from "chalk";

export function formatLocal(val: number, curr: string): string {
	const locale = curr === "NGN" ? "en-NG" : curr === "EUR" ? "de-DE" : "en-US";
	return chalk.blueBright(
		new Intl.NumberFormat(locale, {
			style: "currency",
			currency: curr,
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		}).format(val),
	);
}
