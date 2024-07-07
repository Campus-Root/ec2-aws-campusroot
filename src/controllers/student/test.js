import Stripe from 'stripe';
import 'dotenv/config';
import { errorWrapper } from "../../middleware/errorWrapper.js";

export const checkout = errorWrapper(async (req, res, next) => {
    const { amount } = req.body;
    const stripe = new Stripe(process.env.STRIPE_PAYMENTS)
    const balance = await stripe.balance.retrieve();
    console.log('Stripe key is valid.');
    const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency: 'inr',
        payment_method_types: ['card'], // Specify multiple payment method types
    });
    console.log(paymentIntent);
    res.status(200).send({ clientSecret: paymentIntent.client_secret, });
})


// const stripe = Stripe(process.env.STRIPE_PAYMENTS);

// const testStripeKey = async () => {
//     try {
// const balance = await stripe.balance.retrieve();
// console.log('Stripe key is valid. Balance:', balance);
//     } catch (error) {
//         console.error('Error with Stripe key:', error);
//     }
// };

// testStripeKey();

























