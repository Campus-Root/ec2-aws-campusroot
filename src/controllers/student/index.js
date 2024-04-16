import courseModel from "../../models/Course.js";
import chatModel from "../../models/Chat.js"
import reviewsModel from "../../models/Reviews.js";
import universityModel from "../../models/University.js";
import fs from "fs";
import Document from "../../models/Uploads.js";
import { teamModel } from "../../models/Team.js";
import applicationModel from "../../models/application.js";
// import Stripe from "stripe";
import { studentModel } from "../../models/Student.js";
import userModel from "../../models/User.js";
import sendMail from "../../utils/sendEMAIL.js"
import { generateAPIError } from "../../errors/apiError.js";
import { errorWrapper } from "../../middleware/errorWrapper.js";
import meetingModel from "../../models/meetings.js";
import { oauth2Client } from "../../utils/oAuthClient.js";
import { google } from "googleapis";
import { sendOTP } from "../../utils/sendSMS.js";
import 'dotenv/config';
import communityModel from "../../models/Community.js";
import Handlebars from "handlebars";
import path from "path";
import { fileURLToPath } from "url";
import { gradeConversions } from "../../utils/gradeConversions.js";
import exchangeModel from "../../models/ExchangeRates.js";
import { costConversion } from "../../utils/currencyConversion.js";
import { currencySymbols } from "../../utils/enum.js";
const ExchangeRatesId = process.env.EXCHANGERATES_MONGOID
export const profile = errorWrapper(async (req, res, next) => {
  await Promise.all([
    await userModel.populate(req.user, { path: "advisors.info", select: "-applications -leads -students -googleTokens -logs -updates -password -communities -phoneVerified -otp" }),
    await Document.populate(req.user,
      [{ path: "documents.personal.resume", select: "name contentType createdAt", },
      { path: "documents.personal.passportBD", select: "name contentType createdAt", },
      { path: "documents.personal.passportADD", select: "name contentType createdAt", },
      { path: "documents.academic.secondarySchool", select: "name contentType createdAt", },
      { path: "documents.academic.plus2", select: "name contentType createdAt", },
      { path: "documents.academic.degree", select: "name contentType createdAt", },
      { path: "documents.academic.bachelors.transcripts", select: "name contentType createdAt", },
      { path: "documents.academic.bachelors.bonafide", select: "name contentType createdAt", },
      { path: "documents.academic.bachelors.CMM", select: "name contentType createdAt", },
      { path: "documents.academic.bachelors.PCM", select: "name contentType createdAt", },
      { path: "documents.academic.bachelors.OD", select: "name contentType createdAt", },
      { path: "documents.academic.masters.transcripts", select: "name contentType createdAt", },
      { path: "documents.academic.masters.bonafide", select: "name contentType createdAt", },
      { path: "documents.academic.masters.CMM", select: "name contentType createdAt", },
      { path: "documents.academic.masters.PCM", select: "name contentType createdAt", },
      { path: "documents.academic.masters.OD", select: "name contentType createdAt", },
      { path: "documents.test.general", select: "name contentType createdAt", },
      { path: "documents.test.languageProf", select: "name contentType createdAt", },
      { path: "documents.workExperiences", select: "name contentType createdAt", },])
  ])
  const profile = { ...req.user._doc }
  return res.status(200).json({ success: true, message: `complete profile`, data: profile, AccessToken: req.AccessToken ? req.AccessToken : null });
})
export const editEmail = errorWrapper(async (req, res, next) => {
  const { email } = req.body
  if (req.user.verification[0].status) return next(generateAPIError(`email already verified, contact Campus Root team for support`, 400));
  const existingEmail = await userModel.find({ email: email }, "email")
  if (existingEmail.length > 0) return next(generateAPIError(`email already exists, Enter a new email`, 400));
  req.user.email = email;
  req.user.verification[0].token = {
    data: (Math.random() + 1).toString(16).substring(2),
    expiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  }
  req.user.verification[0].status = false
  let subject = "Email verification"
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const filePath = path.join(__dirname, '../../../static/emailTemplate.html');
  const source = fs.readFileSync(filePath, "utf-8").toString();
  const template = Handlebars.compile(source)
  const replacement = { userName: `${req.user.firstName} ${req.user.lastName}`, URL: `${process.env.SERVER_URL}/api/v1/auth/verify/${email}/${req.user.verification[0].token.data}` }
  const htmlToSend = template(replacement)
  await sendMail({ to: req.user.email, subject: subject, html: htmlToSend });
  req.user.logs.push({
    action: "email updated updated & mail sent for verification",
    details: "email updated in profile"
  })
  await req.user.save()
  return res.status(200).json({ success: true, message: `mail sent for verification`, data: null, AccessToken: req.AccessToken ? req.AccessToken : null });
})
export const editPhone = errorWrapper(async (req, res, next) => {
  const { phone } = req.body
  if (!phone.countryCode || !phone.number) return next(generateAPIError(`Enter a valid number`, 400));
  const existingPhone = await studentModel.find({ $and: [{ "phone.countryCode": phone.countryCode }, { "phone.number": phone.number }] }, "phone")
  if (existingPhone.length > 0) return next(generateAPIError(`phone number already exists, Enter a new number`, 400));
  req.user.phone = phone
  req.user.verification[1].token = { data: Math.floor(100000 + Math.random() * 900000), expiry: new Date(new Date().getTime() + 5 * 60000) }
  var smsResponse = (req.user.phone.countryCode === "+91") ? await sendOTP({ to: req.user.phone.number, otp: req.user.verification[1].token.data, region: "Indian" }) : await sendOTP({ to: req.user.phone.countryCode + req.user.phone.number, otp: req.user.verification[1].token.data, region: "International" });
  if (!smsResponse.return) { console.log(smsResponse); return next(generateAPIError("Otp not sent", 500)) }
  req.user.logs.push({
    action: `profile info updated & otp sent for verification`,
    details: `phone updated in profile`
  })
  await req.user.save()
  return res.status(200).json({ success: true, message: `otp sent for verification, verify it before it expires`, data: { expiry: req.user.verification[1].token.expiry }, AccessToken: req.AccessToken ? req.AccessToken : null });
})
export const editProfile = errorWrapper(async (req, res, next) => {
  const { LeadSource, personalDetails, isPlanningToTakeAcademicTest, isPlanningToTakeLanguageTest, familyDetails, extraCurriculumActivities, displayPicSrc, school, plus2, underGraduation, postGraduation, firstName, lastName, tests, workExperience, skills, preference, researchPapers, education } = req.body;
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
  } if (familyDetails) {
    req.user.familyDetails = familyDetails;
    req.user.logs.push({
      action: `profile info updated`,
      details: `familyDetails updated`
    })
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
  if (tests) {
    req.user.tests = tests;
    req.user.logs.push({
      action: `profile info updated`,
      details: `tests updated`
    })
  }
  if (workExperience) {
    req.user.workExperience = workExperience;
    req.user.logs.push({
      action: `profile info updated`,
      details: `workExperience updated`
    })
  }
  if (researchPapers) {
    req.user.researchPapers = researchPapers;
    req.user.logs.push({
      action: `profile info updated`,
      details: `researchPapers updated`
    })
  }
  if (school) {
    req.user.education.school = school;
    req.user.logs.push({
      action: `profile info updated`,
      details: `school updated`
    })
  }
  if (plus2) {
    req.user.education.plus2 = plus2;
    req.user.logs.push({
      action: `profile info updated`,
      details: `plus2 updated`
    })
  }
  if (underGraduation) {
    req.user.education.underGraduation = underGraduation;
    req.user.logs.push({
      action: `profile info updated`,
      details: `underGraduation updated`
    })
  }
  if (postGraduation) {
    req.user.education.postGraduation = postGraduation;
    req.user.logs.push({
      action: `profile info updated`,
      details: `postGraduation updated`
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
    req.user.preference = preference;
    req.user.logs.push({
      action: `profile info updated`,
      details: `preference updated`
    })
  }
  if (education) {
    req.user.education = education;
    req.user.logs.push({
      action: `profile info updated`,
      details: `education updated`
    })
  }
  await req.user.save()
  const profile = { ...req.user._doc, activity: {}, logs: [] }
  return res.status(200).json({ success: true, message: `profile edited successfully`, data: profile, AccessToken: req.AccessToken ? req.AccessToken : null });
})
export const postReview = errorWrapper(async (req, res, next) => {
  const university = await universityModel.findById(req.body.universityId);
  if (!university) return next(generateAPIError(`invalid university ID`, 400));
  const post = await reviewsModel.create({ user: req.user._id, university: university._id, comment: req.body.comment, rating: req.body.rating, });
  await university.updateOne({ $push: { 'userReviews': post._id } });
  req.user.logs.push({
    action: `review on university posted`,
    details: `reviewId:${post._id}`
  })
  await userModel.populate(post, { path: "user", select: "firstName lastName displayPicSrc" })
  await req.user.save()
  return res.status(200).json({ success: true, message: `review posted successfully`, data: post, AccessToken: req.AccessToken ? req.AccessToken : null });
})
export const editReview = errorWrapper(async (req, res, next) => {
  const { comment, rating, universityId, action, id } = req.body;
  const post = await reviewsModel.findById(id);
  if (post.user !== req.user._id) return next(generateAPIError(`invalid edit permissions`, 400));
  if (action == "delete") {
    const university = await universityModel.findById(universityId);
    if (!university) return next(generateAPIError(`invalid university ID`, 400));
    await Promise.all([
      await university.updateOne({ $pull: { 'userReviews': id } }),
      await reviewsModel.findByIdAndDelete(id)
    ])
    req.user.logs.push({
      action: `review on university updated`,
      details: `reviewId:${id}`
    })
    await userModel.populate(post, { path: "user", select: "firstName lastName displayPicSrc" })
    await req.user.save()
    return res.status(200).json({ success: true, message: `post deleted`, data: null, AccessToken: req.AccessToken ? req.AccessToken : null });
  }
  if (!post) return next(generateAPIError(`invalid review ID`, 400));
  if (comment) post.comment = comment;
  if (rating) post.rating = rating;
  await post.save();
  return res.status(200).json({ success: true, message: `review updated`, data: post, AccessToken: req.AccessToken ? req.AccessToken : null });
})
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
    await userModel.populate(req.user, { path: "activity.meetings.user activity.meetings.member", select: "firstName lastName email role" })
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
export const forceForwardApply = errorWrapper(async (req, res, next) => {
  const { applicationId } = req.body;
  const application = await applicationModel.findById(applicationId)
  if (!application) return next(generateAPIError("invalid ApplicationId"))
  if (application.user.toString() != req.user._id.toString()) return next(generateAPIError("invalid Access"))
  if (application.approval.counsellorApproval !== false) return next(generateAPIError("Wait for Counsellors Response"))
  application.approval.userConsent = true
  await application.save()
  req.user.logs.push({
    action: `Application forwarded forcefully`,
    details: `applicationId:${applicationId}`
  })
  await req.user.save()
  return res.status(200).json({ success: true, message: `Applied Forcefully`, data: application, AccessToken: req.AccessToken ? req.AccessToken : null });
})
export const removeForceApply = errorWrapper(async (req, res, next) => {
  const { applicationId } = req.body;
  const application = await applicationModel.findById(applicationId)
  if (!application) return next(generateAPIError("invalid ApplicationId"))
  if (application.user.toString() != req.user._id.toString()) return next(generateAPIError("invalid Access"))
  if (application.approval.counsellorApproval !== false) return next(generateAPIError("Wait for Counsellors Response"))
  application.approval.userConsent = false
  await application.save()
  req.user.logs.push({
    action: `Removed forceful apply`,
    details: `applicationId:${applicationId}`
  })
  await req.user.save()
  return res.status(200).json({ success: true, message: `removed forced apply`, data: application, AccessToken: req.AccessToken ? req.AccessToken : null });

})
//................download any user related Document...........
export const downloadDocument = errorWrapper(async (req, res, next) => {
  const { documentId } = req.params;
  const document = await Document.findById(documentId);
  if (!document) return next(generateAPIError(`invalid document ID`, 400));
  // if (!document.viewers.includes(req.decoded.id) && document.user.toString != req.decode.id) return next(generateAPIError(`access denied`, 401));
  return res.contentType(document.contentType).send(document.data);
})
// ..............profile documents...................
export const uploadInProfile = errorWrapper(async (req, res, next) => {
  const { fieldPath } = req.body;
  if (!fieldPath) return next(generateAPIError(`fieldPath is required`, 400));
  const allowedFieldPaths = [
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
    "workExperiences",];
  if (!allowedFieldPaths.includes(fieldPath)) return next(generateAPIError(`Invalid fieldPath`, 400));
  if (!req.file) return next(generateAPIError(`file not uploaded`, 400));
  const { originalname, path, mimetype } = req.file;
  const data = fs.readFileSync(path);
  const docDetails = { name: originalname, data: data, contentType: mimetype, user: req.user._id, type: "General", viewers: [req.user._id, req.user.counsellor], };
  if (req.user.processCoordinator) docDetails.viewers.push(req.user.processCoordinator);
  const newDoc = await Document.create(docDetails);
  fs.unlinkSync(path);
  const { ...fields } = fieldPath.split(".")
  switch (fields[0]) {
    case "personal":
      req.user.documents[fields[0]][fields[1]] = newDoc._id
      break;
    case "academic":
      fields[2] ? req.user.documents[fields[0]][fields[1]][fields[2]] = newDoc._id : req.user.documents[fields[0]][fields[1]] = newDoc._id
      break;
    case "test":
      if (req.user.documents[fields[0]][fields[1]].length >= 5) return next(generateAPIError(`Maximum limit of 5 documents reached`, 400));
      req.user.documents[fields[0]][fields[1]].push(newDoc._id)
      break;
    case "workExperiences":
      if (req.user.documents[fields[0]].length >= 5) return next(generateAPIError(`Maximum limit of 5 documents reached`, 400));
      req.user.documents[fields[0]].push(newDoc._id)
      break;
    default: return next(generateAPIError(`Invalid fieldPath`, 400));
  }
  req.user.logs.push({
    action: `document uploaded`,
    details: `path:${fieldPath}&documentId:${newDoc._id}`
  })
  await Promise.all([
    await req.user.save(),
    await Document.populate(req.user,
      [{ path: "documents.personal.resume", select: "name contentType createdAt", },
      { path: "documents.personal.passportBD", select: "name contentType createdAt", },
      { path: "documents.personal.passportADD", select: "name contentType createdAt", },
      { path: "documents.academic.secondarySchool", select: "name contentType createdAt", },
      { path: "documents.academic.plus2", select: "name contentType createdAt", },
      { path: "documents.academic.degree", select: "name contentType createdAt", },
      { path: "documents.academic.bachelors.transcripts", select: "name contentType createdAt", },
      { path: "documents.academic.bachelors.bonafide", select: "name contentType createdAt", },
      { path: "documents.academic.bachelors.CMM", select: "name contentType createdAt", },
      { path: "documents.academic.bachelors.PCM", select: "name contentType createdAt", },
      { path: "documents.academic.bachelors.OD", select: "name contentType createdAt", },
      { path: "documents.academic.masters.transcripts", select: "name contentType createdAt", },
      { path: "documents.academic.masters.bonafide", select: "name contentType createdAt", },
      { path: "documents.academic.masters.CMM", select: "name contentType createdAt", },
      { path: "documents.academic.masters.PCM", select: "name contentType createdAt", },
      { path: "documents.academic.masters.OD", select: "name contentType createdAt", },
      { path: "documents.test.general", select: "name contentType createdAt", },
      { path: "documents.test.languageProf", select: "name contentType createdAt", },
      { path: "documents.workExperiences", select: "name contentType createdAt", },]),
  ])
  return res.status(200).json({ success: true, message: `Document added to ${fieldPath}`, data: { docs: req.user.documents }, AccessToken: req.AccessToken ? req.AccessToken : null });
})
export const deleteUploadedInProfile = errorWrapper(async (req, res, next) => {
  const { fieldPath, documentId } = req.body;
  if (!fieldPath) return next(generateAPIError(`fieldPath is required`, 400));
  const allowedFieldPaths = ["personal.resume", "personal.passportBD", "personal.passportADD", "academic.secondarySchool", "academic.plus2", "academic.degree", "academic.bachelors.transcripts", "academic.bachelors.bonafide", "academic.bachelors.CMM", "academic.bachelors.PCM", "academic.bachelors.OD", "academic.masters.transcripts", "academic.masters.bonafide", "academic.masters.CMM", "academic.masters.PCM", "academic.masters.OD", "test.languageProf", "test.general", "workExperiences",];
  if (!allowedFieldPaths.includes(fieldPath)) return next(generateAPIError(`Invalid fieldPath`, 400));
  const existingDoc = await Document.findById(documentId);
  if (!existingDoc) return next(generateAPIError(`Document not found`, 404));
  if (existingDoc.user.toString() !== req.user._id.toString()) return next(generateAPIError(`Unauthorized to delete this document`, 403));
  const { ...fields } = fieldPath.split(".")
  switch (fields[0]) {
    case "personal":
      if (req.user.documents[fields[0]][fields[1]].toString() != documentId) return next(generateAPIError(`Document Id mis match`, 400));
      req.user.documents[fields[0]][fields[1]] = null
      break;
    case "academic":
      if (!fields[2]) {
        if (req.user.documents[fields[0]][fields[1]].toString() != documentId) return next(generateAPIError(`Document Id mis match`, 400));
        req.user.documents[fields[0]][fields[1]] = null
        break;
      }
      if (req.user.documents[fields[0]][fields[1]][fields[2]].toString() != documentId) return next(generateAPIError(`Document Id mis match`, 400));
      req.user.documents[fields[0]][fields[1]][fields[2]] = null
      break;
    case "test":
      if (!req.user.documents[fields[0]][fields[1]].includes(documentId)) return next(generateAPIError(`Document Id mis match`, 400));
      req.user.documents[fields[0]][fields[1]] = req.user.documents[fields[0]][fields[1]].filter(ele => ele.toString() != documentId)
      break;
    case "workExperiences":
      if (!req.user.documents[fields[0]].includes(documentId)) return next(generateAPIError(`Document Id mis match`, 400));
      req.user.documents[fields[0]] = req.user.documents[fields[0]].filter(ele => ele.toString() != documentId)
      break;
    default: return next(generateAPIError(`Invalid fieldPath`, 400));
  }
  req.user.logs.push({
    action: `document deleted`,
    details: `path:${fieldPath}`
  })
  await Promise.all([
    await req.user.save(),
    await Document.findByIdAndRemove(documentId),
    await Document.populate(req.user,
      [{ path: "documents.personal.resume", select: "name contentType createdAt", },
      { path: "documents.personal.passportBD", select: "name contentType createdAt", },
      { path: "documents.personal.passportADD", select: "name contentType createdAt", },
      { path: "documents.academic.secondarySchool", select: "name contentType createdAt", },
      { path: "documents.academic.plus2", select: "name contentType createdAt", },
      { path: "documents.academic.degree", select: "name contentType createdAt", },
      { path: "documents.academic.bachelors.transcripts", select: "name contentType createdAt", },
      { path: "documents.academic.bachelors.bonafide", select: "name contentType createdAt", },
      { path: "documents.academic.bachelors.CMM", select: "name contentType createdAt", },
      { path: "documents.academic.bachelors.PCM", select: "name contentType createdAt", },
      { path: "documents.academic.bachelors.OD", select: "name contentType createdAt", },
      { path: "documents.academic.masters.transcripts", select: "name contentType createdAt", },
      { path: "documents.academic.masters.bonafide", select: "name contentType createdAt", },
      { path: "documents.academic.masters.CMM", select: "name contentType createdAt", },
      { path: "documents.academic.masters.PCM", select: "name contentType createdAt", },
      { path: "documents.academic.masters.OD", select: "name contentType createdAt", },
      { path: "documents.test.general", select: "name contentType createdAt", },
      { path: "documents.test.languageProf", select: "name contentType createdAt", },
      { path: "documents.workExperiences", select: "name contentType createdAt", },])
  ])
  return res.status(200).json({ success: true, message: `Document deleted from ${fieldPath}`, data: req.user.documents, AccessToken: req.AccessToken ? req.AccessToken : null });
})
// ....................................................
export const addShortListed = errorWrapper(async (req, res, next) => {
  const { universityId, courseId } = req.body;
  if (!(await universityModel.findById(universityId))) return next(generateAPIError(`invalid universityId`, 400));
  if (!(await courseModel.findById(courseId))) return next(generateAPIError(`invalid courseId`, 400));
  const shortListed = req.user.activity.shortListed;
  const alreadyExists = shortListed.find((ele) => ele.course == courseId);
  if (alreadyExists) return next(generateAPIError(`course already exist in the list`, 400));
  shortListed.push({ university: universityId, course: courseId });
  req.user.logs.push({
    action: `course shortlisted`,
    details: `courseId:${courseId}&universityId:${universityId}`
  })
  await Promise.all([
    await req.user.save(),
    await universityModel.populate(req.user, { path: "activity.shortListed.university", select: "name logoSrc location type establishedYear ", }),
    await courseModel.populate(req.user, { path: "activity.shortListed.course", select: "name discipline tuitionFee startDate studyMode subDiscipline currency studyMode schoolName studyLevel duration applicationDetails", },)
  ])
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
    req.user.activity.shortListed.forEach(applyCurrencyConversion);
  }
  return res.status(200).json({ success: true, message: `added to shortlist successfully`, data: req.user.activity.shortListed.slice(-1), AccessToken: req.AccessToken ? req.AccessToken : null });
})
export const removeShortListed = errorWrapper(async (req, res, next) => {
  const updateResult = await studentModel.updateOne({ _id: req.user._id }, { $pull: { 'activity.shortListed': { _id: req.params.id } } });
  if (updateResult.modifiedCount === 0) return next(generateAPIError(`id doesn't exist in the list`, 400));
  req.user.logs.push({
    action: `course removed from shortlist`,
    details: `courseId:${req.params.id}`
  })
  return res.status(200).json({ success: true, message: `list updated`, data: null, AccessToken: req.AccessToken ? req.AccessToken : null });
})
export const apply = errorWrapper(async (req, res, next) => {
  let { universityId, courseId, intake } = req.body
  if (!req.user.verification[0].status) return next(generateAPIError(`do verify your email to process the application`, 400));
  if (!req.user.verification[1].status) return next(generateAPIError(`do verify your phone number to process the application`, 400));
  if (! await universityModel.findById(universityId)) return next(generateAPIError(`invalid university Id`, 400));
  const course = await courseModel.findById(courseId, "startDate")
  if (!course) return next(generateAPIError(`invalid course Id`, 400));
  if (!intake || new Date(intake) <= new Date()) return next(generateAPIError(`invalid intake`, 400));
  const Exists = course.startDate.filter(ele => ele.courseStartingMonth == new Date(intake).getUTCMonth())
  if (Exists.length <= 0) return next(generateAPIError(`intake doesn't exist`, 400));
  if (!req.user.advisors.find(ele => ele.role === "processCoordinator")) {
    const processCoordinators = await teamModel.aggregate([{ $match: { role: "processCoordinator" } },
    {
      $project: {
        _id: 1, applications: 1,
        applicationsCount: {
          $cond: {
            if: { $isArray: "$applications" },
            then: { $size: "$applications" },
            else: 0
          }
        }
      }
    }, { $sort: { applicationsCount: 1 } }, { $limit: 1 }]);
    req.user.advisors.push({
      info: processCoordinators[0]._id,
      role: "processCoordinator"
    })
    await teamModel.findOneAndUpdate({ _id: processCoordinators[0]._id }, { $push: { students: { profile: req.user._id } }, });
    await chatModel.create({ participants: [req.user._id, processCoordinators[0]._id] });
    await Document.updateMany({ user: req.user._id, type: "General" }, { $push: { viewers: processCoordinators[0]._id } })
  }
  const alreadyExists = await applicationModel.find({ user: req.user._id, intake: intake, course: courseId })
  if (alreadyExists.length > 0) return next(generateAPIError(`Already applied for this intake`, 400));
  const newApplication = await applicationModel.create({
    counsellor: req.user.counsellor,
    university: universityId,
    course: courseId,
    intake: intake,
    user: req.user._id,
    processCoordinator: req.user.processCoordinator,
    log: [{ status: "Processing", stages: [{ name: "Waiting For Counsellor's Approval" }] }],
    status: "Processing",
    stage: "Waiting For Counsellor's Approval"
  });
  await teamModel.findOneAndUpdate({ _id: req.user.processCoordinator }, { $push: { applications: newApplication._id } })
  req.user.activity.applications.processing.push(newApplication._id)
  req.user.logs.push({
    action: `application process Initiated`,
    details: `applicationId:${newApplication._id}`
  })
  await req.user.save()
  await applicationModel.populate(req.user, { path: "activity.applications.processing" })
  await userModel.populate(req.user, [{ path: "activity.applications.processing.user", select: "firstName lastName email displayPicSrc" }, { path: "activity.applications.processing.processCoordinator", select: "firstName lastName email displayPicSrc" }])
  await universityModel.populate(req.user, { path: "activity.applications.processing.university", select: "name logoSrc location type establishedYear " })
  await courseModel.populate(req.user, { path: "activity.applications.processing.course", select: "name tuitionFee currency studyMode discipline subDiscipline schoolName studyLevel duration", })
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
    req.user.activity.applications.processing.forEach(applyCurrencyConversion);
  }
  res.status(200).json({ success: true, message: 'New Application Registered', data: req.user.activity.applications.processing.slice(-1), AccessToken: req.AccessToken ? req.AccessToken : null });
})
export const requestCancellation = errorWrapper(async (req, res, next) => {
  const updatedApplication = await applicationModel.findOneAndUpdate({ _id: req.params.applicationId }, { $set: { cancellationRequest: true } }, { new: true });
  if (!updatedApplication) return next(generateAPIError(`Invalid application ID`, 400));
  await Document.populate(updatedApplication, { path: "docChecklist.doc", select: "name contentType createdAt", })
  await userModel.populate(updatedApplication, [
    { path: "user", select: "firstName lastName email displayPicSrc" },
    { path: "counsellor", select: "firstName lastName email displayPicSrc" }
  ])
  req.user.logs.push({
    action: `cancellation requested`,
    details: `applicationId:${req.params.applicationId}`
  })
  await req.user.save()
  await universityModel.populate(updatedApplication, { path: "university", select: "name logoSrc location type establishedYear " });
  await courseModel.populate(updatedApplication, { path: "course", select: "name discipline subDiscipline schoolName studyLevel duration applicationDetails" });
  res.status(200).json({ success: true, message: 'Application cancellation Request sent to processCoordinator', data: updatedApplication, AccessToken: req.AccessToken ? req.AccessToken : null });
})
// ..............applications documents...................
export const uploadInApplication = errorWrapper(async (req, res, next) => {
  const { applicationId, checklistItemId } = req.body;
  const application = await applicationModel.findById(applicationId);
  if (!application) return next(generateAPIError(`invalid application ID`, 400));
  const checklistItem = application.docChecklist.find(ele => ele._id.toString() == checklistItemId)
  if (!checklistItem) return next(generateAPIError(`invalid checklist ID`, 400));
  const { originalname, path, mimetype } = req.file;
  const data = fs.readFileSync(path);
  const upload = { name: originalname, data: data, contentType: mimetype, user: req.user._id, viewers: [req.user._id, application.processCoordinator], type: "Application" }
  if (application.counsellor) upload.viewers.push(application.counsellor)
  const newDoc = await Document.create(upload);
  fs.unlinkSync(path);
  checklistItem.doc = newDoc._id
  req.user.logs.push({
    action: `document uploaded in checklist`,
    details: `applicationId:${applicationId}&checklistItemId:${checklistItemId}`
  })
  await req.user.save()
  await Promise.all([
    await application.save(),
    await universityModel.populate(application, { path: "university", select: "name logoSrc location type establishedYear " }),
    await courseModel.populate(application, { path: "course", select: "name discipline tuitionFee currency studyMode subDiscipline schoolName studyLevel duration", }),
    Document.populate(application, { path: "docChecklist.doc", select: "name contentType createdAt", })
  ])
  if (req.user.preference.currency) {
    const { rates } = await exchangeModel.findById(ExchangeRatesId, "rates");

    if (application.course.currency.code !== req.user.preference.currency) {
      if (!rates[application.course.currency.code] || !rates[req.user.preference.currency]) {
        next(generateAPIError('Exchange rates for the specified currencies are not available', 400));
      }
      application.course.tuitionFee.tuitionFee = costConversion(application.course.tuitionFee.tuitionFee, application.course.currency.code, req.user.preference.currency, rates[application.course.currency.code], rates[req.user.preference.currency]);
      application.course.currency = { code: req.user.preference.currency, symbol: currencySymbols[req.user.preference.currency] };
    }
  }
  res.status(200).json({ success: true, message: 'New Application Registered', data: application, AccessToken: req.AccessToken ? req.AccessToken : null });
})
export const deleteUploadedFromApplication = errorWrapper(async (req, res, next) => {
  const { applicationId, checklistItemId, documentId } = req.body;
  const doc = await Document.findById(documentId)
  if (!doc) return next(generateAPIError(`invalid document ID`, 400));
  const application = await applicationModel.findById(applicationId);
  if (!application) return next(generateAPIError(`invalid application ID`, 400));
  const checklistItem = application.docChecklist.find(ele => ele._id.toString() == checklistItemId)
  if (!checklistItem) return next(generateAPIError(`invalid checklist ID`, 400));
  if (doc.user.toString() != req.user._id.toString()) return next(generateAPIError(`you don't have access to delete or modify this content`, 400));
  if (checklistItem.doc.toString() != documentId) return next(generateAPIError(`list item docId doesn't match with documentId`, 400));
  checklistItem.doc = null
  checklistItem.isChecked = false
  req.user.logs.push({
    action: `document deleted in application`,
    details: `applicationId:${applicationId}`
  })
  await req.user.save()
  await Promise.all([
    await application.save(),
    await Document.findByIdAndDelete(documentId),
    await universityModel.populate(application, { path: "university", select: "name logoSrc location type establishedYear " }),
    await courseModel.populate(application, { path: "course", select: "name discipline tuitionFee currency studyMode subDiscipline schoolName studyLevel duration", }),
    await Document.populate(application, { path: "docChecklist.doc", select: "name contentType createdAt", })
  ])
  if (req.user.preference.currency) {
    const { rates } = await exchangeModel.findById(ExchangeRatesId, "rates");

    if (application.course.currency.code !== req.user.preference.currency) {
      if (!rates[application.course.currency.code] || !rates[req.user.preference.currency]) {
        next(generateAPIError('Exchange rates for the specified currencies are not available', 400));
      }
      application.course.tuitionFee.tuitionFee = costConversion(application.course.tuitionFee.tuitionFee, application.course.currency.code, req.user.preference.currency, rates[application.course.currency.code], rates[req.user.preference.currency]);
      application.course.currency = { code: req.user.preference.currency, symbol: currencySymbols[req.user.preference.currency] };
    }
  }
  return res.status(200).json({ success: true, message: `doc deleted`, data: application, AccessToken: req.AccessToken ? req.AccessToken : null });
})
// ......................................................
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
export const verifyEmail = errorWrapper(async (req, res, next) => {
  let subject = "Verify Your Email to Activate Your CampusRoot Account"
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const filePath = path.join(__dirname, '../../../static/emailTemplate.html');
  const source = fs.readFileSync(filePath, "utf-8").toString();
  const template = Handlebars.compile(source)
  req.user.verification[0].status = false
  req.user.verification[0].token = { data: (Math.random() + 1).toString(16).substring(2), expiry: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }
  const replacement = { userName: `${req.user.firstName} ${req.user.lastName}`, URL: `${process.env.SERVER_URL}/api/v1/auth/verify/${req.user.email}/${req.user.verification[0].token.data}` }
  const htmlToSend = template(replacement)
  await sendMail({ to: req.user.email, subject: subject, html: htmlToSend });
  req.user.logs.push({ action: `Email sent for verification`, details: `` });
  await req.user.save()
  return res.status(200).json({ success: true, message: `email sent for verification`, data: null, AccessToken: req.AccessToken ? req.AccessToken : null });
})
export const sendUserOTP = errorWrapper(async (req, res, next) => {
  const otp = Math.floor(100000 + Math.random() * 900000), expiry = new Date(new Date().getTime() + 5 * 60000);
  if (req.user.phone.number && req.user.verification[1].status) return next(generateAPIError("already verified", 400));
  req.user.verification[1].token = { data: otp, expiry: expiry, }
  var smsResponse = (req.user.phone.countryCode === "+91") ? await sendOTP({ to: req.user.phone.number, otp: otp, region: "Indian" }) : await sendOTP({ to: req.user.phone.countryCode + req.user.phone.number, otp: otp, region: "International" });
  if (!smsResponse.return) { console.log(smsResponse); return next(generateAPIError("Otp not sent", 500)) }
  req.user.logs.push({
    action: `otp sent for verification`,
    details: ``
  })
  await req.user.save()
  return res.status(200).json({ success: true, message: `otp sent for verification, verify before expiry`, data: { expiry: expiry }, AccessToken: req.AccessToken ? req.AccessToken : null });
})
export const verifyUserOTP = errorWrapper(async (req, res, next) => {
  const { otp } = req.body
  const user = await studentModel.findById(req.user._id, "verifications logs")
  if (req.user.verification[1].token.data !== otp) return next(generateAPIError("invalid otp", 400))
  if (new Date() > new Date(req.user.verification[1].token.expiry)) return next(generateAPIError("otp expired, generate again", 400))
  req.user.verification[1].status = true
  req.user.logs.push({
    action: `otp verification successful`,
    details: ``
  })
  await req.user.save()
  return res.status(200).json({ success: true, message: `phone verification successful`, data: null, AccessToken: req.AccessToken ? req.AccessToken : null });
})
export const getEvents = errorWrapper(async (req, res, next) => {
  // add meeting for processCordinator
  await userModel.populate(req.user, { path: "advisors.info", select: "googleTokens" })
  let counsellor = req.user.advisors.find(ele => ele.role === 'counsellor'), processCoordinator = req.user.advisors.find(ele => ele.role === 'processCoordinator')
  const { team } = req.params
  switch (team) {
    case "counsellor":
      oauth2Client.setCredentials(counsellor.info.googleTokens);
      break;
    case "processCoordinator":
      oauth2Client.setCredentials(processCoordinator.info.googleTokens);
      break;
    default: return next(generateAPIError(`invalid team parameter`, 400));
  }
  const { data } = await google.calendar({ version: 'v3', auth: oauth2Client }).events.list({
    calendarId: 'primary',
    timeMin: new Date().toISOString(),
    maxResults: 2499,    // cannot be larger than 2500 by default 250
    singleEvents: true,
    // orderBy: 'updated',
    orderBy: "startTime",
    timeMax: new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000).toISOString()
  });
  const busySlots = data.items.map(event => ({
    summary: event.summary,
    start: new Date(event.start.dateTime).toISOString(),
    end: new Date(event.end.dateTime).toISOString(),
  }));
  let today = new Date();
  today.setMinutes(0, 0, 0)
  const thirtyDaysLater = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
  const result = []
  const endTime = new Date(thirtyDaysLater.getFullYear(), thirtyDaysLater.getMonth(), thirtyDaysLater.getDate(), 12, 30, 0);
  while (today < endTime) {
    let todayStartTime = new Date(today).setHours(3, 30, 0);
    let todayEndTime = new Date(today).setHours(12, 30, 0);
    let currentTime = (today < todayStartTime) ? new Date(todayStartTime) : new Date(today);
    if (today.getDay() !== 0) {
      const availableSlots = [];
      let lunchStart = new Date(today).setHours(7, 30, 0);
      let lunchEnd = new Date(today).setHours(8, 30, 0);
      while (currentTime < todayEndTime) {
        let slotEnd = new Date(currentTime.getTime() + 30 * 60 * 1000)
        let isSlotAvailable = ((
          !busySlots.some(busySlot =>
            ((currentTime <= new Date(busySlot.start)) && (new Date(busySlot.start) < slotEnd)) ||
            ((new Date(busySlot.start) <= currentTime) && (currentTime < new Date(busySlot.end)))
          )) &&
          (!(currentTime >= lunchStart) || !(slotEnd <= lunchEnd))
        )
        if (isSlotAvailable) availableSlots.push({
          startTime: currentTime,
          endTime: slotEnd
        })
        currentTime = slotEnd;
      }
      result.push({
        date: new Date(today),
        availableSlots: availableSlots
      })
    }
    today.setDate(today.getDate() + 1)
    today.setHours(3, 30, 0, 0);
  }
  return res.status(200).json({ success: true, message: `free slots for next 30 days`, data: result, AccessToken: req.AccessToken ? req.AccessToken : null });
})
export const bookSlot = errorWrapper(async (req, res, next) => {
  const { startTime, endTime, attendees, timeZone, notes } = req.body
  const { team } = req.params
  if (req.user.verification[0].status === false) return next(generateAPIError(`do verify your email to book a slot`, 400));
  if (req.user.verification[1].status === false) return next(generateAPIError(`do verify your phone number to book a slot`, 400));
  if (!new Date(startTime)) return next(generateAPIError("invalid startTime", 400))
  if (!new Date(endTime)) return next(generateAPIError("invalid endTime", 400))
  if (!timeZone) return next(generateAPIError("invalid timeZone", 400))
  await userModel.populate(req.user, { path: "advisors.info", select: "googleTokens" })
  let counsellor = req.user.advisors.find(ele => ele.role === 'counsellor'), processCoordinator = req.user.advisors.find(ele => ele.role === 'processCoordinator')
  let event, meet
  switch (team) {
    case "counsellor":
      oauth2Client.setCredentials(counsellor.info.googleTokens);
      event = {
        summary: `Counselling Session - ${req.user.firstName} ${req.user.lastName}`,
        description: notes,
        start: { dateTime: new Date(startTime), timeZone: timeZone, },
        end: { dateTime: new Date(endTime), timeZone: timeZone, },
        attendees: [{ email: req.user.email }],
        conferenceData: { createRequest: { requestId: Math.random().toString(16).slice(2), }, },
        reminders: { useDefault: false, overrides: [{ method: "email", minutes: 24 * 60 }, { method: "popup", minutes: 10 },], },
      };
      meet = { user: req.user._id, member: counsellor.info._id }
      break;
    case "processCoordinator":
      oauth2Client.setCredentials(processCoordinator.info.googleTokens);
      event = {
        summary: `Application Processing Session - ${req.user.firstName} ${req.user.lastName}`,
        description: notes,
        start: { dateTime: new Date(startTime), timeZone: timeZone, },
        end: { dateTime: new Date(endTime), timeZone: timeZone, },
        attendees: [{ email: req.user.email }],
        conferenceData: { createRequest: { requestId: Math.random().toString(16).slice(2), }, },
        reminders: { useDefault: false, overrides: [{ method: "email", minutes: 24 * 60 }, { method: "popup", minutes: 10 },], },
      };
      meet = { user: req.user._id, member: processCoordinator.info._id }
      break;
    default: return next(generateAPIError(`invalid team parameter`, 400));
  }
  if (attendees) attendees.forEach(ele => event.attendees.push({ email: ele }));
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  const { data } = await calendar.events.insert({ calendarId: 'primary', requestBody: event, conferenceDataVersion: 1, sendUpdates: "all", });
  meet.data = data;
  meet.status = "upcoming"
  console.log(event,meet);
  const meeting = await meetingModel.create(meet)
  req.user.activity.meetings.push(meeting._id)
  req.user.logs.push({
    action: `slot booked at ${startTime}`,
    details: `meetingId:${meeting._id}`
  })
  await req.user.save()
  await userModel.populate(meeting, { path: "user member", select: "firstName lastName email role" })
  return res.status(200).json({ success: true, message: `slot booking successful`, data: meeting, AccessToken: req.AccessToken ? req.AccessToken : null });
})
export const modifySlot = errorWrapper(async (req, res, next) => {
  const { meetingId, option, startTime, endTime, timeZone } = req.body
  const meeting = await meetingModel.findById(meetingId)
  if (!meeting || !meeting.data.id) return next(generateAPIError("invalid meetingId", 400))
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  let msg
  switch (option) {
    case "cancelEvent":
      await calendar.events.patch({
        calendarId: 'primary',
        eventId: meeting.data.id,
        requestBody: {
          status: 'cancelled'
        },
        sendUpdates: 'all'
      });
      meeting.status = "cancelled"
      msg = 'Event cancelled successfully'
      req.user.logs.push({
        action: `Event cancelled`,
        details: `meetingId:${meetingId}`
      })
      break;
    case "rescheduleEvent":
      if (!startTime && !endTime) return next(generateAPIError("invalid start and end time", 400))
      if (!timeZone) return next(generateAPIError("invalid timeZone", 400))
      const updatedEvent = {
        start: { dateTime: new Date(startTime), timeZone: timeZone, },
        end: { dateTime: new Date(endTime), timeZone: timeZone, },
      };
      await calendar.events.update({
        calendarId: 'primary',
        eventId: eventId,
        requestBody: updatedEvent,
        sendUpdates: 'all'
      });
      meeting.status = "rescheduled"
      msg = 'Event rescheduled successfully'
      req.user.logs.push({
        action: `Event rescheduled ${startTime}`,
        details: `meetingId:${meetingId}`
      })
      // await rescheduleEvent(calendar, eventId, updatedEvent);
      break;
    default: return next(generateAPIError("invalid option", 400))
  }

  await req.user.save()
  await meeting.save()
  await userModel.populate(meeting, { path: "user member", select: "firstName lastName email role" })
  return res.status(200).json({ success: true, message: msg, data: meeting, AccessToken: req.AccessToken ? req.AccessToken : null });
})
// const { Secret_key } = config.get("STRIPE_PAYMENTS")
// const stripe = new Stripe(`${Secret_key}`);
// const URL = config.get("URL")
// export const checkout = async (req,res,next) => {
//     try {
//         const { price, universityId, courseId } = req.body

//         if (!price === NaN) return res.status(400).send("enter valid price");
//         const session = await stripe.checkout.sessions.create({
//             line_items: [
//                 {
//                     price_data: {
//                         currency: 'inr',
//                         product_data: { name: 'CampusRoot' },
//                         unit_amount: price * 100,
//                     },
//                     quantity: 1,
//                 },
//             ],
//             mode: 'payment',
//             success_url: `${URL}/api/v1/student/success?universityIds=${universityId}&courseIds=${courseId}&userId=${req.user._id}`,
//             cancel_url: `${URL}/api/v1/student/failed`,
//             customer_email: req.user.email,
//         });
//         // generate an invoice and email it to user with session.id
//         return res.status(200).json({ url: session.url });

//     } catch (error) {
//         console.log(error)
//     }
// }