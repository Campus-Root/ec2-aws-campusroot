import cron from 'node-cron';
import { fetchAndUpdateExchangeRates } from './currencyConversion.js';
export const startCronJob = () => {
    cron.schedule('0 0 * * *', () => {
        console.log("cronjob Triggered");
        fetchAndUpdateExchangeRates();
    }, {
        scheduled: true,
        timezone: "Asia/Kolkata" // Set timezone to India/Kolkata (IST)
    });
};