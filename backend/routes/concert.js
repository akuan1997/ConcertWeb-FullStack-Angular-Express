const express = require("express");
const router = express.Router();

const {
    getAllData,
    getMoreData,
    getKeywordSearchData
} = require("../controller/concert")

router.route("/data").get(getAllData);
router.route("/more-data").get(getMoreData);
router.route("/getKeywordSearchData").get(getKeywordSearchData);

module.exports = router;