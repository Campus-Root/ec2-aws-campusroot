import Joi from "joi";
import { DestinationTypeEnum, LanguageTypeEnum, ProductCategoryEnum } from "../utils/enum.js";

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
export const registerSchema = Joi.object({
    email: Joi.string().required(),
    firstName: Joi.string().required(),
    lastName: Joi.string().required(),
    password: Joi.string().required(),
    country: Joi.string().valid(...Object.values(DestinationTypeEnum)).required(),
    language: Joi.string().valid(...Object.values(LanguageTypeEnum)).required(),
});

export const uploadInProfileSchema = Joi.object({
    fieldPath: Joi.string().valid(
        "personal.resume",
        "personal.passportBD",
        "personal.passportADD",
        "academic.secondarySchool",
        "academic.plus2",
        "academic.degree",
        "academic.bachelors.transcripts",
        "academic.bachelors.bonafide",
        "academic.bachelors.CMM",
        "academic.bachelors.PCM",
        "academic.bachelors.OD",
        "academic.masters.transcripts",
        "academic.masters.bonafide",
        "academic.masters.CMM",
        "academic.masters.PCM",
        "academic.masters.OD",
        "test.languageProf",
        "test.general",
        "workExperiences",
        "IEH"
    ),
    fileIdentifier: Joi.string().allow(''),
    documentId: Joi.string().allow(''),
});