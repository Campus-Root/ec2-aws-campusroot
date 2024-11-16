// communicationRouter

import express from "express";
import { editMembers, exitGroup, fetchChats, newGroup, postChat, search } from "../controllers/chat/chat.js";
import { downloadSharedDocument, fetchMessages, postMessages, seeMessages } from "../controllers/chat/message.js";
import { handleFile } from "../middleware/handleFile.js";
import { comment, feed, fetchJoinedCommunities, fetchPosts, joinInCommunity, myActivity, postsInCommunity, query, response, singlePost, vacateCommunity, vote } from "../controllers/community/index.js";
import { authMiddleware } from "../middleware/auth.js";
import { assistantReply } from "../controllers/chat/assistantReply.js";



const router = express.Router();

router.get("/chats", authMiddleware, fetchChats);
router.get("/", authMiddleware, search);
router.get("/chats/:friendId", authMiddleware, postChat);
router.post("/message", authMiddleware, handleFile, postMessages);
router.post("/new-group", authMiddleware, newGroup);
router.post("/edit-members", authMiddleware, editMembers);
router.post("/exit/:chatId", authMiddleware, exitGroup);
router.get("/message/:chatId", authMiddleware, fetchMessages);
router.get("/seen/:chatId", authMiddleware, seeMessages);
router.get("/download-document/:id", authMiddleware, downloadSharedDocument);
router.post("/assistant-chat",assistantReply)
router.get("/communities", authMiddleware, fetchJoinedCommunities)
router.post("/join-in-community", authMiddleware, joinInCommunity)
router.patch("/vacate-community", authMiddleware, vacateCommunity)
router.get("/feed", authMiddleware, feed)
router.get("/posts", authMiddleware, fetchPosts)
router.get("/my-activity", authMiddleware, myActivity)
router.get("/community-posts/:communityId", authMiddleware, postsInCommunity)
router.get("/single-post/:postId", authMiddleware, singlePost)
router.post("/query", authMiddleware, handleFile, query)
router.post("/comment", authMiddleware, comment)
router.post("/vote", authMiddleware, vote)
router.post("/response", authMiddleware, handleFile, response)



// router.delete("/delete-message/:messageId", authMiddleware, deleteMessage);
export default router;