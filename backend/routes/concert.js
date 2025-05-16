const express = require("express");
const router = express.Router();

const {
    getRawData,
    getAllData,
    getKeywordSearchData, getCitySelectionData
} = require("../controller/concert")

router.route("/data").get(getRawData);
router.route("/allData").get(getAllData);
router.route("/getKeywordSearchData").get(getKeywordSearchData);
router.route("/gitCitySelectionData").get(getCitySelectionData);

module.exports = router;