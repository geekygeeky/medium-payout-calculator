import axios from "axios";

export const fetchExchangeRate = async (currency: string) => {
	try {
		const res = await axios.get(`https://open.er-api.com/v6/latest/USD`);
		const rate = res.data.rates[currency];
		if (!rate) throw new Error("Rate not found");
		return { error: false, rate };
	} catch {
		return { error: true, message: "Failed to fetch exchange rate." };
	}
};
