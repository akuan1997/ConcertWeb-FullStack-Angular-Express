const express = require("express");
const router = express.Router();

const {
    getAllData,
    getMoreData,
    getSearchData
} = require("../controller/concert")

router.route("/data").get(getAllData);
router.route("/more-data").get(getMoreData);
router.route("/search").get(getSearchData);

module.exports = router;