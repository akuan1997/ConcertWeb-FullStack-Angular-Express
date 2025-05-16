import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, tap, of, finalize } from 'rxjs';
import { Concert } from '../../../shared/models/concert.model';

export interface ApiConcertResponse {
  data: Concert[];
  page: number;
  totalPages: number;
  nbHits: number;
}

type DisplayMode = 'loadMore' | 'pagination'; // Type for display mode

@Component({
  selector: 'app-all-concert-info',
  standalone: true,
  imports: [CommonModule],
  providers: [DatePipe],
  templateUrl: './all-concert-info.component.html',
  styleUrl: './all-concert-info.component.css'
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
  currentPage: number = 0; // For loadMore: last loaded page. For pagination: current active page.
  totalPages: number = 0;
  itemsPerPage: number = 30; // Let's use a smaller number for easier pagination demo, adjust as needed
  allDataLoaded: boolean = false; // For loadMore mode: if all pages are loaded

  // API Endpoint
  private apiUrl = 'http://localhost:3000/api/more-data';

  ngOnInit(): void {
    this.loadInitialData();
  }

  loadInitialData(): void {
    this.currentPage = 0; // Reset current page
    this.allConcerts = []; // Clear existing concerts
    this.allDataLoaded = false;
    this.loadConcerts();
  }

  loadConcerts(pageToFetch?: number): void { // pageToFetch is for pagination mode
    if (this.displayMode === 'loadMore' && this.allDataLoaded && pageToFetch === undefined) {
      console.log('Load More: All data already loaded.');
      return;
    }
    if (this.isLoading || (this.displayMode === 'loadMore' && this.isLoadingMore)) {
      console.log('Already loading data.');
      return;
    }

    // Determine loading state
    if (this.displayMode === 'loadMore' && pageToFetch === undefined) { // Clicked "Load More"
      this.isLoadingMore = true;
    } else { // Initial load or pagination change
      this.isLoading = true;
    }
    this.errorMessage = null;

    let targetPage: number;
    if (this.displayMode === 'pagination' && pageToFetch !== undefined) {
      targetPage = pageToFetch;
    } else { // loadMore or initial load for pagination
      targetPage = this.currentPage + 1;
    }

    // Prevent fetching beyond total pages in pagination mode (or if totalPages is known)
    if (this.totalPages > 0 && targetPage > this.totalPages) {
      console.warn(`Attempted to fetch page ${targetPage} but total pages is ${this.totalPages}`);
      this.isLoading = false;
      this.isLoadingMore = false;
      return;
    }
    // Prevent fetching page 0 or negative in pagination mode
    if (this.displayMode === 'pagination' && targetPage < 1) {
      console.warn(`Attempted to fetch invalid page ${targetPage}`);
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
            this.totalPages = response.totalPages; // Always update totalPages

            if (this.displayMode === 'loadMore') {
              this.allConcerts = [...this.allConcerts, ...response.data];
              this.currentPage = response.page;
              if (this.currentPage >= this.totalPages || response.data.length < this.itemsPerPage) {
                this.allDataLoaded = true;
              }
            } else { // Pagination mode
              this.allConcerts = response.data; // Replace data for the new page
              this.currentPage = response.page;
            }

            if (response.data.length === 0 && this.allConcerts.length === 0) {
              console.log('Initial fetch returned no concert data.');
            }
          } else {
            console.warn('API response missing data or unexpected format:', response);
            if (this.allConcerts.length === 0) {
              this.errorMessage = '無法從伺服器獲取有效的資料格式。';
            }
            if (this.displayMode === 'loadMore') this.allDataLoaded = true;
          }
        }),
        catchError(error => {
          console.error('API call or data processing failed:', error);
          this.errorMessage = `資料載入失敗: ${error.message || '請稍後再試'}`;
          return of(null);
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
    if (this.displayMode === mode) return; // No change
    this.displayMode = mode;
    this.loadInitialData(); // Reload data for the new mode
  }

  // --- Pagination Helpers ---
  goToPage(page: number): void {
    if (this.displayMode !== 'pagination' || this.isLoading || page === this.currentPage) {
      return;
    }
    if (page < 1 || page > this.totalPages) {
      console.warn("Invalid page number requested for pagination.");
      return;
    }
    this.loadConcerts(page);
  }

  get paginationPages(): number[] {
    if (this.totalPages <= 0) return [];
    // Simple pagination: show all page numbers.
    // For more complex pagination (e.g., with ellipses for many pages),
    // you'd need more sophisticated logic here.
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }


  // --- Formatting Helpers (formatArrayDisplay, formatPriceDisplay, formatDate) ---
  // (These remain the same as in your previous version)
  formatArrayDisplay(arr: string[] | number[] | undefined, joiner: string = ', '): string {
    if (!arr || arr.length === 0) return '-';
    if (arr.length === 1 && (arr[0] === ' -' || (typeof arr[0] === 'number' && arr[0] === -1))) return '-';
    return arr.join(joiner);
  }

  formatPriceDisplay(prices: number[] | undefined): string {
    if (!prices || prices.length === 0 || (prices.length === 1 && prices[0] === -1)) return '洽詢主辦';
    return prices.map(p => `$${p}`).join(' / ');
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
