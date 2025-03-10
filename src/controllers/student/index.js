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
const ExchangeRatesId = process.env.EXCHANGERATES_MONGOID
export const generateRecommendations = errorWrapper(async (req, res, next, session) => {
  const GRE = req.user.tests.find(ele => ele.name == "Graduate Record Examination")
  if (GRE == undefined) return { statusCode: 400, data: null, message: "add GRE test details" }
  const totalScore = GRE.scores.find(ele => ele.description === "totalScore")
  const gre = totalScore ? totalScore.count : GRE.scores.reduce((acc, { description, count }) => (description === "Quantitative Reasoning" || description === "Verbal Reasoning") ? acc + count : acc, 0);
  const ug = req.user.education.underGraduation
  if (!ug || !ug.totalScore) return { statusCode: 400, data: null, message: "add ug gpa" }
  let ug_gpa = (req.user.education.underGraduation.gradingSystem != "gpa") ? gradeConversions(ug.gradingSystem, "gpa", ug.totalScore) : ug.totalScore
  if (!req.user.preference.courses) return { statusCode: 400, data: null, message: "add course preferences" }
  let criteria = {
    ug_gpa: ug_gpa,
    gre: gre,
    sub_discipline: req.user.preference.courses,
    // country: req.user.preference.country
  }

  // if (country) {
  //   query.filterData.push({
  //     type: "Country",
  //     data: [country]
  //   });
  // }

  // if (subcategory) {
  //   query.filterData.push({
  //     type: "SubCategory",
  //     data: [subcategory]
  //   });
  // }

  // // Add test scores to query if values are entered
  // if (greScore) query.testScores.push({ testType: "GRE", overallScore: parseInt(greScore) });
  // if (gmatScore) query.testScores.push({ testType: "GMAT", overallScore: parseInt(gmatScore) });
  // if (ieltsScore) query.testScores.push({ testType: "IELTS", overallScore: parseFloat(ieltsScore) });
  // if (toeflScore) query.testScores.push({ testType: "TOEFL", overallScore: parseFloat(toeflScore) });
  // if (gpaOverallScore && gpaOutOf) query.testScores.push({
  //   testType: "GPA",
  //   overallScore: parseFloat(gpaOverallScore),
  //   ugOutOf: parseFloat(gpaOutOf)
  // });
  // if (workExperience) query.testScores.push({ testType: "WorkExperience", overallScore: parseFloat(workExperience) });
  // if (publicationsLevel) query.testScores.push({ testType: "Publications", level: publicationsLevel });
  // if (backlogs) query.testScores.push({ testType: "Backlogs", overallScore: parseInt(backlogs) });



  let filterData = []
  req.user.preference.country || filterData.push({ type: "Country", data: req.user.preference.country })

  //   export const getRecommendations = async (req, res) => {
  //     try {
  //         const { mode: queryMode } = req.query;
  //         const allowedModes = ["Student", "Counsellor"];
  //         const mode = allowedModes.includes(queryMode) ? queryMode : "Student";
  //         const { filterData, testScores } = req.body;
  //         if (!testScores || !Array.isArray(testScores) || testScores.length === 0) return res.status(400).json({ error: "Please provide valid testScores as an array." });
  //         const { filter, projections } = constructFilters(filterData, testScores);
  //         const client = await MongoClient.connect(process.env.MONGO_URL);
  //         let db = client.db('CampusRoot');
  //         const collection = db.collection("courses");
  //         let pipeline = [{ $match: filter }, { $project: projections }]
  //         const programs = await collection.aggregate(pipeline).toArray();
  //         const { safe, moderate, ambitious } = categorizePrograms(testScores, programs, mode);
  //         const link = await fetchJSON2GridLink({ input: { filterData, testScores }, safe, moderate, ambitious })
  //         return res.status(200).json({ link: link, data: { input: { filterData, testScores }, safe, moderate, ambitious }, message: "recommendations" })
  //         // return res.status(200).json({ filter, projections})

  //     } catch (error) {
  //         console.error("Error fetching programs:", error);
  //         res.status(500).json({ error: "Internal server error." });
  //     }
  // }

  const response = await fetch("http://localhost:4321/predict/", {
    method: "POST",
    headers: { "Content-Type": "application/json", },
    body: JSON.stringify(criteria)
  });
  const result = await response.json();
  let recommendations = []
  for (const item of result) {
    recommendations.push({
      course: item.CID,
      possibilityOfAdmit: item.Category
    })
  }
  req.user.recommendations.criteria = {
    ug_gpa: JSON.stringify(ug),
    gre: JSON.stringify(GRE.scores),
    sub_discipline: JSON.stringify(req.user.preference.courses),
    country: JSON.stringify(req.user.preference.country)
  }
  req.user.recommendations.data = req.user.recommendations.data.filter(ele => ele.counsellorRecommended)
  req.user.recommendations.data = [...req.user.recommendations.data, ...recommendations]
  req.user.logs.push({
    action: `recommendations Generated`,
    details: `recommendations${req.user.recommendations.data.length}`
  })
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