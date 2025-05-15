import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common'; // CommonModule for *ngIf, *ngFor, etc.
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, tap, of, finalize } from 'rxjs'; // Removed 'map' as we are not pre-processing to a fixed 6 items anymore

// 1. Concert Interface (should be consistent across your app, maybe move to a shared models file)
export interface Concert {
  _id: string;
  tit: string;
  sdt: string[];
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

// 2. ApiConcertResponse (interface for the backend response)
export interface ApiConcertResponse {
  data: Concert[];
  page: number;
  totalPages: number;
  nbHits: number; // Number of hits on the current page
}

@Component({
  selector: 'app-all-concert-info', // Updated selector
  standalone: true,
  imports: [
    CommonModule, // Needed for *ngIf, *ngFor, etc.
    // HttpClientModule is usually imported in app.config.ts or AppModule
  ],
  providers: [DatePipe], // For using DatePipe in the component's methods
  templateUrl: './all-concert-info.component.html', // Corrected templateUrl
  styleUrl: './all-concert-info.component.css'   // Corrected styleUrl
})
export class AllConcertInfoComponent implements OnInit {
  private http = inject(HttpClient);
  private datePipe = inject(DatePipe);

  allConcerts: Concert[] = []; // Stores all loaded concerts
  isLoading: boolean = false; // For initial load
  isLoadingMore: boolean = false; // For "load more" button
  errorMessage: string | null = null;

  currentPage: number = 0; // Start at 0, so first fetch is page 1
  totalPages: number = 0;
  itemsPerPage: number = 21; // Your API default, can be adjusted
  allDataLoaded: boolean = false; // True if all pages are loaded

  // Use your actual API endpoint for all paginated data
  // This should be the one that uses 'getMoreData' logic on the backend
  private apiUrl = 'http://localhost:3000/api/more-data';

  ngOnInit(): void {
    this.loadConcerts(); // Initial load
  }

  loadConcerts(isLoadMore: boolean = false): void {
    if (this.allDataLoaded && isLoadMore) {
      console.log('All data already loaded.');
      return;
    }

    if (this.isLoading || (isLoadMore && this.isLoadingMore)) {
      console.log('Already loading data.');
      return;
    }

    if (isLoadMore) {
      this.isLoadingMore = true;
    } else {
      this.isLoading = true;
      this.allConcerts = []; // Reset for a fresh initial load
      this.currentPage = 0;
      this.totalPages = 0;
      this.allDataLoaded = false;
    }
    this.errorMessage = null;

    const pageToFetch = this.currentPage + 1;

    let params = new HttpParams()
      .set('page', pageToFetch.toString())
      .set('limit', this.itemsPerPage.toString());

    this.http.get<ApiConcertResponse>(this.apiUrl, { params })
      .pipe(
        tap(response => {
          if (response && response.data) {
            console.log(`API response for page ${response.page}:`, response);
            this.allConcerts = [...this.allConcerts, ...response.data];
            this.currentPage = response.page;
            this.totalPages = response.totalPages;

            if (this.currentPage >= this.totalPages || response.data.length === 0 || response.data.length < this.itemsPerPage) {
              // If current page is last, or API returns 0 items, or fewer items than requested limit
              this.allDataLoaded = true;
            }
            if (response.data.length === 0 && this.allConcerts.length === 0 && !isLoadMore) {
              console.log('Initial fetch returned no concert data.');
            }

          } else {
            console.warn('API response missing data or unexpected format:', response);
            if (!isLoadMore && this.allConcerts.length === 0) {
              this.errorMessage = '無法從伺服器獲取有效的資料格式。';
            }
            this.allDataLoaded = true; // Assume no more data if format is bad
          }
        }),
        catchError(error => {
          console.error('API call or data processing failed:', error);
          this.errorMessage = `資料載入失敗: ${error.message || '請稍後再試'}`;
          // If it's an initial load error, don't set allDataLoaded to true, allow retry.
          // If it's a loadMore error, perhaps set allDataLoaded to true to stop further attempts.
          // For simplicity, we'll let the user retry via the button or refresh for now.
          return of(null);
        }),
        finalize(() => {
          if (isLoadMore) {
            this.isLoadingMore = false;
          } else {
            this.isLoading = false;
          }
        })
      )
      .subscribe();
  }

  // Helper methods (formatArrayDisplay, formatPriceDisplay, formatDate)
  formatArrayDisplay(arr: string[] | number[] | undefined, joiner: string = ', '): string {
    if (!arr || arr.length === 0) return '-';
    // Check for Mongoose default empty array values
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
      return transformedDate || String(dateInput); // Fallback if transform returns null
    } catch (e) {
      console.warn('日期格式化錯誤:', dateInput, e);
      return String(dateInput);
    }
  }
}
