import { describe } from "mocha";
import supertest from "supertest";
const request = supertest('https://back-end-assignment-reunion-lkot.onrender.com/api/')
// const request = supertest('http://localhost:5000/api/')
import { expect } from "chai";
const Token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2NDM1NmE5NDY1MWNjY2M1ZWI4YzM3Y2UiLCJlbWFpbCI6Imd1ZXN0QGV4YW1wbGUuY29tIiwiaWF0IjoxNjgxMjg5OTI0LCJleHAiOjE3MTcyODk5MjR9.prsnEm9H9HhrwSLeqURXj1YmICwzn3ujxM146SLW2MI";
const FriendID = "64356a3f651cccc5eb8c37cc";
let NewPostID= ""
describe('All Tests', () => {
    it("1st GET user", async () => {
        const { body } = await request.get("user").set("Authorization", `Bearer ${Token}`)
        expect(body).to.not.be.empty;
        console.log(body);
    })

    it("2nd GET all_posts", async () => {
        const { body } = await request.get("all_posts").set("Authorization", `Bearer ${Token}`)
        expect(body).to.not.be.empty;
        console.log(body);
    })

    it("3rd POST follow a friend", async () => {
        const { body } = await request.post(`/follow/${FriendID}`).set("Authorization", `Bearer ${Token}`)
        expect(body).to.not.be.empty;
        console.log(body);
    })

    it("4th POST unfollow a friend", async () => {
        const { body } = await request.post(`/unfollow/${FriendID}`).set("Authorization", `Bearer ${Token}`)
        expect(body).to.not.be.empty;
        console.log(body);
    })

    it("5th POST create a new post", async () => {
        const reqBody = {
            "Title": "a fake post",
            "Description": "noo need for description"
        }
        const { body } = await request.post(`/posts`).set("Authorization", `Bearer ${Token}`).send(reqBody)
        expect(body).to.not.be.empty;
        console.log(body);
        NewPostID = body.ID

    })

    it("6th POST like a post", async () => {
        const { body } = await request.post(`like/${NewPostID}`).set("Authorization", `Bearer ${Token}`)
        expect(body).to.not.be.empty;
        console.log(body);
    })

    it("7th POST dislike a post", async () => {
        const { body } = await request.post(`unlike/${NewPostID}`).set("Authorization", `Bearer ${Token}`)
        expect(body).to.not.be.empty;
        console.log(body);
    })

    it("8th POST comment on a post", async () => {
        const reqBody = { "Comment": "Congratulation mate" }
        const { body } =await request.post(`comment/${NewPostID}`).set("Authorization", `Bearer ${Token}`).send(reqBody)
        expect(body).to.not.be.empty;
        console.log(body);
    })

    it("9th DELETE delete a post", async () => {
        const { body } = await request.delete(`posts/${NewPostID}`).set("Authorization", `Bearer ${Token}`)
        expect(body).to.not.be.empty;
        console.log(body);
    })

    it("GET singlePost", async () => {
        const res = await request.get(`post/6435a37476e87870ece7b0c4`);
        expect(res.body).to.not.be.empty
    })
})




















