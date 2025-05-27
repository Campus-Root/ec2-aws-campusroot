import { unlinkSync, readFileSync } from "fs";
import Document from "../../models/Uploads.js";
import userModel from "../../models/User.js";
import sendMail from "../../utils/sendEMAIL.js"
import { errorWrapper } from "../../middleware/errorWrapper.js";
import 'dotenv/config';
import Handlebars from "handlebars";
import { isValidObjectId } from "mongoose";
import { teamModel } from "../../models/Team.js";
import chatModel from "../../models/Chat.js";
import courseModel from "../../models/Course.js"
import institutionModel from "../../models/IndianColleges.js";
import Joi from "joi";
import { loginSchema, uploadInProfileSchema } from "../../schemas/student.js";
import { deleteFileInWorkDrive, uploadFileToWorkDrive } from "../../utils/CRMintegrations.js";
import { getNewAdvisor } from "../../utils/dbHelperFunctions.js";
import { sendOTP } from "../../utils/sendSMS.js";
import path from "path";
import { fileURLToPath } from "url";
import { studentModel } from "../../models/Student.js";
import { categorizePrograms, constructFilters } from "../../utils/recommendations.js";
import universityModel from "../../models/University.js";
import exchangeModel from "../../models/ExchangeRates.js";
export const profile = errorWrapper(async (req, res, next, session) => {
    await Promise.all([
        userModel.populate(req.user, [
            { path: "advisors.info", select: "firstName displayPicSrc lastName email role language about expertiseCountry" },
            { path: "blockedBy blockList", select: "firstName displayPicSrc lastName email role userType" }
        ]),
        Document.populate(req.user,
            [{ path: "tests.docId", select: "data", },
            { path: "workExperience.docId", select: "data", },
            { path: "documents.personal.resume", select: "data", },
            { path: "documents.personal.passportBD", select: "data", },
            { path: "documents.personal.passportADD", select: "data", },
            { path: "documents.academic.secondarySchool", select: "data", },
            { path: "documents.academic.plus2", select: "data", },
            { path: "documents.academic.degree", select: "data", },
            { path: "documents.academic.bachelors.transcripts", select: "data", },
            { path: "documents.academic.bachelors.bonafide", select: "data", },
            { path: "documents.academic.bachelors.CMM", select: "data", },
            { path: "documents.academic.bachelors.PCM", select: "data", },
            { path: "documents.academic.bachelors.OD", select: "data", },
            { path: "documents.academic.masters.transcripts", select: "data", },
            { path: "documents.academic.masters.bonafide", select: "data", },
            { path: "documents.academic.masters.CMM", select: "data", },
            { path: "documents.academic.masters.PCM", select: "data", },
            { path: "documents.academic.masters.OD", select: "data", },
            { path: "documents.test.general", select: "data", },
            { path: "documents.test.languageProf", select: "data", },
            { path: "documents.workExperiences", select: "data", },]),
        institutionModel.populate(req.user, { path: "IEH.institution", select: "InstitutionName IEH.logoSrc IEH.members InstitutionType university" })
    ])
    const profile = { ...req.user._doc }
    delete profile.logs;
    return ({ statusCode: 200, message: `complete profile`, data: profile });
})
export const editProfile = errorWrapper(async (req, res, next, session) => {
    const { LeadSource, personalDetails, isPlanningToTakeAcademicTest, isPlanningToTakeLanguageTest, familyDetails, extraCurriculumActivities, displayPicSrc, school, plus2, underGraduation, postGraduation, firstName, lastName, tests, workExperience, skills, preference, researchPapers, education, totalWorkExperience, publicationsLevel, oneWindowExclusiveTestPrep, completedStudies, services, educationLoan, financialAid } = req.body;
    let shouldRegenerateRecommendation = false
    if (personalDetails) {
        req.user.personalDetails = personalDetails;
        req.user.logs.push({
            action: `profile info updated`,
            details: `personalDetails updated`
        })
    }
    if (isPlanningToTakeAcademicTest) {
        req.user.isPlanningToTakeAcademicTest = isPlanningToTakeAcademicTest;
        req.user.logs.push({
            action: `profile info updated`,
            details: `isPlanningToTakeAcademicTest updated`
        })
    }
    if (isPlanningToTakeLanguageTest) {
        req.user.isPlanningToTakeLanguageTest = isPlanningToTakeLanguageTest;
        req.user.logs.push({
            action: `profile info updated`,
            details: `isPlanningToTakeLanguageTest updated`
        })
    }
    if (familyDetails) {
        req.user.familyDetails = familyDetails;
        req.user.logs.push({ action: `profile info updated`, details: `familyDetails updated` })
    }
    if (extraCurriculumActivities) {
        req.user.extraCurriculumActivities = extraCurriculumActivities;
        req.user.logs.push({
            action: `profile info updated`,
            details: `extraCurriculumActivities updated`
        })
    }
    if (firstName) {
        req.user.firstName = firstName;
        req.user.logs.push({
            action: `profile info updated`,
            details: `firstName updated`
        })
    }
    if (lastName) {
        req.user.lastName = lastName;
        req.user.logs.push({
            action: `profile info updated`,
            details: `lastName updated`
        })
    }
    if (displayPicSrc) {
        req.user.displayPicSrc = displayPicSrc;
        req.user.logs.push({
            action: `profile info updated`,
            details: `displayPicSrc updated`
        })
    }
    if (LeadSource) {
        req.user.LeadSource = LeadSource;
        req.user.logs.push({
            action: `profile info updated`,
            details: `LeadSource updated`
        })
    }
    if (skills) {
        req.user.skills = skills;
        req.user.logs.push({
            action: `profile info updated`,
            details: `skills updated`
        })
    }
    if (preference) {
        shouldRegenerateRecommendation = true
        req.user.preference = preference;
        req.user.logs.push({
            action: `profile info updated`,
            details: `preference updated`
        })
    }
    if (tests) {
        shouldRegenerateRecommendation = true
        req.user.tests = tests;
        req.user.logs.push({
            action: `profile info updated`,
            details: `tests updated`
        })
    }
    if (workExperience) {
        shouldRegenerateRecommendation = true
        req.user.workExperience = workExperience;
        req.user.logs.push({
            action: `profile info updated`,
            details: `workExperience updated`
        })
    }
    if (researchPapers) {
        shouldRegenerateRecommendation = true
        req.user.researchPapers = researchPapers;
        req.user.logs.push({
            action: `profile info updated`,
            details: `researchPapers updated`
        })
    }
    if (school) {
        // shouldRegenerateRecommendation = true
        req.user.education.school = school;
        req.user.logs.push({
            action: `profile info updated`,
            details: `school updated`
        })
    }
    if (plus2) {
        // shouldRegenerateRecommendation = true
        req.user.education.plus2 = plus2;
        req.user.logs.push({
            action: `profile info updated`,
            details: `plus2 updated`
        })
    }
    if (underGraduation) {
        shouldRegenerateRecommendation = true
        req.user.education.underGraduation = underGraduation;
        req.user.logs.push({
            action: `profile info updated`,
            details: `underGraduation updated`
        })
    }
    if (postGraduation) {
        shouldRegenerateRecommendation = true
        req.user.education.postGraduation = postGraduation;
        req.user.logs.push({
            action: `profile info updated`,
            details: `postGraduation updated`
        })
    }
    if (education) {
        shouldRegenerateRecommendation = true
        req.user.education = education;
        req.user.logs.push({
            action: `profile info updated`,
            details: `education updated`
        })
    }
    if (totalWorkExperience) {
        shouldRegenerateRecommendation = true
        req.user.totalWorkExperience = totalWorkExperience;
        req.user.logs.push({
            action: `profile info updated`,
            details: `totalWorkExperience updated`
        })
    }
    if (publicationsLevel) {
        shouldRegenerateRecommendation = true
        req.user.publicationsLevel = publicationsLevel;
        req.user.logs.push({
            action: `profile info updated`,
            details: `publicationsLevel updated`
        })
    }
    if (financialAid) {
        req.user.financialAid = financialAid;
        req.user.logs.push({
            action: `profile info updated`,
            details: `financialAid updated`
        })
    }
    if (educationLoan) {
        req.user.educationLoan = educationLoan;
        req.user.logs.push({
            action: `profile info updated`,
            details: `educationLoan updated`
        })
    }
    if (services) {
        req.user.services = services;
        req.user.logs.push({
            action: `profile info updated`,
            details: `services updated`
        })
    }
    if (completedStudies) {
        req.user.completedStudies = completedStudies;
        req.user.logs.push({
            action: `profile info updated`,
            details: `completedStudies updated`
        })
    }
    if (oneWindowExclusiveTestPrep) {
        req.user.oneWindowExclusiveTestPrep = oneWindowExclusiveTestPrep;
        req.user.logs.push({
            action: `profile info updated`,
            details: `oneWindowExclusiveTestPrep updated`
        })
    }
    await Promise.all([
        await req.user.save(),
        await userModel.populate(req.user, { path: "advisors.info", select: "firstName displayPicSrc lastName email role language about expertiseCountry" }),
        await Document.populate(req.user,
            [{ path: "tests.docId", select: "data", },
            { path: "workExperience.docId", select: "data", },
            { path: "documents.personal.resume", select: "data", },
            { path: "documents.personal.passportBD", select: "data", },
            { path: "documents.personal.passportADD", select: "data", },
            { path: "documents.academic.secondarySchool", select: "data", },
            { path: "documents.academic.plus2", select: "data", },
            { path: "documents.academic.degree", select: "data", },
            { path: "documents.academic.bachelors.transcripts", select: "data", },
            { path: "documents.academic.bachelors.bonafide", select: "data", },
            { path: "documents.academic.bachelors.CMM", select: "data", },
            { path: "documents.academic.bachelors.PCM", select: "data", },
            { path: "documents.academic.bachelors.OD", select: "data", },
            { path: "documents.academic.masters.transcripts", select: "data", },
            { path: "documents.academic.masters.bonafide", select: "data", },
            { path: "documents.academic.masters.CMM", select: "data", },
            { path: "documents.academic.masters.PCM", select: "data", },
            { path: "documents.academic.masters.OD", select: "data", },
            { path: "documents.test.general", select: "data", },
            { path: "documents.test.languageProf", select: "data", },
            { path: "documents.workExperiences", select: "data", },])
    ])
    const profile = { ...req.user._doc }
    delete profile.logs
    delete profile.activity;
    if (shouldRegenerateRecommendation) {
        let filterData = [], testScores = [], criteria = []
        if (req.user.preference?.country?.length > 0) filterData.push({ type: "Country", data: req.user.preference.country })
        if (req.user.preference?.category?.length > 0) filterData.push({ type: "Category", data: req.user.preference.category })
        if (req.user.preference?.subCategory?.length > 0) filterData.push({ type: "SubCategory", data: req.user.preference.subCategory })
        if (req.user.preference.degree) filterData.push({ type: "StudyLevel", data: req.user.preference.degree })
        criteria = filterData.map(ele => ({ label: ele.type, data: { editLink: "/preference", value: ele.data } }))
        const testScoreMapping = {
            "Graduate Record Examination": ["Total", "Quantitative Reasoning", "Verbal Reasoning"],
            "Graduate Management Admission Test": ["Total", "Quantitative", "Verbal"],
            "Test of English as a Foreign Language": ["Total", "Reading", "Listening", "Speaking", "Writing"],
            "International English Language Testing System": ["Total", "Reading", "Listening", "Speaking", "Writing"],
            "Duolingo English Test": ["Total"],
            "Pearson Test of English": ["Total", "Reading", "Listening", "Speaking", "Writing"],
            "American College Testing": ["Total", "English", "Math", "Reading", "Science"]
        };
        Object.entries(testScoreMapping).forEach(([testName, descriptions]) => {
            const test = req.user.tests.find(ele => ele.name === testName);
            if (test && test.scores) {
                const totalScore = test.scores.find(ele => ele.description === "Total");
                let score = null;
                score = (totalScore) ? totalScore.count : test.scores.reduce((acc, { description, count }) => descriptions.includes(description) ? acc + count : acc, 0);
                if (score !== null && !isNaN(score)) {
                    testScores.push({ testType: testName, overallScore: parseInt(score) });
                    criteria.push({ label: testName, data: { editLink: "/test", value: parseInt(score) } })
                }
            }
        });
        const { backlogs, totalScore, maxScore } = req.user.education.underGraduation
        if (totalScore && maxScore) {
            testScores.push({ testType: "GPA", overallScore: parseFloat(totalScore), ugOutOf: parseFloat(maxScore) });
            criteria.push({ label: "GPA", data: { editLink: "/education", value: parseFloat(totalScore) + " / " + parseFloat(maxScore) } })
        }
        if (backlogs) {
            testScores.push({ testType: "Backlogs", overallScore: parseInt(backlogs) });
            criteria.push({ label: "Backlogs", data: { editLink: "/education", value: parseInt(backlogs) } })
        }
        if (req.user.totalWorkExperience > 0) {
            testScores.push({ testType: "WorkExperience", overallScore: parseFloat(totalWorkExperience.toFixed(2) / 12) });
            criteria.push({ label: "WorkExperience", data: { editLink: "/WorkExperience", value: parseInt(backlogs) } })
        } else if (req.user.workExperience?.length > 0) {
            let totalWorkExperience = 0;
            req.user.workExperience.forEach(experience => {
                if (experience.startDate) {
                    const startDate = new Date(experience.startDate);
                    const endDate = experience.Ongoing ? new Date() : new Date(experience.endDate);
                    if (!isNaN(startDate) && !isNaN(endDate) && startDate < endDate) {
                        const years = (endDate - startDate) / (1000 * 60 * 60 * 24 * 365);
                        totalWorkExperience += years;
                    }
                }
            });
            testScores.push({ testType: "WorkExperience", overallScore: parseFloat(totalWorkExperience.toFixed(2) / 12) });
            criteria.push({ label: "WorkExperience", data: { editLink: "/WorkExperience", value: parseFloat(totalWorkExperience.toFixed(2) / 12) } })
        }
        if (req.user.publicationsLevel) {
            testScores.push({ testType: "Publications", level: req.user.publicationsLevel || null });
            criteria.push({ label: "Publications", data: { editLink: "/Publications", value: req.user.publicationsLevel || null } })
        } else if (req.user.researchPapers?.length > 0) {
            let hasInternational = false, hasNational = false;
            req.user.researchPapers.forEach(paper => {
                if (paper.publicationsLevel === "International") hasInternational = true;
                if (paper.publicationsLevel === "National") hasNational = true;
            });
            testScores.push({ testType: "Publications", level: hasInternational ? "International" : hasNational ? "National" : null });
            criteria.push({ label: "Publications", data: { editLink: "/Publications", value: hasInternational ? "International" : hasNational ? "National" : null } })
        }
        let counsellorRecommendedPrograms = [], notInterestedPrograms = []
        req.user.recommendations.data.forEach(ele => {
          if (ele.counsellorRecommended) counsellorRecommendedPrograms.push(ele)
          else if (ele.notInterested) notInterestedPrograms.push(ele)
        })
        const { filter, projections } = constructFilters(filterData, testScores, [...counsellorRecommendedPrograms, ...notInterestedPrograms]);
        let pipeline = [{ $match: filter }, { $project: projections }]
        const programs = await courseModel.aggregate(pipeline);
        let recommendations = categorizePrograms(testScores, programs);
        req.user.recommendations.criteria = criteria
        req.user.recommendations.data = [...notInterestedPrograms, ...counsellorRecommendedPrograms, ...recommendations]
        req.user.logs.push({ action: `recommendations Updated`, details: `recommendations${req.user.recommendations.data.length}` })
        await req.user.save();
        await courseModel.populate(req.user, { path: "recommendations.data.course", select: "name discipline tuitionFee currency studyMode subDiscipline schoolName startDate studyLevel duration university elite startDate" })
        await universityModel.populate(req.user, { path: "recommendations.data.course.university", select: "name logoSrc location type establishedYear" })
        if (req.user.preference.currency) {
          const { rates } = await exchangeModel.findById(ExchangeRatesId, "rates");
          const applyCurrencyConversion = (element) => {
            if (element.course.currency.code !== req.user.preference.currency) {
              if (!rates[element.course.currency.code] || !rates[req.user.preference.currency]) {
                return {
                  statusCode: 400, data: null, message: 'Exchange rates for the specified currencies are not available'
                };
              }
              element.course.tuitionFee.tuitionFee = costConversion(element.course.tuitionFee.tuitionFee, element.course.currency.code, req.user.preference.currency, rates[element.course.currency.code], rates[req.user.preference.currency]);
              element.course.currency = { code: req.user.preference.currency, symbol: currencySymbols[req.user.preference.currency] };
            }
          };
          req.user.recommendations.data.forEach(applyCurrencyConversion);
        }
    }
    return ({ statusCode: 200, message: `profile edited successfully`, data: profile });
})
export const uploadInProfile = errorWrapper(async (req, res, next, session) => {
    if (!req.file) return { statusCode: 400, data: null, message: `no file found` };
    const { error, value } = uploadInProfileSchema.validate(req.body)
    if (error) {
        if (req.file && req.file.path) unlinkSync(req.file.path);
        return { statusCode: 400, data: [value], message: error.details[0].message };
    }
    const { fieldPath, fileIdentifier } = value;
    const { ...fields } = fieldPath.split(".")
    let isArray = false
    switch (fields[0]) {
        case "test":
            if (req.user.documents[fields[0]][fields[1]].length >= 5) {
                if (req.file && req.file.path) unlinkSync(req.file.path);
                return { statusCode: 400, data: null, message: `Maximum limit of 5 documents reached` };
            }
            isArray = true
            break;
        case "workExperiences":
            if (req.user.documents[fields[0]].length >= 5) {
                if (req.file && req.file.path) unlinkSync(req.file.path);
                return { statusCode: 400, data: null, message: `Maximum limit of 5 documents reached` };
            }
            isArray = true
            break;
    }
    const uploadedFileResponse = await uploadFileToWorkDrive({ originalname: req.file.originalname, path: req.file.path, mimetype: req.file.mimetype, fileIdentifier: fileIdentifier || "", folder_ID: req.user.docData.folder })
    if (!uploadedFileResponse.success) return { statusCode: 500, message: uploadedFileResponse.message, data: uploadedFileResponse.data }
    if (!uploadedFileResponse.data.new) return { statusCode: 200, message: `file updated`, data: null }
    const { FileName, resource_id, mimetype, originalname, preview_url } = uploadedFileResponse.data
    const docDetails = { data: { FileName, resource_id, mimetype, originalname, fileIdentifier, preview_url }, user: req.user._id, type: "General", viewers: [] };
    const newDoc = await Document.create(docDetails);
    if (isArray) {
        fields[1] ? req.user.documents[fields[0]][fields[1]].push(newDoc._id) : req.user.documents[fields[0]].push(newDoc._id)
    } else {
        fields[2] ? req.user.documents[fields[0]][fields[1]][fields[2]] = newDoc._id : req.user.documents[fields[0]][fields[1]] = newDoc._id
    }
    req.user.logs.push({
        action: `file uploaded`,
        details: `file uploaded for ${fieldPath}`
    })
    await Promise.all([
        await req.user.save(),
        await Document.populate(req.user,
            [{ path: "tests.docId", select: "data", },
            { path: "workExperience.docId", select: "data", },
            { path: "documents.personal.resume", select: "data", },
            { path: "documents.personal.passportBD", select: "data", },
            { path: "documents.personal.passportADD", select: "data", },
            { path: "documents.academic.secondarySchool", select: "data", },
            { path: "documents.academic.plus2", select: "data", },
            { path: "documents.academic.degree", select: "data", },
            { path: "documents.academic.bachelors.transcripts", select: "data", },
            { path: "documents.academic.bachelors.bonafide", select: "data", },
            { path: "documents.academic.bachelors.CMM", select: "data", },
            { path: "documents.academic.bachelors.PCM", select: "data", },
            { path: "documents.academic.bachelors.OD", select: "data", },
            { path: "documents.academic.masters.transcripts", select: "data", },
            { path: "documents.academic.masters.bonafide", select: "data", },
            { path: "documents.academic.masters.CMM", select: "data", },
            { path: "documents.academic.masters.PCM", select: "data", },
            { path: "documents.academic.masters.OD", select: "data", },
            { path: "documents.test.general", select: "data", },
            { path: "documents.test.languageProf", select: "data", },
            { path: "documents.workExperiences", select: "data", },]),
    ])
    return ({ statusCode: 200, message: `Document added to ${fieldPath}`, data: { docs: req.user.documents } });
})
export const deleteUploadedInProfile = errorWrapper(async (req, res, next, session) => {
    const { error, value } = uploadInProfileSchema.validate(req.body)
    if (error) return { statusCode: 400, data: [value], message: error.details[0].message };
    const { fieldPath, documentId } = value;
    const existingDoc = await Document.findById(documentId);
    if (!existingDoc) return { statusCode: 400, data: null, message: `Document not found` };
    if (existingDoc.user.toString() !== req.user._id.toString()) return { statusCode: 400, data: null, message: `Unauthorized to delete this document` };
    const fields = fieldPath.split(".")
    switch (fields[0]) {
        case "personal":
            req.user.documents.personal[fields[1]] = null
            break;
        case "academic":
            (fields[1] == "bachelors" || fields[1] == "masters") ? req.user.documents.academic[fields[1]][fields[2]] = null : req.user.documents.academic[fields[1]] = null
            break;
        case "test":
            req.user.documents.test[fields[1]] = req.user.documents.test[fields[1]].filter(doc => doc._id.toString() !== documentId)
            break;
        case "workExperiences":
            req.user.documents.workExperiences = req.user.documents.workExperiences.filter(doc => doc._id.toString() !== documentId)
            break;
        default:
            break;
    }
    req.user.logs.push({ logs: { action: `document deleted`, details: `path:${fieldPath}` } })
    await req.user.save()
    await Promise.all([
        await Document.findByIdAndDelete(documentId),
        await deleteFileInWorkDrive(existingDoc.data.resource_id),
        await Document.populate(req.user,
            [{ path: "tests.docId", select: "data", },
            { path: "workExperience.docId", select: "data", },
            { path: "documents.personal.resume", select: "data", },
            { path: "documents.personal.passportBD", select: "data", },
            { path: "documents.personal.passportADD", select: "data", },
            { path: "documents.academic.secondarySchool", select: "data", },
            { path: "documents.academic.plus2", select: "data", },
            { path: "documents.academic.degree", select: "data", },
            { path: "documents.academic.bachelors.transcripts", select: "data", },
            { path: "documents.academic.bachelors.bonafide", select: "data", },
            { path: "documents.academic.bachelors.CMM", select: "data", },
            { path: "documents.academic.bachelors.PCM", select: "data", },
            { path: "documents.academic.bachelors.OD", select: "data", },
            { path: "documents.academic.masters.transcripts", select: "data", },
            { path: "documents.academic.masters.bonafide", select: "data", },
            { path: "documents.academic.masters.CMM", select: "data", },
            { path: "documents.academic.masters.PCM", select: "data", },
            { path: "documents.academic.masters.OD", select: "data", },
            { path: "documents.test.general", select: "data", },
            { path: "documents.test.languageProf", select: "data", },
            { path: "documents.workExperiences", select: "data", },])
    ])
    return { statusCode: 200, message: `Document deleted from ${fieldPath} `, data: req.user.documents };
})
export const requestCounsellor = errorWrapper(async (req, res, next, session) => {
    const { country } = req.body
    await userModel.populate(req.user, { path: "advisors.info", select: "firstName displayPicSrc lastName email role language about expertiseCountry" })
    let alreadyExist = req.user.advisors.find(ele => ele.info.role === "counsellor" && ele.assignedCountries.includes(country))
    if (alreadyExist && isValidObjectId(alreadyExist.info._id)) return { statusCode: 400, data: null, message: `expert counsellor for selected country is already assigned` };
    let alreadyExistButDifferentCountry = req.user.advisors.find(ele => ele.info.role == "counsellor" && ele.info.expertiseCountry.includes(country))
    if (alreadyExistButDifferentCountry && isValidObjectId(alreadyExistButDifferentCountry.info._id)) {
        alreadyExistButDifferentCountry.assignedCountries.push(country)
        req.user.logs.push({
            action: `${country} counsellor assigned`,
            details: `counsellorId:${alreadyExistButDifferentCountry.info._id}&country:${country}}`
        })
        await req.user.save()
        await userModel.populate(alreadyExistButDifferentCountry, { path: "info", select: "firstName displayPicSrc lastName email role language about expertiseCountry" })
        return ({ statusCode: 200, message: `counsellor assigned for multiple countries`, data: { advisor: alreadyExistButDifferentCountry, chat: null } });
    }
    const Counsellor = await getNewAdvisor("counsellor", country);
    await teamModel.findByIdAndUpdate(Counsellor._id, { $push: { students: { profile: req.user._id, stage: "Fresh Lead" } } });
    req.user.advisors.push({ info: Counsellor._id, assignedCountries: [country] })
    const chat = await chatModel.create({ participants: [req.user._id, Counsellor._id] });
    req.user.logs.push({
        action: `${country} counsellor assigned`,
        details: `counsellorId:${Counsellor._id}&country:${country}}`
    })
    sendMail({
        to: Counsellor.email,
        subject: "Student is requesting your service",
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
                        <h3>Dear ${Counsellor.firstName} ${Counsellor.lastName},</h3>
                        <h2>Student is waiting for your guidance!</h2>
                    </div>
                </body>
            </html>
        `
    });
    await req.user.save()
    await userModel.populate(req.user, { path: "advisors.info", select: "firstName displayPicSrc lastName email role language about expertiseCountry" })
    await userModel.populate(chat, { path: "participants", select: "firstName lastName displayPicSrc email userType role" });
    const advisor = req.user.advisors.find(ele => ele.info._id.toString() === Counsellor._id.toString());
    return { statusCode: 200, message: `counsellor assigned`, data: { advisor: advisor, chat: chat } };
})
export const addPhoneOrEmail = errorWrapper(async (req, res, next) => {
    const user = await userModel.findById(req.user._id, "otp logs phone email");
    if (!user) return { statusCode: 401, message: `Invalid user`, data: null };
    const { error, value } = loginSchema.validate(req.body)
    if (error) return { statusCode: 400, message: error.details[0].message, data: [value] };
    const { email, phoneNumber, countryCode } = value;
    const otp = Math.floor(100000 + Math.random() * 900000), expiry = new Date(new Date().getTime() + 10 * 60000);
    let type = (email) ? "email" : "phone";
    let alreadyExist
    switch (type) {
        case "email":
            alreadyExist = await studentModel.findOne({ email: email, "otp.emailLoginOtp.verified": true });
            if (alreadyExist) return { statusCode: 401, message: `email already exists`, data: null };
            if (user.otp.emailLoginOtp.verified) return { statusCode: 401, message: `email already verified`, data: null };
            user.otp.emailLoginOtp.data = otp
            user.otp.emailLoginOtp.expiry = expiry
            let subject = "OneWindow Ed.tech Pvt. Ltd. - One-Time Password"
            const __dirname = path.dirname(fileURLToPath(import.meta.url));
            const filePath = path.join(__dirname, '../../../static/forgotPassword.html');
            const source = readFileSync(filePath, "utf-8").toString();
            const template = Handlebars.compile(source);
            const emailResponse = await sendMail({ to: email, subject: subject, html: template({ otp: otp }) });
            if (!emailResponse.status) return { statusCode: 500, data: emailResponse, message: "Otp not sent" }
            user.email = email
            break;
        case "phone":
            alreadyExist = await studentModel.findOne({ "phone.number": phoneNumber, "phone.countryCode": countryCode, "otp.phoneLoginOtp.verified": true });
            if (alreadyExist) return { statusCode: 401, message: `phone already exists`, data: null };
            if (user.otp.phoneLoginOtp.verified) return { statusCode: 401, message: `phone already verified`, data: null };
            user.otp.phoneLoginOtp.data = otp
            user.otp.phoneLoginOtp.expiry = expiry
            const smsResponse = countryCode === "+91" ? await sendOTP({ to: countryCode + phoneNumber, otp: otp, region: "Indian" }) : await sendOTP({ name: `${user.firstName} ${user.lastName}`, to: countryCode + phoneNumber, otp: otp, region: "International" });
            if (!smsResponse.return) return { statusCode: 500, data: smsResponse, message: "Otp not sent" }
            user.phone = { countryCode: countryCode, number: phoneNumber }
            break;
    }
    user.logs.push({ action: `otp sent for verification`, details: `` })
    user.save()
    return { statusCode: 200, message: `otp sent for verification, verify before expiry`, data: { expiry: expiry } };
}

);

export const verifyStudentOTP = errorWrapper(async (req, res, next, session) => {
    const { error, value } = Joi.object({ type: Joi.string().required(), otp: Joi.string().required() }).validate(req.body)
    if (error) return { statusCode: 400, message: error.details[0].message, data: [value] };
    const { otp, type } = value;
    let token = (type == "email") ? "emailLoginOtp" : "phoneLoginOtp";
    let user = await userModel.findById(req.user._id).session(session);
    if (!user) return { statusCode: 401, message: `Invalid ${type}. Please try again`, data: null };
    if (user.otp[token]["data"] !== otp) return { statusCode: 400, data: null, message: "invalid otp" }
    if (new Date() > new Date(user.otp[token]["expiry"])) return { statusCode: 400, data: null, message: "otp expired, generate again" }
    user.otp[token]["data"] = null
    user.otp[token]["verified"] = true
    let missingFields = [];
    if (!user?.firstName || !user?.lastName) missingFields.push("name");
    if (!user?.email) missingFields.push("email");
    if (!user?.phone || !user?.phone?.number || !user?.phone?.countryCode) missingFields.push("phone");
    if (!user?.preference || !user?.preference?.country || user.preference.country.length === 0) missingFields.push("country");
    if (!user?.preference || !user?.preference?.courses || user.preference.courses.length === 0) missingFields.push("coursePreference");
    if (JSON.stringify(user.education) === JSON.stringify({ school: {}, plus2: {}, underGraduation: {}, postGraduation: {} })) missingFields.push("education");
    if (!user?.tests || user.tests.length === 0) missingFields.push("tests");
    user.logs.push({ action: `${type} verified` })
    await user.save({ session })
    return { statusCode: 200, message: `verification Successful`, data: { missingFields: missingFields, [token]: user.otp[token] } };
})
export const IEH = errorWrapper(async (req, res, next, session) => {
    const { error, value } = Joi.object({ institutionId: Joi.string(), verificationDocName: Joi.string() }).validate(req.body)
    if (error) {
        unlinkSync(req.file.path ? req.file.path : "");
        return { statusCode: 400, message: error.details[0].message, data: [value] };
    }
    const { institutionId, verificationDocName } = value;
    const institution = await institutionModel.findById(institutionId)
    if (!institution) {
        unlinkSync(req.file.path ? req.file.path : "");
        return { statusCode: 400, message: `invalid institutionId`, data: { institutionId: institutionId } }
    }
    if (!institution.IEH.exists) {
        unlinkSync(req.file.path ? req.file.path : "");
        return { statusCode: 400, message: `this institution doesn't have IEH`, data: { institutionId: institutionId } }
    }
    if (req.user.IEH.verifiedAccess) {
        unlinkSync(req.file.path ? req.file.path : "");
        return { statusCode: 400, message: `already verified`, data: { institutionId: institutionId } }
    }
    // if (req.user.IEH.verificationStatus === "Verification Request Initiated") return { statusCode: 400, message: `already verified`, data: { institutionId: institutionId } }
    let IEH = {
        institution: institutionId,
        verificationStatus: "Verification Request Initiated",
        verificationDocName: verificationDocName,
        verificationDocument: ""
    }
    const uploadedFileResponse = await uploadFileToWorkDrive({ originalname: req.file.originalname, path: req.file.path, mimetype: req.file.mimetype, fileIdentifier: fileIdentifier || "", folder_ID: req.user.docData.folder })
    if (!uploadedFileResponse.success) return { statusCode: 500, message: uploadedFileResponse.message, data: uploadedFileResponse.data }
    if (!uploadedFileResponse.data.new) {
        const { FileName, resource_id, mimetype, originalname, preview_url } = uploadedFileResponse.data
        const docDetails = { data: { FileName, resource_id, mimetype, originalname, fileIdentifier, preview_url }, user: req.user._id, type: "General", viewers: [] };
        const newDoc = await Document.create(docDetails);
        IEH.verificationDocument = newDoc._id
    }

    req.user.IEH = IEH
    req.user.logs.push({
        action: `IEH updated`,
        details: `institutionId:${institutionId}`
    })
    await req.user.save()
    await institutionModel.populate(req.user, { path: "IEH.institution", select: "InstitutionName IEH.logoSrc IEH.members InstitutionType university" })
    return { statusCode: 200, message: `IEH updated`, data: { IEH: req.user.IEH } };
})
