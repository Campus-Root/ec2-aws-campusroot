import { studentModel } from "../../models/Student.js";
import universityModel from "../../models/University.js";
import courseModel from "../../models/Course.js";
import { teamModel } from "../../models/Team.js";
import { errorWrapper } from "../../middleware/errorWrapper.js";
import { currencySymbols } from "../../utils/enum.js";
import exchangeModel from "../../models/ExchangeRates.js";
import { costConversion } from "../../utils/currencyConversion.js";
import { disciplineRegexMatch, locationRegexMatch, subDisciplineRegexMatch } from "../../utils/regex.js";
import leadsModel from "../../models/leads.js";
import { leadCreation, refreshToken } from "../../utils/CRMintegrations.js";
import 'dotenv/config';
import institutionModel from "../../models/IndianColleges.js";
import { getNewAdvisor } from "../../utils/dbHelperFunctions.js";
import { stringToEmbedding } from "../../utils/openAiEmbedding.js";
import { blogModel } from "../../models/blogs.js";
import mongoose from "mongoose";
import destinationModel from "../../models/Destination.js";
import { MongoClient } from "mongodb";
import { categorizePrograms, constructFilters } from "../../utils/recommendations.js";
import { fetchJSON2GridLink } from "../../utils/json2grid.js";
import { performance } from "node:perf_hooks";
const ExchangeRatesId = process.env.EXCHANGERATES_MONGOID
export const filters = errorWrapper(async (req, res, next) => {
    let { filterData, project } = req.body;
    let facetResults, facets = {}, countrySelected = false, stateSelected = false, disciplineSelected = false, filter = {}
    switch (req.params.name) {
        case "universities":
            for (const ele of filterData) {
                if (ele.type === "country") {
                    filter["location.country"] = { $in: ele.data };
                    countrySelected = true;
                }
                else if (ele.type === "city") filter["location.city"] = { $in: ele.data };
                else if (ele.type === "state") {
                    filter["location.state"] = { $in: ele.data };
                    stateSelected = true;
                }
            }
            filterData.forEach(ele => {
                if (ele.type === "country") {
                    filter["location.country"] = { $in: ele.data };
                    countrySelected = true;
                }
                else if (ele.type === "city") filter["location.city"] = { $in: ele.data };
                else if (ele.type === "state") {
                    filter["location.state"] = { $in: ele.data };
                    stateSelected = true;
                }
            });
            if (project.length === 0) project = ["country", "state", "city", "type"]
            if (project.includes("country")) facets.country = [{ $match: { "location.country": { $ne: null } } }, { $group: { _id: "$location.country", count: { $sum: 1 } } }, { $sort: { count: -1 } }];
            if (project.includes("state") && countrySelected) facets.state = [{ $match: { "location.state": { $ne: null } } }, { $group: { _id: "$location.state", count: { $sum: 1 } } }, { $sort: { count: -1 } }];
            if (project.includes("city") && (stateSelected || countrySelected)) facets.city = [{ $match: { "location.city": { $ne: null } } }, { $group: { _id: "$location.city", count: { $sum: 1 } } }, { $sort: { count: -1 } }];
            if (project.includes("type")) facets.type = [{ $match: { type: { $nin: [null, "not reported"] } } }, { $group: { _id: "$type", count: { $sum: 1 } } }, { $sort: { count: -1 } }]
            facetResults = await universityModel.aggregate([{ $match: filter }, { $facet: facets }]);
            break;
        case "courses":
            filter.university = { $exists: true }
            filter.multipleLocations = { $exists: false }
            for (const ele of filterData) {
                switch (ele.type) {
                    case "country":
                        filter["location.country"] = { $in: ele.data };
                        countrySelected = true;
                        break;
                    case "city":
                        filter["location.city"] = { $in: ele.data };
                        break;
                    case "state":
                        filter["location.state"] = { $in: ele.data };
                        stateSelected = true;
                        break;
                    // case "discipline":
                    //     filter.discipline = { $in: ele.data };
                    //     disciplineSelected = true;
                    //     break;
                    case "TOEFL":
                        filter.TOEFL = { $in: ele.data };
                        break;
                    case "PTE":
                        filter.PTE = { $in: ele.data };
                        break;
                    case "IELTS":
                        filter.IELTS = { $in: ele.data };
                        break;
                    case "Duolingo":
                        filter.Duolingo = { $in: ele.data };
                        break;
                    case "GMAT":
                        filter.GMAT = { $in: ele.data };
                        break;
                    case "GPA":
                        filter.GPA = { $in: ele.data };
                        break;
                    case "GRE":
                        filter.GRE = { $in: ele.data };
                        break;
                    case "subDiscipline":
                        filter.subDiscipline = { $in: ele.data };
                        break;
                    case "studyMode":
                        filter.studyMode = { $in: ele.data };
                        break;
                    case "studyLevel":
                        filter.studyLevel = { $in: ele.data };
                        break;
                    case "featured":
                        filter.featured = { $in: ele.data };
                        break;
                    case "STEM":
                        filter["stemDetails.stem"] = { $in: ele.data };
                        break;
                    case "budget":
                        let lowerLimit = ele.data[0], upperLimit = ele.data[1]
                        const { rates } = await exchangeModel.findById(ExchangeRatesId, "rates")
                        if (req.body.currency !== "USD") {
                            lowerLimit = costConversion(lowerLimit, req.body.currency, "USD", rates[req.body.currency], rates["USD"]);
                            upperLimit = costConversion(upperLimit, req.body.currency, "USD", rates[req.body.currency], rates["USD"]);
                        }
                        filter["budget.budgetAmount"] = { $lte: upperLimit + 100, $gte: Math.max(lowerLimit - 100, 0) };
                        break;
                    default:
                        break;
                }
            }
            if (project.length === 0) project = ["country", "state", "city", "discipline", "subDiscipline", "featured", "type", "studyLevel", "studyMode", "courseStartingMonth", "Language", "Academic", "stem", "ApplicationFeeWaver"]
            if (project.includes("country")) facets.country = [{ $match: { "location.country": { $ne: null } } }, { $group: { _id: "$location.country", count: { $sum: 1 } } }, { $sort: { count: -1 } }];
            if (project.includes("state") && countrySelected) facets.state = [{ $match: { "location.state": { $ne: null } } }, { $group: { _id: "$location.state", count: { $sum: 1 } } }, { $sort: { count: -1 } }];
            if (project.includes("city") && (stateSelected || countrySelected)) facets.city = [{ $match: { "location.city": { $ne: null } } }, { $group: { _id: "$location.city", count: { $sum: 1 } } }, { $sort: { count: -1 } }];
            // if (project.includes("discipline")) facets.discipline = [{ $unwind: "$discipline" }, { $group: { _id: "$discipline", count: { $sum: 1 } } }, { $sort: { count: -1 } }]
            if (project.includes("subDiscipline")) facets.subDiscipline = [{ $unwind: "$subDiscipline" }, { $group: { _id: "$subDiscipline", count: { $sum: 1 } } }, { $sort: { _id: 1 } }]
            if (project.includes("featured")) facets.featured = [{ $group: { _id: "$featured", count: { $sum: 1 } } }, { $sort: { count: -1 } }]
            if (project.includes("type")) facets.type = [{ $match: { type: { $nin: [null, "not reported"] } } }, { $group: { _id: "$type", count: { $sum: 1 } } }, { $sort: { count: -1 } }]
            // if (project.includes("studyLevel")) facets.studyLevel = [{ $group: { _id: "$studyLevel", count: { $sum: 1 } } }, { $sort: { count: -1 } }]
            if (project.includes("studyMode")) facets.studyMode = [{ $unwind: "$studyMode" }, { $match: { studyMode: { $nin: [null, "Online"] } } }, { $group: { _id: "$studyMode", count: { $sum: 1 } } }, { $sort: { count: -1 } }]
            if (project.includes("courseStartingMonth")) facets.courseStartingMonth = [
                { $unwind: "$startDate" },
                {
                    $group: {
                        _id: {
                            $cond: [
                                { $in: ["$startDate.courseStartingMonth", [0, 1, 2]] },
                                "January to March",
                                {
                                    $cond: [
                                        { $in: ["$startDate.courseStartingMonth", [3, 4, 5]] },
                                        "April to June",
                                        {
                                            $cond: [
                                                { $in: ["$startDate.courseStartingMonth", [6, 7, 8]] },
                                                "July to September",
                                                "October to December"
                                            ]
                                        }
                                    ]
                                }
                            ]
                        },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { count: -1 } }
            ]
            if (project.includes("Academic")) {
                facets.GRE = [
                    { $group: { _id: "$GRE", count: { $sum: 1 } } },
                    { $sort: { count: -1 } }
                ]
                facets.GPA = [
                    { $group: { _id: "$GPA", count: { $sum: 1 } } },
                    { $sort: { count: -1 } }
                ]
                facets.GMAT = [
                    { $group: { _id: "$GMAT", count: { $sum: 1 } } },
                    { $sort: { count: -1 } }
                ]
            }
            if (project.includes("Language")) {
                facets.Duolingo = [
                    { $group: { _id: "$Duolingo", count: { $sum: 1 } } },
                    { $sort: { count: -1 } }
                ]
                facets.IELTS = [
                    { $group: { _id: "$IELTS", count: { $sum: 1 } } },
                    { $sort: { count: -1 } }
                ]
                facets.PTE = [
                    { $group: { _id: "$PTE", count: { $sum: 1 } } },
                    { $sort: { count: -1 } }
                ]
                facets.TOEFL = [
                    { $group: { _id: "$TOEFL", count: { $sum: 1 } } },
                    { $sort: { count: -1 } }
                ]
            }
            // if (project.includes("stem")) facets.stem = [{ $group: { _id: "$stemDetails.stem", count: { $sum: 1 } } }, { $sort: { count: -1 } }]
            // if (project.includes("ApplicationFeeWaver")) facets.waiver = [{ $group: { _id: "$applicationDetails.applicationFeeWaiver", count: { $sum: 1 } } }, { $sort: { count: -1 } }]
            facetResults = await courseModel.aggregate([{ $match: filter }, { $facet: facets }]);
            break;
        default:
            break;
    }
    return ({ statusCode: 200, message: `facets`, data: facetResults })
})
export const listings = errorWrapper(async (req, res, next, session) => {
    const { page, perPage = 20 } = req.body, filter = {}, sort = {}, skip = (page - 1) * perPage; // Number of items per page
    let totalPages = 0, totalDocs
    const { rates } = await exchangeModel.findById(ExchangeRatesId, "rates")
    switch (req.params.name) {
        case "universities":
            // sort.globalRankingPosition = 1,
            // sort._id = 1
            // sort.courses = -1
            for (const ele of req.body.filterData) {
                switch (ele.type) {
                    case "country":
                        filter["location.country"] = { $in: ele.data };
                        break;
                    case "city":
                        filter["location.city"] = { $in: ele.data };
                        break;
                    case "state":
                        filter["location.state"] = { $in: ele.data };
                        break;
                    case "type":
                        filter.type = ele.data[0];
                        break;
                    case "rating":
                        filter.uni_rating = { $gte: ele.data[0] };
                        break;
                    case "name":
                        filter["$or"] ? filter["$or"].push([{ name: { $regex: ele.data[0].replace(" ", "|"), $options: "i" } }, { code: { $regex: ele.data[0].replace(" ", "|"), $options: "i" } }]) : filter["$or"] = [{ name: { $regex: ele.data[0].replace(" ", "|"), $options: "i" } }, { code: { $regex: ele.data[0].replace(" ", "|"), $options: "i" } }]
                        break;
                    case "popular":
                        filter[`rank.${ele.data[0]}`] = { $exists: true, $ne: 0 };
                        sort[`rank.${ele.data[0]}`] = 1;
                        break;
                    case "pointer":
                        let lat = parseFloat(ele.data[0]), lng = parseFloat(ele.data[1]), zoomLevel = parseInt(ele.data[2]), radius = parseFloat(ele.data[3])
                        const calculatedRadius = Math.pow(2, 20 - zoomLevel) * 100; // Dynamic radius calculation
                        const finalRadius = radius ? Math.min(radius, calculatedRadius) : calculatedRadius;
                        filter["geoCoordinates"] = {
                            $geoWithin: {
                                $centerSphere: [[lng, lat], finalRadius / 6378100], // Convert meters to radians
                            }
                        };
                        break;
                    default:
                        break;
                }
            }
            const listOfUniversities = await universityModel.find(filter, { name: 1, uni_rating: 1, cost: 1, location: 1, currency: 1, logoSrc: 1, pictureSrc: 1, type: 1, rank: 1, establishedYear: 1, campusrootReview: 1, graduationRate: 1, acceptanceRate: 1, courses: 1, geoCoordinates: 1 }).sort(sort).skip(skip).limit(perPage);
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
            let aggregationPipeline = [], courses
            for (const ele of req.body.filterData) {
                switch (ele.type) {
                    case "country":
                        filter["location.country"] = { $in: ele.data };
                        break;
                    case "city":
                        filter["location.city"] = { $in: ele.data };
                        break;
                    case "state":
                        filter["location.state"] = { $in: ele.data };
                        break;
                    case "universityId":
                        filter.university = { $in: ele.data.map(i => new mongoose.Types.ObjectId(i)) };
                        break;
                    case "courseId":
                        filter._id = { $in: ele.data.map(i => new mongoose.Types.ObjectId(i)) };
                        break;
                    case "studyLevel":
                        filter.studyLevel = { $in: ele.data };
                        break;
                    case "studyMode":
                        filter.studyMode = { $in: ele.data };
                        break;
                    case "discipline":
                        filter.discipline = { $in: ele.data };
                        break;
                    case "subDiscipline":
                        filter.subDiscipline = { $in: ele.data };
                        break;
                    case "type":
                        filter.type = ele.data[0];
                        break;
                    case "featured":
                        filter.featured = ele.data[0];
                        break;
                    case "name":
                        let vector = await stringToEmbedding(ele.data) // extract content from db  such as plot and courseLink 
                        aggregationPipeline.push({
                            $vectorSearch: {
                                "queryVector": vector,
                                "path": "embeddingVector",
                                "numCandidates": 100,
                                "limit": 40,
                                "index": "vector_index"
                            }
                        });
                        break;
                    case "TOEFL":
                        filter.TOEFL = { $in: ele.data };
                        break;
                    case "PTE":
                        filter.PTE = { $in: ele.data };
                        break;
                    case "IELTS":
                        filter.IELTS = { $in: ele.data };
                        break;
                    case "Duolingo":
                        filter.Duolingo = { $in: ele.data };
                        break;
                    case "GMAT":
                        filter.GMAT = { $in: ele.data };
                        break;
                    case "GPA":
                        filter.GPA = { $in: ele.data };
                        break;
                    case "GRE":
                        filter.GRE = { $in: ele.data };
                        break;
                    case "STEM":
                        filter["stemDetails.stem"] = { $in: ele.data };
                        break;
                    case "waiver":
                        filter["applicationDetails.applicationFeeWaiver"] = { $in: ele.data };
                        break;
                    case "budget":
                        let lowerLimit = ele.data[0], upperLimit = ele.data[1]
                        if (req.body.currency !== "USD") {
                            lowerLimit = costConversion(lowerLimit, req.body.currency, "USD", rates[req.body.currency], rates["USD"]);
                            upperLimit = costConversion(upperLimit, req.body.currency, "USD", rates[req.body.currency], rates["USD"]);
                        }
                        filter["budget.budgetAmount"] = { $lte: upperLimit + 100, $gte: Math.max(lowerLimit - 100, 0) };
                        break;
                    case "courseStartingMonth":
                        const monthsRange = {
                            "January to March": [0, 1, 2],
                            "April to June": [3, 4, 5],
                            "July to September": [6, 7, 8],
                            "October to December": [9, 10, 11]
                        };
                        let allowedMonths = [];
                        for (const label of ele.data || []) if (monthsRange[label]) allowedMonths = allowedMonths.concat(monthsRange[label]);
                        // Now use $in for filtering months
                        if (allowedMonths.length > 0) filter["startDate.courseStartingMonth"] = { $in: allowedMonths };
                        break;
                    // Add cases for other filters
                    default:
                        break;
                }
            }
            if (aggregationPipeline.length > 0) {
                aggregationPipeline.push({
                    $match: {
                        multipleLocations: { $exists: false },
                        ...filter // Apply dynamic filters
                    }
                }, {
                    $lookup: {
                        from: "universities", // Related collection name
                        localField: "university",
                        foreignField: "_id",
                        as: "university",
                        pipeline: [
                            {
                                $project: {
                                    name: 1,
                                    location: 1,
                                    logoSrc: 1,
                                    type: 1,
                                    uni_rating: 1,
                                    rank: 1,
                                    geoCoordinates: 1
                                }
                            }
                        ]
                    }
                },
                    {
                        $addFields: {
                            university: { $arrayElemAt: ["$university", 0] } // Extract the first element
                        }
                    }, {
                    $facet: {
                        metadata: [{ $count: "totalDocs" }], // Count total matching documents
                        data: [
                            {
                                $project: {
                                    name: 1,
                                    university: 1,
                                    discipline: 1,
                                    subDiscipline: 1,
                                    studyLevel: 1,
                                    applicationDetails: 1,
                                    "tuitionFee.tuitionFeeType": 1,
                                    "tuitionFee.tuitionFee": 1,
                                    startDate: 1,
                                    schoolName: 1,
                                    duration: 1,
                                    courseType: 1,
                                    studyMode: 1,
                                    currency: 1,
                                    "stemDetails.stem": 1,
                                    "AdmissionsRequirements.AcademicRequirements": 1,
                                    featured: 1,
                                    globalRankingPosition: 1,
                                    "AdmissionsRequirements.LanguageRequirements": 1,
                                    loanDetails: 1,
                                    budget: 1
                                }
                            },
                            // {
                            //     $sort: { globalRankingPosition: 1, _id: 1 } // Sort by ranking
                            // },
                            { $skip: skip }, // Pagination skip
                            { $limit: perPage }, // Pagination limit
                        ]
                    }
                });
                let result = await courseModel.aggregate(aggregationPipeline);
                courses = result[0]?.data || [];
                totalDocs = result[0]?.metadata[0]?.totalDocs || 0;
            }
            else {
                // add timing logger here 
                console.time("myFunction");
                const start = performance.now();

                [courses, totalDocs] = await Promise.all(
                    [
                        courseModel
                            .find({
                                multipleLocations: { $exists: false },
                                ...filter
                            }, "name university discipline subDiscipline studyLevel applicationDetails tuitionFee.tuitionFeeType tuitionFee.tuitionFee startDate schoolName duration courseType studyMode currency stemDetails.stem AdmissionsRequirements.AcademicRequirements featured globalRankingPosition AdmissionsRequirements.LanguageRequirements loanDetails budget")
                            .populate("university", "name location logoSrc type uni_rating rank geoCoordinates")
                            // .sort({ globalRankingPosition: 1, _id: 1 })
                            .skip(skip)
                            .limit(perPage),
                        courseModel.countDocuments({
                            multipleLocations: { $exists: false },
                            ...filter
                        })
                    ]
                )
                console.timeEnd("myFunction");
                const duration = performance.now() - start;
                console.log(`myFunction executed in ${duration.toFixed(2)} ms`);
              
            }
            totalPages = Math.ceil(totalDocs / perPage);
            if (req.body.currency) {
                courses = courses.map(ele => {
                    if (!rates[ele.currency.code] || !rates[req.body.currency]) {
                        return { statusCode: 400, data: null, message: 'Exchange rates for the specified currencies are not available' };
                    }
                    if (ele.currency.code != req.body.currency) {
                        ele.tuitionFee.tuitionFee = costConversion(ele.tuitionFee.tuitionFee, ele.currency.code, req.body.currency, rates[ele.currency.code], rates[req.body.currency]);
                        ele.currency = { code: req.body.currency, symbol: currencySymbols[req.body.currency] };
                    }
                    return ele;
                });
            }
            if (req.body.filterData.length == 0) courses = courses.sort(() => Math.random() - 0.5);
            return ({ statusCode: 200, message: `list of all courses`, data: { list: courses, currentPage: page, totalPages: totalPages, totalItems: totalDocs } });
        case "destinations":
            const destinations = await destinationModel.find({}, "-content").populate("author", "firstName lastName displayPicSrc email userType role").sort({ createdAt: -1 }).skip(skip).limit(perPage);
            totalDocs = await destinationModel.countDocuments({})
            totalPages = Math.ceil(totalDocs / perPage);
            return ({ statusCode: 200, message: `all destinations`, data: { list: destinations, currentPage: page, totalPages: totalPages, totalItems: totalDocs } })
        case "blogs":
            const blogs = await blogModel.find({}, "-content").populate("author comments.user likes", "firstName lastName displayPicSrc email userType role").sort({ createdAt: -1 }).skip(skip).limit(perPage);
            totalDocs = await blogModel.countDocuments({})
            totalPages = Math.ceil(totalDocs / perPage);
            return { statusCode: 200, message: "Blogs fetched successfully", data: { list: blogs, currentPage: page, totalPages: totalPages, totalItems: totalDocs } };
        default: return ({ statusCode: 400, message: "Invalid endpoint", data: null });
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
    }
    return ({ statusCode: 200, message: `single university`, data: university })
})
export const oneCourse = errorWrapper(async (req, res, next, session) => {
    let course = await courseModel
        .findById(req.query.id)
        .select("-embeddingVector -plot -programmeStructure -description")
        .populate("university", "name location rank cost currency type logoSrc pictureSrc establishedYear")
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
    let { page = 1, perPage = 5, search, institutions, universities, disciplines, subDisciplines, location, country, state, custom = false } = req.query, skip = (page - 1) * perPage;
    let institutionSearchResults = [], disciplineSearchResults = [], subDisciplineSearchResults = [], uniSearchResults = [], countrySearchResults = [], stateSearchResults = [], citySearchResults = [], totalPages = 1, queries = []
    if (!search) return res.status(400).json({ success: false, message: `blank search`, data: null })
    const specialCharRegex = /[^a-zA-Z0-9\s]/;
    if (specialCharRegex.test(search)) return res.status(400).json({ success: false, message: 'Invalid search. Special characters are not allowed.', data: null });
    const searchPattern = new RegExp(search.replace(/\s+/g, "|"), "i");
    if (institutions == 1) queries.push(
        (async () => {
            const [regexResults, textResults, totalDocs] = await Promise.all([
                institutionModel.find({ InstitutionName: { $regex: search, $options: "i" } }, "InstitutionName State District university IEH.exists").skip(skip).limit(perPage),
                institutionModel.find({ $text: { $search: search } }, "InstitutionName State District university IEH.exists").skip(skip).limit(perPage),
                institutionModel.countDocuments({ InstitutionName: { $regex: search, $options: "i" } })
            ]);
            if (regexResults.length <= 3) {
                institutionSearchResults = [...regexResults, ...textResults].reduce((acc, curr) => {
                    if (!acc.find(item => item._id.equals(curr._id))) acc.push(curr);
                    return acc;
                }, []);
                institutionSearchResults.sort((a, b) => a.InstitutionName.localeCompare(b.InstitutionName));
            }
            else institutionSearchResults = [...regexResults]
            totalPages = Math.max(Math.ceil(totalDocs / perPage), totalPages);
        })()
    );
    if (universities == 1) queries.push(
        (async () => {
            const countryFilter = country ? { "location.country": country } : {};
            const uniKeyword = { $or: [{ name: { $regex: new RegExp(searchPattern, "i") } }, { code: { $regex: new RegExp(searchPattern, "i") } }], courses: { $gt: 0 }, ...countryFilter };
            const [regexResults, textResults, totalDocs] = await Promise.all([universityModel.find(uniKeyword, "name location community logoSrc code").skip(skip).limit(perPage), universityModel.find({ $text: { $search: search } }, "name location community logoSrc code").skip(skip).limit(perPage), universityModel.countDocuments(uniKeyword)]);
            if (regexResults.length <= 3) {
                uniSearchResults = [...regexResults, ...textResults].reduce((acc, curr) => { if (!acc.find(item => item._id.equals(curr._id))) acc.push(curr); return acc; }, []);
                uniSearchResults.sort((a, b) => a.name.localeCompare(b.name));
            }
            else uniSearchResults = [...regexResults]
            totalPages = Math.max(Math.ceil(totalDocs / perPage), totalPages);
        })()
    );
    if (disciplines == 1) queries.push(
        (async () => {
            const { arr, totalDocs } = await disciplineRegexMatch(search, skip, perPage, custom);
            disciplineSearchResults = arr;
            totalPages = Math.max(Math.ceil(totalDocs / perPage), totalPages);
        })()
    );
    if (subDisciplines == 1) queries.push(
        (async () => {
            const { arr, totalDocs } = await subDisciplineRegexMatch(search, skip, perPage, custom);
            subDisciplineSearchResults = arr;
            totalPages = Math.max(Math.ceil(totalDocs / perPage), totalPages);
        })()
    );
    if (location == 1) queries.push(
        (async () => {
            const hint = {
                country: country?.length > 0 ? country : null,
                state: state?.length > 0 ? state : null
            };
            const { countries, states, cities, totalDocs } = await locationRegexMatch(search, skip, perPage, hint);
            countrySearchResults = countries;
            stateSearchResults = states;
            citySearchResults = cities;
            totalPages = Math.max(Math.ceil(totalDocs / perPage), totalPages);
        })()
    );
    await Promise.all(queries);
    return ({ statusCode: 200, message: `search Result`, data: { universities: uniSearchResults, subDisciplines: subDisciplineSearchResults, disciplines: disciplineSearchResults, institutions: institutionSearchResults, country: countrySearchResults, state: stateSearchResults, city: citySearchResults, totalPages } });
})
export const requestCallBack = errorWrapper(async (req, res, next, session) => {
    const { name, email, phone, studentID, queryDescription } = req.body
    let student, leadData, existingLead
    if (studentID) {
        existingLead = await leadsModel.find({ student: studentID })
        if (existingLead && existingLead.length > 0) return ({ statusCode: 200, message: 'We have already received your request, we will reach out to you shortly', data: null });
        student = await studentModel.findById(studentID)
        if (!student) return { statusCode: 400, data: null, message: 'invalid studentId' };
        const RSA = await getNewAdvisor("remoteStudentAdvisor");
        leadData = {
            student: studentID,
            queryDescription,
            name: `${student.firstName} ${student.lastName}`,
            email: student.email ? student.email : email,
            phone: student.phone ? student.phone : phone,
            remoteStudentAdvisor: RSA._id
        }
        let newLead = await leadsModel.create(leadData);
        await teamModel.findOneAndUpdate({ _id: RSA._id }, { $push: { leads: newLead._id } });
        const accessToken = await refreshToken()
        let crmData = await leadCreation(accessToken, { Last_Name: newLead.name, Mobile: newLead.phone.countryCode + newLead.phone.number, Lead_Source: "Campusroot App", Email: newLead.email })
        if (crmData[0].code == "DUPLICATE_DATA") return { statusCode: 200, data: null, message: "We have already received your request, we will reach out to you shortly" };
        if (crmData[0].code == "MULTIPLE_OR_MULTI_ERRORS") {
            let unknownErrors = crmData[0].details.errors.filter(ele => ele.code != "DUPLICATE_DATA")
            if (unknownErrors.length == 0) return { statusCode: 200, data: null, message: "We have already received your request, we will reach out to you shortly" };
            return { statusCode: 400, data: null, message: crmData[0].code };
        }
        if (crmData[0].code != "SUCCESS") return { statusCode: 400, data: null, message: crmData[0].code };
        newLead.crmId = crmData[0].details.id
        await newLead.save()
        return ({ statusCode: 200, message: 'We have received your request, we will reach out to you shortly', data: null });
    }
    if (!email || !phone.number || !phone.countryCode || !name || !queryDescription) return { statusCode: 400, data: null, message: 'Incomplete details' };
    existingLead = await leadsModel.find({ "phone.countryCode": phone.countryCode, "phone.number": phone.number })
    if (existingLead.length > 0) return ({ statusCode: 200, message: 'We have already received your request, we will reach out to you shortly', data: null });
    if (!leadData) leadData = { queryDescription, name, email, phone }
    let newLead = await leadsModel.create(leadData);
    const rsa = await getNewAdvisor("remoteStudentAdvisor");
    await teamModel.findOneAndUpdate({ _id: rsa._id }, { $push: { leads: newLead._id } }, { new: true });
    newLead.remoteStudentAdvisor = rsa._id;
    const accessToken = await refreshToken()
    let crmData = await leadCreation(accessToken, { Last_Name: newLead.name, Mobile: newLead.phone.countryCode + newLead.phone.number, Lead_Source: "Campusroot App", Email: newLead.email })
    if (crmData[0].code == "DUPLICATE_DATA") return { statusCode: 200, data: null, message: "We have already received your request, we will reach out to you shortly" };
    if (crmData[0].code == "MULTIPLE_OR_MULTI_ERRORS") {
        let unknownErrors = crmData[0].details.errors.filter(ele => ele.code != "DUPLICATE_DATA")
        if (unknownErrors.length == 0) return { statusCode: 200, data: null, message: "We have already received your request, we will reach out to you shortly" };
        return { statusCode: 400, data: null, message: crmData[0].code };
    }
    if (crmData[0].code != "SUCCESS") return { statusCode: 400, data: null, message: crmData[0].code };
    newLead.crmId = crmData[0].details.id
    await newLead.save()
    return ({ statusCode: 200, message: 'We have received your request, we will reach out to you shortly', data: null });
})
export const getBlogById = errorWrapper(async (req, res) => {
    const blog = await blogModel.findById(req.params.id).populate("author comments.user likes", "firstName lastName displayPicSrc email userType role").sort({ createdAt: -1 });
    if (!blog) return { statusCode: 400, message: "Blog post not found", data: req.params.id };
    return { statusCode: 200, message: "Blog fetched successfully", data: blog };
})
export const getDestinationById = errorWrapper(async (req, res) => {
    const destination = await destinationModel.findById(req.params.id).populate("author", "firstName lastName displayPicSrc email userType role").sort({ createdAt: -1 });
    if (!destination) return { statusCode: 400, message: "Destination not found", data: req.params.id };
    return { statusCode: 200, message: "Destination fetched successfully", data: destination };
})
export const getRecommendations = async (req, res) => {
    try {
        const { mode: queryMode } = req.query;
        const allowedModes = ["Student", "Counsellor"];
        const mode = allowedModes.includes(queryMode) ? queryMode : "Student";
        const { filterData, testScores } = req.body;
        if (!testScores || !Array.isArray(testScores) || testScores.length === 0) return res.status(400).json({ error: "Please provide valid testScores as an array." });
        const { filter, projections } = constructFilters(filterData, testScores);
        const client = await MongoClient.connect(process.env.MONGO_URL);
        let db = client.db('CampusRoot');
        const collection = db.collection("courses");
        let pipeline = [{ $match: filter }, { $project: projections }]
        const programs = await collection.aggregate(pipeline).toArray();
        const { safe, moderate, ambitious } = categorizePrograms(testScores, programs, mode);
        const link = await fetchJSON2GridLink({ input: { filterData, testScores }, safe, moderate, ambitious })
        return res.status(200).json({ link: link, data: { input: { filterData, testScores }, safe, moderate, ambitious }, message: "recommendations" })
        // return res.status(200).json({ filter, projections})

    } catch (error) {
        console.error("Error fetching programs:", error);
        res.status(500).json({ error: "Internal server error." });
    }
}

// case "courses":
//     let aggregationPipeline = []
//     for (const ele of req.body.filterData) {
//         switch (ele.type) {
//             case "country":
//                 filter["location.country"] = { $in: ele.data };
//                 break;
//             case "city":
//                 filter["location.city"] = { $in: ele.data };
//                 break;
//             case "state":
//                 filter["location.state"] = { $in: ele.data };
//                 break;
//             case "universityId":
//                 filter.university = { $in: ele.data.map(i => new mongoose.Types.ObjectId(i)) };
//                 break;
//             case "courseId":
//                 filter._id = { $in: ele.data.map(i => new mongoose.Types.ObjectId(i)) };
//                 break;
//             case "studyLevel":
//                 filter.studyLevel = { $in: ele.data };
//                 break;
//             case "studyMode":
//                 filter.studyMode = { $in: ele.data };
//                 break;
//             case "discipline":
//                 filter.discipline = { $in: ele.data };
//                 break;
//             case "subDiscipline":
//                 filter.subDiscipline = { $in: ele.data };
//                 break;
//             case "type":
//                 filter.type = ele.data[0];
//                 break;
//             case "name":
//                 let vector = await stringToEmbedding(ele.data) // extract content from db  such as plot and courseLink 
//                 aggregationPipeline.push({
//                     $vectorSearch: {
//                         "queryVector": vector,
//                         "path": "embeddingVector",
//                         "numCandidates": 100,
//                         "limit": 40,
//                         "index": "vector_index"
//                     }
//                 })
//                 break;
//             case "GRE":
//                 filter.GRE = ele.data[0];
//                 break;
//             case "GPA":
//                 filter.GPA = ele.data[0];
//                 break;
//             case "GMAT":
//                 filter.GMAT = ele.data[0];
//                 break;
//             case "Duolingo":
//                 filter.Duolingo = ele.data[0];
//                 break;
//             case "IELTS":
//                 filter.IELTS = ele.data[0];
//                 break;
//             case "PTE":
//                 filter.PTE = ele.data[0];
//                 break;
//             case "TOEFL":
//                 filter.TOEFL = ele.data[0];
//                 break;
//             case "waiver":
//                 filter["applicationDetails.applicationFeeWaiver"] = true;
//                 break;
//             case "openNow":
//                 break;
//             case "stem":
//                 filter["stemDetails.stem"] = true;
//                 break;
//             case "budget":
//                 let currencyFilter = [{ "currency.code": "USD", "tuitionFee.tuitionFee": { "$gte": 0, "$lte": 0 } }, { "currency.code": "GBP", "tuitionFee.tuitionFee": { "$gte": 0, "$lte": 0 } }, { "currency.code": "NZD", "tuitionFee.tuitionFee": { "$gte": 0, "$lte": 0 } }, { "currency.code": "CAD", "tuitionFee.tuitionFee": { "$gte": 0, "$lte": 0 } }, { "currency.code": "AUD", "tuitionFee.tuitionFee": { "$gte": 0, "$lte": 0 } }, { "currency.code": "EUR", "tuitionFee.tuitionFee": { "$gte": 0, "$lte": 0 } }];
//                 if (!filter["$or"]) filter["$or"] = []
//                 filter["$or"].push(...currencyFilter.map(element => {
//                     ele.data[0] = ele.data[0] ? ele.data[0] : 0
//                     ele.data[1] = ele.data[1] ? ele.data[1] : Math.min()
//                     let lowerLimit = costConversion(ele.data[0], req.body.currency, element["currency.code"], rates[req.body.currency], rates[element["currency.code"]]);
//                     let upperLimit = costConversion(ele.data[1], req.body.currency, element["currency.code"], rates[req.body.currency], rates[element["currency.code"]]);
//                     return { ...element, "tuitionFee.tuitionFee": { "$gte": lowerLimit, "$lte": upperLimit } };
//                 }));
//                 break;
//             case "courseStartingMonth":
// const monthsRange = ["January to March", "April to June", "July to September", "October to December"]
// let period = { $and: [{ courseStartingMonth: { $gte: monthsRange.indexOf(ele.data) * 3 } }, { courseStartingMonth: { $lte: (monthsRange.indexOf(ele.data) * 3) + 2 } }] }
// filter.startDate = { $elemMatch: period };
//                 break;
//             default:
//                 break;
//         }
//     }
//     aggregationPipeline.push({
//         $match: {
//             multipleLocations: { $exists: false },
//             ...filter // Dynamic filters based on the input
//         }
//     }, {
//         $lookup: {
//             from: "universities", // Related collection name
//             localField: "university",
//             foreignField: "_id",
//             as: "university",
//             pipeline: [
//                 {
//                     $project: {
//                         name: 1,
//                         location: 1,
//                         logoSrc: 1,
//                         type: 1,
//                         uni_rating: 1,
//                         rank: 1
//                     }
//                 }
//             ]
//         }
//     },
//         {
//             $addFields: {
//                 university: { $arrayElemAt: ["$university", 0] } // Extract the first element
//             }
//         },{
//         $facet: {
//             metadata: [{ $count: "totalDocs" }], // Count total matching documents
//             data: [
//                 {
//                     $project: {
//                         name: 1,
//                         university: 1,
//                         discipline: 1,
//                         subDiscipline: 1,
//                         studyLevel: 1,
//                         applicationDetails: 1,
//                         "tuitionFee.tuitionFeeType": 1,
//                         "tuitionFee.tuitionFee": 1,
//                         startDate: 1,
//                         schoolName: 1,
//                         duration: 1,
//                         courseType: 1,
//                         studyMode: 1,
//                         currency: 1,
//                         "stemDetails.stem": 1,
//                         "AdmissionsRequirements.AcademicRequirements": 1,
//                         globalRankingPosition: 1,
//                         "AdmissionsRequirements.LanguageRequirements": 1
//                     }
//                 },
//                 {
//                     $sort: { globalRankingPosition: 1 } // First by sortOrder, then by position
//                 },
//                 { $skip: skip }, // Pagination skip
//                 { $limit: perPage }, // Pagination limit

//             ]
//         }
//     });
//     let result = await courseModel.aggregate(aggregationPipeline);
//     let courses = result[0]?.data || [];
//     totalDocs = result[0]?.metadata[0]?.totalDocs || 0;
//     totalPages = Math.ceil(totalDocs / perPage);
//     if (req.body.currency) {
//         courses = courses.map(ele => {
//             if (!rates[ele.currency.code] || !rates[req.body.currency]) return { statusCode: 400, data: null, message: 'Exchange rates for the specified currencies are not available' };
//             if (ele.currency.code != req.body.currency) {
//                 ele.tuitionFee.tuitionFee = costConversion(ele.tuitionFee.tuitionFee, ele.currency.code, req.body.currency, rates[ele.currency.code], rates[req.body.currency])
//                 ele.currency = { code: req.body.currency, symbol: currencySymbols[req.body.currency] }
//             }
//             return ele;
//         });
//     }
//     if (req.body.filterData.length == 0) courses = courses.sort(() => Math.random() - 0.5)
//     return ({ statusCode: 200, message: `list of all courses`, data: { list: courses, currentPage: page, totalPages: totalPages, totalItems: totalDocs } })



// const lead = {
//     "Mobile": "+918096177562",
//     // primary  
//     "Full_Name": "SONTE VENKATRAMANA",
//     "First_Name": null,
//     "Last_Name": "SONTE VENKATRAMANA",
//     "Country1": null,
//     "Destination_School": null,
//     "Target_Branch": null,
//     "Preferred_Contact_Time": null,
//     "Interest_in_studying_abroad": null,
//     "Test_Preference_I": null,
//     "Test_Preference_II": null,
//     "Intake": null,


//     // personal
//     "Salutation": null,
//     "Gender": null,
//     "Native_City": null,
//     "Parent_Mobile": null,
//     "Email": null,
//     "Whatsapp_Number": null,
//     "Student_Email_for_Referral": null,
//     "Phone": null,
//     "Secondary_Email": null,
//     "Message": null,
//     "Email_Opt_Out": false,
//     "Unsubscribed_Mode": null,

//     //profile 
//     "Current_Last_School_or_college": "KMIT-2025",
//     "IELTS": null,
//     "GRE_GMAT_Score": null,
//     "Current_Last_Academic_Grade": "2025",
//     "DUOLINGO": null,
//     "ACT": null,
//     "Select_GRE_GMAT_Score": null,
//     "Score": 0,
//     "TOEFL": null,
//     "Academic_Score": null,
//     "GMAT": null,
//     "GRE": null,
//     "PTE": null,
//     "SAT": null,




//     // analysis
//     "Touch_Point_Score": 0,
//     "Negative_Score": 0,
//     "Positive_Score": 0,
//     "Negative_Touch_Point_Score": 0,
//     "Lead_Rating": null,
//     "Temporary_Notes": null,
//     "Positive_Touch_Point_Score": 0,


//     // next actions 
//     "Last_Activity_Time": null,
//     "Lost_Reason": null,
//     "Class_start_date": null,
//     "Followup_Status": null,
//     "Next_Followup_Date": null,
//     "Lead_Conversion_Time": null,


//     // defaults 
//     "Lead_Status": "New Lead",
//     "Created_Time": "2025-06-06T10:24:10+05:30",
//     "Modified_Time": "2025-06-06T10:24:10+05:30",
//     "Campusroot_DB_ID": null,

//     // unclear fields

//     "Attending_ConnectED": null,
//     "Campaign_Name": null,
//     "Record_Image": null,
//     "Digital_Campaign": null,
//     "leadchain0__Social_Lead_ID": null,
//     "CP": null,
//     "Website_URL": null,
//     "Converted_Account": null,
//     "Converted_Deal": null,
//     "OW_Campaign": "KMIT-2025",
//     "Unsubscribed_Time": null,
//     "Converted_Contact": null,
//     "Subject": null,
//     "Community": null,

// }



//     // ref
//     "How_did_student_know_OW": null,
//     "Team_Member_Referred": null,
//     "Team_Member_Email_for_Referral": null,
//     "Lead_Source": "College Data",
//     "Student_Referred": null,