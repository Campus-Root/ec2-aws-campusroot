import { studentModel } from "../../models/Student.js";
import universityModel from "../../models/University.js";
import courseModel from "../../models/Course.js";
import destinationModel from "../../models/Destination.js";
import { teamModel } from "../../models/Team.js";
import { generateAPIError } from "../../errors/apiError.js";
import { errorWrapper } from "../../middleware/errorWrapper.js";
import { currencySymbols } from "../../utils/enum.js";
import exchangeModel from "../../models/ExchangeRates.js";
import { costConversion } from "../../utils/currencyConversion.js";
import { disciplineRegexMatch, subDisciplineRegexMatch } from "../../utils/regex.js";

const ExchangeRatesId = process.env.EXCHANGERATES_MONGOID
export const listings = errorWrapper(async (req, res, next) => {
    const { page, search } = req.body, filter = {}, perPage = 20, skip = (page - 1) * perPage; // Number of items per page
    let totalPages = 0, totalDocs
    const { rates } = await exchangeModel.findById(ExchangeRatesId, "rates")
    switch (req.params.name) {
        case "universities":
            req.body.filterData.forEach(ele => {
                if (ele.type === "country") filter["location.country"] = { $in: ele.data };
                else if (ele.type === "city") filter["location.city"] = { $in: ele.data };
                else if (ele.type === "state") filter["location.state"] = { $in: ele.data };
                else if (ele.type === "type") filter.type = ele.data;
                // else if (ele.graduationRate === "graduationRate") filter.graduationRate = { $gte: ele.data };
                // else if (ele.acceptanceRate === "acceptanceRate") filter.acceptanceRate = { $gte: ele.data };
                // else if (ele.type === "avgTuitionFee") filter.avgTuitionFee = { $lte: ele.data };
            });
            const listOfUniversities = await universityModel.find(filter, { name: 1, cost: 1, location: 1, currency: 1, logoSrc: 1, pictureSrc: 1, type: 1, ranking: 1, establishedYear: 1, campusrootReview: 1, graduationRate: 1, acceptanceRate: 1, courses: 1 }).populate("courses", "name").skip(skip).limit(perPage);
            for (const university of listOfUniversities) {
                if (req.body.currency && university.currency.code !== req.body.currency) {
                    if (!rates[university.currency.code] || !rates[req.body.currency]) next(generateAPIError('Exchange rates for the specified currencies are not available', 400));
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


            totalDocs = await universityModel.countDocuments(filter)
            totalPages = Math.ceil(totalDocs / perPage);
            return res.status(200).json({ success: true, message: `list of all universities`, data: { list: listOfUniversities.sort(() => Math.random() - 0.5), currentPage: page, totalPages: totalPages, totalItems: totalDocs } })
        case "courses":
            req.body.filterData.forEach(ele => {
                if (ele.type === "country") filter["location.country"] = { $in: ele.data };
                else if (ele.type === "city") filter["location.city"] = { $in: ele.data };
                else if (ele.type === "state") filter["location.state"] = { $in: ele.data };
                else if (ele.type === "universityId") filter.university = { $in: ele.data };
                else if (ele.type === "studyLevel") filter.studyLevel = { $in: ele.data };
                else if (ele.type === "studyMode") filter.studyMode = { $in: ele.data };
                else if (ele.type === "discipline") filter.discipline = { $in: ele.data };
                else if (ele.type === "subDiscipline") filter.subDiscipline = { $in: ele.data };
                else if (ele.type === "type") filter.type = ele.data;
                else if (ele.type === "name") filter["$or"] ? filter["$or"].push([{ name: { $regex: ele.data, $options: "i" } }, { schoolName: { $regex: ele.data, $options: "i" } }]) : filter["$or"] = [{ name: { $regex: ele.data, $options: "i" } }, { schoolName: { $regex: ele.data, $options: "i" } }]
                else if (ele.type === "AcademicTestName") filter["AdmissionsRequirements.AcademicRequirements.testName"] = { $in: ele.data };
                else if (ele.type === "LanguageTestName") filter["AdmissionsRequirements.LanguageRequirements.testName"] = { $in: ele.data };
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
                else if (ele.type === "budget") {
                    let currencyFilter = [{ "currency.code": "USD", "tuitionFee.tuitionFee": { "$gte": 0, "$lte": 0 } }, { "currency.code": "GBP", "tuitionFee.tuitionFee": { "$gte": 0, "$lte": 0 } }, { "currency.code": "NZD", "tuitionFee.tuitionFee": { "$gte": 0, "$lte": 0 } }, { "currency.code": "CAD", "tuitionFee.tuitionFee": { "$gte": 0, "$lte": 0 } }, { "currency.code": "AUD", "tuitionFee.tuitionFee": { "$gte": 0, "$lte": 0 } }, { "currency.code": "EUR", "tuitionFee.tuitionFee": { "$gte": 0, "$lte": 0 } }];
                    filter["$or"] = currencyFilter.map(element => {
                        let lowerLimit = costConversion(ele.data.lowerLimit, req.body.currency, element["currency.code"], rates[req.body.currency], rates[element["currency.code"]]);
                        let upperLimit = costConversion(ele.data.upperLimit, req.body.currency, element["currency.code"], rates[req.body.currency], rates[element["currency.code"]]);
                        return { ...element, "tuitionFee.tuitionFee": { "$gte": lowerLimit, "$lte": upperLimit } };
                    });
                }
                else if (ele.type === "intake") {
                    /* 0=>0,1,2 1=>3,4,5 2=>6,7,8 3=>9,10,11*/
                    let period = { $and: [{ courseStartingMonth: { $gte: ele.data * 3 } }, { courseStartingMonth: { $lte: (ele.data * 3) + 2 } }] }
                    filter.startDate = { $elemMatch: period };
                }
            });
            let courses = await courseModel.find(filter, { name: 1, university: 1, discipline: 1, subDiscipline: 1, studyLevel: 1, "tuitionFee.tuitionFeeType": 1, "tuitionFee.tuitionFee": 1, "startDate": 1, schoolName: 1, STEM: 1, duration: 1, courseType: 1, studyMode: 1, currency: 1, }).populate("university", "name location logoSrc type uni_rating").skip(skip).limit(perPage);
            if (req.body.currency) {
                courses = courses.map(ele => {
                    if (!rates[ele.currency.code] || !rates[req.body.currency]) next(generateAPIError('Exchange rates for the specified currencies are not available', 400));
                    if (ele.currency.code != req.body.currency) {
                        ele.tuitionFee.tuitionFee = costConversion(ele.tuitionFee.tuitionFee, ele.currency.code, req.body.currency, rates[ele.currency.code], rates[req.body.currency])
                        ele.currency = { code: req.body.currency, symbol: currencySymbols[req.body.currency] }
                    }
                    return ele;
                });
            }
            totalDocs = await courseModel.countDocuments(filter)
            totalPages = Math.ceil(totalDocs / perPage);
            if (req.body.filterData.length > 0) courses = courses.sort(() => Math.random() - 0.5)
            return res.status(200).json({ success: true, message: `list of all courses`, data: { list: courses, currentPage: page, totalPages: totalPages, totalItems: totalDocs } })
        case "destinations":
            const destinations = await destinationModel.find({}, "destinationPicSrc destinationName")
            return res.status(200).json({ success: true, message: `all destinations`, data: { list: destinations } })
        // case "search":
        //     const [lists, universities] = await Promise.all([
        //         courseModel.find({ name: { $regex: req.body.search, $options: "i" } }, { name: 1, university: 1, discipline: 1, subDiscipline: 1, studyLevel: 1, "tuitionFee.tuitionFeeType": 1, "tuitionFee.tuitionFee": 1, "startDate": 1, schoolName: 1, STEM: 1, duration: 1, courseType: 1, studyMode: 1, currency: 1 }).populate("university", "name location logoSrc type"),
        //         universityModel.find({ $or: [{ name: { $regex: req.body.search, $options: "i" } }, { code: { $regex: req.body.search, $options: "i" } }], courses: { $exists: true, $not: { $size: 0 } } }, "courses").populate("courses", { name: 1, university: 1, discipline: 1, subDiscipline: 1, studyLevel: 1, "tuitionFee.tuitionFeeType": 1, "tuitionFee.tuitionFee": 1, "startDate": 1, schoolName: 1, STEM: 1, duration: 1, courseType: 1, studyMode: 1, currency: 1 })
        //     ]);
        //     await universityModel.populate(universities, { path: "courses.university", select: "name location logoSrc type" });
        //     const combinedList = universities.reduce((acc, ele) => {
        //         acc.push(...ele.courses);
        //         return acc;
        //     }, []);
        //     const slicedLists = [...lists, ...combinedList].slice(skip, skip + perPage);
        //     return res.status(200).json({ success: true, message: `all destinations`, data: { list: slicedLists, currentPage: page, totalPages: Math.ceil(lists.length + combinedList.length / perPage), totalItems: lists.length + combinedList.length } });
    }
})
export const oneUniversity = errorWrapper(async (req, res, next) => {
    let university = await universityModel.findById(req.query.id, { universityLink: 0, generalRequirementLink: 0, completeProgramLink: 0 }).populate("courses", "name studyLevel tuitionFee duration courseType studyMode currency")
    if (!university) return res.status(400).json({ success: true, message: `university ID invalid`, data: null })
    university = await university.populate("userReviews", "rating user comment")
    university = await university.populate("userReviews.user", "name displayPicSrc")
    if (req.query.currency && university.currency.code !== req.query.currency) {
        const { rates } = await exchangeModel.findById(ExchangeRatesId, "rates")
        if (!rates[university.currency.code] || !rates[req.query.currency]) next(generateAPIError('Exchange rates for the specified currencies are not available', 400));
        university.cost = university.cost.map(ele => {
            return {
                name: ele.name,
                lowerLimit: costConversion(ele.lowerLimit, university.currency.code, req.query.currency, rates[university.currency.code], rates[req.query.currency]),
                upperLimit: costConversion(ele.upperLimit, university.currency.code, req.query.currency, rates[university.currency.code], rates[req.query.currency])
            };
        });
        university.currency = { code: req.query.currency, symbol: currencySymbols[req.query.currency] }
        university.courses = university.courses.map(ele => {
            if (!rates[ele.currency.code] || !rates[req.query.currency]) next(generateAPIError('Exchange rates for the specified currencies are not available', 400));
            if (ele.currency.code != req.query.currency) {
                ele.tuitionFee.tuitionFee = costConversion(ele.tuitionFee.tuitionFee, ele.currency.code, req.query.currency, rates[ele.currency.code], rates[req.query.currency])
                ele.currency = { code: req.query.currency, symbol: currencySymbols[req.query.currency] }
            }
            return ele;
        });
    }
    return res.status(200).json({ success: true, message: `single university`, data: university })
})
export const oneCourse = errorWrapper(async (req, res, next) => {
    let course = await courseModel
        .findById(req.query.id, {
            "tuitionFee.tuitionFeeLink": 0,
            "startDate.link": 0,
            "AdmissionsRequirements.AcademicRequirements.Link": 0,
            "AdmissionsRequirements.EnglishRequirements.Link": 0,
            "AdmissionsRequirements.generalRequirementLink": 0,
            "AdmissionsRequirements.year15RequirementLink": 0,
            "applicationDetails.applicationProcedureLink": 0,
            "applicationDetails.applicationFeeLink": 0,
            "scholarship.termsAndConditions": 0,
            "scholarship.scholarshipLink": 0,
            "contactInfo": 0,
            "initialDeposits": 0
        })
        .populate("university", "name location ranking cost currency type logoSrc pictureSrc establishedYear")
    if (!course) return res.status(400).json({ success: true, message: `course ID invalid`, data: null })
    if (req.query.currency && course.currency.code !== req.query.currency) {
        const { rates } = await exchangeModel.findById(ExchangeRatesId, "rates")
        if (!rates[course.currency.code] || !rates[req.query.currency]) next(generateAPIError('Exchange rates for the specified currencies are not available', 400));
        course.tuitionFee.tuitionFee = costConversion(course.tuitionFee.tuitionFee, course.currency.code, req.query.currency, rates[course.currency.code], rates[req.query.currency])
        course.currency = { code: req.query.currency, symbol: currencySymbols[req.query.currency] }
        if (!rates[course.university.currency.code] || !rates[req.query.currency]) next(generateAPIError('Exchange rates for the specified currencies are not available', 400));
        course.university.cost = course.university.cost.map(ele => {
            return {
                name: ele.name,
                lowerLimit: costConversion(ele.lowerLimit, course.university.currency.code, req.query.currency, rates[course.university.currency.code], rates[req.query.currency]),
                upperLimit: costConversion(ele.upperLimit, course.university.currency.code, req.query.currency, rates[course.university.currency.code], rates[req.query.currency])
            };
        });
        course.university.currency = { code: req.query.currency, symbol: currencySymbols[req.query.currency] }
    }
    return res.status(200).json({ success: true, message: `single course`, data: course })
})
export const PublicProfile = errorWrapper(async (req, res, next) => {
    const { id } = req.params
    if (!id) return res.status(400).json({ success: false, message: "no id provided", data: null })
    const profile = await studentModel.findById(id, "_id displayPicSrc name activity")
    if (!profile) return res.status(400).json({ success: false, message: "invalid id", data: null })
    return res.status(200).json({ success: true, message: "public profile", data: profile, AccessToken: req.AccessToken ? req.AccessToken : null })
})
export const CommunityProfiles = errorWrapper(async (req, res, next) => {
    const { limit } = req.query
    const profiles = await studentModel.aggregate([{ $sample: { size: +limit || 10 } }, { $project: { _id: 1, displayPicSrc: 1, name: 1, activity: 1 } }]);
    return res.status(200).json({ success: true, message: "public profiles", data: profiles, AccessToken: req.AccessToken ? req.AccessToken : null })
})
export const counsellors = errorWrapper(async (req, res, next) => {
    const counsellors = await teamModel.find({ role: "counsellor" }, { name: 1, numberOfStudentsAssisted: 1, displayPicSrc: 1 })
    return res.status(200).json({ success: true, message: `all counsellors`, data: counsellors })
})
export const uniNameRegex = errorWrapper(async (req, res, next) => {
    if (!req.query.search) return res.status(400).json({ success: false, message: `blank search`, data: null })
    const uniKeyword = {
        $or: [
            { name: { $regex: req.query.search, $options: "i" } },
            { code: { $regex: req.query.search, $options: "i" } }
        ],
        courses: { $exists: true, $not: { $size: 0 } }
    };
    const disciplineSearchResults = disciplineRegexMatch(req.query.search)
    const subDisciplineSearchResults = subDisciplineRegexMatch(req.query.search)
    if (req.query.country) uniKeyword["location.country"] = req.query.country
    const uniSearchResults = await universityModel.find(uniKeyword, "name courses community logoSrc").limit(5).populate("courses", "name")
    return res.status(200).json({ success: true, message: `search Result`, data: { universities: uniSearchResults, subDisciplines: subDisciplineSearchResults, disciplines: disciplineSearchResults } })
})