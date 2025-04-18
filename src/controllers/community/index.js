import { errorWrapper } from "../../middleware/errorWrapper.js"
import communityModel from "../../models/Community.js";
import userModel from "../../models/User.js";
import universityModel from "../../models/University.js"
import postModel from "../../models/Post.js";
import contextModel from "../../models/Context.js"
import fs from "fs"
import Document from "../../models/Uploads.js";
import { deleteFileInWorkDrive, uploadFileToWorkDrive } from "../../utils/CRMintegrations.js";
import { ChannelModel } from "../../models/Channels.js";

export const joinInCommunity = errorWrapper(async (req, res, next, session) => {
    const { communityId } = req.body
    const existingCommunity = await communityModel.findById(communityId)
    if (!existingCommunity) return { statusCode: 400, data: null, message: "invalid Community" }
    if (existingCommunity.participants.includes(req.decoded.id)) return {
        statusCode: 400, data: null, message: "you're already a participant"
    }
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
    return ({ statusCode: 200, message: `join success`, data: community })
})
export const JoinInChannel = errorWrapper(async (req, res, next) => {
    const { channelId } = req.params
    const existingChannel = await ChannelModel.findByIdAndUpdate(
        channelId,
        { $addToSet: { members: req.user._id } },
        { new: true }
    );
    if (!existingChannel) return ({ statusCode: 404, message: "Channel not found", data: null })
    return ({ statusCode: 200, message: `Successfully joined the channel`, data: existingChannel })
})
export const postInChannel = errorWrapper(async (req, res, next) => {
    const { action, body, header, fileIdentifier, contextId } = req.body
    const user = await userModel.findById(req.decoded.id)
    let context
    switch (action) {
        case "create":
            const { channelId } = req.body
            const existingChannel = await ChannelModel.findById(channelId)
            if ((body === undefined && header === undefined) || !existingChannel || !existingChannel.owner.toString() !== req.user._id.toString()) {
                if (req.file && req.file.path) unlinkSync(req.file.path);
                return { statusCode: 400, data: null, message: `Invalid input for ${action} action` }
            }
            const newPost = await contextModel.create({
                contextType: "Announcement",
                creator: req.decoded.id,
                content: {
                    header: header,
                    body: body
                }
            })
            if (req.file) {
                const uploadedFileResponse = await uploadFileToWorkDrive({ originalname: req.file.originalname, path: req.file.path, mimetype: req.file.mimetype, fileIdentifier: fileIdentifier, folder_ID: req.user.docData.folder })
                if (!uploadedFileResponse.success) return { statusCode: 500, message: uploadedFileResponse.message, data: uploadedFileResponse.data }
                if (uploadedFileResponse.data.new) {
                    const { FileName, resource_id, mimetype, originalname, preview_url } = uploadedFileResponse.data
                    const docDetails = { data: { FileName, resource_id, mimetype, originalname, fileIdentifier, preview_url }, user: req.user._id, type: "Chat", viewers: [] };
                    const newDoc = await Document.create(docDetails);
                    newPost.attachment = newDoc._id
                }
            }
            user.logs.push({
                action: "New Post",
                details: `contextId:${newPost._id}`
            })
            await Promise.all([user.save(), newPost.save()])
            return ({ statusCode: 200, message: `${action} successful`, data: newPost })
        case "update":
            const { deleteAttachment } = req.body
            context = await contextModel.findById(contextId)
            if (!context || context.creator.toString() != req.decoded.id) {
                if (req.file && req.file.path) unlinkSync(req.file.path);
                return { statusCode: 400, data: null, message: `Invalid input for ${action} action` }
            }
            if (body !== undefined) context.content.body = body
            if (header !== undefined) context.content.header = header
            if (deleteAttachment && context.attachment) {
                const document = await Document.findById(context.attachment)
                await Promise.all([deleteFileInWorkDrive(document.data.resource_id), Document.findByIdAndDelete(context.attachment)])
                context.attachment = null
            }
            if (req.file) {
                const uploadedFileResponse = await uploadFileToWorkDrive({ originalname: req.file.originalname, path: req.file.path, mimetype: req.file.mimetype, fileIdentifier: fileIdentifier || "", folder_ID: req.user.docData.folder })
                if (!uploadedFileResponse.success) return { statusCode: 500, message: uploadedFileResponse.message, data: uploadedFileResponse.data }
                if (uploadedFileResponse.data.new) {
                    const { FileName, resource_id, mimetype, originalname, preview_url } = uploadedFileResponse.data
                    const docDetails = { data: { FileName, resource_id, mimetype, originalname, fileIdentifier, preview_url }, user: req.user._id, type: "Post", viewers: [] };
                    const newDoc = await Document.create(docDetails);
                    context.attachment = newDoc._id
                }
            }
            user.logs.push({
                action: "updated a query",
                details: `contextId:${contextId}`
            })
            await Promise.all([user.save(), context.save()])
            return ({ statusCode: 200, message: `${action} successful`, data: context })
        case "delete":
            const { contextId } = req.body
            const document = await Document.findById(context.attachment)
            await Promise.all([deleteFileInWorkDrive(document.data.resource_id), Document.findByIdAndDelete(context.attachment), contextModel.findByIdAndDelete(contextId)])
            return ({ statusCode: 200, message: `${action} successful`, data: null })
        default: return { statusCode: 400, data: null, message: `invalid action:${action}` }
    }





















})
export const ExitFromChannel = errorWrapper(async (req, res, next) => {
    const { channelId } = req.params
    const existingChannel = await ChannelModel.findByIdAndUpdate(channelId, { $pull: { members: req.user._id } }, { new: true });
    if (!existingChannel) return ({ statusCode: 404, message: "Channel not found", data: null })
    return ({ statusCode: 200, message: `Successfully exited the channel`, data: existingChannel })
})
export const fetchJoinedCommunities = errorWrapper(async (req, res, next, session) => {
    const user = await userModel.findById(req.decoded.id)
    await communityModel.populate(user, { path: "communities", select: "participants university posts", },)
    await userModel.populate(user, { path: "communities.participants", select: "firstName lastName displayPicSrc", },)
    await universityModel.populate(user, { path: "communities.university", select: "name logoSrc location type establishedYear", },)
    return ({ statusCode: 200, message: `joined communities`, data: user.communities })
})
export const vacateCommunity = errorWrapper(async (req, res, next, session) => {
    const { communityId } = req.body
    const existingCommunity = await communityModel.findById(communityId)
    if (!existingCommunity) return { statusCode: 400, data: null, message: "invalid CommunityId" }
    if (!existingCommunity.participants.includes(req.decoded.id)) return {
        statusCode: 400, data: null, message: "you're not a participant"
    }
    const user = await userModel.findById(req.decoded.id)
    user.logs.push({
        action: "left a community",
        details: `communityId:${communityId}`
    })
    await user.save()
    await Promise.all([communityModel.findOneAndUpdate({ _id: communityId }, { $pull: { participants: req.decoded.id } }), userModel.findOneAndUpdate({ _id: req.decoded.id }, { $pull: { communities: communityId } })])
    return ({ statusCode: 200, message: `left the community`, data: null })
})
export const fetchPosts = errorWrapper(async (req, res, next, session) => {
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
                    select: "data"
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
    return ({ statusCode: 200, message: `all your posts`, data: posts, additionalData: { totalPages, currentPage: +page, pageSize: +pageSize } })
});
export const myActivity = errorWrapper(async (req, res, next, session) => {
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
                    { path: "attachment", select: "data" },
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
    return ({ statusCode: 200, message: `all your posts`, data: Posts, additionalData: { totalPages: totalPages, currentPage: +page, pageSize: +pageSize } })
})
export const postsInCommunity = errorWrapper(async (req, res, next, session) => {
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
                    { path: "attachment", select: "data" },
                    { path: "comments.user", select: "firstName lastName displayPicSrc" },
                    { path: "creator", select: "firstName lastName displayPicSrc" }
                ]
            },
            {
                path: "responses",
                select: "contextType content vote comments creator attachment",
                populate: [
                    { path: "attachment", select: "data" },
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
    if (!community) return { statusCode: 400, data: null, message: "Invalid CommunityId" };
    const totalPostsCount = await communityModel.countDocuments({ _id: communityId });
    const totalPages = Math.ceil(totalPostsCount / pageSize);
    return ({ statusCode: 200, message: `all your posts`, data: community, additionalData: { totalPages, currentPage: +page, pageSize: +pageSize } })
})
export const singlePost = errorWrapper(async (req, res, next, session) => {
    const { postId } = req.params
    const post = await postModel
        .findById(postId)
        .populate({
            path: "query",
            select: "contextType content vote comments creator attachment",
            populate: [
                { path: "attachment", select: "data" },
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
                { path: "attachment", select: "data" },
                { path: "comments.user", select: "firstName lastName displayPicSrc" },
                { path: "creator", select: "firstName lastName displayPicSrc" }
            ]
        })
    return ({ statusCode: 200, message: `single post`, data: post })
})
export const feed = errorWrapper(async (req, res, next, session) => {
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
                { path: "attachment", select: "data" },
                { path: "comments.user", select: "firstName lastName displayPicSrc" },
                { path: "creator", select: "firstName lastName displayPicSrc" }
            ]
        })
        .populate({
            path: "responses",
            select: "contextType content vote comments creator attachment",
            populate: [
                { path: "attachment", select: "data" },
                { path: "comments.user", select: "firstName lastName displayPicSrc" },
                { path: "creator", select: "firstName lastName displayPicSrc" }
            ]
        })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .sort({ updatedAt: -1 });
    const totalPostsCount = await postModel.countDocuments({ community: { $in: user.communities } })
    const totalPages = Math.ceil(totalPostsCount / pageSize);
    return ({ statusCode: 200, message: `all your feed`, data: posts, additionalData: { totalPages, currentPage: +page, pageSize: +pageSize } })
})
export const query = errorWrapper(async (req, res, next, session) => {
    const { action, body, header, fileIdentifier } = req.body
    const user = await userModel.findById(req.decoded.id)
    switch (action) {
        case "create":
            const { communityId } = req.body
            const community = await communityModel.findById(communityId)
            if ((body === undefined && header === undefined) || !community || !community.participants.includes(req.decoded.id)) {
                if (req.file && req.file.path) unlinkSync(req.file.path);
                return { statusCode: 400, data: null, message: `Invalid input for ${action} action` }
            }

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
                const uploadedFileResponse = await uploadFileToWorkDrive({ originalname: req.file.originalname, path: req.file.path, mimetype: req.file.mimetype, fileIdentifier: fileIdentifier || "", folder_ID: req.user.docData.folder })
                if (!uploadedFileResponse.success) return { statusCode: 500, message: uploadedFileResponse.message, data: uploadedFileResponse.data }
                if (uploadedFileResponse.data.new) {
                    const { FileName, resource_id, mimetype, originalname, preview_url } = uploadedFileResponse.data
                    const docDetails = { data: { FileName, resource_id, mimetype, originalname, fileIdentifier, preview_url }, user: req.user._id, type: "Post", viewers: [] };
                    const newDoc = await Document.create(docDetails);
                    newContext.attachment = newDoc._id
                }

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
                { path: "query.attachment", select: "data", },
                { path: "responses.attachment", select: "data", },
            ])
            await userModel.populate(newPost, [
                { path: "query.comments.user", select: "firstName lastName displayPicSrc" },
                { path: "responses.comments.user", select: "firstName lastName displayPicSrc" },
                { path: "query.creator", select: "firstName lastName displayPicSrc" },
                { path: "responses.creator", select: "firstName lastName displayPicSrc" },
            ])
            return ({ statusCode: 200, message: `${action} successful`, data: newPost })
        case "update":
            const { contextId, deleteAttachment } = req.body
            const context = await contextModel.findById(contextId)
            if (!context || context.creator.toString() != req.decoded.id) {
                if (req.file && req.file.path) unlinkSync(req.file.path);
                return { statusCode: 400, data: null, message: `Invalid input for ${action} action` }
            }
            if (body !== undefined) context.content.body = body
            if (header !== undefined) context.content.header = header
            if (deleteAttachment && context.attachment) {
                const document = await Document.findById(context.attachment)
                await deleteFileInWorkDrive(document.data.resource_id)
                await Document.findByIdAndDelete(context.attachment)
                context.attachment = null
            }

            if (req.file) {
                const uploadedFileResponse = await uploadFileToWorkDrive({ originalname: req.file.originalname, path: req.file.path, mimetype: req.file.mimetype, fileIdentifier: fileIdentifier || "", folder_ID: req.user.docData.folder })
                if (!uploadedFileResponse.success) return { statusCode: 500, message: uploadedFileResponse.message, data: uploadedFileResponse.data }
                if (uploadedFileResponse.data.new) {
                    const { FileName, resource_id, mimetype, originalname, preview_url } = uploadedFileResponse.data
                    const docDetails = { data: { FileName, resource_id, mimetype, originalname, fileIdentifier, preview_url }, user: req.user._id, type: "Post", viewers: [] };
                    const newDoc = await Document.create(docDetails);
                    newContext.attachment = newDoc._id
                }

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
                { path: "query.attachment", select: "data", },
                { path: "responses.attachment", select: "data", },
            ])
            await userModel.populate(post, [
                { path: "query.comments.user", select: "firstName lastName displayPicSrc" },
                { path: "responses.comments.user", select: "firstName lastName displayPicSrc" },
                { path: "query.creator", select: "firstName lastName displayPicSrc" },
                { path: "responses.creator", select: "firstName lastName displayPicSrc" },
            ])
            return ({ statusCode: 200, message: `${action} successful`, data: post })
        case "delete":
            const { postId } = req.body
            const postToBeDeleted = await postModel.findById(postId).populate("query", "creator")
            if (!postToBeDeleted) return {
                statusCode: 400, data: null, message: "Invalid input for delete action"
            }
            if (postToBeDeleted.query.creator.toString() != req.decoded.id) return {
                statusCode: 400, data: null, message: "Invalid access for delete action"
            }
            if (postToBeDeleted.query) {
                const query = await contextModel.findById(postToBeDeleted.query)
                if (query.attachment) {
                    const document = await Document.findById(query.attachment)
                    await deleteFileInWorkDrive(document.data.resource_id)
                    await Document.findByIdAndDelete(query.attachment)
                }
                await contextModel.findByIdAndDelete(postToBeDeleted.query)
            }
            for (const ele of postToBeDeleted.responses) {
                const response = await contextModel.findById(ele)
                if (response.attachment) {
                    const document = await Document.findById(query.attachment)
                    await deleteFileInWorkDrive(document.data.resource_id)
                    await Document.findByIdAndDelete(response.attachment)
                }
                await contextModel.findByIdAndDelete(ele)
            }
            user.logs.push({
                action: "query deleted",
                details: `postId:${postId}`
            })
            await user.save()
            await communityModel.findOneAndUpdate({ _id: postToBeDeleted.community }, { $pull: { posts: postId } });
            await postModel.findOneAndDelete({ _id: postId });
            return ({ statusCode: 200, message: `${action} successful`, data: null })
        default: return { statusCode: 400, data: null, message: `invalid action:${action}` }
    }
})
export const response = errorWrapper(async (req, res, next, session) => {
    const { action, body, header, contextId, fileIdentifier } = req.body
    const user = await userModel.findById(req.decoded.id)
    switch (action) {
        case "create":
            const { postId } = req.body
            const post = await postModel.findById(postId)
            if ((body === undefined && header === undefined) || !post) {
                if (req.file && req.file.path) unlinkSync(req.file.path);
                return { statusCode: 400, data: null, message: `Invalid input for ${action} action` };
            }

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
                const uploadedFileResponse = await uploadFileToWorkDrive({ originalname: req.file.originalname, path: req.file.path, mimetype: req.file.mimetype, fileIdentifier: fileIdentifier || "", folder_ID: req.user.docData.folder })
                if (!uploadedFileResponse.success) return { statusCode: 500, message: uploadedFileResponse.message, data: uploadedFileResponse.data }
                if (uploadedFileResponse.data.new) {
                    const { FileName, resource_id, mimetype, originalname, preview_url } = uploadedFileResponse.data
                    const docDetails = { data: { FileName, resource_id, mimetype, originalname, fileIdentifier, preview_url }, user: req.user._id, type: "Chat", viewers: [] };
                    const newDoc = await Document.create(docDetails);
                    newContext.attachment = newDoc._id
                }
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
                { path: "query.attachment", select: "data", },
                { path: "responses.attachment", select: "data", },
            ])
            await userModel.populate(post, [
                { path: "query.comments.user", select: "firstName lastName displayPicSrc" },
                { path: "responses.comments.user", select: "firstName lastName displayPicSrc" },
                { path: "query.creator", select: "firstName lastName displayPicSrc" },
                { path: "responses.creator", select: "firstName lastName displayPicSrc" },
            ])
            return ({ statusCode: 200, message: `${action} successful`, data: post })
        case "update":
            const { deleteAttachment } = req.body
            const context = await contextModel.findById(contextId)
            if (!context || context.creator.toString() != req.decoded.id) return {
                statusCode: 400, data: null, message: `Invalid input for ${action} action`
            }
            if (body !== undefined) context.content.body = body
            if (header !== undefined) context.content.header = header
            if (deleteAttachment && context.attachment) {
                const document = await Document.findById(context.attachment)
                await deleteFileInWorkDrive(document.data.resource_id)
                await Document.findByIdAndDelete(context.attachment)
                context.attachment = null
            }
            if (req.file) {
                const uploadedFileResponse = await uploadFileToWorkDrive({ originalname: req.file.originalname, path: req.file.path, mimetype: req.file.mimetype, fileIdentifier: fileIdentifier || "", folder_ID: req.user.docData.folder })
                if (!uploadedFileResponse.success) return { statusCode: 500, message: uploadedFileResponse.message, data: uploadedFileResponse.data }
                if (uploadedFileResponse.data.new) {
                    const { FileName, resource_id, mimetype, originalname, preview_url } = uploadedFileResponse.data
                    const docDetails = { data: { FileName, resource_id, mimetype, originalname, fileIdentifier, preview_url }, user: req.user._id, type: "Chat", viewers: [] };
                    const newDoc = await Document.create(docDetails);
                    context.attachment = newDoc._id
                }
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
                { path: "query.attachment", select: "data", },
                { path: "responses.attachment", select: "data", },
            ])
            await userModel.populate(Post, [
                { path: "query.comments.user", select: "firstName lastName displayPicSrc" },
                { path: "responses.comments.user", select: "firstName lastName displayPicSrc" },
                { path: "query.creator", select: "firstName lastName displayPicSrc" },
                { path: "responses.creator", select: "firstName lastName displayPicSrc" },
            ])
            return ({ statusCode: 200, message: `${action} successful`, data: Post })
        case "delete":
            const contextToBeDeleted = await contextModel.findById(contextId)
            if (!contextToBeDeleted) return {
                statusCode: 400, data: null, message: `Invalid contextId`
            }
            const document = await Document.findById(context.attachment)
            await deleteFileInWorkDrive(document.data.resource_id)
            await Document.findByIdAndDelete(contextToBeDeleted.attachment)
            const postIs = await postModel.findOneAndUpdate({ _id: contextToBeDeleted.post }, { $pull: { responses: contextId } }, { new: true })
            await communityModel.populate(postIs, { path: "community", select: "university" })
            await universityModel.populate(postIs, { path: "community.university", select: "name logoSrc location type establishedYear" })
            await contextModel.populate(postIs, [
                { path: "query", select: "contextType content vote comments creator attachment" },
                { path: "responses", select: "contextType content vote comments creator attachment" }
            ])
            await Document.populate(postIs, [
                { path: "query.attachment", select: "data", },
                { path: "responses.attachment", select: "data", },
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
            return ({ statusCode: 200, message: `${action} successful`, data: postIs })
        default: return { statusCode: 400, data: null, message: `invalid action:${action} ` }
    }
})
export const comment = errorWrapper(async (req, res, next, session) => {
    const { action, contextId, content, commentId } = req.body
    const context = await contextModel.findById(contextId)
    if (!context) return { statusCode: 400, data: null, message: `invalid contextId` }
    const user = await userModel.findById(req.decoded.id)
    switch (action) {
        case "create":
            if (content === undefined) return { statusCode: 400, data: null, message: `invalid content` }
            const commentToBeCreated = { content: content, user: req.decoded.id }
            context.comments.push(commentToBeCreated)
            break;
        case "update":
            if (content === undefined) return { statusCode: 400, data: null, message: `invalid content` }
            const commentToBeEdited = context.comments.find(ele => ele._id.toString() == commentId)
            commentToBeEdited.content = content
            await commentToBeEdited.save()
            break;
        case "delete":
            context.comments = context.comments.filter(ele => ele._id.toString() != commentId)
            break;
        default: return { statusCode: 400, data: null, message: `invalid action:${action} ` }

    }
    await context.save()
    user.logs.push({
        action: `${action} comment`,
        details: `contextId:${contextId} `
    })
    await user.save()
    await communityModel.populate(context, { path: "post.community", select: "university" })
    await universityModel.populate(context, { path: "post.community.university", select: "name logoSrc location type establishedYear" })
    await contextModel.populate(context, [
        { path: "post.query", select: "contextType content vote comments creator attachment" },
        { path: "post.responses", select: "contextType content vote comments creator attachment" }
    ])
    await Document.populate(context, { path: "attachment", select: "data", },)
    await userModel.populate(context, [
        { path: "creator", select: "firstName lastName displayPicSrc" },
        { path: "comments.user", select: "firstName lastName displayPicSrc" },
        { path: "post.query.comments.user", select: "firstName lastName displayPicSrc" },
        { path: "post.responses.comments.user", select: "firstName lastName displayPicSrc" },
        { path: "post.query.creator", select: "firstName lastName displayPicSrc" },
        { path: "post.responses.creator", select: "firstName lastName displayPicSrc" },
    ])
    return ({ statusCode: 200, message: `${action} comment successful`, data: context })
})
export const vote = errorWrapper(async (req, res, next, session) => {
    const { action, contextId } = req.body
    const context = await contextModel.findById(contextId)
    if (!context) return { statusCode: 400, data: null, message: `invalid contextId` }
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
        default: return { statusCode: 400, data: null, message: `invalid action:${action} ` }
    }
    await context.save()
    const user = await userModel.findById(req.decoded.id)
    user.logs.push({
        action: `${action} `,
        details: `contextId:${contextId} `
    })
    await user.save()
    await communityModel.populate(context, { path: "post.community", select: "university" })
    await universityModel.populate(context, { path: "post.community.university", select: "name logoSrc location type establishedYear" })
    await contextModel.populate(context, [
        { path: "post.query", select: "contextType content vote comments creator attachment" },
        { path: "post.responses", select: "contextType content vote comments creator attachment" }
    ])
    await Document.populate(context, { path: "attachment", select: "data", },)
    await userModel.populate(context, [
        { path: "creator", select: "firstName lastName displayPicSrc" },
        { path: "comments.user", select: "firstName lastName displayPicSrc" },
        { path: "post.query.comments.user", select: "firstName lastName displayPicSrc" },
        { path: "post.responses.comments.user", select: "firstName lastName displayPicSrc" },
        { path: "post.query.creator", select: "firstName lastName displayPicSrc" },
        { path: "post.responses.creator", select: "firstName lastName displayPicSrc" },
    ])
    return ({ statusCode: 200, message: `${action} successful`, data: context })
})
