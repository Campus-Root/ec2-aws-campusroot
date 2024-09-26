// /**
//  *
//  * @param {*} fn
//  * @returns
//  */
/**  handles errors inside every req */
import { startSession } from "mongoose"
import { generateAPIError } from "../errors/apiError.js"
import sendMail from "../utils/sendEMAIL.js";
export const errorWrapper = (fn) => {

  return async (req, res, next) => {
    const session = await startSession();
    try {
      session.startTransaction();
      const result = await fn(req, res, next, session);
      if (result) {
        const { statusCode, message, data } = result;
        switch (statusCode) {
          case 200:
            let obj = { success: true, message: message, data: data };
            if (req.AccessToken) obj.AccessToken = req.AccessToken;
            await session.commitTransaction();
            return res.status(statusCode).json(obj);
          case 500:
            await session.abortTransaction(); // Abort on failure
            const errorHtml = `<h1>Error at Server Side</h1><p><strong>Message:</strong> ${message} <strong>Status Code:${statusCode} </strong> </p><pre>${data}</pre>`;
            sendMail({ to: "vishnu.teja101.vt@gmail.com", subject: "Error at server side", html: errorHtml });
            return next(generateAPIError(message, statusCode, data));
          default: {
            await session.abortTransaction(); // Abort on failure
            return next(generateAPIError(message, statusCode, data));
          }
        }
      }
    } catch (error) {
      // console.log(error.message);
      await session.abortTransaction();
      console.error(error)
      const errorHtml = ` <h1>Error at Server Side</h1> <p><strong>Message:</strong> ${error.message}</p><p><strong>Stack Trace:</strong></p><pre>${error.stack.replace(/\n/g, '<br>')}</pre>`;
      sendMail({ to: "vishnu.teja101.vt@gmail.com", subject: "Error at server side", html: errorHtml });
      return next(generateAPIError(`${error.name}:${error.message}`, 500, error.message));
    }
    finally {
      session.endSession();
    }
  };
};