import { APIError } from "../errors/apiError.js";
import pkg from 'mongoose';
const { ValidationError } = pkg;
import { StatusCodes } from "http-status-codes";

const errorHandlerMiddleware = (err, req, res, next) => {
  let customError = {
    statusCode: err.statusCode || StatusCodes.INTERNAL_SERVER_ERROR,
    msg: err.message || "Something went wrong, try again later",
    success: false,
    data: err.data || null
  };

  // if (err instanceof ValidationError) {
  //   customError.msg = Object.values(err.errors)
  //     .map((item) => item.message)
  //     .join(",");
  //   customError.statusCode = StatusCodes.BAD_REQUEST;
  // }

  if (err.code && err.code === 11000) {
    customError.msg = `Duplicate value entered for ${Object.keys(
      err.keyValue
    )} field, please choose another value`;
    customError.statusCode = StatusCodes.BAD_REQUEST;
  }

  if (err.name === "CastError") {
    customError.msg = `No item found with id: ${err.value}`;
    customError.statusCode = StatusCodes.NOT_FOUND;
  }

  return res.status(customError.statusCode).json({
    message: customError.msg,
    status: "failure",
    success: customError.success,
    data: customError.data,
  });
};

export default errorHandlerMiddleware;
