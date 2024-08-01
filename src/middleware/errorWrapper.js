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
          return res.status(statusCode).json({ success: true, message: message, data: data, AccessToken: req.AccessToken ? req.AccessToken : null })
        case 400:

          return next(generateAPIError(message, statusCode, data));

        default: {
          console.log(error);
          return next(generateAPIError(`${error.name}:${error.message}`, 500, null));
        }
      }
    } catch (error) {
      console.log(error);
      return next(generateAPIError(`${error.name}:${error.message}`, 500, null));
    }
  };
};