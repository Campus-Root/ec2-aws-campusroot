import Joi from "joi";


export const CartSchema = Joi.object({
    action: Joi.string().valid('add', 'remove', 'update').required(),
    category: Joi.string().valid(...Object.values(ProductCategoryEnum)),
    data: Joi.object({
        course: Joi.string(),
        intake: Joi.date()
    }),
    itemId: Joi.string()
}).required();