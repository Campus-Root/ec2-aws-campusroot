export const registration = async (req, res, next) => {
    console.table({
        "Body": req.body,
        "Query Params": Params,
        "Headers": req.headers,
        "Request Method": req.method,
        "Request URL": req.originalUrl,
        "IP Address": req.ip,
        "Timestamp": new Date().toISOString()
    });
    res.status(200).send('Webhook received successfully');
}