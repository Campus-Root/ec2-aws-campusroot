import courseModel from "../../models/Course.js";
import universityModel from "../../models/University.js";
import Document from "../../models/Uploads.js";
import { studentModel } from "../../models/Student.js";
import userModel from "../../models/User.js";
import { errorWrapper } from "../../middleware/errorWrapper.js";
import meetingModel from "../../models/meetings.js";
import 'dotenv/config';
import communityModel from "../../models/Community.js";
import { gradeConversions } from "../../utils/gradeConversions.js";
import exchangeModel from "../../models/ExchangeRates.js";
import { costConversion } from "../../utils/currencyConversion.js";
import { currencySymbols } from "../../utils/enum.js";
import { productModel } from "../../models/Product.js";
import { orderModel } from "../../models/Order.js";
import { packageModel } from "../../models/Package.js";
import sendMail from "../../utils/sendEMAIL.js";
import chatModel from "../../models/Chat.js";
import { recycleBinModel } from "../../models/recycleBin.js";
import { categorizePrograms, constructFilters } from "../../utils/recommendations.js";
const ExchangeRatesId = process.env.EXCHANGERATES_MONGOID
export const generateRecommendations = errorWrapper(async (req, res, next, session) => {
  let filterData = [], testScores = []
  if (req.user.preference.country.length > 0) filterData.push({ type: "Country", data: req.user.preference.country })
  if (req.user.preference.category.length > 0) filterData.push({ type: "Category", data: req.user.preference.category })
  if (req.user.preference.subCategory.length > 0) filterData.push({ type: "SubCategory", data: req.user.preference.subCategory })
  if (req.user.preference.subCategory.degree) filterData.push({ type: "StudyLevel", data: req.user.preference.degree })
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
      if (score !== null && !isNaN(score)) testScores.push({ testType: testName, overallScore: parseInt(score) });
    }
  });
  const { backlogs, totalScore, maxScore } = req.user.education.underGraduation
  if (totalScore && maxScore) testScores.push({ testType: "GPA", overallScore: parseFloat(totalScore), ugOutOf: parseFloat(maxScore) });
  if (backlogs) testScores.push({ testType: "Backlogs", overallScore: parseInt(backlogs) });
  if (req.user.workExperience.length > 0) {
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
    testScores.push({ testType: "WorkExperience", overallScore: parseFloat(totalWorkExperience.toFixed(2)) });
  }
  if (req.user.researchPapers.length > 0) {
    let hasInternational = false, hasNational = false;
    req.user.researchPapers.forEach(paper => {
      if (paper.publicationsLevel === "International") hasInternational = true;
      if (paper.publicationsLevel === "National") hasNational = true;
    });
    testScores.push({ testType: "Publications", level: hasInternational ? "International" : hasNational ? "National" : null });
  }
  const { filter, projections } = constructFilters(filterData, testScores);
  let pipeline = [{ $match: filter }, { $project: projections }]
  const programs = await courseModel.aggregate(pipeline);
  req.user.recommendations.data = req.user.recommendations.data.filter(ele => ele.counsellorRecommended)
  let recommendations = categorizePrograms(testScores, programs);
  req.user.recommendations.criteria = [...filterData, ...testScores]
  req.user.recommendations.data = [...req.user.recommendations.data, ...recommendations]
  req.user.logs.push({ action: `recommendations Generated`, details: `recommendations${req.user.recommendations.data.length}` })
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
  return ({ statusCode: 200, message: "Recommendations Generated", data: req.user.recommendations });
})
export const hideRecommendation = errorWrapper(async (req, res) => {
  const { recommendationId } = req.body
  const recommendation = req.user.recommendations.data.find(ele => ele._id.toString() == recommendationId)
  if (!recommendation) return { statusCode: 400, data: null, message: `invalid recommendationId` };
  recommendation.notInterested = true;
  await req.user.save();
  await courseModel.populate(req.user, { path: "recommendations.data.course", select: "name discipline tuitionFee currency studyMode subDiscipline schoolName startDate studyLevel duration university elite" })
  await universityModel.populate(req.user, { path: "recommendations.data.course.university", select: "name logoSrc location type establishedYear " })
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

  return ({ statusCode: 200, message: "Recommendation hidden", data: req.user.recommendations });
})
export const dashboard = errorWrapper(async (req, res, next, session) => {
  await Promise.all([
    await orderModel.populate(req.user, { path: "orders", select: "paymentDetails Package status priceDetails cancellationReason cancellationDate logs products" }),
    await packageModel.populate(req.user, { path: "suggestedPackages purchasedPackages orders.Package", select: "name description country priceDetails.totalPrice priceDetails.currency requirements benefits products termsAndConditions active" }),
    await productModel.populate(req.user, [{ path: "activity.products orders.products" }]),
    await courseModel.populate(req.user, [{ path: "recommendations.data.course activity.cart.course activity.wishList activity.products.course orders.products.course", select: "name discipline tuitionFee studyMode subDiscipline schoolName startDate studyLevel duration applicationDetails currency university elite" },]),
    await universityModel.populate(req.user, [{ path: "activity.cart.course.university activity.wishList.university recommendations.data.course.university activity.products.course.university orders.products.course.university", select: "name logoSrc location type establishedYear " },]),
    await Document.populate(req.user, [{ path: "activity.products.docChecklist.doc orders.products.docChecklist", select: "data" },]),
    await meetingModel.populate(req.user, { path: "activity.meetings" }),
    await userModel.populate(req.user, { path: "activity.meetings.user activity.meetings.member activity.products.advisors orders.products.advisors", select: "firstName displayPicSrc lastName email role" }),
  ]);
  let applications, checklist
  if (req.user.activity.products.length > 0) {
    if (req.user.preference?.currency != null) {
      const { rates } = await exchangeModel.findById(ExchangeRatesId, "rates");
      const applyCurrencyConversion = (element) => {
        if (element.course.currency.code !== req.user.preference.currency) {
          if (!rates[element.course.currency.code] || !rates[req.user.preference.currency]) {
            return { statusCode: 400, data: null, message: 'Exchange rates for the specified currencies are not available' };
          }
          element.course.tuitionFee.tuitionFee = costConversion(element.course.tuitionFee.tuitionFee, element.course.currency.code, req.user.preference.currency, rates[element.course.currency.code], rates[req.user.preference.currency]);
          element.course.currency = { code: req.user.preference.currency, symbol: currencySymbols[req.user.preference.currency] };
        }
      };
      if (req.user.recommendations.data.length > 0) req.user.recommendations.data.forEach(applyCurrencyConversion);
      if (req.user.activity.cart.length > 0) req.user.activity.cart.forEach(applyCurrencyConversion);
      if (req.user.activity.products.length > 0) req.user.activity.products.forEach(applyCurrencyConversion);
    }
    applications = req.user.activity.products.filter((ele) => ele.stage === "Processing" || ele.stage === "Accepted");
    checklist = applications.flatMap(application =>
      application.docChecklist.filter(item => !item.isChecked).map(item => ({
        checklistId: item._id,
        name: item.name,
        isChecked: item.isChecked,
        doc: item.doc,
        desc: item.desc,
        applicationId: application._id
      })));
  }
  return ({ statusCode: 200, message: `activity of user`, data: { activity: req.user.activity, orders: req.user.orders, suggestedPackages: req.user.suggestedPackages, purchasedPackages: req.user.purchasedPackages, recommendations: req.user.recommendations, checklist: checklist } });
});
//................download any user related Document...........
export const downloadDocument = errorWrapper(async (req, res, next, session) => {
  const { documentId } = req.params;
  const document = await Document.findById(documentId);
  if (!document) return { statusCode: 400, data: null, message: `invalid document ID` };
  // if (!document.viewers.includes(req.decoded.id) && document.user.toString != req.decode.id) return { statusCode: 400, data: student , message:    `access denied`};
  return res.contentType(document.contentType).send(document.data);
})
export const allStudents = errorWrapper(async (req, res, next, session) => {
  const students = await studentModel.find({}, "firstName lastName displayPicSrc activity.admitReceived").populate("activity.admitReceived", "university course");
  await Promise.all([
    await universityModel.populate(students, { path: "activity.admitReceived.university", select: "name logoSrc location type ", }),
    await courseModel.populate(students, { path: "activity.admitReceived.course", select: "name schoolDetails", })
  ])
  return ({ statusCode: 200, message: `all students`, data: students });
})
export const singleStudent = errorWrapper(async (req, res, next, session) => {
  const { studentId } = req.params
  const student = await studentModel.findById(studentId, "firstName lastName displayPicSrc tests workExperience researchPapers education activity.products skills communities")
  await communityModel.populate(student, { path: "communities", select: "participants university posts", })
  await productModel.populate(student, [
    { path: "activity.products", select: "university course intake status stage" },
  ])
  await courseModel.populate(student, [
    { path: "activity.products.course", select: "name discipline tuitionFee studyMode subDiscipline schoolName studyLevel duration currency university elite", },
  ])
  await universityModel.populate(student, [
    { path: "activity.products.course.university", select: "name logoSrc location type establishedYear" },
    { path: "communities.university", select: "name logoSrc location type establishedYear", }
  ])
  await userModel.populate(student, { path: "communities.participants", select: "firstName lastName displayPicSrc", },)
  return ({ statusCode: 200, message: `student details`, data: student });
})
export const deleteData = errorWrapper(async (req, res, next, session) => {
  await sendMail({
    to: req.user.email,
    subject: "Data Deletion",
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
                    <h2>Your data will be deleted permanently after 60 days</h2>
                    <p>After you delete your data, we retain your data for a period of 60 days. This period allows us to ensure that the deletion was intentional and provides time for account recovery if needed. It also allows us to complete any remaining transactions or address potential security, fraud, or regulatory issues. After 60 days, your data will be permanently deleted from our systems.</p>

                </div>
            </body>
        </html>
    `
  });
  await sendMail({
    to: "developer.campusroot@gmail.com",
    subject: "Delete Data",
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
                    <h3>studentId:  ${req.user._id}</h3>
                    <p>This student is requesting to delete data</p>
                </div>
            </body>
        </html>
    `
  });
  return { statusCode: 200, message: "data cleared successfully", data: null }
})
export const deleteAccount = errorWrapper(async (req, res, next, session) => {
  let user = await userModel.findById(req.user._id)
  await recycleBinModel.create({ data: user, dataModel: "userModel", collectionName: "user" })
  await chatModel.updateMany({ participants: { $in: [req.user._id] } }, { $pull: { participants: req.user._id, "unSeenMessages.$[].seen": req.user._id } }, { multi: true })
  await sendMail({
    to: req.user.email,
    subject: "Account Deletion",
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
                    <h2>Your account will be deleted permanently after 60 days</h2>
                    <p>After you delete your account, we retain your data for a period of 60 days. This period allows us to ensure that the deletion was intentional and provides time for account recovery if needed. It also allows us to complete any remaining transactions or address potential security, fraud, or regulatory issues. After 60 days, your data will be permanently deleted from our systems.</p>
                </div>
            </body>
        </html>
    `
  });
  await sendMail({
    to: "developer.campusroot@gmail.com",
    subject: "Delete Account",
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
                    <h3>studentId:  ${req.user._id}</h3>
                    <p>This student is requesting to delete account</p>
                </div>
            </body>
        </html>
    `
  });
  await userModel.deleteOne({ _id: req.user._id })
  return { statusCode: 200, message: "Requested to delete Account", data: null }
})
export const blockUser = errorWrapper(async (req, res, next, session) => {
  const { action, studentId } = req.params
  const currentUserId = req.user._id;
  if (!['block', 'unblock'].includes(action)) return { statusCode: 400, message: 'Invalid action. Use "block" or "unblock".', data: null };
  const currentUser = await studentModel.findById(currentUserId, "firstName lastName displayPicSrc email userType role");
  const user = await studentModel.findById(studentId, "firstName lastName displayPicSrc email userType role");
  if (!user) return { statusCode: 404, message: 'User not found', data: null };
  if (action === 'block') {
    await Promise.all([
      studentModel.findByIdAndUpdate(currentUserId, { $addToSet: { blockList: studentId } }),
      studentModel.findByIdAndUpdate(studentId, { $addToSet: { blockedBy: currentUserId } })
    ]);
  } else if (action === 'unblock') {
    await Promise.all([
      studentModel.findByIdAndUpdate(currentUserId, { $pull: { blockList: studentId } }),
      studentModel.findByIdAndUpdate(studentId, { $pull: { blockedBy: currentUserId } })
    ]);
  }
  return { statusCode: 200, message: `User ${action}ed successfully`, data: { user: currentUser, blocked: user } };
})