import { errorWrapper } from "../../middleware/errorWrapper.js";
export const profile = errorWrapper(async (req, res, next) => {
    const profile = {
        _id: req.user._id,
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        displayPicSrc: req.user.displayPicSrc,
        email: req.user.email,
        linkedIn: req.user.linkedIn,
    }
    return res.status(200).json({ success: true, message: `all Details of Counsellor`, data: profile, AccessToken: req.AccessToken ? req.AccessToken : null })
})
export const profileEdit = errorWrapper(async (req, res, next) => {
    const { linkedIn } = req.body
    if (linkedIn) {
        req.user.linkedIn = linkedIn
        req.user.logs.push({
            action: "profile edited",
            details: `linkedIn:${linkedIn}`
        })
    }
    await req.user.save()
    return res.status(200).json({
        success: true, message: `updated Details of Counsellor`, data: {
            _id: req.user._id,
            firstName: req.user.firstName,
            lastName: req.user.lastName,
            displayPicSrc: req.user.displayPicSrc,
            email: req.user.email,
            linkedIn: req.user.linkedIn,
        }, AccessToken: req.AccessToken ? req.AccessToken : null
    })
})

