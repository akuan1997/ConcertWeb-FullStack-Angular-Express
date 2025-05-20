import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router'; // Added Router
import { HttpClient, HttpParams } from '@angular/common/http';
import { Subscription, of, Observable, finalize } from 'rxjs'; // Added finalize
import { switchMap, catchError, tap, distinctUntilChanged, map } from 'rxjs/operators'; // Added distinctUntilChanged, map
import { Concert } from '../../../shared/models/concert.model';

// Re-using the same response interface
export interface ApiConcertResponse {
  data: Concert[];
  nbHits: number;
  page?: number;
  totalPages?: number;
}

// --- NEW: Define DisplayMode type ---
export type DisplayMode = 'loadMore' | 'pagination';

@Component({
  selector: 'app-date-results',
  standalone: true,
  imports: [
    CommonModule,
  ],
  templateUrl: './date-results.component.html',
  styleUrls: ['./date-results.component.css']
})
export class DateResultsComponent implements OnInit, OnDestroy {
  searchResults: Concert[] = [];
  isLoading: boolean = false;
  errorMessage: string | null = null;

  // Date search specific
  startDateQuery: string | null = null;
  endDateQuery: string | null = null;
  displayStartDate: string | null = null;
  displayEndDate: string | null = null;

  // --- MODIFIED/NEW: State for display modes and loading ---
  displayMode: DisplayMode = 'loadMore'; // Default mode
  isLoadingMore: boolean = false;        // For "Load More" button
  allDataLoaded: boolean = false;        // For "Load More" mode

  currentPage: number = 0; // For loadMore: last loaded page. For pagination: current active page.
  totalPages: number = 0;
  itemsPerPage: number = 30;
  paginationPages: number[] = [];
  totalItems: number = 0;

  private routeSubscription!: Subscription;
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private router = inject(Router); // Inject Router

  private apiUrl = `${window.location.origin}/api/getDateSearchData`;

  ngOnInit(): void {
    this.routeSubscription = this.route.queryParams.pipe(
      // map is used to ensure we only react to changes in relevant query params
      map(params => ({
        start_date: params['start_date'],
        end_date: params['end_date'],
        // page: params['page'] // We'll manage page internally for pagination mode
      })),
      distinctUntilChanged((prev, curr) =>
        prev.start_date === curr.start_date && prev.end_date === curr.end_date
      ),
      tap(params => {
        console.log('Date params changed or initial load:', params);
        const newStartDate = params.start_date || null;
        const newEndDate = params.end_date || null;

        // Check if date range actually changed
        if (this.startDateQuery !== newStartDate || this.endDateQuery !== newEndDate) {
          this.startDateQuery = newStartDate;
          this.endDateQuery = newEndDate;
          this.displayStartDate = this.formatDisplayDate(this.startDateQuery);
          this.displayEndDate = this.formatDisplayDate(this.endDateQuery);
          this.loadInitialDataForDateRange(); // Full reset if date range changes
        } else if (!this.searchResults.length && (this.startDateQuery || this.endDateQuery) && !this.isLoading) {
          // If no results yet for the current date range (e.g., initial load via direct URL)
          this.loadInitialDataForDateRange();
        } else if (!this.startDateQuery && !this.endDateQuery && !this.errorMessage) {
          this.resetStateForNoQuery();
        }
      })
    ).subscribe();

    // Handle initial load if params are already there
    const initialParams = this.route.snapshot.queryParams;
    if ((initialParams['start_date'] || initialParams['end_date']) && !this.searchResults.length) {
      this.startDateQuery = initialParams['start_date'] || null;
      this.endDateQuery = initialParams['end_date'] || null;
      this.displayStartDate = this.formatDisplayDate(this.startDateQuery);
      this.displayEndDate = this.formatDisplayDate(this.endDateQuery);
      this.loadInitialDataForDateRange();
    } else if (!initialParams['start_date'] && !initialParams['end_date'] && !this.errorMessage && !this.isLoading) {
      this.resetStateForNoQuery();
    }
  }

