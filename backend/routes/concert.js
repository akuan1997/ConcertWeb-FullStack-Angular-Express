const express = require("express");
const router = express.Router();

const {
    getRawData,
    getAllData,
    getKeywordSearchData, getCitySelectionData, getDateSearchData
} = require("../controller/concert")

router.route("/data").get(getRawData);
router.route("/allData").get(getAllData);
router.route("/getKeywordSearchData").get(getKeywordSearchData);
router.route("/getCitySelectionData").get(getCitySelectionData);
router.route("/getDateSearchData").get(getDateSearchData);

module.exports = router;