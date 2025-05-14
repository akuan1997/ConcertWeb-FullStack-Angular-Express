import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, tap, finalize } from 'rxjs/operators';

// 重複使用你先前組件中的介面
// (請確保它們可以被存取，例如放在共用的模型檔案中或在此處定義)
export interface Concert {
  _id: string;
  tit: string;
  sdt: string[];       // 售票日期 - 此組件的關鍵
  prc: number[];
  pdt: string[];
  loc: string[];
  cit: string;
  int?: string;
  web?: string;
  url?: string;
  pin?: string;
  tim: Date | string;
}

export interface ApiConcertResponse {
  data: Concert[];
  page: number;
  totalPages: number;
  nbHits: number;
}

@Component({
  selector: 'app-home-upcoming-ticketing-info',
  standalone: true,
  imports: [
    CommonModule, // 用於 *ngIf, *ngFor 等指令
    // HttpClientModule 通常在非獨立組件的 AppModule 或 CoreModule 中匯入，
    // 但對於獨立組件，HttpClient 通常是 'root' 級別提供或透過 appConfig 中的 provideHttpClient() 提供。
    // 如果遇到問題，請確保 HttpClient 已正確提供。
  ],
  providers: [DatePipe], // 用於在模板中格式化日期 (如果需要)
  templateUrl: './home-upcoming-ticketing-info.component.html',
  styleUrls: ['./home-upcoming-ticketing-info.component.css']
})
export class HomeUpcomingTicketingInfoComponent implements OnInit {
  private http = inject(HttpClient);
  private datePipe = inject(DatePipe); // 用於格式化顯示日期

  upcomingTicketingConcerts: Concert[] = []; // 儲存篩選後的演唱會資料
  isLoading: boolean = false;
  errorMessage: string | null = null;

  private apiUrl = 'http://localhost:3000/api/data'; // 獲取所有資料

  ngOnInit(): void {
    this.fetchAndFilterConcerts();
  }

  fetchAndFilterConcerts(): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.upcomingTicketingConcerts = [];

    this.http.get<ApiConcertResponse>(this.apiUrl).pipe(
      map(response => {
        if (!response || !response.data || !Array.isArray(response.data)) {
          console.warn('API 回應格式不符預期或無資料:', response);
          return []; // 如果資料不如預期，則返回空陣列
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0); // 將今天日期標準化為當天的開始時間

        const sevenDaysLater = new Date(today);
        sevenDaysLater.setDate(today.getDate() + 6); // 今天 + 6 天 = 7 天的區間 (包含今天)
        sevenDaysLater.setHours(23, 59, 59, 999); // 第 7 天的結束時間

        const filtered = response.data.filter(concert => {
          if (!concert.sdt || concert.sdt.length === 0) {
            return false; // 沒有售票日期
          }
          // 檢查是否有任何 sdt 在未來 7 天內
          return concert.sdt.some(sdtEntry =>
            this.isTicketingDateWithinRange(sdtEntry, today, sevenDaysLater)
          );
        });

        // 依照最早的售票日期 (sdt) 排序
        return filtered.sort((a, b) => {
          const earliestA = this.getEarliestValidSdtDate(a.sdt, today, sevenDaysLater);
          const earliestB = this.getEarliestValidSdtDate(b.sdt, today, sevenDaysLater);

          if (earliestA && earliestB) {
            return earliestA.getTime() - earliestB.getTime();
          }
          if (earliestA) return -1; // 如果 B 沒有有效日期，則 A 在前
          if (earliestB) return 1;  // 如果 A 沒有有效日期，則 B 在前
          return 0; // 沒有有效日期可供比較
        });
      }),
      tap(filteredConcerts => {
        this.upcomingTicketingConcerts = filteredConcerts;
        console.log('近期售票演唱會 (7天內):', this.upcomingTicketingConcerts);
      }),
      catchError(error => {
        console.error('API 呼叫失敗或處理過程中發生錯誤:', error);
        this.errorMessage = `資料載入或處理失敗: ${error.message || '請稍後再試'}`;
        return of([]); // 發生錯誤時返回空陣列，以防止中斷資料流
      }),
      finalize(() => {
        this.isLoading = false;
      })
    ).subscribe();
  }

  private parseDateString(dateStr: string): Date | null {
    // 預期格式為 "YYYY/MM/DD HH:mm" 或 "YYYY/MM/DD"
    try {
      const [datePart] = dateStr.split(' '); // 取 "YYYY/MM/DD" 部分
      const [year, month, day] = datePart.split('/').map(Number);

      if (isNaN(year) || isNaN(month) || isNaN(day) || month < 1 || month > 12 || day < 1 || day > 31) {
        // console.warn(`日期字串元件無效: ${dateStr}`);
        return null;
      }
      // JavaScript Date 建構函式中的月份是從 0 開始的
      const parsedDate = new Date(year, month - 1, day);
      parsedDate.setHours(0,0,0,0); // 標準化為當天開始時間以便比較
      return parsedDate;
    } catch (e) {
      // console.warn(`解析日期字串時發生錯誤: ${dateStr}`, e);
      return null;
    }
  }

  private isTicketingDateWithinRange(sdtEntry: string, startDate: Date, endDate: Date): boolean {
    const itemDate = this.parseDateString(sdtEntry);
    if (!itemDate) {
      return false;
    }
    // 檢查 itemDate 是否在 startDate 當天或之後，並且在 endDate 當天或之前
    return itemDate.getTime() >= startDate.getTime() && itemDate.getTime() <= endDate.getTime();
  }

  // 排序輔助函式。它會找出演唱會中實際落在我們 7 天區間內的最早 sdt 日期。
  public getEarliestValidSdtDate(sdtArray: string[], startDate: Date, endDate: Date): Date | null {
    let earliestDate: Date | null = null;
    for (const sdtEntry of sdtArray) {
      const currentDate = this.parseDateString(sdtEntry);
      if (currentDate && currentDate.getTime() >= startDate.getTime() && currentDate.getTime() <= endDate.getTime()) {
        if (!earliestDate || currentDate.getTime() < earliestDate.getTime()) {
          earliestDate = currentDate;
        }
      }
    }
    return earliestDate;
  }

  // 模板中顯示日期用的輔助函式
  todayForDisplay(): Date {
    const d = new Date();
    d.setHours(0,0,0,0);
    return d;
  }

  sevenDaysLaterForDisplay(): Date {
    const d = new Date();
    d.setHours(0,0,0,0);
    d.setDate(d.getDate() + 6);
    d.setHours(23,59,59,999);
    return d;
  }

  // 用於顯示的輔助函式 (可以移至共用的工具程式/服務中)
  formatArrayDisplay(arr: string[] | number[] | undefined, joiner: string = ', '): string {
    if (!arr || arr.length === 0) return '-';
    if (arr.length === 1 && arr[0] === ' -') return '-'; // 處理 Mongoose 的預設值
    return arr.join(joiner);
  }

  formatPriceDisplay(prices: number[] | undefined): string {
    if (!prices || prices.length === 0) return '洽詢主辦';
    return prices.map(p => `$${p}`).join(' / ');
  }

  formatDate(dateInput: Date | string | null | undefined, format: string = 'yyyy/MM/dd HH:mm'): string {
    if (!dateInput) { // 這會同時捕捉 null 和 undefined
      return '-';
    }
    try {
      return this.datePipe.transform(dateInput, format) || '-'; // 如果 transform 返回 null (例如無效日期)，也返回 '-'
    } catch (e) {
      console.warn('日期格式化錯誤:', dateInput, e);
      return String(dateInput); // 如果轉換失敗，返回原始字串
    }
  }
}
