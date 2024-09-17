import courseModel from "../../models/Course.js"
import destinationModel from "../../models/Destination.js"
import universityModel from "../../models/University.js"
import communityModel from "../../models/Community.js"
import { errorWrapper } from "../../middleware/errorWrapper.js";
import { packageModel } from "../../models/Package.js";
export const devDetails = async (req, res) => {
    try {
        return ({ statusCode: 200, message: `all Details of Developer`, data: req.user })
    } catch (error) {
        console.log(error)
        return res.status(500).json({ success: false, message: `${error.name} : ${error.message}`, data: null })
    }
}
export const allUniversities = async (req, res) => {
    try {
        const { page } = req.query
        const listOfUniversities = await universityModel.find({}).populate("courses")
        if (page) return ({ statusCode: 200, message: "list of all universities (paginated)", data: listOfUniversities.slice(10 * (page - 1), 10 * page) });
        return ({ statusCode: 200, message: `list of all universities`, data: listOfUniversities })
    } catch (error) {
        console.log(error)
        return res.status(500).json({ success: false, message: `${error.name} : ${error.message}`, data: null })
    }
}

export const addDestination = async (req, res) => {
    try {
        const { destinationName, flagSrc, capitalCity, climate, currency, about, popularPrograms } = req.body
        if (!destinationName) return res.status(400).json({ success: false, message: `destination not added`, data: null })
        if (await destinationModel.findOne({ destinationName: destinationName })) return res.status(400).json({ success: false, message: `destination already added`, data: null })
        const destination = await destinationModel.create({ destinationName, flagSrc, capitalCity, climate, currency, about, popularPrograms })
        return ({ statusCode: 200, message: `new destination added`, data: destination })
    } catch (error) {
        console.log(error)
        return res.status(500).json({ success: false, message: `${error.name} : ${error.message}`, data: null })
    }
}


export const addPackage = async (req, res) => {
    try {
        const packages = await packageModel.insertMany(req.body)
        return ({ statusCode: 200, message: `new packages added`, data: packages })
    } catch (error) {
        console.log(error)
        return res.status(500).json({ success: false, message: `${error.name} : ${error.message}`, data: null })
    }
}


