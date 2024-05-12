// import admin from 'firebase-admin';
// import 'dotenv/config'
// export const sendNotification = async ({ token, title, body }) => {
//     try {
//         admin.initializeApp({ credential: admin.credential.cert(process.env.FCM) });
//         const message = {
//             token,
//             notification: {
//                 title,
//                 body,
//             },
//         };
//         console.log(message);
//         const response = await admin.messaging().send(message);
//         console.log('Successfully sent notification:');
//         console.log(response);
//         // If you want to send a response back, you can return it
//         return response;
//     } catch (error) {
//         console.error('Error sending notification:', error);
//     }
// }

// // // Example usage
// sendNotification({
//     token: "esU7WCKzr_RvtI8wBpPIlP:APA91bHxnGA9nbhAj7K4ng72MS6dI3g7P-hqG-BjoABNbWN4eDZpCV1ki-U-AVG88oxgbSIszREAI2kNX9JIlZLltXpS7-7vAvh1hh8rCAp1CG8Bs_eTzYSZWE91p7lrHsej9zO0J1__",
//     title: "title",
//     body: "body"
// });







// // const senderDeviceInfo = new DeviceInfo({
// //     token: senderToken,
// //     platform: req.headers['user-agent'],
// //     deviceName: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
// //   });
