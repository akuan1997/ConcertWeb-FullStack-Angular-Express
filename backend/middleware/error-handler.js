const { CustomAPIError } = require("../errors/custom-error");

const errorHandlerMiddleware = (err, req, res, next) => {
  if (err instanceof CustomAPIError) {
    console.log("3");
    return res
      .status(err.statusCode)
      .json({ msg: err.message + " - from custom API Error" });
  }
  console.log("4");
  return res
    .status(500)
    .json({ msg: err.message + " - from error handler middleware" });
};

module.exports = errorHandlerMiddleware;
