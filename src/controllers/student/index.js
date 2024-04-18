import courseModel from "../../models/Course.js";
import universityModel from "../../models/University.js";
import Document from "../../models/Uploads.js";
import applicationModel from "../../models/application.js";
import { studentModel } from "../../models/Student.js";
import userModel from "../../models/User.js";
import { generateAPIError } from "../../errors/apiError.js";
import { errorWrapper } from "../../middleware/errorWrapper.js";
import meetingModel from "../../models/meetings.js";
import 'dotenv/config';
import communityModel from "../../models/Community.js";
import { gradeConversions } from "../../utils/gradeConversions.js";
import exchangeModel from "../../models/ExchangeRates.js";
import { costConversion } from "../../utils/currencyConversion.js";
import { currencySymbols } from "../../utils/enum.js";
const ExchangeRatesId = process.env.EXCHANGERATES_MONGOID
export const generateRecommendations = errorWrapper(async (req, res, next) => {
  if (!req.user.verification[0].status) return next(generateAPIError(`do verify your email to generate recommendations`, 400));
  if (!req.user.verification[1].status) return next(generateAPIError(`do verify your phone number to generate recommendations`, 400));
  const GRE = req.user.tests.filter(ele => ele.name == "Graduate Record Examination")
  if (!GRE[0].scores) return next(generateAPIError("add GRE test details", 400))
  const gre = GRE[0].scores.reduce((acc, { description, count }) => (description === "Quantitative Reasoning" || description === "Verbal Reasoning") ? acc + count : acc, 0);
  const ug = req.user.education.underGraduation
  if (!ug) return next(generateAPIError("add ug gpa", 400))
  let ug_gpa = (req.user.education.underGraduation.pattern != "gpa") ? gradeConversions(ug.pattern, "gpa", ug.totalScore) : ug.totalScore
  if (!req.user.preference.courses) return next(generateAPIError("add course preferences", 400))
  console.log("verification:", {
    ug_gpa: ug_gpa,
    gre: gre,
    sub_discipline: req.user.preference.courses.toString()
  });
  const response = await fetch("http://localhost:4321/predict/", {
    method: "POST",
    headers: { "Content-Type": "application/json", },
    body: JSON.stringify({
      ug_gpa: ug_gpa,
      gre: gre,
      sub_discipline: req.user.preference.courses
    })
  });
  const result = await response.json();
  let recommendations = []
  for (const item of result) {
    let course = await courseModel.findById(item.CID, "university")
    recommendations.push({
      university: course.university,
      course: item.CID,
      possibilityOfAdmit: item.Category
    })
  }
  req.user.recommendation = req.user.recommendation.filter(ele => ele.counsellorRecommended)
  req.user.recommendation = [...req.user.recommendation, ...recommendations]
  req.user.logs.push({
    action: `recommendations Generated`,
    details: `recommendations${req.user.recommendation}`
  })
  await req.user.save();
  await universityModel.populate(req.user, { path: "recommendation.university", select: "name logoSrc location type establishedYear " })
  await courseModel.populate(req.user, { path: "recommendation.course", select: "name discipline tuitionFee currency studyMode subDiscipline schoolName studyLevel duration" })
  if (req.user.preference.currency) {
    const { rates } = await exchangeModel.findById(ExchangeRatesId, "rates");
    const applyCurrencyConversion = (element) => {
      if (element.course.currency.code !== req.user.preference.currency) {
        if (!rates[element.course.currency.code] || !rates[req.user.preference.currency]) {
          next(generateAPIError('Exchange rates for the specified currencies are not available', 400));
        }
        element.course.tuitionFee.tuitionFee = costConversion(element.course.tuitionFee.tuitionFee, element.course.currency.code, req.user.preference.currency, rates[element.course.currency.code], rates[req.user.preference.currency]);
        element.course.currency = { code: req.user.preference.currency, symbol: currencySymbols[req.user.preference.currency] };
      }
    };
    req.user.recommendation.forEach(applyCurrencyConversion);
  }
  return res.status(200).json({ success: true, message: "Recommendations Generated", data: req.user.recommendation, AccessToken: req.AccessToken ? req.AccessToken : null });
})
export const activity = errorWrapper(async (req, res, next) => {
  await Promise.all([
    await applicationModel.populate(req.user, [
      { path: "activity.applications.processing" },
      { path: "activity.applications.accepted" },
      { path: "activity.applications.rejected" },
      { path: "activity.applications.completed" },
      { path: "activity.applications.cancelled" },
    ]),
    await universityModel.populate(req.user, [
      { path: "activity.shortListed.university recommendation.university activity.applications.processing.university activity.applications.accepted.university activity.applications.rejected.university activity.applications.completed.university activity.applications.cancelled.university", select: "name logoSrc location type establishedYear " },
    ]),
    await courseModel.populate(req.user, [
      { path: "recommendation.course activity.shortListed.course activity.applications.processing.course activity.applications.accepted.course activity.applications.rejected.course activity.applications.completed.course activity.applications.cancelled.course", select: "name discipline tuitionFee studyMode subDiscipline schoolName startDate studyLevel duration applicationDetails currency" },
    ]),
    await Document.populate(req.user, [
      { path: "activity.applications.processing.docChecklist.doc activity.applications.accepted.docChecklist.doc activity.applications.rejected.docChecklist.doc activity.applications.completed.docChecklist.doc activity.applications.cancelled.docChecklist.doc", select: "name contentType createdAt" },
    ]),
    await meetingModel.populate(req.user, { path: "activity.meetings" }),
    await userModel.populate(req.user, { path: "activity.meetings.user activity.meetings.member", select: "firstName displayPicSrc lastName email role" })
  ]);
  if (req.user.preference.currency) {
    const { rates } = await exchangeModel.findById(ExchangeRatesId, "rates");
    const applyCurrencyConversion = (element) => {
      if (element.course.currency.code !== req.user.preference.currency) {
        if (!rates[element.course.currency.code] || !rates[req.user.preference.currency]) {
          next(generateAPIError('Exchange rates for the specified currencies are not available', 400));
        }
        element.course.tuitionFee.tuitionFee = costConversion(element.course.tuitionFee.tuitionFee, element.course.currency.code, req.user.preference.currency, rates[element.course.currency.code], rates[req.user.preference.currency]);
        element.course.currency = { code: req.user.preference.currency, symbol: currencySymbols[req.user.preference.currency] };
      }
    };
    req.user.recommendation.forEach(applyCurrencyConversion);
    req.user.activity.shortListed.forEach(applyCurrencyConversion);
    req.user.activity.applications.processing.forEach(applyCurrencyConversion);
    req.user.activity.applications.accepted.forEach(applyCurrencyConversion);
    req.user.activity.applications.rejected.forEach(applyCurrencyConversion);
    req.user.activity.applications.completed.forEach(applyCurrencyConversion);
    req.user.activity.applications.cancelled.forEach(applyCurrencyConversion);
  }
  return res.status(200).json({ success: true, message: `activity of user`, data: { activity: req.user.activity, counsellor: req.user.counsellor, processCoordinator: req.user.processCoordinator, recommendation: req.user.recommendation }, AccessToken: req.AccessToken ? req.AccessToken : null });
});
//................download any user related Document...........
export const downloadDocument = errorWrapper(async (req, res, next) => {
  const { documentId } = req.params;
  const document = await Document.findById(documentId);
  if (!document) return next(generateAPIError(`invalid document ID`, 400));
  // if (!document.viewers.includes(req.decoded.id) && document.user.toString != req.decode.id) return next(generateAPIError(`access denied`, 401));
  return res.contentType(document.contentType).send(document.data);
})
export const allStudents = errorWrapper(async (req, res, next) => {
  const students = await studentModel.find({}, "firstName lastName displayPicSrc activity.admitReceived").populate("activity.admitReceived", "university course");
  await Promise.all([
    await universityModel.populate(students, { path: "activity.admitReceived.university", select: "name logoSrc location type ", }),
    await courseModel.populate(students, { path: "activity.admitReceived.course", select: "name schoolDetails", })
  ])
  return res.status(200).json({ success: true, message: `all students`, data: students, AccessToken: req.AccessToken ? req.AccessToken : null });
})
export const singleStudent = errorWrapper(async (req, res, next) => {
  const { studentId } = req.params
  const student = await studentModel.findById(studentId, "firstName lastName displayPicSrc tests workExperience researchPapers education activity.applications skills communities")
  await communityModel.populate(student, { path: "communities", select: "participants university posts", })
  await applicationModel.populate(student, [
    { path: "activity.applications.processing", select: "university course intake status stage" },
    { path: "activity.applications.accepted", select: "university course intake status stage" },
    { path: "activity.applications.rejected", select: "university course intake status stage" },
    { path: "activity.applications.completed", select: "university course intake status stage" },
  ])
  await universityModel.populate(student, [
    { path: "activity.applications.processing.university", select: "name logoSrc location type establishedYear" },
    { path: "activity.applications.accepted.university", select: "name logoSrc location type establishedYear" },
    { path: "activity.applications.rejected.university", select: "name logoSrc location type establishedYear" },
    { path: "activity.applications.completed.university", select: "name logoSrc location type establishedYear" },
    { path: "communities.university", select: "name logoSrc location type establishedYear", }
  ])
  await courseModel.populate(student, [
    { path: "activity.applications.processing.course", select: "name discipline tuitionFee studyMode subDiscipline schoolName studyLevel duration currency", },
    { path: "activity.applications.accepted.course", select: "name discipline tuitionFee studyMode subDiscipline schoolName studyLevel duration currency", },
    { path: "activity.applications.rejected.course", select: "name discipline tuitionFee studyMode subDiscipline schoolName studyLevel duration currency", },
    { path: "activity.applications.completed.course", select: "name discipline tuitionFee studyMode subDiscipline schoolName studyLevel duration currency", },
  ])
  await userModel.populate(student, { path: "communities.participants", select: "firstName lastName displayPicSrc", },)
  return res.status(200).json({ success: true, message: `student details`, data: student, AccessToken: req.AccessToken ? req.AccessToken : null });
})