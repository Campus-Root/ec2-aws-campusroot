import { studentModel } from "../../models/Student.js";
import universityModel from "../../models/University.js";
import courseModel from "../../models/Course.js";
import destinationModel from "../../models/Destination.js";
import { teamModel } from "../../models/Team.js";
import { errorWrapper } from "../../middleware/errorWrapper.js";
import { currencySymbols } from "../../utils/enum.js";
import exchangeModel from "../../models/ExchangeRates.js";
import { costConversion } from "../../utils/currencyConversion.js";
import { disciplineRegexMatch, subDisciplineRegexMatch } from "../../utils/regex.js";
import leadsModel from "../../models/leads.js";
import { leadCreation, refreshToken } from "../../utils/CRMintegrations.js";
import 'dotenv/config';
import institutionModel from "../../models/IndianColleges.js";
const ExchangeRatesId = process.env.EXCHANGERATES_MONGOID
export const listings = errorWrapper(async (req, res, next, session) => {
    const { page } = req.body, filter = {}, sort = {}, perPage = 20, skip = (page - 1) * perPage; // Number of items per page
    let totalPages = 0, totalDocs
    const { rates } = await exchangeModel.findById(ExchangeRatesId, "rates")
    switch (req.params.name) {
        case "universities":
            filter.courses = { "$gt": 0 }
            sort.courses = -1
            req.body.filterData.forEach(ele => {
                if (ele.type === "country") filter["location.country"] = { $in: ele.data };
                else if (ele.type === "city") filter["location.city"] = { $in: ele.data };
                else if (ele.type === "state") filter["location.state"] = { $in: ele.data };
                else if (ele.type === "type") filter.type = ele.data[0];
                else if (ele.type === "rating") filter.uni_rating = { $gte: ele.data[0] };
                else if (ele.type === "name") filter["$or"] ? filter["$or"].push([{ name: { $regex: ele.data[0].replace(" ", "|"), $options: "i" } }, { code: { $regex: ele.data[0].replace(" ", "|"), $options: "i" } }]) : filter["$or"] = [{ name: { $regex: ele.data[0].replace(" ", "|"), $options: "i" } }, { code: { $regex: ele.data[0].replace(" ", "|"), $options: "i" } }]
                else if (ele.type === "popular") {
                    filter[`rank.${ele.data[0]}`] = { $exists: true, $ne: 0 };
                    sort[`rank.${ele.data[0]}`] = 1;
                }
            });
            const listOfUniversities = await universityModel.find(filter, { name: 1, uni_rating: 1, cost: 1, location: 1, currency: 1, logoSrc: 1, pictureSrc: 1, type: 1, ranking: 1, establishedYear: 1, campusrootReview: 1, graduationRate: 1, acceptanceRate: 1, courses: 1 }).sort(sort).skip(skip).limit(perPage);
            totalDocs = await universityModel.countDocuments(filter)
            for (const university of listOfUniversities) {
                if (req.body.currency && university.currency.code !== req.body.currency) {
                    if (!rates[university.currency.code] || !rates[req.body.currency]) return { statusCode: 400, data: null, message: 'Exchange rates for the specified currencies are not available' };
                    university.cost = university.cost.map(ele => {
                        return {
                            name: ele.name,
                            lowerLimit: costConversion(ele.lowerLimit, university.currency.code, req.body.currency, rates[university.currency.code], rates[req.body.currency]),
                            upperLimit: costConversion(ele.upperLimit, university.currency.code, req.body.currency, rates[university.currency.code], rates[req.body.currency])
                        };
                    });
                    university.currency = { code: req.body.currency, symbol: currencySymbols[req.body.currency] }
                }
            }

            totalPages = Math.ceil(totalDocs / perPage);
            return ({ statusCode: 200, message: `list of all universities`, data: { list: listOfUniversities, currentPage: page, totalPages: totalPages, totalItems: totalDocs } })
        case "courses":
            req.body.filterData.forEach(ele => {
                if (ele.type === "country") filter["location.country"] = { $in: ele.data };
                else if (ele.type === "city") filter["location.city"] = { $in: ele.data };
                else if (ele.type === "state") filter["location.state"] = { $in: ele.data };
                else if (ele.type === "universityId") filter.university = { $in: ele.data };
                else if (ele.type === "courseId") filter._id = { $in: ele.data };
                else if (ele.type === "studyLevel") filter.studyLevel = { $in: ele.data };
                else if (ele.type === "studyMode") filter.studyMode = { $in: ele.data };
                else if (ele.type === "discipline") filter.discipline = { $in: ele.data };
                else if (ele.type === "subDiscipline") filter.subDiscipline = { $in: ele.data };
                else if (ele.type === "type") filter.type = ele.data;
                else if (ele.type === "name") {
                    // filter["$or"].push({ "location.country": { $regex: ele.data[0].replace(" ", "|"), $options: "i" } }, { "location.city": { $regex: ele.data[0].replace(" ", "|"), $options: "i" } }, { "location.state": { $regex: ele.data[0].replace(" ", "|"), $options: "i" } }, { name: { $regex: ele.data[0].replace(" ", "|"), $options: "i" } }, { unisName: { $regex: ele.data[0].replace(" ", "|"), $options: "i" } }, { schoolName: { $regex: ele.data[0].replace(" ", "|"), $options: "i" } })
                    filter.$text = { $search: ele.data[0] };
                }
                else if (ele.type === "AcademicTestName") {
                    if (!filter["$and"]) filter["$and"] = []
                    let InArray = [], OutArray = []
                    ele.data.forEach(item => item.required ? InArray.push(item.name) : OutArray.push(item.name))
                    if (OutArray.length) filter["$and"].push({ "AdmissionsRequirements.AcademicRequirements.testName": { $nin: OutArray } });
                    if (InArray.length) filter["$and"].push({ "AdmissionsRequirements.AcademicRequirements.testName": { $in: InArray } });
                }
                else if (ele.type === "LanguageTestName") {
                    if (!filter["$and"]) filter["$and"] = []
                    let InArray = [], OutArray = []
                    ele.data.forEach(item => item.required ? InArray.push(item.name) : OutArray.push(item.name))
                    if (OutArray.length) filter["$and"].push({ "AdmissionsRequirements.LanguageRequirements.testName": { $nin: OutArray } });
                    if (InArray.length) filter["$and"].push({ "AdmissionsRequirements.LanguageRequirements.testName": { $in: InArray } });
                }
                else if (ele.type === "openNow") {
                    let currentMonth = new Date().getMonth(), next3Months = (currentMonth + 3) % 12, period
                    (currentMonth > 8) ?
                        period = {
                            $or: [
                                {
                                    $and: [
                                        { deadlineMonth: { $gte: currentMonth } },
                                        { deadlineMonth: { $lte: 11 } } // Deadline in the current year
                                    ]
                                },
                                {
                                    $and: [
                                        { deadlineMonth: { $lte: next3Months } },
                                        { deadlineMonth: { $gte: 0 } } // Deadline in the next year

                                    ]
                                }]
                        }
                        :
                        period = { $and: [{ deadlineMonth: { $gte: currentMonth } }, { deadlineMonth: { $lte: next3Months } }] }
                    filter.startDate = { $elemMatch: period };
                }
                else if (ele.type === "stem") filter["stemDetails.stem"] = true;
                else if (ele.type === "budget") {
                    let currencyFilter = [{ "currency.code": "USD", "tuitionFee.tuitionFee": { "$gte": 0, "$lte": 0 } }, { "currency.code": "GBP", "tuitionFee.tuitionFee": { "$gte": 0, "$lte": 0 } }, { "currency.code": "NZD", "tuitionFee.tuitionFee": { "$gte": 0, "$lte": 0 } }, { "currency.code": "CAD", "tuitionFee.tuitionFee": { "$gte": 0, "$lte": 0 } }, { "currency.code": "AUD", "tuitionFee.tuitionFee": { "$gte": 0, "$lte": 0 } }, { "currency.code": "EUR", "tuitionFee.tuitionFee": { "$gte": 0, "$lte": 0 } }];
                    if (!filter["$or"]) filter["$or"] = []
                    filter["$or"].push(...currencyFilter.map(element => {
                        ele.data[0] = ele.data[0] ? ele.data[0] : 0
                        ele.data[1] = ele.data[1] ? ele.data[1] : Math.min()
                        let lowerLimit = costConversion(ele.data[0], req.body.currency, element["currency.code"], rates[req.body.currency], rates[element["currency.code"]]);
                        let upperLimit = costConversion(ele.data[1], req.body.currency, element["currency.code"], rates[req.body.currency], rates[element["currency.code"]]);
                        return { ...element, "tuitionFee.tuitionFee": { "$gte": lowerLimit, "$lte": upperLimit } };
                    }));
                }
                else if (ele.type === "intake") {
                    /* 0=>0,1,2 1=>3,4,5 2=>6,7,8 3=>9,10,11*/
                    let period = { $and: [{ courseStartingMonth: { $gte: ele.data * 3 } }, { courseStartingMonth: { $lte: (ele.data * 3) + 2 } }] }
                    filter.startDate = { $elemMatch: period };
                }
            });
            let courses = await courseModel.find(filter, { name: 1, university: 1, discipline: 1, subDiscipline: 1, studyLevel: 1, "tuitionFee.tuitionFeeType": 1, "tuitionFee.tuitionFee": 1, "startDate": 1, schoolName: 1, STEM: 1, duration: 1, courseType: 1, studyMode: 1, currency: 1, "stemDetails.stem": 1, "AdmissionsRequirements.AcademicRequirements": 1, elite: 1, "AdmissionsRequirements.LanguageRequirements": 1 }).populate("university", "name location logoSrc type uni_rating").skip(skip).limit(perPage);
            if (req.body.currency) {
                courses = courses.map(ele => {
                    if (!rates[ele.currency.code] || !rates[req.body.currency]) return { statusCode: 400, data: null, message: 'Exchange rates for the specified currencies are not available' };
                    if (ele.currency.code != req.body.currency) {
                        ele.tuitionFee.tuitionFee = costConversion(ele.tuitionFee.tuitionFee, ele.currency.code, req.body.currency, rates[ele.currency.code], rates[req.body.currency])
                        ele.currency = { code: req.body.currency, symbol: currencySymbols[req.body.currency] }
                    }
                    return ele;
                });
            }
            totalDocs = await courseModel.countDocuments(filter)
            totalPages = Math.ceil(totalDocs / perPage);
            if (req.body.filterData.length == 0) courses = courses.sort(() => Math.random() - 0.5)
            return ({ statusCode: 200, message: `list of all courses`, data: { list: courses, currentPage: page, totalPages: totalPages, totalItems: totalDocs } })
        case "destinations":
            const destinations = await destinationModel.find({})
            return ({ statusCode: 200, message: `all destinations`, data: { list: destinations } })
    }
})
export const oneUniversity = errorWrapper(async (req, res, next, session) => {
    let university = await universityModel.findById(req.query.id, { universityLink: 0, generalRequirementLink: 0, completeProgramLink: 0 })
    if (!university) return res.status(400).json({ statusCode: 200, message: `university ID invalid`, data: null })
    university = await university.populate("userReviews", "rating user comment")
    university = await university.populate("userReviews.user", "firstName lastName displayPicSrc")
    if (req.query.currency && university.currency.code !== req.query.currency) {
        const { rates } = await exchangeModel.findById(ExchangeRatesId, "rates")
        if (!rates[university.currency.code] || !rates[req.query.currency]) return { statusCode: 400, data: null, message: 'Exchange rates for the specified currencies are not available' };
        university.cost = university.cost.map(ele => {
            return {
                name: ele.name,
                lowerLimit: costConversion(ele.lowerLimit, university.currency.code, req.query.currency, rates[university.currency.code], rates[req.query.currency]),
                upperLimit: costConversion(ele.upperLimit, university.currency.code, req.query.currency, rates[university.currency.code], rates[req.query.currency])
            };
        });
        university.currency = { code: req.query.currency, symbol: currencySymbols[req.query.currency] }
        // university.courses = university.courses.map(ele => {
        //     if (!rates[ele.currency.code] || !rates[req.query.currency]) { statusCode: 400, data: student , message:    'Exchange rates for the specified currencies are not available'};
        //     if (ele.currency.code != req.query.currency) {
        //         ele.tuitionFee.tuitionFee = costConversion(ele.tuitionFee.tuitionFee, ele.currency.code, req.query.currency, rates[ele.currency.code], rates[req.query.currency])
        //         ele.currency = { code: req.query.currency, symbol: currencySymbols[req.query.currency] }
        //     }
        //     return ele;
        // });
    }
    return ({ statusCode: 200, message: `single university`, data: university })
})
export const oneCourse = errorWrapper(async (req, res, next, session) => {
    let course = await courseModel
        .findById(req.query.id, {
            "tuitionFee.tuitionFeeLink": 0,
            "startDate.link": 0,
            "AdmissionsRequirements.AcademicRequirements.Link": 0,
            "AdmissionsRequirements.EnglishRequirements.Link": 0,
            "AdmissionsRequirements.generalRequirementLink": 0,
            "AdmissionsRequirements.year15RequirementLink": 0,
            "applicationDetails.applicationProcedureLink": 0,
            "scholarship.termsAndConditions": 0,
            "scholarship.scholarshipLink": 0,
            "contactInfo": 0,
            "initialDeposits": 0,
            "stemDetails.stemLink": 0
        })
        .populate("university", "name location ranking cost currency type logoSrc pictureSrc establishedYear")
    if (!course) return res.status(400).json({ statusCode: 200, message: `course ID invalid`, data: null })
    if (req.query.currency && course.currency.code !== req.query.currency) {
        const { rates } = await exchangeModel.findById(ExchangeRatesId, "rates")
        if (!rates[course.currency.code] || !rates[req.query.currency]) return { statusCode: 400, data: null, message: 'Exchange rates for the specified currencies are not available' };
        course.tuitionFee.tuitionFee = costConversion(course.tuitionFee.tuitionFee, course.currency.code, req.query.currency, rates[course.currency.code], rates[req.query.currency])
        course.applicationDetails.applicationFee = costConversion(course.applicationDetails.applicationFee, course.currency.code, req.query.currency, rates[course.currency.code], rates[req.query.currency])
        course.currency = { code: req.query.currency, symbol: currencySymbols[req.query.currency] }
        if (!rates[course.university.currency.code] || !rates[req.query.currency]) return { statusCode: 400, data: null, message: 'Exchange rates for the specified currencies are not available' };
        course.university.cost = course.university.cost.map(ele => {
            return {
                name: ele.name,
                lowerLimit: costConversion(ele.lowerLimit, course.university.currency.code, req.query.currency, rates[course.university.currency.code], rates[req.query.currency]),
                upperLimit: costConversion(ele.upperLimit, course.university.currency.code, req.query.currency, rates[course.university.currency.code], rates[req.query.currency])
            };
        });
        course.university.currency = { code: req.query.currency, symbol: currencySymbols[req.query.currency] }
    }
    return ({ statusCode: 200, message: `single course`, data: course })
})
export const PublicProfile = errorWrapper(async (req, res, next, session) => {
    const { id } = req.params
    if (!id) return res.status(400).json({ success: false, message: "no id provided", data: null })
    const profile = await studentModel.findById(id, "firstName lastName displayPicSrc activity")
    if (!profile) return res.status(400).json({ success: false, message: "invalid id", data: null })
    return ({ statusCode: 200, message: "public profile", data: profile })
})
export const CommunityProfiles = errorWrapper(async (req, res, next, session) => {
    const { limit } = req.query
    const profiles = await studentModel.aggregate([{ $sample: { size: +limit || 10 } }, { $project: { _id: 1, displayPicSrc: 1, firstName: 1, lastName: 1, activity: 1 } }]);
    return ({ statusCode: 200, message: "public profiles", data: profiles })
})
export const counsellors = errorWrapper(async (req, res, next, session) => {
    const counsellors = await teamModel.find({ role: "counsellor" }, { firstName: 1, lastName: 1, numberOfStudentsAssisted: 1, displayPicSrc: 1 })
    return { statusCode: 200, message: `all counsellors`, data: counsellors }
})
export const uniNameRegex = errorWrapper(async (req, res, next, session) => {
    if (!req.query.search) return res.status(400).json({ success: false, message: `blank search`, data: null })
    let institutionSearchResults = [], disciplineSearchResults = [], subDisciplineSearchResults = [], uniSearchResults = []
    if (req.query.institutions == 1) institutionSearchResults = await institutionModel.find({ $or: [{ InstitutionName: { $regex: req.query.search, $options: "i" } }, { university: { $regex: req.query.search, $options: "i" } }, { Address: { $regex: req.query.search, $options: "i" } }, { State: { $regex: req.query.search, $options: "i" } }, { District: { $regex: req.query.search, $options: "i" } }] }, "InstitutionName State District university IEH.exists").sort({ isStartMatch: -1, InstitutionName: 1 }).limit(5);
    if (req.query.universities == 1) {
        const searchPattern = req.query.search.replace(" ", "|");
        const countryFilter = req.query.country ? { "location.country": req.query.country } : {};
        const uniKeyword = {
            $or: [
                { name: { $regex: searchPattern, $options: "i" } },
                { code: { $regex: searchPattern, $options: "i" } },
                { "location.country": { $regex: searchPattern, $options: "i" } },
                { "location.state": { $regex: searchPattern, $options: "i" } },
                { "location.city": { $regex: searchPattern, $options: "i" } }
            ],
            courses: { $gt: 0 },
            ...countryFilter
        };
        uniSearchResults = await universityModel.aggregate([
            { $match: uniKeyword },
            {
                $addFields: {
                    isStartMatch: {
                        $cond: {
                            if: {
                                $or: [
                                    { $regexMatch: { input: "$name", regex: "^" + req.query.search, options: "i" } },
                                    { $regexMatch: { input: "$code", regex: "^" + req.query.search, options: "i" } },
                                    { $regexMatch: { input: "$location.country", regex: "^" + req.query.search, options: "i" } },
                                    { $regexMatch: { input: "$location.state", regex: "^" + req.query.search, options: "i" } },
                                    { $regexMatch: { input: "$location.city", regex: "^" + req.query.search, options: "i" } }
                                ]
                            },
                            then: 1,
                            else: 0
                        }
                    }
                }
            },
            { $sort: { isStartMatch: -1, name: 1 } },
            { $limit: 5 },
            {
                $project: {
                    name: 1,
                    location: 1,
                    community: 1,
                    logoSrc: 1,
                    code: 1
                }
            }
        ]);
    }
    if (req.query.disciplines == 1) disciplineSearchResults = disciplineRegexMatch(req.query.search)
    if (req.query.subDisciplines == 1) subDisciplineSearchResults = subDisciplineRegexMatch(req.query.search)
    // const uniKeyword = {
    //     $or: [
    //         { name: { $regex: req.query.search.replace(" ", "|"), $options: "i" } },
    //         { code: { $regex: req.query.search.replace(" ", "|"), $options: "i" } },
    //         { "location.country": { $regex: req.query.search.replace(" ", "|"), $options: "i" } },
    //         { "location.state": { $regex: req.query.search.replace(" ", "|"), $options: "i" } },
    //         { "location.city": { $regex: req.query.search.replace(" ", "|"), $options: "i" } }
    //     ],
    //     courses: { $gt: 0 }
    // };
    // if (req.query.country) uniKeyword["location.country"] = req.query.country
    // const uniSearchResults = await universityModel.find(uniKeyword, "name location community logoSrc").limit(5)
    return ({ statusCode: 200, message: `search Result`, data: { universities: uniSearchResults, subDisciplines: subDisciplineSearchResults, disciplines: disciplineSearchResults, institutions: institutionSearchResults } })
})
export const requestCallBack = errorWrapper(async (req, res, next, session) => {
    const { name, email, phone, studentID, queryDescription } = req.body
    let student, leadData, existingLead
    if (studentID) {
        existingLead = await leadsModel.find({ student: studentID })
        if (existingLead && existingLead.length > 0) return ({ statusCode: 200, message: 'We have already received your request, we will reach out to you shortly', data: null });
        student = await studentModel.findById(studentID)
        if (!student) return { statusCode: 400, data: null, message: 'invalid studentId' };
        // if (!student.verification[0].status && !email) return { statusCode: 400, data: student , message:    'please do verify your email before requesting a call'};
        // if (!student.verification[1].status && !phone) return { statusCode: 400, data: student , message:    'please do verify your phone number before requesting a call'};
        leadData = {
            student: studentID,
            queryDescription,
            name: `${student.firstName} ${student.lastName}`,
            email: student.verification[0].status ? student.email : email,
            phone: student.verification[1].status ? student.phone : phone
        }
        let newLead = await leadsModel.create(leadData);
        const rsa = await teamModel.aggregate([{ $match: { role: "remoteStudentAdvisor" } }, { $project: { _id: 1, leads: 1, leads: { $size: "$leads" } } }, { $sort: { leads: 1 } }, { $limit: 1 }]);
        await teamModel.findOneAndUpdate({ _id: rsa[0]._id }, { $push: { leads: newLead._id } }, { new: true });
        newLead.remoteStudentAdvisor = rsa[0]._id;
        const accessToken = await refreshToken()
        let crmData = await leadCreation(accessToken, { Last_Name: newLead.name, Mobile: newLead.phone.countryCode + newLead.phone.number, Lead_Source: "Campusroot App", Email: newLead.email })
        if (crmData[0].code != "SUCCESS") return {
            statusCode: 400, data: null, message: crmData[0].code
        };
        newLead.crmId = crmData[0].details.id
        await newLead.save()
        return ({ statusCode: 200, message: 'We have received your request, we will reach out to you shortly', data: null });
    }
    if (!email || !phone.number || !phone.countryCode || !name || !queryDescription) return {
        statusCode: 400, data: null, message: 'Incomplete details'
    };
    existingLead = await leadsModel.find({ "phone.countryCode": phone.countryCode, "phone.number": phone.number })
    if (existingLead.length > 0) return ({ statusCode: 200, message: 'We have already received your request, we will reach out to you shortly', data: null });
    if (!leadData) leadData = { queryDescription, name, email, phone }
    let newLead = await leadsModel.create(leadData);
    const rsa = await teamModel.aggregate([{ $match: { role: "remoteStudentAdvisor" } }, { $project: { _id: 1, leads: 1, leads: { $size: "$leads" } } }, { $sort: { leads: 1 } }, { $limit: 1 }]);
    await teamModel.findOneAndUpdate({ _id: rsa[0]._id }, { $push: { leads: newLead._id } }, { new: true });
    newLead.remoteStudentAdvisor = rsa[0]._id;
    const accessToken = await refreshToken()
    let crmData = await leadCreation(accessToken, { Last_Name: newLead.name, Mobile: newLead.phone.countryCode + newLead.phone.number, Lead_Source: "Campusroot App", Email: newLead.email })
    if (crmData[0].code != "SUCCESS") return {
        statusCode: 400, data: null, message: crmData[0].code
    };
    newLead.crmId = crmData[0].details.id
    await newLead.save()
    return ({ statusCode: 200, message: 'We have received your request, we will reach out to you shortly', data: null });
})