export const allDestinations = async (req, res) => {
    try {
        const destinations = await destinationModel.find({})
        return ({ statusCode: 200, message: `all destinations`, data: destinations })
    } catch (error) {
        console.log(error)
        return res.status(500).json({ success: false, message: `${error.name}--${error.message}`, data: null })
    }
}
export const editDestination = async (req, res) => {
    try {
        const { id } = req.params
        const destination = await destinationModel.findById(id)
        if (!destination) return res.status(400).json({ success: false, message: `invalid destination ID`, data: null })
        const { callingCode, destinationPicSrc, topUniversities, flagSrc, capitalCity, climate, currency, about, popularPrograms, UniversitiesCount, InternationalStudentsCount } = req.body
        if (destinationPicSrc) destination.destinationPicSrc = destinationPicSrc
        if (flagSrc) destination.flagSrc = flagSrc
        if (capitalCity) destination.capitalCity = capitalCity
        if (climate) destination.climate = climate
        if (currency) destination.currency = currency
        if (about) destination.about = about
        if (popularPrograms) destination.popularPrograms = popularPrograms
        if (topUniversities) destination.topUniversities = topUniversities
        if (UniversitiesCount) destination.UniversitiesCount = UniversitiesCount
        if (InternationalStudentsCount) destination.InternationalStudentsCount = InternationalStudentsCount
        if (callingCode) destination.callingCode = callingCode
        await destination.save()
        return ({ statusCode: 200, message: `destination updated`, data: destination })
    } catch (error) {
        console.log(error)
        return res.status(500).json({ success: false, message: `${error.name} : ${error.message}`, data: null })
    }
}
export const editCourse = async (req, res) => {
    try {
        const { id } = req.params
        const course = await courseModel.findById(id)
        if (!course) return res.status(400).json({ success: false, message: `invalid course ID`, data: null })
        const { name, discipline, subDiscipline, studyLevel, programLink, curriculumLink, totalCredits, tuitionFee, startDate, schoolName, STEM, duration, pathway, courseType, studyMode, AdmissionsRequirements, applicationDetails, currency, initialDeposits, scholarship, contactInfo } = req.body
        if (name) course.name = name
        if (discipline) course.discipline = discipline
        if (subDiscipline) course.subDiscipline = subDiscipline
        if (studyLevel) course.studyLevel = studyLevel
        if (programLink) course.programLink = programLink
        if (curriculumLink) course.curriculumLink = curriculumLink
        if (totalCredits) course.totalCredits = totalCredits
        if (tuitionFee) course.tuitionFee = tuitionFee
        if (startDate) course.startDate = startDate
        if (schoolName) course.schoolName = schoolName
        if (STEM) course.STEM = STEM
        if (duration) course.duration = duration
        if (pathway) course.pathway = pathway
        if (courseType) course.courseType = courseType
        if (studyMode) course.studyMode = studyMode
        if (AdmissionsRequirements) course.AdmissionsRequirements = AdmissionsRequirements
        if (applicationDetails) course.applicationDetails = applicationDetails
        if (currency) course.currency = currency
        if (initialDeposits) course.initialDeposits = initialDeposits
        if (scholarship) course.scholarship = scholarship
        if (contactInfo) course.contactInfo = contactInfo
        await course.save()
        return ({ statusCode: 200, message: `course updated`, data: course })
    } catch (error) {
        console.log(error)
        return res.status(500).json({ success: false, message: `${error.name} : ${error.message}`, data: null })
    }
}
export const deleteDestination = async (req, res) => {
    try {
        const { id } = req.params
        if (!id) return res.status(400).json({ success: false, message: `invalid destination ID`, data: null })
        await destinationModel.findByIdAndDelete(id)
        return ({ statusCode: 200, message: `destination deleted`, data: null })
    } catch (error) {
        console.log(error)
        return res.status(500).json({ success: false, message: `${error.name}--${error.message}`, data: null })
    }
}

export const uniDescriptionCreate = async (req, res) => {
    try {
        // console.log(req.body);
        const { code } = req.body
        const alreadyExists = await universityModel.findOne({ code: code })
        if (alreadyExists) return res.status(400).json({ success: false, message: `university with same code already exists`, data: alreadyExists })
        const university = await new universityModel(req.body)
        await university.save()
        return ({ statusCode: 200, message: `university details saved in the DB`, data: university })
    } catch (error) {
        console.log(error)
        return res.status(500).json({ success: false, message: `${error.name} : ${error.message}`, data: null })
    }
}


export const uniDescriptionUpdate = async (req, res) => {
    try {
        const university = await universityModel.findById(req.params.id)
        if (!university) return res.status(400).json({ success: false, message: `invalid course ID`, data: null })
        const { ranking, name, location, universityLink, generalRequirementLink, completeProgramLink, decisionTAT, currency, logoSrc, pictureSrc, type, establishedYear, about, campusrootReview, graduationRate, acceptanceRate, cost, scholarship, loanDetails, contact } = req.body
        if (ranking) university.ranking = ranking
        if (name) university.name = name
        if (location) university.location = location
        if (universityLink) university.universityLink = universityLink
        if (generalRequirementLink) university.generalRequirementLink = generalRequirementLink
        if (completeProgramLink) university.completeProgramLink = completeProgramLink
        if (decisionTAT) university.decisionTAT = decisionTAT
        if (currency) university.currency = currency
        if (logoSrc) university.logoSrc = logoSrc
        if (pictureSrc) university.pictureSrc = pictureSrc
        if (type) university.type = type
        if (establishedYear) university.establishedYear = establishedYear
        if (about) university.about = about
        if (campusrootReview) university.campusrootReview = campusrootReview
        if (graduationRate) university.graduationRate = graduationRate
        if (acceptanceRate) university.acceptanceRate = acceptanceRate
        if (cost) university.cost = cost
        if (scholarship) university.scholarship = scholarship
        if (loanDetails) university.loanDetails = loanDetails
        if (contact) university.contact = contact
        await university.save()
        return ({ statusCode: 200, message: `university details updated in the DB`, data: null })

    } catch (error) {
        console.log(error)
        return res.status(500).json({ success: false, message: `${error.name} : ${error.message}`, data: null })
    }
}

