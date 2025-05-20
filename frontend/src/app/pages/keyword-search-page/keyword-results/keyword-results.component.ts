import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, of, Observable } from 'rxjs';
import { takeUntil, catchError, tap, finalize, distinctUntilChanged, map } from 'rxjs/operators';
import { Concert } from '../../../shared/models/concert.model';

export interface ApiKeywordSearchResponse {
  data: Concert[];
  page: number;
  totalPages: number;
  nbHits: number;
}

export type DisplayMode = 'loadMore' | 'pagination';

@Component({
  selector: 'app-keyword-results',
  standalone: true,
  imports: [CommonModule],
  providers: [DatePipe],
  templateUrl: './keyword-results.component.html',
  styleUrls: ['./keyword-results.component.css']
})
export class KeywordResultsComponent implements OnInit, OnDestroy {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private datePipe = inject(DatePipe);

  searchResults: Concert[] = [];
  isLoading: boolean = false;
  errorMessage: string | null = null;
  currentSearchText: string | null = null;

  displayMode: DisplayMode = 'loadMore';
  isLoadingMore: boolean = false;
  allDataLoaded: boolean = false;

  currentPage: number = 0;
  totalPages: number = 0;
  itemsPerPage: number = 30;
  totalItems: number = 0;
  // paginationPages: number[] = []; // <--- REMOVE THIS LINE

  private destroy$ = new Subject<void>();
  private apiUrl = `${window.location.origin}/api/getKeywordSearchData`;

  ngOnInit(): void {
    this.route.queryParams
      .pipe(
        takeUntil(this.destroy$),
        map(params => ({ text: params['text'] })),
        distinctUntilChanged((prev, curr) => prev.text === curr.text),
        tap(params => {
          const searchText = params.text;
          if (searchText && searchText !== this.currentSearchText) {
            this.currentSearchText = searchText;
            this.loadInitialDataForKeyword();
          } else if (!searchText && this.currentSearchText !== null) {
            this.resetStateForNoQuery();
          } else if (searchText && this.searchResults.length === 0 && !this.isLoading && !this.errorMessage) {
            this.currentSearchText = searchText;
            this.loadInitialDataForKeyword();
          }
        })
      )
      .subscribe();

    const initialSearchText = this.route.snapshot.queryParamMap.get('text');
    if (initialSearchText && !this.currentSearchText) {
      this.currentSearchText = initialSearchText;
      this.loadInitialDataForKeyword();
    } else if (!initialSearchText && !this.isLoading && !this.errorMessage) {
      this.resetStateForNoQuery();
    }
  }

  private resetStateForNoQuery(): void {
    this.currentSearchText = null;
    this.searchResults = [];
    this.isLoading = false;
    this.isLoadingMore = false;
    this.errorMessage = "請在上方導覽列輸入關鍵字進行搜尋。";
    this.totalItems = 0;
    this.totalPages = 0;
    this.currentPage = 0;
    this.allDataLoaded = false;
    // this.paginationPages = []; // Not needed due to getter
  }

  loadInitialDataForKeyword(): void {
    if (!this.currentSearchText) {
      this.resetStateForNoQuery();
      return;
    }
    this.searchResults = [];
    this.allDataLoaded = false;
    this.totalPages = 0;
    this.totalItems = 0;
    this.errorMessage = null;
    this.currentPage = (this.displayMode === 'loadMore') ? 0 : 1;
    this.fetchKeywordResults();
  }

  fetchKeywordResults(pageToFetch?: number): void {
    if (!this.currentSearchText) {
      this.errorMessage = "搜尋關鍵字為空。";
      this.isLoading = false;
      this.isLoadingMore = false;
      return;
    }

    if (this.displayMode === 'loadMore' && this.allDataLoaded && pageToFetch === undefined) {
      return;
    }
    if (this.isLoading || (this.displayMode === 'loadMore' && this.isLoadingMore)) {
      return;
    }

    if (this.displayMode === 'loadMore' && pageToFetch === undefined) {
      this.isLoadingMore = true;
    } else {
      this.isLoading = true;
    }
    if(this.currentSearchText) {
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
      this.isLoading = false;
      this.isLoadingMore = false;
      if (this.displayMode === 'loadMore') this.allDataLoaded = true;
      return;
    }
    if (this.displayMode === 'pagination' && targetPage < 1) {
      this.isLoading = false;
      this.isLoadingMore = false;
      return;
    }

    let params = new HttpParams()
      .set('text', this.currentSearchText)
      .set('page', targetPage.toString())
      .set('limit', this.itemsPerPage.toString());

    this.http.get<ApiKeywordSearchResponse>(this.apiUrl, { params })
      .pipe(
        takeUntil(this.destroy$),
        tap(response => this.handleApiResponse(response, targetPage)),
        catchError(error => {
          this.errorMessage = `搜尋失敗: ${error.message || '請稍後再試'}`;
          if (this.displayMode === 'loadMore') this.allDataLoaded = true;
          return of({ data: [], page: targetPage, totalPages: this.totalPages, nbHits: this.totalItems });
        }),
        finalize(() => {
          this.isLoading = false;
          this.isLoadingMore = false;
        })
      )
      .subscribe();
  }

  private handleApiResponse(response: ApiKeywordSearchResponse, fetchedPage: number): void {
    if (response && response.data) {
      this.totalItems = response.nbHits;
      this.totalPages = response.totalPages;

      if (this.displayMode === 'loadMore') {
        this.searchResults = [...this.searchResults, ...response.data];
        this.currentPage = fetchedPage;
        if (this.currentPage >= this.totalPages || response.data.length < this.itemsPerPage || response.data.length === 0) {
          this.allDataLoaded = true;
        }
      } else {
        this.searchResults = response.data;
        this.currentPage = fetchedPage;
      }
      // The getter `paginationPages` will be re-evaluated automatically by Angular's change detection when `totalPages` or `currentPage` changes.
    } else {
      if (this.searchResults.length === 0) {
        this.errorMessage = '從伺服器獲取到的資料格式不正確。';
      }
      if (this.displayMode === 'loadMore') this.allDataLoaded = true;
    }
  }

  setDisplayMode(mode: DisplayMode): void {
    if (this.displayMode === mode || this.isLoading || this.isLoadingMore) return;
    this.displayMode = mode;
    this.loadInitialDataForKeyword();
  }

  goToPage(page: number): void {
    if (this.displayMode !== 'pagination' || this.isLoading) {
      return;
    }
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      this.fetchKeywordResults(page);
    }
  }

  // The getter for paginationPages
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

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
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
