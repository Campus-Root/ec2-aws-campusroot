import { body, validationResult } from 'express-validator';
import { generateAPIError } from '../errors/apiError.js';
import { errorWrapper } from './errorWrapper.js';
export const validateCredentials = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Invalid email address'),
    body('password')
        .isLength({ min: 8, max: 25 })
        .withMessage('Password must be 8 - 25 characters long')
        .matches(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[^a-zA-Z\d]).{8,}$/)
        .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
];
export const validationErrorMiddleware = errorWrapper((req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return next(generateAPIError(`${errors.array()[0].msg}`, 400));
    return next();
})
export const checkDisposableEmail = errorWrapper(async (req, res, next) => {
    const { email } = req.body;
    const response = await fetch(`https://disposable.debounce.io/?email=${email}`);
    const data = await response.json();
    if (data.disposable == "true") return next(generateAPIError(`Please do not use throw away email`, 400));
    if (data.success == "0") return next(generateAPIError(`Invalid email Id`, 400));
    next();
});