/*
req.params.id=""
req.body =
{
  "name": "Computer Science",
  "degree": "masters",
  "applicationDeadline": "2023-12-31",
  "duration": "24 Months",
  "cost": [
    {
      "name": "Tuition Fee",
      "lowerLimit": 20000,
      "upperLimit": 35000
    }
  ],
  "preRequisites": {}
}
 */

export const courseDescriptionCreation = async (req, res) => {
    try {
        const Course = await new courseModel({ ...req.body })
        Course.university = req.params.id
        await Course.save()
        const university = await universityModel.findById(req.params.id)
        university.courses.push(Course._id)
        await university.save()
        return ({ statusCode: 200, message: `course added to the database`, data: Course })

    } catch (error) {
        console.log(error)
        return res.status(500).json({ success: false, message: `${error.name} : ${error.message}`, data: null })
    }
}



export const uniDeletion = async (req, res) => {
    try {
        await universityModel.findByIdAndDelete(req.params.id);
        return ({ statusCode: 200, message: `university deleted successfully`, data: null })
    } catch (error) {
        console.log(error)
        return res.status(500).json({ success: false, message: `${error.name} : ${error.message}`, data: null })
    }
}

// export const uniDescriptionCreation = async (req, res) => {
//     try {

//     } catch (error) {
//         console.log(error)
//         return res.status(500).json({ success: false, message: `${error.name} : ${error.message}`, data: null })
//     }
// }