  private resetStateForNoQuery(): void {
    this.searchResults = [];
    this.isLoading = false;
    this.isLoadingMore = false;
    this.errorMessage = '請提供開始日期或結束日期以進行搜尋。';
    this.totalItems = 0;
    this.totalPages = 0;
    this.currentPage = 0;
    this.allDataLoaded = false;
    this.paginationPages = [];
  }


  // --- NEW: Initialize data loading based on date range and current mode ---
  loadInitialDataForDateRange(): void {
    if (!this.startDateQuery && !this.endDateQuery) {
      this.resetStateForNoQuery();
      return;
    }
    this.searchResults = [];
    this.allDataLoaded = false;
    this.totalPages = 0;
    this.totalItems = 0;
    this.errorMessage = null; // Clear previous errors
    this.currentPage = (this.displayMode === 'loadMore') ? 0 : 1;
    this.fetchConcertsByDate();
  }

  // --- MODIFIED: Central data fetching logic ---
  fetchConcertsByDate(pageToFetch?: number): void {
    if (!this.startDateQuery && !this.endDateQuery) {
      this.errorMessage = '請提供開始日期或結束日期進行搜尋。';
      this.isLoading = false;
      this.isLoadingMore = false;
      return;
    }

    if (this.displayMode === 'loadMore' && this.allDataLoaded && pageToFetch === undefined) {
      console.log('Load More: All data already loaded for the current date range.');
      return;
    }
    if (this.isLoading || (this.displayMode === 'loadMore' && this.isLoadingMore)) {
      console.log('Already loading data for the current date range.');
      return;
    }

    if (this.displayMode === 'loadMore' && pageToFetch === undefined) {
      this.isLoadingMore = true;
    } else {
      this.isLoading = true;
    }
    // Clear error only if we are attempting a new fetch, not for initial "no query"
    if(this.startDateQuery || this.endDateQuery) {
      this.errorMessage = null;
    }


    let targetPage: number;
    if (this.displayMode === 'pagination') {
      // 如果 pageToFetch 已定義 (例如，用戶點擊分頁按鈕)，則使用它。
      // 否則 (pagination 模式的初次載入)，使用 this.currentPage (已由 loadInitialDataForDateRange 設為 1)。
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
      if (this.displayMode === 'loadMore') this.allDataLoaded = true;
      return;
    }
    if (this.displayMode === 'pagination' && targetPage < 1) {
      console.warn(`Attempted to fetch invalid page ${targetPage}`);
      this.isLoading = false;
      this.isLoadingMore = false;
      return;
    }

    let httpParams = new HttpParams()
      .set('page', targetPage.toString())
      .set('limit', this.itemsPerPage.toString());

    if (this.startDateQuery) {
      httpParams = httpParams.set('start_date', this.startDateQuery);
    }
    if (this.endDateQuery) {
      httpParams = httpParams.set('end_date', this.endDateQuery);
    }

    this.http.get<ApiConcertResponse>(this.apiUrl, { params: httpParams }).pipe(
      tap(response => this.handleApiResponse(response, targetPage)),
      catchError(err => {
        console.error(`API Error fetching date filtered data (start: ${this.startDateQuery}, end: ${this.endDateQuery}, page: ${targetPage}):`, err);
        let specificError = '無法載入指定日期的演唱會資訊，請稍後再試。';
        if (err.status === 400 && err.error && err.error.message) {
          specificError = err.error.message;
        }
        this.errorMessage = specificError;
        if (this.displayMode === 'loadMore') this.allDataLoaded = true;
        return of({ data: [], nbHits: this.totalItems, page: targetPage, totalPages: this.totalPages });
      }),
      finalize(() => {
        this.isLoading = false;
        this.isLoadingMore = false;
      })
    ).subscribe();
  }

