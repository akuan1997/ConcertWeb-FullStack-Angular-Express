const concertModel = require("../models/concert");
const asyncWrapper = require("../middleware/async");

const getRawData = asyncWrapper(async (req, res) => {
    // 不做任何的分頁以及查詢
    const data = await concertModel.find()
        .sort({"tim": -1}) // 依 tim 降序排列，也就是說按照最新到最舊

    res.status(200).json({
        data,
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
        nbHits: totalItems
    });
});

const getCitySelectionData = asyncWrapper(async (req, res) => {
    const page = parseInt(req.query.page) || 1; // 預設第一頁
    const limit = parseInt(req.query.limit) || 30; // 每頁 30 筆
    const skip = (page - 1) * limit;

    const { cit } = req.query; // 從 req.query 中解構出 cit
    const queryObject = {}; // 初始化一個空的查詢物件
    if (cit) { // 如果請求的 query 中包含了 cit 參數
        queryObject.cit = cit;  // 將 cit 添加到查詢條件中，這會查找 cit 欄位完全等於提供的 cit 值的文檔
    }

    // 使用 queryObject 來執行查詢
    const data = await concertModel.find(queryObject)
        .sort({"tim": -1}) // 依 tim 降序排列，也就是說按照最新到最舊
        .skip(skip) // 跳過前面幾筆
        .limit(limit); // 取出指定數量的資料;

    // 3. 獲取符合 queryObject 條件的總文檔數 (用於前端計算總頁數)
    //    這個 countDocuments 應該在 .skip() 和 .limit() 之前，或者對原始 queryObject 進行
    const totalItems = await concertModel.countDocuments(queryObject);

    // 4. 返回分頁後的數據和總數
    res.status(200).json({
        data,             // 這是分頁後的數據
        nbHits: totalItems, // 這是符合 cit 條件的總數據量
        page: page,       // 可以選擇性地返回當前頁碼
        totalPages: Math.ceil(totalItems / limit) // 可以選擇性地返回總頁數
    });
});

// 假設你有這兩個輔助函數 (如果沒有，你需要實作它們)
// 它的作用是將 "YYYYMMDD" 格式的查詢參數轉換為 Date 物件
function parseQueryDateParam(dateStr) {
    if (!dateStr || !/^\d{8}$/.test(dateStr)) {
        return null;
    }
    const year = parseInt(dateStr.substring(0, 4), 10);
    const month = parseInt(dateStr.substring(4, 6), 10) - 1; // 月份是 0-indexed
    const day = parseInt(dateStr.substring(6, 8), 10);
    const date = new Date(year, month, day);
    // 驗證日期是否有效 (例如 20230230 是無效的)
    if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
        return null;
    }
    return date;
}

// 它的作用是將 pdt 陣列中的日期字串轉換為 Date 物件
// 你需要根據 pdt 中實際儲存的日期格式來調整此函數
function parsePdtDateString(pdtDateStr) {
    // 範例：假設 pdt 中的日期是 ISO 格式字串
    const date = new Date(pdtDateStr);
    return isNaN(date.getTime()) ? null : date; // 如果解析失敗返回 null
}

const getDateSearchData = asyncWrapper(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 30;
    const skip = (page - 1) * limit;

    const { start_date, end_date } = req.query;

    let startDateObj = null;
    if (start_date) {
        startDateObj = parseQueryDateParam(start_date);
        if (startDateObj) {
            startDateObj.setHours(0, 0, 0, 0);
        } else {
            return res.status(400).json({ message: "無效的 start_date 格式。請使用 YYYYMMDD。" });
        }
    }

    let endDateObj = null;
    if (end_date) {
        endDateObj = parseQueryDateParam(end_date);
        if (endDateObj) {
            endDateObj.setHours(23, 59, 59, 999);
        } else {
            return res.status(400).json({ message: "無效的 end_date 格式。請使用 YYYYMMDD。" });
        }
    }

    if (startDateObj && endDateObj && startDateObj > endDateObj) {
        return res.status(400).json({ message: "start_date 不能晚於 end_date。" });
    }

    // 處理沒有日期參數的情況 (這個部分可以保持不變，它會按 tim 排序)
    if (!startDateObj && !endDateObj) {
        const allData = await concertModel.find()
            .sort({"tim": -1}) // 如果沒有日期篩選，仍按 tim 排序
            .skip(skip)
            .limit(limit);
        const totalItems = await concertModel.countDocuments();
        return res.status(200).json({
            data: allData,
            page,
            totalPages: Math.ceil(totalItems / limit),
            nbHits: totalItems
        });
    }

    const allItems = await concertModel.find({});

    const filteredByDate = allItems.filter(item => {
        if (!item.pdt || !Array.isArray(item.pdt) || item.pdt.length === 0) {
            return false;
        }
        return item.pdt.some(pdtStr => {
            const pdtDate = parsePdtDateString(pdtStr);
            if (!pdtDate) {
                return false;
            }
            let isInRange = true;
            if (startDateObj && pdtDate < startDateObj) {
                isInRange = false;
            }
            if (endDateObj && pdtDate > endDateObj) {
                isInRange = false;
            }
            return isInRange;
        });
    });

    // --- 排序邏輯修改開始 ---
    const sortedData = filteredByDate.sort((a, b) => {
        // 輔助函數：從 pdt 陣列中獲取最早的有效日期
        const getEarliestPdtDate = (pdtArray) => {
            if (!pdtArray || pdtArray.length === 0) return null;
            return pdtArray
                .map(pdtStr => parsePdtDateString(pdtStr)) // 將字串轉換為 Date 物件
                .filter(date => date !== null)             // 過濾掉無效日期
                .sort((d1, d2) => d1.getTime() - d2.getTime()) // 按時間升冪排序
                [0] || null; // 取第一個 (最早的)，如果沒有有效日期則為 null
        };

        const earliestPdtA = getEarliestPdtDate(a.pdt);
        const earliestPdtB = getEarliestPdtDate(b.pdt);

        // 處理其中一個或兩個都沒有有效 pdt 日期的情況
        if (!earliestPdtA && !earliestPdtB) return 0; // 兩者都無，視為相等
        if (!earliestPdtA) return 1;  // 只有 A 無，A 排在後面
        if (!earliestPdtB) return -1; // 只有 B 無，B 排在後面 (即 A 在前)

        // 比較最早的 pdt 日期 (升冪排序：從 0101 到 1231)
        return earliestPdtA.getTime() - earliestPdtB.getTime();
    });
    // --- 排序邏輯修改結束 ---

    const totalFilteredItems = sortedData.length; // 注意：這裡的 sortedData 是按 pdt 排序後的
    const paginatedData = sortedData.slice(skip, skip + limit);

    res.status(200).json({
        data: paginatedData,
        page,
        totalPages: Math.ceil(totalFilteredItems / limit),
        nbHits: totalFilteredItems
    });
});

module.exports = {
    getRawData,
    getAllData,
    getKeywordSearchData,
    getCitySelectionData,
    getDateSearchData
}