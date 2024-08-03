// /**
//  *
//  * @param {*} fn
//  * @returns
//  */
/**  handles errors inside every req */
import { generateAPIError } from "../errors/apiError.js"
export const errorWrapper = (fn) => {
  return async (req, res, next) => {
    try {
      const { statusCode, message, data } = await fn(req, res, next);
      switch (statusCode) {
        case 200:
          let obj = { success: true, message: message, data: data };
          if (req.AccessToken) obj.AccessToken = req.AccessToken;
          return res.status(statusCode).json(obj);
        case 400: return next(generateAPIError(message, statusCode, data));
      }
    } catch (error) {
      console.log(error);
      return next(generateAPIError(`${error.name}:${error.message}`, 500, null));
    }
  };
};