export const injectionCourse = async (req, res) => {
    try {
        const { data } = req.body
        data.forEach(async (obj, key) => {
            try {
                const uni = await universityModel.findById(obj.university)
                const course = await new courseModel({
                    name: obj.name,
                    university: obj.university,
                    about: obj.about,
                    discipline: obj.discipline,
                    subDiscipline: obj.subDiscipline,
                    studyLevel: obj.studyLevel,
                    totalCredits: obj.totalCredits,
                    schoolName: obj.schoolName,
                    duration: obj.duration,
                    studyMode: obj.studyMode,
                })
                if (obj.country) course.location.country = obj.country
                if (obj.state) course.location.state = obj.state
                if (obj.city) course.location.city = obj.city
                if (obj.tuitionFeeType) course.tuitionFee.tuitionFeeType = obj.tuitionFeeType
                if (obj.tuitionFee) course.tuitionFee.tuitionFee = obj.tuitionFee
                if (obj.StartDate1) course.startDate.push({ courseStarting: obj.StartDate1, Deadline: obj.Deadline1_1 || obj.Deadline1_2 || obj.Deadline1_3 })
                if (obj.StartDate2) course.startDate.push({ courseStarting: obj.StartDate2, Deadline: obj.Deadline2_1 || obj.Deadline2_2 || obj.Deadline2_3 })
                if (obj.StartDate3) course.startDate.push({ courseStarting: obj.StartDate3, Deadline: obj.Deadline3_1 || obj.Deadline3_2 || obj.Deadline3_3 })
                if (obj.StartDate4) course.startDate.push({ courseStarting: obj.StartDate4, Deadline: obj.Deadline4_1 || obj.Deadline4_2 || obj.Deadline4_3 })
                if (obj.StartDate5) course.startDate.push({ courseStarting: obj.StartDate5, Deadline: obj.Deadline5_1 || obj.Deadline5_2 || obj.Deadline5_3 })
                if (obj.StartDate6) course.startDate.push({ courseStarting: obj.StartDate6, Deadline: obj.Deadline6_1 || obj.Deadline6_2 || obj.Deadline6_3 })
                if (obj.IELTS) course.AdmissionsRequirements.LanguageRequirements.push({ testName: "IELTS", Accepted: true, minScore: obj.IELTS, })
                if (obj.TOEFL) course.AdmissionsRequirements.LanguageRequirements.push({ testName: "TOEFL", Accepted: true, minScore: obj.TOEFL, })
                if (obj.PTE) course.AdmissionsRequirements.LanguageRequirements.push({ testName: "PTE", Accepted: true, minScore: obj.PTE, })
                if (obj.GPA) course.AdmissionsRequirements.AcademicRequirements.push({ testName: "GPA", required: "required", minScore: obj.GPA, })
                if (obj.GRE) course.AdmissionsRequirements.AcademicRequirements.push({ testName: "GRE", required: "required", })
                if (obj.GMAT) course.AdmissionsRequirements.AcademicRequirements.push({ testName: "GMAT", required: "required", })
                if (obj.GeneralReq1) course.AdmissionsRequirements.generalRequirements.push(obj.GeneralReq1)
                if (obj.GeneralReq2) course.AdmissionsRequirements.generalRequirements.push(obj.GeneralReq2)
                if (obj.GeneralReq3) course.AdmissionsRequirements.generalRequirements.push(obj.GeneralReq3)
                if (obj.GeneralReq4) course.AdmissionsRequirements.generalRequirements.push(obj.GeneralReq4)
                if (obj.GeneralReq5) course.AdmissionsRequirements.generalRequirements.push(obj.GeneralReq5)
                if (obj.GeneralReq6) course.AdmissionsRequirements.generalRequirements.push(obj.GeneralReq6)
                if (obj.GeneralReq7) course.AdmissionsRequirements.generalRequirements.push(obj.GeneralReq7)
                if (obj.GeneralReq8) course.AdmissionsRequirements.generalRequirements.push(obj.GeneralReq8)
                if (obj.GeneralReq9) course.AdmissionsRequirements.generalRequirements.push(obj.GeneralReq9)
                if (obj.GeneralReq10) course.AdmissionsRequirements.generalRequirements.push(obj.GeneralReq10)
                if (obj.gr2) course.AdmissionsRequirements.generalRequirements.push(obj.gr2)
                if (obj.gr3) course.AdmissionsRequirements.generalRequirements.push(obj.gr3)
                if (obj.gr4) course.AdmissionsRequirements.generalRequirements.push(obj.gr4)
                if (obj.gr5) course.AdmissionsRequirements.generalRequirements.push(obj.gr5)
                if (obj.gr6) course.AdmissionsRequirements.generalRequirements.push(obj.gr6)
                if (obj.gr7) course.AdmissionsRequirements.generalRequirements.push(obj.gr7)
                if (obj.gr8) course.AdmissionsRequirements.generalRequirements.push(obj.gr8)
                if (obj.gr9) course.AdmissionsRequirements.generalRequirements.push(obj.gr9)
                if (obj.gr10) course.AdmissionsRequirements.generalRequirements.push(obj.gr10)
                course.currency.symbol = "$"
                course.currency.code = "USD"
                await course.save()
                uni.courses.push(course._id)
                await uni.save()
            } catch (error) {
                console.log(error);
                return res.status(500).json({ success: false, message: `${error.name} : ${error.message}`, data: { key: key, obj } })
            }
        });
        return ({ statusCode: 200, message: `courses added successfully`, data: null })

    } catch (error) {
        console.log(error);
        return res.status(500).json({ success: false, message: `${error.name} : ${error.message}`, data: null })
    }
}
export const test = async (req, res) => {
    try {
        const { data } = req.body
        const startDate = new Date(data.StartDate1).toLocaleString(undefined, { timeZone: 'Asia/Kolkata' })
        const Deadline = (data.Deadline1_1 || data.Deadline1_2 || data.Deadline1_3)
        const newDeadline = new Date(Deadline).toLocaleString(undefined, { timeZone: 'Asia/Kolkata' })
        return ({ statusCode: 200, message: ` successfully`, data: [data.StartDate1, startDate, new Date(startDate), Deadline, newDeadline, new Date(newDeadline)] })
        // [
        //     "September 2024",
        //     "9/1/2024, 5:30:00 AM",
        //     "2024-09-01T00:00:00.000Z",
        //     "Jan 2024",
        //     "2024-01-01T00:00:00.000Z"
        // ]    
    } catch (error) {
        console.log(error);
        return res.status(500).json({ success: false, message: `${error.name} : ${error.message}`, data: null })
    }
}
export const retrive = async (req, res) => {
    try {
        const result = await universityModel.find({}, "_id name")
        return ({ statusCode: 200, message: `university ids`, data: result })

    } catch (error) {
        console.log(error);
        return res.status(500).json({ success: false, message: `${error.name} : ${error.message}`, data: null })
    }
}


