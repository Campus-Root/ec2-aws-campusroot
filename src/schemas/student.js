import Joi from "joi";
import { ProductCategoryEnum } from "../utils/enum.js";


export const CartSchema = Joi.object({
    action: Joi.string().valid('add', 'remove', 'update').required(),
    category: Joi.string().valid(...Object.values(ProductCategoryEnum)),
    data: Joi.object({
        course: Joi.string(),
        intake: Joi.date()
    }),
    itemId: Joi.string().allow('')
}).required();