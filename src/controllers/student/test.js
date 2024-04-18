// import Stripe from "stripe";


// const { Secret_key } = config.get("STRIPE_PAYMENTS")
// const stripe = new Stripe(`${Secret_key}`);
// const URL = config.get("URL")
// export const checkout = async (req,res,next) => {
//     try {
//         const { price, universityId, courseId } = req.body

//         if (!price === NaN) return res.status(400).send("enter valid price");
//         const session = await stripe.checkout.sessions.create({
//             line_items: [
//                 {
//                     price_data: {
//                         currency: 'inr',
//                         product_data: { name: 'CampusRoot' },
//                         unit_amount: price * 100,
//                     },
//                     quantity: 1,
//                 },
//             ],
//             mode: 'payment',
//             success_url: `${URL}/api/v1/student/success?universityIds=${universityId}&courseIds=${courseId}&userId=${req.user._id}`,
//             cancel_url: `${URL}/api/v1/student/failed`,
//             customer_email: req.user.email,
//         });
//         // generate an invoice and email it to user with session.id
//         return res.status(200).json({ url: session.url });

//     } catch (error) {
//         console.log(error)
//     }
// }