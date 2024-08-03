import Joi from "joi";
import { ProductCategoryEnum } from "../utils/enum.js";

export const loginSchema = Joi.object({
    email: Joi.string().required(),
    password: Joi.string().required(),
    DeviceToken: Joi.string().allow('')
}).required()

export const CartSchema = Joi.object({
    action: Joi.string().valid('add', 'remove', 'update').required(),
    category: Joi.string().valid(...Object.values(ProductCategoryEnum)),
    courseId: Joi.string(),
    intake: Joi.date().greater('now'),
    itemId: Joi.string().allow('')
}).required();

export const ProductSchema = Joi.object({
    category: Joi.string().valid(...Object.values(ProductCategoryEnum)).required(),
    courseId: Joi.string().required(),
    intake: Joi.date().greater('now').required()
})
export const CheckoutSchema = Joi.object({
    packageId: Joi.string().allow(''),
    products: Joi.array().items(ProductSchema).min(0),
    userCurrency: Joi.string()
}).required();