  // --- MODIFIED: handleApiResponse adapted for modes ---
  private handleApiResponse(response: ApiConcertResponse, fetchedPage: number): void {
    if (response && response.data) {
      this.totalItems = response.nbHits;
      this.totalPages = response.totalPages !== undefined
        ? response.totalPages
        : Math.ceil(this.totalItems / this.itemsPerPage);

      if (this.displayMode === 'loadMore') {
        this.searchResults = [...this.searchResults, ...response.data];
        this.currentPage = fetchedPage;
        if (this.currentPage >= this.totalPages || response.data.length < this.itemsPerPage || response.data.length === 0) {
          this.allDataLoaded = true;
        }
      } else { // Pagination mode
        this.searchResults = response.data;
        this.currentPage = fetchedPage;
      }

      if (this.searchResults.length === 0 && (this.startDateQuery || this.endDateQuery) && !this.errorMessage) {
        // Message is handled by the template for no results.
      }
      this.calculatePaginationPages();
    } else {
      console.warn('API response missing data or unexpected format for date range', response);
      if (this.searchResults.length === 0) {
        this.errorMessage = '從伺服器獲取到的資料格式不正確。';
      }
      if (this.displayMode === 'loadMore') this.allDataLoaded = true;
    }
  }

  // --- NEW: Method to switch display mode ---
  setDisplayMode(mode: DisplayMode): void {
    if (this.displayMode === mode || this.isLoading || this.isLoadingMore) return;
    this.displayMode = mode;
    this.loadInitialDataForDateRange(); // Reload data for the new mode
  }

  // --- MODIFIED: goToPage for pagination mode ---
  goToPage(page: number): void {
    if (this.displayMode !== 'pagination' || this.isLoading) {
      return;
    }
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      this.fetchConcertsByDate(page);
    }
  }

  calculatePaginationPages(): void {
    if (this.totalPages === 0) {
      this.paginationPages = [];
      return;
    }
    const maxPagesToShow = 5;
    const sidePages = Math.floor(maxPagesToShow / 2);
    let startPage = Math.max(1, this.currentPage - sidePages);
    let endPage = Math.min(this.totalPages, this.currentPage + sidePages);

    if (this.currentPage - sidePages < 1) {
      endPage = Math.min(this.totalPages, maxPagesToShow);
    }
    if (this.currentPage + sidePages > this.totalPages) {
      startPage = Math.max(1, this.totalPages - maxPagesToShow + 1);
    }
    if (this.totalPages <= maxPagesToShow) {
      startPage = 1;
      endPage = this.totalPages;
    }
    this.paginationPages = Array.from({ length: (endPage - startPage) + 1 }, (_, i) => startPage + i);
  }

  private formatDisplayDate(dateStr: string | null): string | null {
    if (!dateStr || dateStr.length !== 8) return dateStr;
    try {
      const year = dateStr.substring(0, 4);
      const month = dateStr.substring(4, 6);
      const day = dateStr.substring(6, 8);
      return `${year}/${month}/${day}`;
    } catch (e) {
      return dateStr;
    }
  }

  formatArrayDisplay(arr: string[] | undefined | null, separator: string = '、'): string {
    if (!arr || arr.length === 0) return '未提供';
    const filteredArr = arr.filter(item => item && item.trim() !== '' && item.trim() !== '-');
    if (filteredArr.length === 0) return '未提供';
    return filteredArr.join(separator);
  }

  formatPriceDisplay(prices: number[] | undefined): string {
    if (!prices || prices.length === 0 || (prices.length === 1 && prices[0] === -1)) return '洽詢主辦';
    if (prices.every(p => p === 0)) return '免費或洽詢';
    return prices.map(p => (p > 0 ? `$${p}` : '洽詢')).join(' / ');
  }

  ngOnDestroy(): void {
    if (this.routeSubscription) {
      this.routeSubscription.unsubscribe();
    }
  }
}
