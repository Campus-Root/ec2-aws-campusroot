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
      await fn(req, res, next);
    } catch (error) {
      console.log(error);
      return next(generateAPIError(`${error.name}:${error.message}`, 500));
    }
  };
};