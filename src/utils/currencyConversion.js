import exchangeModel from "../models/ExchangeRates.js";
import 'dotenv/config';


const API_KEY = process.env.EXCHANGERATES_API_KEY; // Replace this with your actual API key
const ExchangeRatesId = process.env.EXCHANGERATES_MONGOID
const BASE_URL = process.env.EXCHANGERATES_BASE_URL;

// Function to fetch latest exchange rates
export const fetchAndUpdateExchangeRates = async () => {
    try {
        const response = await fetch(`${BASE_URL}?app_id=${API_KEY}`);
        const { base, rates } = await response.json();
        await exchangeModel.findByIdAndUpdate(ExchangeRatesId, { base: base, rates: rates })
    } catch (error) {
        console.error('Error fetching exchange rates:', error);
    }
}

export const costConversion = (amount, fromCurrency, toCurrency, fromCurrencyRate, toCurrencyRate) => {
    if (fromCurrency === 'USD') {
        return Math.round(amount * toCurrencyRate);
    } else if (toCurrency === 'USD') {
        return Math.round(amount / fromCurrencyRate);
    } else {
        return Math.round(amount * toCurrencyRate / fromCurrencyRate);
    }
};