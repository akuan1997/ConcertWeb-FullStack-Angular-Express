import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, tap, of, finalize } from 'rxjs';
import { Concert } from '../../../shared/models/concert.model';

export interface ApiConcertResponse {
  data: Concert[];
  page: number;       // 當前頁碼 (從 API 回應)
  totalPages: number; // 總頁數 (從 API 回應)
  nbHits: number;     // 總項目數 (從 API 回應)
}

type DisplayMode = 'loadMore' | 'pagination'; // Type for display mode

@Component({
  selector: 'app-all-concert-info',
  standalone: true,
  imports: [CommonModule],
  providers: [DatePipe],
  templateUrl: './all-concert-info.component.html',
  styleUrls: ['./all-concert-info.component.css'] // Corrected: styleUrls instead of styleUrl
})
export class AllConcertInfoComponent implements OnInit {
  private http = inject(HttpClient);
  private datePipe = inject(DatePipe);

  // --- State Variables ---
  allConcerts: Concert[] = [];
  isLoading: boolean = false;
  isLoadingMore: boolean = false; // Specifically for loadMore button
  errorMessage: string | null = null;

  // Pagination & Mode State
  displayMode: DisplayMode = 'loadMore'; // Default mode
  currentPage: number = 0; // For loadMore: last loaded page (0 means none loaded). For pagination: current active page (1-indexed).
  totalPages: number = 0;
  itemsPerPage: number = 30;
  allDataLoaded: boolean = false; // For loadMore mode: if all pages are loaded
  totalItems: number = 0; // Store total number of items

  // API Endpoint
  private apiUrl = `${window.location.origin}/api/allData`;

  ngOnInit(): void {
    this.loadInitialData();
  }

  loadInitialData(): void {
    this.allConcerts = [];
    this.allDataLoaded = false;
    this.errorMessage = null;
    this.totalPages = 0;
    this.totalItems = 0;

    // 根據當前模式設置 currentPage
    if (this.displayMode === 'pagination') {
      this.currentPage = 1; // Pagination 模式從第 1 頁開始
    } else { // loadMore 模式
      this.currentPage = 0; // loadMore 模式的 currentPage 代表已載入的最後一頁 (0 表示還未載入)
    }
    this.loadConcerts();
  }

  loadConcerts(pageToFetch?: number): void {
    if (this.displayMode === 'loadMore' && this.allDataLoaded && pageToFetch === undefined) {
      console.log('Load More: All data already loaded.');
      return;
    }
    if (this.isLoading || (this.displayMode === 'loadMore' && this.isLoadingMore)) {
      console.log('Already loading data.');
      return;
    }

    if (this.displayMode === 'loadMore' && pageToFetch === undefined) {
      this.isLoadingMore = true;
    } else {
      this.isLoading = true;
    }
    this.errorMessage = null;

    let targetPage: number;

    if (this.displayMode === 'pagination') {
      // 如果 pageToFetch 已定義 (用戶點擊分頁按鈕)，則使用它。
      // 否則 (pagination 模式的初次載入)，使用 this.currentPage (已由 loadInitialData 設為 1)。
      targetPage = pageToFetch !== undefined ? pageToFetch : this.currentPage;
    } else { // loadMore mode
      // 對於 loadMore 模式，currentPage 是最後成功載入的頁面 (初始為 0)。
      // 所以總是獲取下一頁。
      targetPage = this.currentPage + 1;
    }

    if (this.totalPages > 0 && targetPage > this.totalPages) {
      console.warn(`Attempted to fetch page ${targetPage} but total pages is ${this.totalPages}`);
      this.isLoading = false;
      this.isLoadingMore = false;
      if (this.displayMode === 'loadMore') this.allDataLoaded = true; // Mark as loaded if tried to go past
      return;
    }
    // For pagination, ensure targetPage is at least 1 (should be guaranteed by logic above)
    if (this.displayMode === 'pagination' && targetPage < 1) {
      console.warn(`Attempted to fetch invalid page ${targetPage} for pagination`);
      this.isLoading = false;
      this.isLoadingMore = false;
      return;
    }

    let params = new HttpParams()
      .set('page', targetPage.toString())
      .set('limit', this.itemsPerPage.toString());

    this.http.get<ApiConcertResponse>(this.apiUrl, { params })
      .pipe(
        tap(response => {
          if (response && response.data) {
            this.totalItems = response.nbHits; // Store total items
            this.totalPages = response.totalPages; // Always update totalPages from API

            if (this.displayMode === 'loadMore') {
              this.allConcerts = [...this.allConcerts, ...response.data];
              this.currentPage = response.page; // API returns 1-indexed page
              if (this.currentPage >= this.totalPages || response.data.length < this.itemsPerPage || response.data.length === 0) {
                this.allDataLoaded = true;
              }
            } else { // Pagination mode
              this.allConcerts = response.data;
              this.currentPage = response.page; // API returns 1-indexed page
            }

            if (this.allConcerts.length === 0 && this.totalItems > 0) {
              // This case means API returned empty data for a page that should have data,
              // or totalItems is non-zero but first page is empty.
              // The 'No results' message in HTML will be based on allConcerts.length and totalItems.
            }

          } else {
            console.warn('API response missing data or unexpected format:', response);
            if (this.allConcerts.length === 0) {
              this.errorMessage = '無法從伺服器獲取有效的資料格式。';
            }
            if (this.displayMode === 'loadMore') this.allDataLoaded = true; // Stop further load more on bad response
          }
        }),
        catchError(error => {
          console.error('API call or data processing failed:', error);
          this.errorMessage = `資料載入失敗: ${error.message || '請稍後再試'}`;
          if (this.displayMode === 'loadMore') this.allDataLoaded = true; // Stop further load more on error
          return of(null); // Or return an empty response structure: of({ data: [], page: targetPage, totalPages: this.totalPages, nbHits: this.totalItems })
        }),
        finalize(() => {
          this.isLoading = false;
          this.isLoadingMore = false;
        })
      )
      .subscribe();
  }

