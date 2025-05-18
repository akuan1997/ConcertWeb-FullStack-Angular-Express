import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common'; // 引入 DatePipe
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, tap, of, finalize, map } from 'rxjs'; // 引入 map 操作符
import { RouterLink } from '@angular/router';
import {Concert } from '../../../shared/models/concert.model';

// 2. 更新 ApiConcertResponse 以使用 Concert Interface
export interface ApiConcertResponse {
  data: Concert[];
  page: number; // 來自 API 的原始 page
  totalPages: number; // 來自 API 的原始 totalPages
  nbHits: number; // 來自 API 的原始 nbHits (可能是總筆數)
}

// 新增一個介面來表示我們實際在組件中使用的、處理過的資料結構
export interface ProcessedConcertResponse {
  data: Concert[];      // 處理後（例如，前6筆）的資料
  originalPage?: number; // 可選，保留原始 API 回傳的 page
  originalTotalPages?: number; // 可選，保留原始 API 回傳的 totalPages
  displayedHits: number; // 實際顯示的筆數
  totalAvailableHits?: number; // 從 API 獲取的總筆數 (如果 API 有提供)
}

@Component({
  selector: 'app-home-concert-info',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink
  ],
  providers: [DatePipe], // 為了在 TS 中使用 DatePipe (如果需要，模板中通常不用)
  templateUrl: './home-concert-info.component.html',
  styleUrls: ['./home-concert-info.component.css']
})

// ngOnInit，該方法會在 Angular 初始化完組件的資料綁定屬性後被調用。
export class HomeConcertInfoComponent implements OnInit {
  private http = inject(HttpClient); // httpClient 是 Angular 用來發送 HTTP 請求（例如 GET, POST）的服務
  private datePipe = inject(DatePipe); // DatePipe 用於將日期物件或字串格式化成特定格式的日期字串。

  processedConcertsResponse: ProcessedConcertResponse | null = null;
  isLoading: boolean = false;
  errorMessage: string | null = null;

  private apiUrl = `${window.location.origin}/api/data`;

  // 這是 OnInit 生命週期鉤子的實現。當組件初始化完成後，它會立即調用 fetchConcertInfo 方法來獲取演唱會資料。
  ngOnInit(): void {
    this.fetchConcertInfo();
  }

  fetchConcertInfo(): void {
    this.isLoading = true;
    this.errorMessage = null; // 清除之前的錯誤訊息。
    this.processedConcertsResponse  = null; // 清除之前獲取的資料。

    let params = new HttpParams(); // 建立一個 HttpParams 物件，用來設定 HTTP GET 請求的 URL 查詢參數。
    params = params.append('page', '1');
    params = params.append('limit', '6'); // limit=6 參數，表示希望 API 回傳 6 筆資料。

    // 使用 HttpClient 的 get 方法發送一個 HTTP GET 請求到 this.apiUrl。
    // <ApiConcertResponse>: 這是一個泛型參數，告訴 HttpClient 我們期望 API 回應的資料結構符合 ApiConcertResponse 類型。這有助於 TypeScript 進行型別檢查。
    // { params }: 將之前建立的 params 物件作為請求參數傳遞。
    // this.http.get<ApiConcertResponse>(this.apiUrl, { params })
    //   // .pipe(...): http.get 返回一個 RxJS Observable。
    //   // .pipe() 方法允許我們串接多個 RxJS 操作符來處理這個 Observable。
    //   .pipe(
    //     tap(response => {
    //       console.log('API 成功回應 (強型別):', response);
    //       this.concertsResponse = response;
    //     }),
    //     catchError(error => {
    //       console.error('API 呼叫失敗:', error);
    //       this.errorMessage = `資料載入失敗: ${error.message || '請稍後再試'}`;
    //       return of(null);
    //     }),
    //     finalize(() => {
    //       this.isLoading = false;
    //     })
    //   )
    //   // 這是觸發 Observable（即發送 HTTP 請求）並開始接收資料（或錯誤）的關鍵。
    //   // 因為成功和錯誤的處理邏輯已經分別在 tap 和 catchError 中完成，所以這裡的 subscribe() 可以不帶任何參數。如果沒有 subscribe()，HTTP 請求根本不會被發送。
    //   .subscribe();
    this.http.get<ApiConcertResponse>(this.apiUrl)
      .pipe(
        map(response => { // <<--- 2. 使用 map 操作符在資料流中轉換資料
          if (response && response.data) {
            // 假設演唱會資料是按時間倒序排列的，取前6筆
            // 如果不是，你可能需要先排序 response.data
            const latestSixConcerts = response.data.slice(0, 6);

            // 建立我們在組件中實際使用的資料結構
            const processedResponse: ProcessedConcertResponse = {
              data: latestSixConcerts,
              displayedHits: latestSixConcerts.length,
              originalPage: response.page, // 保留原始API的page資訊
              originalTotalPages: response.totalPages, // 保留原始API的totalPages資訊
              totalAvailableHits: response.nbHits // API回傳的總筆數
            };
            return processedResponse;
          }
          // 如果 API 回應不符合預期 (例如沒有 response.data)，則返回 null 或拋出錯誤
          // 這裡返回 null，讓 catchError 處理或讓 UI 顯示無資料
          console.warn('API 回應格式不正確或無資料:', response);
          return null;
        }),
        tap(processedResponse => { // tap 現在接收的是 map 處理後的 processedResponse
          if (processedResponse) {
            console.log('API 成功回應 (已處理前6筆):', processedResponse);
            this.processedConcertsResponse = processedResponse;
          } else {
            // 如果 map 返回 null (例如 API 回應格式不對)
            this.errorMessage = '無法處理從伺服器獲取的資料格式。';
          }
        }),
        catchError(error => {
          console.error('API 呼叫或資料處理失敗:', error);
          this.errorMessage = `資料載入失敗: ${error.message || '請稍後再試'}`;
          this.processedConcertsResponse = null; // 確保出錯時清空
          return of(null); // 讓 finalize 執行
        }),
        finalize(() => {
          this.isLoading = false;
        })
      )
      .subscribe();
  }

  // 3. 加入輔助函式用於格式化
  formatArrayDisplay(arr: string[] | number[] | undefined, joiner: string = ', '): string {
    if (!arr || arr.length === 0) return '-';
    // 檢查 Mongoose schema 中設定的空陣列預設值
    if (arr.length === 1 && arr[0] === ' -') return '-';
    return arr.join(joiner);
  }

  formatPriceDisplay(prices: number[] | undefined): string {
    if (!prices || prices.length === 0) return '洽詢主辦';
    return prices.map(p => `$${p}`).join(' / ');
  }

  // 使用 DatePipe 來格式化日期
  formatDate(dateInput: Date | string | undefined, format: string = 'yyyy/MM/dd HH:mm'): string {
    if (!dateInput) return '-';
    try {
      return this.datePipe.transform(dateInput, format) || '-';
    } catch (e) {
      console.warn('日期格式化錯誤:', dateInput, e);
      return String(dateInput); // 如果轉換失敗，返回原始字串
    }
  }
}