export const createCommunity = errorWrapper(async (req, res, next, session) => {
    const { universityId } = req.body
    const university = await universityModel.findById(universityId)
    if (!university) return { statusCode: 400, data: null, message: `Invalid University Id` };
    if (university.community) return {
        statusCode: 400, data: null, message: `Community already exists for this university`
    };
    if (await communityModel.findOne({ university: universityId })) return {
        statusCode: 400, data: null, message: `This university already has a community listed, check community cluster`
    };
    const community = await communityModel.create({ participants: [req.user._id], university: universityId, })
    university.community = community._id
    req.user.communities.push(community._id)
    await Promise.all([req.user.save(), university.save()]);
    return ({ statusCode: 200, message: `Community created`, data: community })
})
export const deleteCommunity = errorWrapper(async (req, res, next, session) => {
    const { communityId } = req.params
    const community = await communityModel.findById(communityId)
    if (!community) return { statusCode: 400, data: null, message: `Community Doesn't Exist` };
    if (!community.participants.includes(req.user._id)) return {
        statusCode: 400, data: null, message: `you don't belong to this community`
    };
    await universityModel.findOneAndUpdate({ _id: community.university }, { $pull: { community: communityId } },)
    await communityModel.findByIdAndDelete(communityId)
    return ({ statusCode: 200, message: `community deleted`, data: null })
})
export const getallunis = errorWrapper(async (req, res, next, session) => {
    const universites = await universityModel.find({})
    return ({ statusCode: 200, message: `all unis`, data: universites })

})
export const pushunis = errorWrapper(async (req, res, next, session) => {
    const { data } = req.body, ret = []

    for (let ele of data) {
        try {
            let object = {
                ranking: [{ rank: ele["crank"], source: ele["csource"], }, { rank: ele["wrank"], source: ele["wsource"], }],
                name: ele["Name"],
                location: {
                    country: ele["country"],
                    state: ele["state"],
                    city: ele["city"],
                },
                currency: {
                    symbol: ele["symbol"],
                    code: ele["code"],
                },
                logoSrc: ele["logoSrc"],
                type: ele["type"],
                establishedYear: ele["establishedYear"],
                about: ele["about"],
                campusrootReview: 0,
                graduationRate: 0,
                acceptanceRate: 0,
                contact: {
                    instagram: ele["instagram"],
                    linkedIn: ele["linkedin"],
                    officialWebsite: ele["officialWebsite"]
                }
            }
            const unis = await new universityModel(object)
            await unis.save()
            ret.push(unis)
        } catch (error) {
            console.error(error);
        }

    }
    return ({ statusCode: 200, message: `unis data saved in db`, data: ret })
})