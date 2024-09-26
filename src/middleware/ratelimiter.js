import rateLimit from "express-rate-limit";
export const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: "Too many requests from this IP, please try again later"
});
export const customRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes window
    max: (req, res) => {
        if (!req.rateLimit) req.rateLimit = {};
        if (!req.rateLimit.counter) req.rateLimit.counter = 1; // First request
        if (req.rateLimit.counter === 1) req.rateLimit.nextAllowed = Date.now() + 60 * 1000; // 1 min for second request
        else if (req.rateLimit.counter === 2) req.rateLimit.nextAllowed = Date.now() + 3 * 60 * 1000; // 3 min for third request
        req.rateLimit.counter++;
        return 3;
    },
    handler: (req, res, next) => {
        if (req.rateLimit && req.rateLimit.nextAllowed) {
            const timeRemaining = req.rateLimit.nextAllowed - Date.now();
            if (timeRemaining > 0) {
                return res.status(429).send({
                    message: `Too many requests from this IP, please try again after ${Math.ceil(timeRemaining / 1000)} seconds`
                });
            }
        }
        next();
    },
});
