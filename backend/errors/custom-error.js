// import { Error, startSession } from "mongoose";

class CustomAPIError extends Error {
    constructor(message, statusCode) {
      console.log("2");
      super(message);
      this.statusCode = statusCode;
    }
  }
  
  const createCustomError = (msg, statusCode) => {
    console.log("1");
    return new CustomAPIError(msg, statusCode);
  };
  
  module.exports = {
    createCustomError,
    CustomAPIError,
  };
  