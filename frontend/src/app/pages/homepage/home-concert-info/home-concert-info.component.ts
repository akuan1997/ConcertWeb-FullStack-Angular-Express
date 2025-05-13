import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common'; // 引入 DatePipe
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, tap, of, finalize } from 'rxjs';

// 1. 定義 Concert Interface (基於你的 Mongoose Schema)
export interface Concert {
  _id: string;         // Mongoose 自動產生
  tit: string;         // 標題
  sdt: string[];       // 開始日期/時間 (陣列 of strings)
  prc: number[];       // 價格 (陣列 of numbers)
  pdt: string[];       // 活動日期/時間 (陣列 of strings)
  loc: string[];       // 地點 (陣列 of strings)
  cit: string;         // 城市
  int?: string;        // 介紹 (可選)
  web?: string;        // 官方網站 (可選)
  url?: string;        // 售票網址/活動網址 (可選)
  pin?: string;        // 置頂/圖片 URL (可選)
  tim: Date | string;  // API 排序用的時間戳 (後端是 Date，前端接收可能是 string)
}

// 2. 更新 ApiConcertResponse 以使用 Concert Interface
export interface ApiConcertResponse {
  data: Concert[]; // <<--- 改成 Concert[]
  page: number;
  totalPages: number;
  nbHits: number;
}

@Component({
  selector: 'app-home-concert-info',
  standalone: true,
  imports: [
    CommonModule,
    // HttpClientModule, // 已由 provideHttpClient() 全局提供
  ],
  providers: [DatePipe], // 為了在 TS 中使用 DatePipe (如果需要，模板中通常不用)
  templateUrl: './home-concert-info.component.html',
  styleUrls: ['./home-concert-info.component.css']
})
export class HomeConcertInfoComponent implements OnInit {
  private http = inject(HttpClient);
  private datePipe = inject(DatePipe); // 注入 DatePipe

  concertsResponse: ApiConcertResponse | null = null; // <<--- 更新屬性名和類型
  isLoading: boolean = false;
  errorMessage: string | null = null;

  private apiUrl = 'http://localhost:3000/api/more-data';

  ngOnInit(): void {
    this.fetchConcertInfo();
  }

  fetchConcertInfo(): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.concertsResponse = null;

    let params = new HttpParams();
    params = params.append('page', '1');
    params = params.append('limit', '6'); // 保持請求 6 筆

    this.http.get<ApiConcertResponse>(this.apiUrl, { params })
      .pipe(
        tap(response => {
          console.log('API 成功回應 (強型別):', response);
          this.concertsResponse = response;
        }),
        catchError(error => {
          console.error('API 呼叫失敗:', error);
          this.errorMessage = `資料載入失敗: ${error.message || '請稍後再試'}`;
          return of(null);
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
