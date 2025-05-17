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

function parseQueryDateParam(dateStr) {
    if (!dateStr || !/^\d{8}$/.test(dateStr)) {
        return null;
    }
    const year = parseInt(dateStr.substring(0, 4), 10);
    const month = parseInt(dateStr.substring(4, 6), 10) - 1; // 月份是 0-indexed
    const day = parseInt(dateStr.substring(6, 8), 10);
    const date = new Date(year, month, day);

    if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
        console.warn(`[getDateSearchData] 查詢參數日期無效 (例如，日期超出範圍): "${dateStr}"`);
        return null;
    }
    return date;
}

// 輔助函數：將 pdt 陣列中的 "YYYY/MM/DD HH:mm" 日期字串轉換為 Date 物件
function parsePdtDateString(pdtDateStr) {
    if (typeof pdtDateStr !== 'string') {
        return null;
    }
    // 預期格式: "YYYY/MM/DD HH:mm"
    const parts = pdtDateStr.match(/^(\d{4})\/(\d{2})\/(\d{2}) (\d{2}):(\d{2})$/);
    if (!parts) {
        console.warn(`[getDateSearchData] pdt 日期字串格式不符預期: "${pdtDateStr}"`);
        return null;
    }

    const year = parseInt(parts[1], 10);
    const month = parseInt(parts[2], 10) - 1; // 月份是 0-indexed
    const day = parseInt(parts[3], 10);
    const hours = parseInt(parts[4], 10);
    const minutes = parseInt(parts[5], 10);

    const date = new Date(year, month, day, hours, minutes);

    // 再次驗證解析後的日期是否與輸入部分匹配
    if (
        date.getFullYear() !== year ||
        date.getMonth() !== month ||
        date.getDate() !== day ||
        date.getHours() !== hours ||
        date.getMinutes() !== minutes
    ) {
        console.warn(`[getDateSearchData] pdt 日期字串解析後無效 (例如，日期超出範圍): "${pdtDateStr}"`);
        return null;
    }
    return date;
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
            startDateObj.setHours(0, 0, 0, 0); // 確保是當天的開始
        } else {
            // parseQueryDateParam 內部已有 console.warn
            return res.status(400).json({ message: "無效的 start_date 格式。請使用 YYYYMMDD。" });
        }
    }

    let endDateObj = null;
    if (end_date) {
        endDateObj = parseQueryDateParam(end_date);
        if (endDateObj) {
            endDateObj.setHours(23, 59, 59, 999); // 確保是當天的結束
        } else {
            // parseQueryDateParam 內部已有 console.warn
            return res.status(400).json({ message: "無效的 end_date 格式。請使用 YYYYMMDD。" });
        }
    }

    if (startDateObj && endDateObj && startDateObj > endDateObj) {
        return res.status(400).json({ message: "start_date 不能晚於 end_date。" });
    }

    // 處理沒有日期參數的情況
    if (!startDateObj && !endDateObj) {
        // console.log("[getDateSearchData] 未提供日期參數，回退到按 'tim' 排序。");
        const allData = await concertModel.find()
            .sort({"tim": -1}) // 如果沒有日期篩選，按 'tim' 降冪排序
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

    // 警告：對於大型資料庫，find({}) 效能不佳
    // console.log("[getDateSearchData] 正在獲取所有項目進行客戶端篩選和排序 (大型資料庫可能效能不佳)...");
    const allItems = await concertModel.find({});

    const filteredByDate = allItems.filter(item => {
        if (!item.pdt || !Array.isArray(item.pdt) || item.pdt.length === 0) {
            return false; // 跳過沒有 pdt 或 pdt 為空的項目
        }
        // 檢查 pdt 陣列中的任何一個日期是否在範圍內
        return item.pdt.some(pdtStr => {
            const pdtDate = parsePdtDateString(pdtStr);
            if (!pdtDate) { // 如果此特定 pdt 項目解析失敗
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

    // --- 排序邏輯 ---
    // 輔助函數：從 pdt 陣列中獲取最早的有效日期
    const getEarliestPdtDate = (pdtArray) => {
        if (!pdtArray || pdtArray.length === 0) return null;
        const validDates = pdtArray
            .map(pdtStr => parsePdtDateString(pdtStr)) // 將字串轉換為 Date 物件
            .filter(date => date !== null);            // 過濾掉無效日期

        if (validDates.length === 0) return null;

        // 按時間升冪排序並取第一個
        return validDates.sort((d1, d2) => d1.getTime() - d2.getTime())[0];
    };

    // 1. 為每個篩選後的項目預先計算排序鍵 (最早的 pdt 日期)
    const itemsWithSortKey = filteredByDate.map(item => {
        // 如果 item 是 Mongoose 文檔，使用 toObject() 獲取純 JS 物件以附加屬性
        // 否則直接使用 item (假設它已經是普通物件)
        // 為了安全，可以複製一份，避免修改原始從 DB 獲取的物件 (雖然這裡只是讀取)
        const plainItem = item.toObject ? item.toObject() : { ...item };
        return {
            originalItem: plainItem,
            sortKey: getEarliestPdtDate(plainItem.pdt)
        };
    });

    // 2. 基於預計算的排序鍵進行排序 (升冪排序：從 0101 到 1231)
    itemsWithSortKey.sort((itemA, itemB) => {
        const earliestPdtA = itemA.sortKey;
        const earliestPdtB = itemB.sortKey;

        // 處理其中一個或兩個都沒有有效 pdt 日期 (sortKey 為 null) 的情況
        if (!earliestPdtA && !earliestPdtB) return 0; // 兩者都無，視為相等
        if (!earliestPdtA) return 1;  // 只有 A 無，A 排在後面 (將無日期的項目放在列表末尾)
        if (!earliestPdtB) return -1; // 只有 B 無，B 排在後面 (即 A 在前)

        return earliestPdtA.getTime() - earliestPdtB.getTime();
    });

    // 3. 從排序後的結果中提取原始項目
    const sortedData = itemsWithSortKey.map(item => item.originalItem);
    // --- 排序邏輯結束 ---

    const totalFilteredItems = sortedData.length;
    const paginatedData = sortedData.slice(skip, skip + limit);

    // console.log(`[getDateSearchData] 篩選並排序後，返回 ${paginatedData.length} 筆資料 (總符合條件 ${totalFilteredItems} 筆)。`);

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