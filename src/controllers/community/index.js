import { errorWrapper } from "../../middleware/errorWrapper.js"
import { generateAPIError } from "../../errors/apiError.js";
import communityModel from "../../models/Community.js";
import userModel from "../../models/User.js";
import universityModel from "../../models/University.js"
import postModel from "../../models/Post.js";
import contextModel from "../../models/Context.js"
import fs from "fs"
import Document from "../../models/Uploads.js";

export const joinInCommunity = errorWrapper(async (req, res, next) => {
    const { communityId } = req.body
    const existingCommunity = await communityModel.findById(communityId)
    if (!existingCommunity) return next(generateAPIError("invalid Community", 400))
    if (existingCommunity.participants.includes(req.decoded.id)) return next(generateAPIError("you're already a participant", 400))
    const community = await communityModel.findOneAndUpdate({ _id: communityId }, { $push: { participants: req.decoded.id } }, { new: true })
    const user = await userModel.findById(req.decoded.id)
    user.logs.push({
        action: "joined in a community",
        details: `communityId:${communityId}`
    })
    await user.save()
    await userModel.findOneAndUpdate({ _id: req.decoded.id }, { $push: { communities: communityId } })
    await userModel.populate(community, { path: "participants", select: "firstName lastName displayPicSrc" })
    await universityModel.populate(community, { path: "university", select: "name logoSrc location type establishedYear" })
    return res.status(200).json({ success: true, message: `join success`, data: community, AccessToken: req.AccessToken ? req.AccessToken : null })
})
export const fetchJoinedCommunities = errorWrapper(async (req, res, next) => {
    const user = await userModel.findById(req.decoded.id)
    await communityModel.populate(user, { path: "communities", select: "participants university posts", },)
    await userModel.populate(user, { path: "communities.participants", select: "firstName lastName displayPicSrc", },)
    await universityModel.populate(user, { path: "communities.university", select: "name logoSrc location type establishedYear", },)
    return res.status(200).json({ success: true, message: `joined communities`, data: user.communities, AccessToken: req.AccessToken ? req.AccessToken : null })
})
export const vacateCommunity = errorWrapper(async (req, res, next) => {
    const { communityId } = req.body
    const existingCommunity = await communityModel.findById(communityId)
    if (!existingCommunity) return next(generateAPIError("invalid CommunityId", 400))
    if (!existingCommunity.participants.includes(req.decoded.id)) return next(generateAPIError("you're not a participant", 400))
    const user = await userModel.findById(req.decoded.id)
    user.logs.push({
        action: "left a community",
        details: `communityId:${communityId}`
    })
    await user.save()
    await Promise.all([communityModel.findOneAndUpdate({ _id: communityId }, { $pull: { participants: req.decoded.id } }), userModel.findOneAndUpdate({ _id: req.decoded.id }, { $pull: { communities: communityId } })])
    return res.status(200).json({ success: true, message: `left the community`, data: null, AccessToken: req.AccessToken ? req.AccessToken : null })
})
export const fetchPosts = errorWrapper(async (req, res, next) => {
    const { page = 1, pageSize = 10 } = req.query;
    const totalPostsCount = await contextModel.countDocuments({ creator: req.decoded.id });
    const totalPages = Math.ceil(totalPostsCount / pageSize);
    const contexts = await contextModel.find({ creator: req.decoded.id }).populate({
        path: "post",
        populate: [
            {
                path: "community",
                select: "university",
                populate: { path: "university", select: "name logoSrc location type establishedYear" }
            },
            {
                path: "query",
                select: "contextType content vote comments creator attachment",
                populate: {
                    path: "attachment",
                    select: "name contentType createdAt"
                },
                populate: {
                    path: "comments.user",
                    select: "firstName lastName displayPicSrc"
                },
                populate: {
                    path: "creator",
                    select: "firstName lastName displayPicSrc"
                }
            },
            {
                path: "responses",
                select: "contextType content vote comments creator attachment",
                populate: [
                    {
                        path: "comments.user",
                        select: "firstName lastName displayPicSrc"
                    },
                    {
                        path: "creator",
                        select: "firstName lastName displayPicSrc"
                    }
                ]
            }
        ]
    })
        .skip((page - 1) * pageSize)
        .limit(+pageSize);
    const posts = contexts.map(ele => ele.post);
    return res.status(200).json({ success: true, message: `all your posts`, data: posts, additionalData: { totalPages, currentPage: +page, pageSize: +pageSize }, AccessToken: req.AccessToken ? req.AccessToken : null })
});
export const myActivity = errorWrapper(async (req, res, next) => {
    const { page = 1, pageSize = 10 } = req.query;
    const contexts = await contextModel.find({ $or: [{ creator: req.decoded.id }, { "comments.user": req.decoded.id }, { "vote.user": req.decoded.id }] }, "post")
    const postIds = [...new Set(contexts.flatMap(ele => ele.post.toString()))];
    const totalPostsCount = postIds.length;
    const totalPages = Math.ceil(totalPostsCount / pageSize);
    const paginatedPostIds = postIds.slice((page - 1) * pageSize, page * pageSize);
    const posts = await postModel
        .find({ _id: { $in: paginatedPostIds } })
        .populate({
            path: "community",
            select: "university",
            populate: {
                path: "university",
                select: "name logoSrc location type establishedYear"
            }
        }).populate([
            {
                path: "query",
                select: "contextType content vote comments creator attachment createdAt",
                populate: [
                    { path: "attachment", select: "name contentType createdAt" },
                    { path: "comments.user", select: "firstName lastName displayPicSrc" },
                    { path: "creator", select: "firstName lastName displayPicSrc" }
                ]
            },
            {
                path: "responses",
                select: "contextType content vote comments creator attachment createdAt",
                populate: [
                    { path: "comments.user", select: "firstName lastName displayPicSrc" },
                    { path: "creator", select: "firstName lastName displayPicSrc" }
                ]
            }
        ]);
    const Posts = []
    for (const ele of posts) {
        let activity = []
        if (ele.query.creator._id == req.decoded.id) activity.push({ content: "You have raised a question", time: ele.query.createdAt })
        let comment = ele.query.comments.find(element => element.user._id == req.decoded.id)
        if (comment) activity.push({ content: "You commented on this question", time: comment.createdAt })
        let vote = ele.query.vote.find(element => element.user._id == req.decoded.id)
        if (vote) activity.push({ content: "You voted on this question", time: vote.createdAt })
        ele.responses.forEach(item => {
            if (item.creator._id == req.decoded.id) activity.push({ content: "You have posted an answer", time: item.createdAt })
            let comment = item.comments.find(element => element.user._id == req.decoded.id)
            if (comment) activity.push({ content: "You commented on an answer", time: comment.createdAt })
            let vote = item.vote.find(element => element.user._id == req.decoded.id)
            if (vote) activity.push({ content: "You voted on this question", time: vote.createdAt })
        })
        Posts.push({ ...ele._doc, activity })
    }
    return res.status(200).json({ success: true, message: `all your posts`, data: Posts, additionalData: { totalPages: totalPages, currentPage: +page, pageSize: +pageSize }, AccessToken: req.AccessToken ? req.AccessToken : null })
})
export const postsInCommunity = errorWrapper(async (req, res, next) => {
    const { communityId } = req.params;
    const { page = 1, pageSize = 10 } = req.query;
    const community = await communityModel.findById(communityId).populate([{
        path: "posts",
        options: {
            limit: +pageSize,
            skip: (+page - 1) * pageSize
        },
        populate: [
            {
                path: "query",
                select: "contextType content vote comments creator attachment",
                populate: [
                    { path: "attachment", select: "name contentType createdAt" },
                    { path: "comments.user", select: "firstName lastName displayPicSrc" },
                    { path: "creator", select: "firstName lastName displayPicSrc" }
                ]
            },
            {
                path: "responses",
                select: "contextType content vote comments creator attachment",
                populate: [
                    { path: "attachment", select: "name contentType createdAt" },
                    { path: "comments.user", select: "firstName lastName displayPicSrc" },
                    { path: "creator", select: "firstName lastName displayPicSrc" }
                ]
            }
        ],
    },
    {
        path: "university",
        select: "name logoSrc location type establishedYear"
    },
    {
        path: "participants",
        select: "firstName lastName displayPicSrc "
    }]
    );
    if (!community) return next(generateAPIError("Invalid CommunityId", 400));
    const totalPostsCount = await communityModel.countDocuments({ _id: communityId });
    const totalPages = Math.ceil(totalPostsCount / pageSize);
    return res.status(200).json({ success: true, message: `all your posts`, data: community, additionalData: { totalPages, currentPage: +page, pageSize: +pageSize }, AccessToken: req.AccessToken ? req.AccessToken : null })
})
export const singlePost = errorWrapper(async (req, res, next) => {
    const { postId } = req.params
    const post = await postModel
        .findById(postId)
        .populate({
            path: "query",
            select: "contextType content vote comments creator attachment",
            populate: [
                { path: "attachment", select: "name contentType createdAt" },
                { path: "comments.user", select: "firstName lastName displayPicSrc" },
                { path: "creator", select: "firstName lastName displayPicSrc" }
            ]
        })
        .populate({
            path: "community",
            select: "university",
            populate: {
                path: "university",
                select: "name logoSrc location type establishedYear"
            }
        })
        .populate({
            path: "responses",
            select: "contextType content vote comments creator attachment",
            populate: [
                { path: "attachment", select: "name contentType createdAt" },
                { path: "comments.user", select: "firstName lastName displayPicSrc" },
                { path: "creator", select: "firstName lastName displayPicSrc" }
            ]
        })
    return res.status(200).json({ success: true, message: `single post`, data: post, AccessToken: req.AccessToken ? req.AccessToken : null })
})
export const feed = errorWrapper(async (req, res, next) => {
    const { page = 1, pageSize = 20 } = req.query;
    const user = await userModel.findById(req.decoded.id);
    const posts = await postModel.find({ community: { $in: user.communities } })
        .populate({
            path: "community",
            select: "-posts -participants",
            populate: {
                path: "university",
                select: "name logoSrc location type establishedYear"
            }
        })
        .populate({
            path: "query",
            select: "contextType content vote comments creator attachment",
            populate: [
                { path: "attachment", select: "name contentType createdAt" },
                { path: "comments.user", select: "firstName lastName displayPicSrc" },
                { path: "creator", select: "firstName lastName displayPicSrc" }
            ]
        })
        .populate({
            path: "responses",
            select: "contextType content vote comments creator attachment",
            populate: [
                { path: "attachment", select: "name contentType createdAt" },
                { path: "comments.user", select: "firstName lastName displayPicSrc" },
                { path: "creator", select: "firstName lastName displayPicSrc" }
            ]
        })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .sort({ updatedAt: -1 });
    const totalPostsCount = await postModel.countDocuments({ community: { $in: user.communities } })
    const totalPages = Math.ceil(totalPostsCount / pageSize);
    return res.status(200).json({ success: true, message: `all your feed`, data: posts, additionalData: { totalPages, currentPage: +page, pageSize: +pageSize }, AccessToken: req.AccessToken ? req.AccessToken : null })
})
export const query = errorWrapper(async (req, res, next) => {
    const { action, body, header } = req.body
    const user = await userModel.findById(req.decoded.id)
    switch (action) {
        case "create":
            const { communityId } = req.body
            const community = await communityModel.findById(communityId)
            if ((body === undefined && header === undefined) || !community || !community.participants.includes(req.decoded.id)) return next(generateAPIError(`Invalid input for ${action} action`, 400))
            const newPost = await postModel.create({ community: communityId })
            const newContext = await contextModel.create({
                post: newPost._id,
                contextType: "query",
                creator: req.decoded.id,
                content: {
                    header: header,
                    body: body,
                },
            })
            newPost.query = newContext._id
            if (req.file) {
                const { originalname, path, mimetype } = req.file;
                const data = fs.readFileSync(path);
                const newDoc = await Document.create({ name: originalname, data: data, contentType: mimetype, user: req.decoded.id });
                newContext.attachment = newDoc._id
                fs.unlink(path, (err) => { err ? console.error("Error deleting file:", err) : console.log("File deleted successfully") });
            }
            community.posts.push(newPost._id)
            await Promise.all([community.save(), newPost.save(), newContext.save()])
            user.logs.push({
                action: "created a query",
                details: `contextId:${newContext._id}`
            })
            await user.save()
            await communityModel.populate(newPost, { path: "community", select: "university" })
            await universityModel.populate(newPost, { path: "community.university", select: "name logoSrc location type establishedYear" })
            await contextModel.populate(newPost, [
                { path: "query", select: "contextType content vote comments creator attachment" },
                { path: "responses", select: "contextType content vote comments creator attachment" }
            ])
            await Document.populate(newPost, [
                { path: "query.attachment", select: "name contentType createdAt", },
                { path: "responses.attachment", select: "name contentType createdAt", },
            ])
            await userModel.populate(newPost, [
                { path: "query.comments.user", select: "firstName lastName displayPicSrc" },
                { path: "responses.comments.user", select: "firstName lastName displayPicSrc" },
                { path: "query.creator", select: "firstName lastName displayPicSrc" },
                { path: "responses.creator", select: "firstName lastName displayPicSrc" },
            ])
            return res.status(200).json({ success: true, message: `${action} successful`, data: newPost, AccessToken: req.AccessToken ? req.AccessToken : null })
        case "update":
            const { contextId, deleteAttachment } = req.body
            const context = await contextModel.findById(contextId)
            if (!context || context.creator.toString() != req.decoded.id) return next(generateAPIError(`Invalid input for ${action} action`, 400))
            if (body !== undefined) context.content.body = body
            if (header !== undefined) context.content.header = header
            if (deleteAttachment && context.attachment) {
                await Document.findByIdAndDelete(context.attachment)
                context.attachment = null
            }
            if (req.file) {
                const { originalname, path, mimetype } = req.file;
                const data = fs.readFileSync(path);
                const newDoc = await Document.create({ name: originalname, data: data, contentType: mimetype, user: req.decoded.id });
                context.attachment = newDoc._id
                fs.unlink(path, (err) => { err ? console.error("Error deleting file:", err) : console.log("File deleted successfully") });
            }
            await context.save()
            user.logs.push({
                action: "updated a query",
                details: `contextId:${contextId}`
            })
            await user.save()
            const post = await postModel.findById(context.post)
            await communityModel.populate(post, { path: "community", select: "university" })
            await universityModel.populate(post, { path: "community.university", select: "name logoSrc location type establishedYear" })
            await contextModel.populate(post, [
                { path: "query", select: "contextType content vote comments creator attachment" },
                { path: "responses", select: "contextType content vote comments creator attachment" }
            ])
            await Document.populate(post, [
                { path: "query.attachment", select: "name contentType createdAt", },
                { path: "responses.attachment", select: "name contentType createdAt", },
            ])
            await userModel.populate(post, [
                { path: "query.comments.user", select: "firstName lastName displayPicSrc" },
                { path: "responses.comments.user", select: "firstName lastName displayPicSrc" },
                { path: "query.creator", select: "firstName lastName displayPicSrc" },
                { path: "responses.creator", select: "firstName lastName displayPicSrc" },
            ])
            return res.status(200).json({ success: true, message: `${action} successful`, data: post, AccessToken: req.AccessToken ? req.AccessToken : null })
        case "delete":
            const { postId } = req.body
            const postToBeDeleted = await postModel.findById(postId).populate("query", "creator")
            if (!postToBeDeleted) return next(generateAPIError("Invalid input for delete action", 400))
            if (postToBeDeleted.query.creator.toString() != req.decoded.id) return next(generateAPIError("Invalid access for delete action", 400))
            if (postToBeDeleted.query) {
                const query = await contextModel.findById(postToBeDeleted.query)
                if (query.attachment) await Document.findByIdAndDelete(query.attachment)
                await contextModel.findByIdAndDelete(postToBeDeleted.query)
            }
            for (const ele of postToBeDeleted.responses) {
                const response = await contextModel.findById(ele)
                if (response.attachment) await Document.findByIdAndDelete(response.attachment)
                await contextModel.findByIdAndDelete(ele)
            }
            user.logs.push({
                action: "query deleted",
                details: `postId:${postId}`
            })
            await user.save()
            await communityModel.findOneAndUpdate({ _id: postToBeDeleted.community }, { $pull: { posts: postId } });
            await postModel.findOneAndDelete({ _id: postId });
            return res.status(200).json({ success: true, message: `${action} successful`, data: null, AccessToken: req.AccessToken ? req.AccessToken : null })
        default: return next(generateAPIError(`invalid action:${action}`, 400))
    }
})
export const response = errorWrapper(async (req, res, next) => {
    const { action, body, header, contextId } = req.body
    const user = await userModel.findById(req.decoded.id)
    switch (action) {
        case "create":
            const { postId } = req.body
            const post = await postModel.findById(postId)
            if ((body === undefined && header === undefined) || !post) return next(generateAPIError(`Invalid input for ${action} action`, 400))
            const newContext = await contextModel.create({
                post: post._id,
                contextType: "response",
                creator: req.decoded.id,
                content: {
                    header: header,
                    body: body,
                }
            })
            post.responses.push(newContext._id)
            if (req.file) {
                const { originalname, path, mimetype } = req.file;
                const data = fs.readFileSync(path);
                const newDoc = await Document.create({ name: originalname, data: data, contentType: mimetype, user: req.decoded.id });
                newContext.attachment = newDoc._id
                fs.unlink(path, (err) => { err ? console.error("Error deleting file:", err) : console.log("File deleted successfully") });
            }
            await Promise.all([post.save(), newContext.save()])
            user.logs.push({
                action: "created a response",
                details: `contextId:${newContext._id}`
            })
            await user.save()
            await communityModel.populate(post, { path: "community", select: "university" })
            await universityModel.populate(post, { path: "community.university", select: "name logoSrc location type establishedYear" })
            await contextModel.populate(post, [
                { path: "query", select: "contextType content vote comments creator attachment" },
                { path: "responses", select: "contextType content vote comments creator attachment" }
            ])
            await Document.populate(post, [
                { path: "query.attachment", select: "name contentType createdAt", },
                { path: "responses.attachment", select: "name contentType createdAt", },
            ])
            await userModel.populate(post, [
                { path: "query.comments.user", select: "firstName lastName displayPicSrc" },
                { path: "responses.comments.user", select: "firstName lastName displayPicSrc" },
                { path: "query.creator", select: "firstName lastName displayPicSrc" },
                { path: "responses.creator", select: "firstName lastName displayPicSrc" },
            ])
            return res.status(200).json({ success: true, message: `${action} successful`, data: post, AccessToken: req.AccessToken ? req.AccessToken : null })
        case "update":
            const { deleteAttachment } = req.body
            const context = await contextModel.findById(contextId)
            if (!context || context.creator.toString() != req.decoded.id) return next(generateAPIError(`Invalid input for ${action} action`, 400))
            if (body !== undefined) context.content.body = body
            if (header !== undefined) context.content.header = header
            if (deleteAttachment && context.attachment) {
                await Document.findByIdAndDelete(context.attachment)
                context.attachment = null
            }
            if (req.file) {
                const { originalname, path, mimetype } = req.file;
                const data = fs.readFileSync(path);
                const newDoc = await Document.create({ name: originalname, data: data, contentType: mimetype, user: req.decoded.id });
                context.attachment = newDoc._id
                fs.unlink(path, (err) => { err ? console.error("Error deleting file:", err) : console.log("File deleted successfully") });
            }
            await context.save()
            user.logs.push({
                action: "response updated",
                details: `contextId:${contextId}`
            })
            await user.save()
            const Post = await postModel.findById(context.post)
            await communityModel.populate(Post, { path: "community", select: "university" })
            await universityModel.populate(Post, { path: "community.university", select: "name logoSrc location type establishedYear" })
            await contextModel.populate(Post, [
                { path: "query", select: "contextType content vote comments creator attachment" },
                { path: "responses", select: "contextType content vote comments creator attachment" }
            ])
            await Document.populate(Post, [
                { path: "query.attachment", select: "name contentType createdAt", },
                { path: "responses.attachment", select: "name contentType createdAt", },
            ])
            await userModel.populate(Post, [
                { path: "query.comments.user", select: "firstName lastName displayPicSrc" },
                { path: "responses.comments.user", select: "firstName lastName displayPicSrc" },
                { path: "query.creator", select: "firstName lastName displayPicSrc" },
                { path: "responses.creator", select: "firstName lastName displayPicSrc" },
            ])
            return res.status(200).json({ success: true, message: `${action} successful`, data: Post, AccessToken: req.AccessToken ? req.AccessToken : null })
        case "delete":
            const contextToBeDeleted = await contextModel.findById(contextId)
            if (!contextToBeDeleted) return next(generateAPIError(`Invalid contextId`, 400))
            await Document.findByIdAndDelete(contextToBeDeleted.attachment)
            const postIs = await postModel.findOneAndUpdate({ _id: contextToBeDeleted.post }, { $pull: { responses: contextId } }, { new: true })
            await communityModel.populate(postIs, { path: "community", select: "university" })
            await universityModel.populate(postIs, { path: "community.university", select: "name logoSrc location type establishedYear" })
            await contextModel.populate(postIs, [
                { path: "query", select: "contextType content vote comments creator attachment" },
                { path: "responses", select: "contextType content vote comments creator attachment" }
            ])
            await Document.populate(postIs, [
                { path: "query.attachment", select: "name contentType createdAt", },
                { path: "responses.attachment", select: "name contentType createdAt", },
            ])
            await userModel.populate(postIs, [
                { path: "query.comments.user", select: "firstName lastName displayPicSrc" },
                { path: "responses.comments.user", select: "firstName lastName displayPicSrc" },
                { path: "query.creator", select: "firstName lastName displayPicSrc" },
                { path: "responses.creator", select: "firstName lastName displayPicSrc" },
            ])
            user.logs.push({
                action: "response deleted",
                details: `contextId:${contextId}`
            })
            await user.save()
            await contextModel.findByIdAndDelete(contextToBeDeleted)
            return res.status(200).json({ success: true, message: `${action} successful`, data: postIs, AccessToken: req.AccessToken ? req.AccessToken : null })
        default: return next(generateAPIError(`invalid action:${action}`, 400))
    }
})
export const comment = errorWrapper(async (req, res, next) => {
    const { action, contextId, content, commentId } = req.body
    const context = await contextModel.findById(contextId)
    if (!context) return next(generateAPIError(`invalid contextId`, 400))
    const user = await userModel.findById(req.decoded.id)
    switch (action) {
        case "create":
            if (content === undefined) return next(generateAPIError(`invalid content`, 400))
            const commentToBeCreated = { content: content, user: req.decoded.id }
            context.comments.push(commentToBeCreated)
            break;
        case "update":
            if (content === undefined) return next(generateAPIError(`invalid content`, 400))
            const commentToBeEdited = context.comments.find(ele => ele._id.toString() == commentId)
            commentToBeEdited.content = content
            await commentToBeEdited.save()
            break;
        case "delete":
            context.comments = context.comments.filter(ele => ele._id.toString() != commentId)
            break;
        default: return next(generateAPIError(`invalid action:${action}`, 400))

    }
    await context.save()
    user.logs.push({
        action: `${action} comment`,
        details: `contextId:${contextId}`
    })
    await user.save()
    await communityModel.populate(context, { path: "post.community", select: "university" })
    await universityModel.populate(context, { path: "post.community.university", select: "name logoSrc location type establishedYear" })
    await contextModel.populate(context, [
        { path: "post.query", select: "contextType content vote comments creator attachment" },
        { path: "post.responses", select: "contextType content vote comments creator attachment" }
    ])
    await Document.populate(context, { path: "attachment", select: "name contentType createdAt", },)
    await userModel.populate(context, [
        { path: "creator", select: "firstName lastName displayPicSrc" },
        { path: "comments.user", select: "firstName lastName displayPicSrc" },
        { path: "post.query.comments.user", select: "firstName lastName displayPicSrc" },
        { path: "post.responses.comments.user", select: "firstName lastName displayPicSrc" },
        { path: "post.query.creator", select: "firstName lastName displayPicSrc" },
        { path: "post.responses.creator", select: "firstName lastName displayPicSrc" },
    ])
    return res.status(200).json({ success: true, message: `${action} comment successful`, data: context, AccessToken: req.AccessToken ? req.AccessToken : null })
})
export const vote = errorWrapper(async (req, res, next) => {
    const { action, contextId } = req.body
    const context = await contextModel.findById(contextId)
    if (!context) return next(generateAPIError(`invalid contextId`, 400))
    context.vote = context.vote.filter(ele => ele.user.toString() != req.decoded.id)
    const vote = { user: req.decoded.id }
    switch (action) {
        case "upvote":
            vote.type = true
            context.vote.push(vote)
            break;
        case "downvote":
            vote.type = false
            context.vote.push(vote)
            break;
        case "nota":
            break;
        default: return next(generateAPIError(`invalid action:${action}`, 400))
    }
    await context.save()
    const user = await userModel.findById(req.decoded.id)
    user.logs.push({
        action: `${action}`,
        details: `contextId:${contextId}`
    })
    await user.save()
    await communityModel.populate(context, { path: "post.community", select: "university" })
    await universityModel.populate(context, { path: "post.community.university", select: "name logoSrc location type establishedYear" })
    await contextModel.populate(context, [
        { path: "post.query", select: "contextType content vote comments creator attachment" },
        { path: "post.responses", select: "contextType content vote comments creator attachment" }
    ])
    await Document.populate(context, { path: "attachment", select: "name contentType createdAt", },)
    await userModel.populate(context, [
        { path: "creator", select: "firstName lastName displayPicSrc" },
        { path: "comments.user", select: "firstName lastName displayPicSrc" },
        { path: "post.query.comments.user", select: "firstName lastName displayPicSrc" },
        { path: "post.responses.comments.user", select: "firstName lastName displayPicSrc" },
        { path: "post.query.creator", select: "firstName lastName displayPicSrc" },
        { path: "post.responses.creator", select: "firstName lastName displayPicSrc" },
    ])
    return res.status(200).json({ success: true, message: `${action} successful`, data: context, AccessToken: req.AccessToken ? req.AccessToken : null })
})
