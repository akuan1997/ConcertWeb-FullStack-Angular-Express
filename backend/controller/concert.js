const concertModel = require("../models/concert");
const asyncWrapper = require("../middleware/async");

const getRawData = asyncWrapper(async (req, res) => {
    // const page = parseInt(req.query.page) || 1; // 預設第一頁
    // const limit = parseInt(req.query.limit) || 30; // 每頁 30 筆
    // const skip = (page - 1) * limit;

    // 從 req.query 中解構出 cit
    const { cit } = req.query;

    // 初始化一個空的查詢物件
    const queryObject = {};

    // 如果請求的 query 中包含了 cit 參數
    if (cit) {
        queryObject.cit = cit;  // 將 cit 添加到查詢條件中，這會查找 cit 欄位完全等於提供的 cit 值的文檔
    }

    // 使用 queryObject 來執行查詢
    const data = await concertModel.find(queryObject)
        // .sort({"tim": -1}) // 依 tim 降序排列，也就是說按照最新到最舊
        // .skip(skip) // 跳過前面幾筆
        // .limit(limit); // 取出指定數量的資料;

    // const total = await concertModel.countDocuments(); // 總筆數
    // const totalPages = Math.ceil(total / limit); // 總頁數

    // 返回查詢結果
    res.status(200).json({
        data,
        // page,
        // totalPages,
        nbHits: data.length
    });
});

const getAllData = asyncWrapper(async (req, res) => {
    const page = parseInt(req.query.page) || 1; // 預設第一頁
    const limit = parseInt(req.query.limit) || 30; // 每頁 30 筆
    const skip = (page - 1) * limit;

    const data = await concertModel.find()
        .sort({"tim": -1}) // 依 tim 降序排列，也就是說按照最新到最舊
        .skip(skip) // 跳過前面幾筆
        .limit(limit); // 取出指定數量的資料

    const total = await concertModel.countDocuments(); // 總筆數
    const totalPages = Math.ceil(total / limit); // 總頁數

    res.status(200).json({
        data,
        page,
        totalPages,
        nbHits: data.length
    });
});

const getKeywordSearchData  = asyncWrapper(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 30;
    const searchText = req.query.text ? req.query.text.trim() : "";

    const query = {};

    if (searchText) {
        query.$or = [
            { tit: { $regex: searchText, $options: 'i' } },
            { int: { $regex: searchText, $options: 'i' } }
        ];
    }

    const data = await concertModel.find(query)
        .sort({ "tim": -1 }) // 依 tim 降序排列，也就是說按照最新到最舊
        .skip((page - 1) * limit)
        .limit(limit);

    const totalItems = await concertModel.countDocuments(query);
    const totalPages = Math.ceil(totalItems / limit);

    res.status(200).json({
        data,
        page,
        totalPages,
        nbHits: data.length
    });
});

module.exports = {
    getRawData,
    getAllData,
    getKeywordSearchData
}