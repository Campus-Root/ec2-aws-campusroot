import Stripe from "stripe";
import 'dotenv/config';
import { errorWrapper } from "../../middleware/errorWrapper.js";

export const checkout = errorWrapper(async (req, res, next) => {
    const { amount, currency } = req.body;
    const stripe = new Stripe(process.env.STRIPE_PAYMENTS)
    const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency,
        payment_method_types: ['card'], // Specify payment method types here

    });

    res.status(200).send({
        clientSecret: paymentIntent.client_secret,
    });
})
































