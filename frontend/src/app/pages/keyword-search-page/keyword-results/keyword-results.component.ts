import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router'; // Params 通常不需要直接導入
import { Subject, of } from 'rxjs';
import { takeUntil, catchError, tap, finalize } from 'rxjs/operators'; // switchMap 可能不需要了
import { Concert } from '../../../shared/models/concert.model';

export interface ApiKeywordSearchResponse {
  data: Concert[];
  page: number;
  totalPages: number;
}

@Component({
  selector: 'app-keyword-results', // <--- 假設您的選擇器是這個
  standalone: true,
  imports: [CommonModule],
  providers: [DatePipe],
  templateUrl: './keyword-results.component.html', // <--- 假設 HTML 文件名
  styleUrls: ['./keyword-results.component.css']   // <--- 假設 CSS 文件名
})
export class KeywordResultsComponent implements OnInit, OnDestroy { // <--- 假設類名是這個
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private datePipe = inject(DatePipe);

  searchResults: Concert[] = [];
  isLoading: boolean = false;
  errorMessage: string | null = null;
  currentSearchText: string | null = null;

  currentPage: number = 1;
  totalPages: number = 0;
  itemsPerPage: number = 30;

  private destroy$ = new Subject<void>();

  private apiUrl = 'http://localhost:3000/api/getKeywordSearchData';

  ngOnInit(): void {
    this.route.queryParams
      .pipe(
        takeUntil(this.destroy$),
        tap(params => {
          const searchText = params['text'];
          const pageParam = params['page']; // 獲取 page 參數

          if (searchText && searchText !== this.currentSearchText) {
            // 搜尋詞變化
            this.currentSearchText = searchText;
            this.currentPage = pageParam ? parseInt(pageParam, 10) : 1; // 如果有 page 參數，使用它
            this.searchResults = [];
            this.totalPages = 0;
            this.fetchSearchResults();
          } else if (searchText && searchText === this.currentSearchText && pageParam) {
            // 僅頁碼變化
            const pageNum = parseInt(pageParam, 10);
            if (!isNaN(pageNum) && pageNum !== this.currentPage) {
              this.currentPage = pageNum;
              // 不清空 searchResults，因為是翻頁
              this.fetchSearchResults();
            }
          } else if (!searchText && this.currentSearchText !== null) {
            // 搜尋詞被移除
            this.currentSearchText = null;
            this.searchResults = [];
            this.totalPages = 0;
            this.currentPage = 1;
            this.errorMessage = "請在導覽列輸入關鍵字進行搜尋。";
          } else if (searchText && !pageParam && searchText === this.currentSearchText) {
            // 搜尋詞未變，且沒有 page 參數 (可能用戶直接訪問 /keywordSearch?text=xxx)
            // 如果 currentPage 不是 1，則可能需要重置到第一頁或按當前頁獲取
            if (this.currentPage !== 1) {
              this.currentPage = 1;
            }
            this.fetchSearchResults(); // 確保獲取數據
          }
        })
      )
      .subscribe();

    // 處理直接訪問時，URL 可能只有 text 參數的情況
    const initialSearchText = this.route.snapshot.queryParamMap.get('text');
    const initialPage = this.route.snapshot.queryParamMap.get('page');

    if (initialSearchText) {
      this.currentSearchText = initialSearchText;
      this.currentPage = initialPage ? parseInt(initialPage, 10) : 1;
      if (this.searchResults.length === 0) { // 避免重複加載
        this.fetchSearchResults();
      }
    } else {
      this.errorMessage = "請在導覽列輸入關鍵字進行搜尋。";
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  fetchSearchResults(): void { // 移除了 pageToFetch 參數，直接使用 this.currentPage
    if (!this.currentSearchText) {
      this.errorMessage = "搜尋關鍵字為空。";
      this.searchResults = [];
      this.totalPages = 0;
      return;
    }

    this.isLoading = true;
    this.errorMessage = null; // 清除之前的錯誤信息

    let params = new HttpParams()
      .set('text', this.currentSearchText)
      .set('page', this.currentPage.toString())
      .set('limit', this.itemsPerPage.toString());

    this.http.get<ApiKeywordSearchResponse>(this.apiUrl, { params })
      .pipe(
        takeUntil(this.destroy$),
        tap(response => {
          if (response && response.data) {
            this.searchResults = response.data;
            this.currentPage = response.page;
            this.totalPages = response.totalPages;
            if (response.data.length === 0 && this.currentPage === 1) { // 只有第一頁無結果才顯示找不到
              this.errorMessage = `找不到與 "${this.currentSearchText}" 相關的演唱會資訊。`;
            }
          } else {
            this.searchResults = [];
            this.totalPages = 0;
            this.errorMessage = '無法從伺服器獲取有效的搜尋結果格式。';
            console.warn('API response missing data or unexpected format:', response);
          }
        }),
        catchError(error => {
          console.error('API call for search failed:', error);
          this.errorMessage = `搜尋失敗: ${error.message || '請稍後再試'}`;
          this.searchResults = [];
          this.totalPages = 0;
          return of({} as ApiKeywordSearchResponse); // 返回一個空的符合類型的 Observable
        }),
        finalize(() => {
          this.isLoading = false;
        })
      )
      .subscribe();
  }

  goToPage(page: number): void {
    if (this.isLoading || page === this.currentPage || page < 1 || page > this.totalPages) {
      return;
    }
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { page: page }, // 只更新 page，text 參數會被保留 (因為 queryParamsHandling: 'merge' 的預設行為)
      queryParamsHandling: 'merge',
    });
    // ngOnInit 中的 queryParams observable 會監聽到變化並調用 fetchSearchResults
  }

  get paginationPages(): number[] {
    if (this.totalPages <= 0) return [];
    const pagesToShow = 5;
    const halfPagesToShow = Math.floor(pagesToShow / 2);
    let startPage = Math.max(1, this.currentPage - halfPagesToShow);
    let endPage = Math.min(this.totalPages, this.currentPage + halfPagesToShow);

    const delta = pagesToShow - (endPage - startPage + 1);
    if (delta > 0) {
      if (startPage === 1) {
        endPage = Math.min(this.totalPages, endPage + delta);
      } else if (endPage === this.totalPages) {
        startPage = Math.max(1, startPage - delta);
      }
    }
    if (this.totalPages <= pagesToShow) {
      startPage = 1;
      endPage = this.totalPages;
    }


    const pages: number[] = [];
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  }

  formatArrayDisplay(arr: string[] | number[] | undefined, joiner: string = '、'): string {
    if (!arr || arr.length === 0) return '-';
    if (arr.length === 1 && (arr[0] === ' -' || (typeof arr[0] === 'number' && arr[0] === -1))) return '-';
    return arr.join(joiner);
  }

  formatPriceDisplay(prices: number[] | undefined): string {
    if (!prices || prices.length === 0 || (prices.length === 1 && prices[0] === -1)) return '洽詢主辦';
    if (prices.every(p => p === 0)) return '免費或洽詢';
    return prices.map(p => (p > 0 ? `$${p}` : '洽詢')).join(' / ');
  }

  formatDate(dateInput: Date | string | undefined, format: string = 'yyyy/MM/dd HH:mm'): string {
    if (!dateInput) return '-';
    try {
      const transformedDate = this.datePipe.transform(dateInput, format);
      return transformedDate || String(dateInput);
    } catch (e) {
      console.warn('日期格式化錯誤:', dateInput, e);
      return String(dateInput);
    }
  }
}
