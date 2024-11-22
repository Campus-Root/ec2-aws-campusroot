import courseModel from "../../../models/Course.js";
import universityModel from "../../../models/University.js";
import { studentModel } from "../../../models/Student.js";
import { errorWrapper } from "../../../middleware/errorWrapper.js";
import { CurrencySymbolEnum, DestinationTypeEnum, possibilityOfAdmitEnum, ProductCategoryEnum, studentCounsellingStagesEnum } from "../../../utils/enum.js";
import userModel from "../../../models/User.js";
import { packageModel } from "../../../models/Package.js";
import 'dotenv/config'
export const switchStage = errorWrapper(async (req, res, next, session) => {
    const { studentId, stage, nextActionDate, note } = req.body
    if (!await studentModel.findById(studentId)) return { statusCode: 400, data: null, message: `invalid StudentId` };
    const student = req.user.students.find(ele => ele.profile.toString() == studentId)
    if (!student) return {
        statusCode: 400, data: null, message: `invalid access`
    };
    if (!Object.values(studentCounsellingStagesEnum).includes(stage)) return {
        statusCode: 400, data: null, message: `invalid stage`
    };
    if (!new Date(nextActionDate) || new Date(nextActionDate) <= new Date()) return {
        statusCode: 400, data: null, message: `invalid nextActionDate`
    };
    student.nextActionDate = nextActionDate
    student.stage = stage
    req.user.logs.push({
        action: "student stage shifted",
        details: `studentId:${studentId}&stage:${stage}&note:${note}&nextActionDate:${nextActionDate}`
    })
    await req.user.save()
    await studentModel.populate(student, { path: "profile", select: "firstName lastName email displayPicSrc" },)
    return ({ statusCode: 200, message: `activity success`, data: student })
})
export const recommend = errorWrapper(async (req, res, next, session) => {
    const { studentId, universityId, courseId, possibilityOfAdmit } = req.body
    const university = await universityModel.findById(universityId)
    if (!university) return { statusCode: 400, data: null, message: `Invalid UniversityId` };
    const course = await courseModel.findById(courseId)
    if (!course) return {
        statusCode: 400, data: null, message: `Invalid courseId`
    };
    const student = await studentModel.findById(studentId)
    if (!student) return {
        statusCode: 400, data: null, message: `invalid StudentId`
    };
    if (!Object.values(possibilityOfAdmitEnum).includes(possibilityOfAdmit)) return {
        statusCode: 400, data: null, message: `invalid possibilityOfAdmit`
    };
    if (student.recommendations.data.find(ele => ele.course == courseId)) return {
        statusCode: 400, data: null, message: `course Already recommended`
    };
    student.recommendations.data.push({ university: universityId, course: courseId, possibilityOfAdmit: possibilityOfAdmit, counsellorRecommended: true });
    student.recommendations.data = student.recommendations.data.sort((a, b) => a.possibilityOfAdmit - b.possibilityOfAdmit)
    await student.save();
    req.user.logs.push({
        action: "course recommended to student",
        details: `studentId:${studentId}&courseId:${courseId}`
    })
    await req.user.save()
    const newRecommend = student.recommendations.data.find(ele => ele.course == courseId)

    await courseModel.populate(newRecommend, { path: "course", select: "name discipline subDiscipline schoolName studyLevel duration applicationDetails university elite", },)
    await universityModel.populate(newRecommend, { path: "course.university", select: "name logoSrc location type establishedYear " },)
    return ({ statusCode: 200, message: "Recommendations Generated", data: newRecommend });
})
export const deleteRecommend = errorWrapper(async (req, res, next, session) => {
    const { studentId, recommendId } = req.body
    const student = await studentModel.findById(studentId)
    if (!student) return { statusCode: 400, data: null, message: `invalid StudentId` };
    const recommendationToBeDeleted = student.recommendations.data.find(ele => ele._id.toString() == recommendId)
    if (!recommendationToBeDeleted) return {
        statusCode: 400, data: null, message: `invalid recommendId`
    };
    await studentModel.findByIdAndUpdate(studentId, { $pull: { "recommendations.data": { _id: recommendId } } })
    req.user.logs.push({
        action: "course recommended to student",
        details: `UniversityId:${recommendationToBeDeleted.university}&CourseId:${recommendationToBeDeleted.course}&studentId=${studentId}`
    })
    await req.user.save()
    return ({ statusCode: 200, message: "recommendations deleted", data: null });
})
export const Package = errorWrapper(async (req, res, next, session) => {
    const { studentId, action, data } = req.body
    const student = await studentModel.findById(studentId, "advisors suggestedPackages")
    if (!student) return { statusCode: 400, data: null, message: `invalid StudentId` };
    if (!student.advisors.find(ele => ele.info.toString() == req.user._id.toString())) return {
        statusCode: 400, data: null, message: `invalid access rights`
    };
    let Package, Org
    switch (action) {
        case "suggest":
            Org = new Set(Object.values(DestinationTypeEnum));
            if (data.country.length > 0 && !data.country.every(element => Org.has(element))) return {
                statusCode: 400, data: null, message: `invalid country list`
            };
            Org = new Set(Object.keys(CurrencySymbolEnum));
            if (!Org.has(data.currency.code)) return {
                statusCode: 400, data: null, message: `invalid currency code`
            };
            if (data.currency.symbol !== CurrencySymbolEnum[data.currency.code]) return {
                statusCode: 400, data: null, message: `invalid currency symbol`
            };
            if (isNaN(data.totalPrice)) return {
                statusCode: 400, data: null, message: `invalid totalPrice`
            };
            Org = new Set(Object.values(ProductCategoryEnum));
            if (data.products.length > 0 && !data.products.every(element => Org.has(element.category) && !isNaN(element.quantity) && Number(element.quantity) > 0)) return {
                statusCode: 400, data: null, message: `invalid product list`
            };
            if (!data.name || !data.description || !data.totalPrice || !data.benefits || !data.termsAndConditions) return {
                statusCode: 400, data: null, message: `incomplete form data`
            };
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
                duration: {
                    start: new Date(),
                    end: new Date(data.end) ? new Date(data.end) : null
                },
                benefits: data.benefits,
                products: data.products,
                requirements: data.requirements,
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
            return ({ statusCode: 200, message: "Package suggested", data: Package });
        case "edit":
            if (!data.packageId) return {
                statusCode: 400, data: null, message: `invalid package Id`
            };
            Package = await packageModel.findById(data.packageId)
            if (!Package) return {
                statusCode: 400, data: null, message: `invalid PackageId`
            };
            if (Package.designer.toString() !== req.user._id.toString()) return {
                statusCode: 400, data: null, message: `invalid access rights`
            };
            if (data.country.length > 0) {
                Org = new Set(Object.values(DestinationTypeEnum));
                if (!data.country.every(element => Org.has(element))) return {
                    statusCode: 400, data: null, message: `invalid country list`
                };
            }
            if (data.currency.code || data.currency.symbol) {
                Org = new Set(Object.keys(CurrencySymbolEnum));
                if (!Org.has(data.currency.code)) return {
                    statusCode: 400, data: null, message: `invalid currency code`
                };
                if (data.currency.symbol !== CurrencySymbolEnum[data.currency.code]) return {
                    statusCode: 400, data: null, message: `invalid currency symbol`
                };
            }
            if (isNaN(data.totalPrice)) return {
                statusCode: 400, data: null, message: `invalid totalPrice`
            };
            if (data.products.length > 0) {
                Org = new Set(Object.values(ProductCategoryEnum));
                if (!data.products.every(element => Org.has(element.category) && !isNaN(element.quantity) && Number(element.quantity) > 0)) return {
                    statusCode: 400, data: null, message: `invalid product list`
                };
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
                logStack.push(`benefits changed from ${Package.benefits} to ${data.benefits}`)
                Package.benefits = data.benefits;
            }
            if (data.requirements.length > 0) {
                logStack.push(`requirements changed from ${Package.requirements} to ${data.requirements}`)
                Package.requirements = data.requirements;
            }
            if (data.end) {
                logStack.push(`end date changed to ${data.end}`)
                Package.duration.end = new Date(data.end);
            }
            if (data.products.length > 0) {
                logStack.push(`products changed from ${Package.products} to ${data.products}`)
                Package.products = data.products;
            }
            if (data.termsAndConditions.length > 0) {
                logStack.push(`termsAndConditions changed from ${Package.termsAndConditions} to ${data.termsAndConditions}`)
                Package.termsAndConditions = data.termsAndConditions;
            }
            if (Package.active !== data.active) {
                logStack.push(`package active status changed from ${Package.active} to ${data.active}`)
                Package.active = data.active;
            }
            Package.logs.push({ action: "package details updated", details: `${logStack}` })
            Package.save();
            await userModel.populate(Package, {
                path: "designer",
                select: "firstName lastName email displayPicSrc"
            })
            return ({ statusCode: 200, message: "Package edited", data: Package });
        default: return {
            statusCode: 400, data: null, message: `invalid action`
        };
    }
})
export const registerNewStudent = errorWrapper(async (req, res, next, session) => {
    const { phone, email, firstName, lastName, personalDetails, isPlanningToTakeAcademicTest, isPlanningToTakeLanguageTest, familyDetails, extraCurriculumActivities, displayPicSrc, school, plus2, underGraduation, postGraduation, tests, workExperience, skills, preference, researchPapers, education } = req.body;
    const existingEmail = await userModel.findOne({ email });
    if (existingEmail) return { statusCode: 400, message: "email already exists", data: email }
    const existingPhone = await userModel.findOne({ "phone.number": phone.number, "phone.countryCode": phone.countryCode });
    if (existingPhone) return { statusCode: 400, message: "phone number already exists", data: phone }
    const user = await studentModel.create({ phone, email, firstName, lastName })
    user.suggestedPackages = [process.env.DEFAULT_SUGGESTED_PACKAGE_MONGOID]
    user.advisors = [{ assignedCountries: req.user.expertiseCountry, info: req.user._id }]
    const chat = await chatModel.create({ participants: [req.user._id, user._id] });
    req.user.students.push({ students: { profile: user._id, stage: "Fresh Lead" } });
    req.user.logs.push({
        action: `registered new student`,
        details: `userId:${user._id}`
    })
    sendMail({
        to: req.user.email,
        subject: "new Student assigned to you",
        html: `
            <html lang="en">
                <head>
                    <meta charset="UTF-8" />
                    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                    <title>Document</title>
                    <style>
                        .container {
                            font-family: Arial, sans-serif;
                            text-align: center;
                            padding: 20px;
                        }
                        img {
                            max-width: 200px;
                            margin-bottom: 20px;
                        }
                        h3 {
                            color: #333;
                        }
                        h2 {
                            color: #0073e6;
                        }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <img src="https://campusroot.com/static/media/CampusrootLogo.bb6a8db3a579f4910f3f.png" alt="Campusroot Logo" />
                        <h3>Dear ${req.user.firstName} ${req.user.lastName},</h3>
                        <h2>you have successfully registered a student!</h2>
                    </div>
                </body>
            </html>
        `
    });
    const doc = await createFolder(user._id, process.env.DEFAULT_STUDENT_PARENTID_FOLDER_ZOHO)
    user.docData = {
        folder: doc.id,
        name: doc.attributes.name,
        parent: doc.attributes.parent_id,
        download_url: doc.attributes.download_url,
        modified_by_zuid: doc.attributes.modified_by_zuid
    }
    user.LeadSource = req.user.firstName + req.user.lastName;
    if (personalDetails) user.personalDetails = personalDetails;
    if (isPlanningToTakeAcademicTest) user.isPlanningToTakeAcademicTest = isPlanningToTakeAcademicTest;
    if (isPlanningToTakeLanguageTest) user.isPlanningToTakeLanguageTest = isPlanningToTakeLanguageTest;
    if (familyDetails) user.familyDetails = familyDetails;
    if (extraCurriculumActivities) user.extraCurriculumActivities = extraCurriculumActivities;
    if (displayPicSrc) user.displayPicSrc = displayPicSrc;
    if (tests) user.tests = tests;
    if (workExperience) user.workExperience = workExperience;
    if (researchPapers) user.researchPapers = researchPapers;
    if (school) user.education.school = school;
    if (plus2) user.education.plus2 = plus2;
    if (underGraduation) user.education.underGraduation = underGraduation;
    if (postGraduation) user.education.postGraduation = postGraduation;
    if (skills) user.skills = skills;
    if (preference) user.preference = preference;
    if (education) user.education = education;
    await Promise.all([
        req.user.save(),
        user.save()
    ])
    return { statusCode: 200, message: "user created successfully", data: user }
})
export const editStudentDetails = errorWrapper(async (req, res) => {
    const { studentId, firstName, lastName, personalDetails, isPlanningToTakeAcademicTest, isPlanningToTakeLanguageTest, familyDetails, extraCurriculumActivities, displayPicSrc, school, plus2, underGraduation, postGraduation, tests, workExperience, skills, preference, researchPapers, education } = req.body;
    const user = await studentModel.findById(studentId)
    if (!user) return { statusCode: 404, message: "User not found" }
    if (firstName) user.firstName = firstName
    if (lastName) user.lastName = lastName
    if (personalDetails) user.personalDetails = personalDetails;
    if (isPlanningToTakeAcademicTest) user.isPlanningToTakeAcademicTest = isPlanningToTakeAcademicTest;
    if (isPlanningToTakeLanguageTest) user.isPlanningToTakeLanguageTest = isPlanningToTakeLanguageTest;
    if (familyDetails) user.familyDetails = familyDetails;
    if (extraCurriculumActivities) user.extraCurriculumActivities = extraCurriculumActivities;
    if (displayPicSrc) user.displayPicSrc = displayPicSrc;
    if (tests) user.tests = tests;
    if (workExperience) user.workExperience = workExperience;
    if (researchPapers) user.researchPapers = researchPapers;
    if (school) user.education.school = school;
    if (plus2) user.education.plus2 = plus2;
    if (underGraduation) user.education.underGraduation = underGraduation;
    if (postGraduation) user.education.postGraduation = postGraduation;
    if (skills) user.skills = skills;
    if (preference) user.preference = preference;
    if (education) user.education = education;
    req.user.logs.push({
        action: `updated student data`,
        details: `userId:${user._id}`
    })
    await Promise.all([
        req.user.save(),
        user.save()
    ])
    return { statusCode: 200, message: "user updated successfully", data: user }
})