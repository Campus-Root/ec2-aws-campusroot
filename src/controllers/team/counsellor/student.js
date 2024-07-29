import courseModel from "../../../models/Course.js";
import universityModel from "../../../models/University.js";
import { studentModel } from "../../../models/Student.js";
import { generateAPIError } from "../../../errors/apiError.js";
import { errorWrapper } from "../../../middleware/errorWrapper.js";
import { CurrencySymbolEnum, DestinationTypeEnum, possibilityOfAdmitEnum, ProductCategoryEnum, studentCounsellingStagesEnum } from "../../../utils/enum.js";
import userModel from "../../../models/User.js";
import { packageModel } from "../../../models/Package.js";

export const switchStage = errorWrapper(async (req, res, next) => {
    const { studentId, stage, nextActionDate, note } = req.body
    if (!await studentModel.findById(studentId)) return next(generateAPIError(`invalid StudentId`, 400));
    const student = req.user.students.find(ele => ele.profile.toString() == studentId)
    if (!student) return next(generateAPIError(`invalid access`, 400));
    if (!Object.values(studentCounsellingStagesEnum).includes(stage)) return next(generateAPIError(`invalid stage`, 400));
    if (!new Date(nextActionDate) || new Date(nextActionDate) <= new Date()) return next(generateAPIError(`invalid nextActionDate`, 400));
    student.nextActionDate = nextActionDate
    student.stage = stage
    req.user.logs.push({
        action: "student stage shifted",
        details: `studentId:${studentId}&stage:${stage}&note:${note}&nextActionDate:${nextActionDate}`
    })
    await req.user.save()
    await studentModel.populate(student, { path: "profile", select: "firstName lastName email displayPicSrc" },)
    return res.status(200).json({ success: true, message: `activity success`, data: student, AccessToken: req.AccessToken ? req.AccessToken : null })
})
export const recommend = errorWrapper(async (req, res, next) => {
    const { studentId, universityId, courseId, possibilityOfAdmit } = req.body
    const university = await universityModel.findById(universityId)
    if (!university) return next(generateAPIError(`Invalid UniversityId`, 400));
    const course = await courseModel.findById(courseId)
    if (!course) return next(generateAPIError(`Invalid courseId`, 400));
    const student = await studentModel.findById(studentId)
    if (!student) return next(generateAPIError(`invalid StudentId`, 400));
    if (!Object.values(possibilityOfAdmitEnum).includes(possibilityOfAdmit)) return next(generateAPIError(`invalid possibilityOfAdmit`, 400));
    if (student.recommendations.data.find(ele => ele.course == courseId)) return next(generateAPIError(`course Already recommended`, 400));
    student.recommendations.data.push({ university: universityId, course: courseId, possibilityOfAdmit: possibilityOfAdmit, counsellorRecommended: true });
    student.recommendations.data = student.recommendations.data.sort((a, b) => a.possibilityOfAdmit - b.possibilityOfAdmit)
    await student.save();
    req.user.logs.push({
        action: "course recommended to student",
        details: `studentId:${studentId}&courseId:${courseId}`
    })
    await req.user.save()
    const newRecommend = student.recommendations.data.find(ele => ele.course == courseId)
    await universityModel.populate(newRecommend, { path: "university", select: "name logoSrc location type establishedYear " },)
    await courseModel.populate(newRecommend, { path: "course", select: "name discipline subDiscipline schoolName studyLevel duration applicationDetails", },)
    return res.status(200).json({ success: true, message: "Recommendations Generated", data: newRecommend, AccessToken: req.AccessToken ? req.AccessToken : null });
})
export const deleteRecommend =  errorWrapper(async (req, res, next) => {
    const { studentId, recommendId } = req.body
    const student = await studentModel.findById(studentId)
    if (!student) return next(generateAPIError(`invalid StudentId`, 400));
    const recommendationToBeDeleted = student.recommendations.data.find(ele => ele._id.toString() == recommendId)
    if (!recommendationToBeDeleted) return next(generateAPIError(`invalid recommendId`, 400));
    await studentModel.findByIdAndUpdate(studentId, { $pull: { "recommendations.data": { _id: recommendId } } })
    req.user.logs.push({
        action: "course recommended to student",
        details: `UniversityId:${recommendationToBeDeleted.university}&CourseId:${recommendationToBeDeleted.course}&studentId=${studentId}`
    })
    await req.user.save()
    return res.status(200).json({ success: true, message: "recommendations deleted", data: null, AccessToken: req.AccessToken ? req.AccessToken : null });
})
export const Package = errorWrapper(async (req, res, next) => {
    const { studentId, action, data } = req.body
    const student = await studentModel.findById(studentId, "advisors suggestedPackages")
    if (!student) return next(generateAPIError(`invalid StudentId`, 400));
    if (!student.advisors.find(ele => ele.info.toString() == req.user._id.toString())) return next(generateAPIError(`invalid access rights`, 400));
    let Package, Org
    switch (action) {
        case "suggest":
            Org = new Set(Object.values(DestinationTypeEnum));
            if (data.country.length > 0 && !data.country.every(element => Org.has(element))) return next(generateAPIError(`invalid country list`, 400));
            Org = new Set(Object.keys(CurrencySymbolEnum));
            if (!Org.has(data.currency.code)) return next(generateAPIError(`invalid currency code`, 400));
            if (data.currency.symbol !== CurrencySymbolEnum[data.currency.code]) return next(generateAPIError(`invalid currency symbol`, 400));
            if (isNaN(data.totalPrice)) return next(generateAPIError(`invalid totalPrice`, 400));
            Org = new Set(Object.values(ProductCategoryEnum));
            if (data.products.length > 0 && !data.products.every(element => Org.has(element.category) && !isNaN(element.quantity) && Number(element.quantity) > 0)) return next(generateAPIError(`invalid product list`, 400));
            if (!data.name || !data.description || !data.totalPrice || !data.benefits || !data.name || !data.termsAndConditions) return next(generateAPIError(`incomplete form data`, 400));
            Package = await packageModel.create({
                variety: "Custom",
                active: true,
                designer: req.user._id,
                name: data.name,
                description: data.description,
                country: data.country,
                imageSrc: data.imageSrc ? data.imageSrc : "",
                priceDetails: {
                    totalPrice: Number(data.totalPrice),
                    currency: data.currency,
                },
                benefits: data.benefits,
                products: data.products,
                termsAndConditions: data.termsAndConditions,
                logs: [{ action: "Package suggested to student", time: new Date(), details: `studentId=${studentId}` }]
            })
            student.suggestedPackages.push(Package._id);
            await student.save();
            req.user.logs.push({
                action: "Package suggested to student",
                details: `PackageId:${Package._id}&studentId=${studentId}`
            })
            await req.user.save()
            await userModel.populate(Package, {
                path: "designer",
                select: "firstName lastName email displayPicSrc"
            })
            return res.status(200).json({ success: true, message: "Package suggested", data: Package, AccessToken: req.AccessToken ? req.AccessToken : null });
        case "edit":
            if (!data.packageId) return next(generateAPIError(`invalid package Id`, 400));
            Package = await packageModel.findById(data.packageId)
            if (!Package) return next(generateAPIError(`invalid PackageId`, 400));
            if (Package.designer.toString() !== req.user._id.toString()) return next(generateAPIError(`invalid access rights`, 400));
            if (data.country.length > 0) {
                Org = new Set(Object.values(DestinationTypeEnum));
                if (!data.country.every(element => Org.has(element))) return next(generateAPIError(`invalid country list`, 400));
            }
            if (data.currency.code || data.currency.symbol) {
                Org = new Set(Object.keys(CurrencySymbolEnum));
                if (!Org.has(data.currency.code)) return next(generateAPIError(`invalid currency code`, 400));
                if (data.currency.symbol !== CurrencySymbolEnum[data.currency.code]) return next(generateAPIError(`invalid currency symbol`, 400));
            }
            if (isNaN(data.totalPrice)) return next(generateAPIError(`invalid totalPrice`, 400));
            if (data.products.length > 0) {
                Org = new Set(Object.values(ProductCategoryEnum));
                if (!data.products.every(element => Org.has(element.category) && !isNaN(element.quantity) && Number(element.quantity) > 0)) return next(generateAPIError(`invalid product list`, 400));
            }
            let logStack = []
            if (data.name && Package.name !== data.name) {
                logStack.push(`name changed from ${Package.name} to ${data.name}`)
                Package.name = data.name;
            }
            if (data.description && Package.description !== data.description) {
                logStack.push(`description changed from ${Package.description} to ${data.description}`)
                Package.description = data.description;
            }
            if (data.imageSrc && Package.imageSrc !== data.imageSrc) {
                logStack.push(`imageSrc changed from ${Package.imageSrc} to ${data.imageSrc}`)
                Package.imageSrc = data.imageSrc;
            }
            if (Package.priceDetails.totalPrice !== Number(data.totalPrice)) {
                logStack.push(`totalPrice changed from ${Package.priceDetails.totalPrice} to ${Number(data.totalPrice)}`)
                Package.priceDetails.totalPrice = Number(data.totalPrice);
            }
            if (data.country.length > 0) {
                logStack.push(`country changed from ${Package.country} to ${data.country}`)
                Package.country = data.country;
            }
            if (data.currency.code && data.currency.code !== Package.priceDetails.currency.code) {
                logStack.push(`currency code changed from ${Package.priceDetails.currency.code} to ${data.currency.code}`)
                Package.priceDetails.currency.code = data.currency.code;
            }
            if (data.currency.symbol && data.currency.symbol !== Package.priceDetails.currency.symbol) {
                logStack.push(`currency symbol changed from ${Package.priceDetails.currency.symbol} to ${data.currency.symbol}`)
                Package.priceDetails.currency.symbol = data.currency.symbol;
            }
            if (data.benefits.length > 0) {
                logStack.push(`currency symbol changed from ${Package.benefits} to ${data.benefits}`)
                Package.benefits = data.benefits;
            }
            if (data.products.length > 0) {
                logStack.push(`currency symbol changed from ${Package.products} to ${data.products}`)
                Package.products = data.products;
            }
            if (data.termsAndConditions.length > 0) {
                logStack.push(`currency symbol changed from ${Package.termsAndConditions} to ${data.termsAndConditions}`)
                Package.termsAndConditions = data.termsAndConditions;
            }
            if (Package.active !== data.active) {
                logStack.push(`currency symbol changed from ${Package.active} to ${data.active}`)
                Package.active = data.active;
            }
            Package.logs.push({ action: "package details updated", details: `${logStack}` })
            Package.save();
            await userModel.populate(Package, {
                path: "designer",
                select: "firstName lastName email displayPicSrc"
            })
            return res.status(200).json({ success: true, message: "Package edited", data: Package, AccessToken: req.AccessToken ? req.AccessToken : null });
        default: return next(generateAPIError(`invalid action`, 400));
    }
})