  // --- Mode Switching ---
  setDisplayMode(mode: DisplayMode): void {
    if (this.displayMode === mode || this.isLoading || this.isLoadingMore) return;
    this.displayMode = mode;
    this.loadInitialData(); // Reload data for the new mode
  }

  // --- Pagination Helpers ---
  goToPage(page: number): void {
    if (this.displayMode !== 'pagination' || this.isLoading) {
      return;
    }
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      this.loadConcerts(page);
    }
  }

  // Getter for pagination pages (for simple pagination UI)
  get paginationPages(): number[] {
    if (this.totalPages <= 0) return [];

    const maxPagesToShow = 5; // Maximum number of page links to show
    const pages: number[] = [];
    let startPage: number, endPage: number;

    if (this.totalPages <= maxPagesToShow) {
      // Less than or equal to maxPagesToShow, so show all pages
      startPage = 1;
      endPage = this.totalPages;
    } else {
      // More than maxPagesToShow, so calculate start and end pages with ellipsis logic
      const maxPagesBeforeCurrentPage = Math.floor(maxPagesToShow / 2);
      const maxPagesAfterCurrentPage = Math.ceil(maxPagesToShow / 2) - 1;

      if (this.currentPage <= maxPagesBeforeCurrentPage) {
        // Current page is near the start
        startPage = 1;
        endPage = maxPagesToShow;
      } else if (this.currentPage + maxPagesAfterCurrentPage >= this.totalPages) {
        // Current page is near the end
        startPage = this.totalPages - maxPagesToShow + 1;
        endPage = this.totalPages;
      } else {
        // Current page is somewhere in the middle
        startPage = this.currentPage - maxPagesBeforeCurrentPage;
        endPage = this.currentPage + maxPagesAfterCurrentPage;
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
    // If you want ellipsis, you'd need more logic here to add '...'
    // and potentially the first/last page if they are not in the 'pages' array.
    // The 'calculatePaginationPages' from your other components is a good reference for that.
  }


  // --- Formatting Helpers ---
  formatArrayDisplay(arr: string[] | number[] | undefined, joiner: string = '、'): string {
    if (!arr || arr.length === 0) return '未提供';
    // Filter out empty or placeholder values before joining
    const filteredArr = arr.filter(item => item && String(item).trim() !== '' && String(item).trim() !== '-');
    if (filteredArr.length === 0) return '未提供';
    return filteredArr.join(joiner);
  }

  formatPriceDisplay(prices: number[] | undefined): string {
    if (!prices || prices.length === 0 || (prices.length === 1 && prices[0] === -1)) return '洽詢主辦';
    if (prices.every(p => p === 0)) return '免費或洽詢';
    return prices.map(p => (p > 0 ? `$${p}` : '洽詢')).join(' / ');
  }

  formatDate(dateInput: Date | string | undefined, format: string = 'yyyy/MM/dd HH:mm'): string {
    if (!dateInput) return '未提供';
    try {
      // Check if it's a 'pdt' or 'sdt' style array
      if (Array.isArray(dateInput) && dateInput.length > 0) {
        // Assuming you want to format the first date in the array, or join them
        // This part needs clarification based on how `concert.pdt` or `concert.sdt` are structured
        // For now, let's assume it's a single date string if passed here, or you'd pre-process it.
        // If `dateInput` can be an array of dates, you need to decide how to display them.
        // Example: return dateInput.map(d => this.datePipe.transform(d, format) || String(d)).join('、');
      }
      const transformedDate = this.datePipe.transform(dateInput, format);
      return transformedDate || String(dateInput); // Fallback to original if transform fails
    } catch (e) {
      console.warn('日期格式化錯誤:', dateInput, e);
      return String(dateInput); // Fallback to original on error
    }
  }
}
