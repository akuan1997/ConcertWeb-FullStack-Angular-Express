import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router'; // RouterLink not directly used here but good for consistency if you add links later
import { HttpClient, HttpParams } from '@angular/common/http';
import { Subscription, of, Observable } from 'rxjs';
import { switchMap, catchError, tap } from 'rxjs/operators';
import { Concert } from '../../../shared/models/concert.model'; // Adjust path if necessary

// Re-using the same response interface as it's likely similar
export interface ApiConcertResponse {
  data: Concert[];
  nbHits: number;
  page?: number;
  totalPages?: number;
}

@Component({
  selector: 'app-date-results',
  standalone: true,
  imports: [
    CommonModule, // For *ngIf, *ngFor etc.
  ],
  templateUrl: './date-results.component.html',
  styleUrls: ['./date-results.component.css'] // You can reuse or adapt city-search-results.component.css
})
export class DateResultsComponent implements OnInit, OnDestroy {
  searchResults: Concert[] = [];
  isLoading: boolean = false;
  errorMessage: string | null = null;

  // Specific to date search
  startDateQuery: string | null = null; // YYYYMMDD from URL
  endDateQuery: string | null = null;   // YYYYMMDD from URL
  displayStartDate: string | null = null; // For user-friendly display
  displayEndDate: string | null = null;   // For user-friendly display

  currentPage: number = 1;
  totalPages: number = 0;
  itemsPerPage: number = 30; // Matches backend default, can be made configurable
  paginationPages: number[] = [];
  totalItems: number = 0;

  private routeSubscription!: Subscription;
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);

  private apiUrl = 'http://localhost:3000/api/getDateSearchData'; // Your new API endpoint

  ngOnInit(): void {
    this.routeSubscription = this.route.queryParams.pipe(
      tap(params => {
        this.startDateQuery = params['start_date'] || null;
        this.endDateQuery = params['end_date'] || null;
        this.currentPage = params['page'] ? parseInt(params['page'], 10) : 1; // Also get page from URL if present

        this.displayStartDate = this.formatDisplayDate(this.startDateQuery);
        this.displayEndDate = this.formatDisplayDate(this.endDateQuery);

        this.resetStateBeforeFetch();
        console.log('Dates from query params:', this.startDateQuery, this.endDateQuery, 'Page:', this.currentPage);
      }),
      switchMap(params => {
        // page is already set from tap, or defaults to 1
        return this.fetchDateFilteredData(this.startDateQuery, this.endDateQuery, this.currentPage);
      })
    ).subscribe(
      (response: ApiConcertResponse) => this.handleApiResponse(response)
    );
  }

  private resetStateBeforeFetch(): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.searchResults = [];
    this.totalPages = 0;
    this.totalItems = 0;
    this.paginationPages = [];
  }

  private fetchDateFilteredData(startDate: string | null, endDate: string | null, page: number): Observable<ApiConcertResponse> {
    if (!startDate && !endDate) { // Though your backend handles this, good to have a client-side check
      this.errorMessage = '請提供開始日期或結束日期進行搜尋。';
      this.isLoading = false;
      return of({ data: [], nbHits: 0, page: 1, totalPages: 0 });
    }

    this.isLoading = true;
    this.errorMessage = null;

    let httpParams = new HttpParams()
      .set('page', page.toString())
      .set('limit', this.itemsPerPage.toString());

    if (startDate) {
      httpParams = httpParams.set('start_date', startDate);
    }
    if (endDate) {
      httpParams = httpParams.set('end_date', endDate);
    }

    return this.http.get<ApiConcertResponse>(this.apiUrl, { params: httpParams }).pipe(
      catchError(err => {
        console.error(`API Error fetching date filtered data (start: ${startDate}, end: ${endDate}, page: ${page}):`, err);
        let specificError = '無法載入指定日期的演唱會資訊，請稍後再試。';
        if (err.status === 400 && err.error && err.error.message) {
          specificError = err.error.message; // Use backend's specific error
        }
        this.errorMessage = specificError;
        return of({ data: [], nbHits: 0, page, totalPages: 0 });
      })
    );
  }

  private handleApiResponse(response: ApiConcertResponse): void {
    this.searchResults = response.data;
    this.totalItems = response.nbHits;

    this.totalPages = response.totalPages !== undefined
      ? response.totalPages
      : Math.ceil(this.totalItems / this.itemsPerPage);

    // Use page from response if available, otherwise keep current (which should match if API returns it)
    this.currentPage = response.page !== undefined
      ? response.page
      : this.currentPage;

    this.calculatePaginationPages();
    this.isLoading = false;

    if (response.data.length === 0 && this.currentPage === 1 && !this.errorMessage) {
      this.errorMessage = `在指定的日期範圍內 (${this.displayStartDate || '未指定開始'} - ${this.displayEndDate || '未指定結束'}) 沒有找到相關的演唱會資訊。`;
    } else if (response.data.length === 0 && this.currentPage > 1 && !this.errorMessage) {
      console.log(`在指定的日期範圍內的第 ${this.currentPage} 頁沒有更多數據了。`);
    }
    console.log('Handled API response. Results:', this.searchResults.length, 'Total Items:', this.totalItems, 'Total Pages:', this.totalPages, 'Current Page:', this.currentPage);
  }


  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage && !this.isLoading) {
      this.isLoading = true; // Set loading before fetch
      this.currentPage = page; // Update current page immediately for UI responsiveness

      // Update URL for bookmarking/sharing - this will also trigger ngOnInit's subscription if not handled carefully,
      // but since we are directly calling fetchDateFilteredData, it's fine.
      // Alternatively, navigate and let ngOnInit handle it, but then manage isLoading carefully.
      // For simplicity here, we fetch directly.
      // this.router.navigate([], {
      //   relativeTo: this.route,
      //   queryParams: { start_date: this.startDateQuery, end_date: this.endDateQuery, page: this.currentPage },
      //   queryParamsHandling: 'merge', // Keeps other query params
      // });

      this.fetchDateFilteredData(this.startDateQuery, this.endDateQuery, this.currentPage)
        .subscribe(
          (response: ApiConcertResponse) => this.handleApiResponse(response)
        );
    }
  }

  calculatePaginationPages(): void {
    // Same logic as in CitySearchResultsComponent
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

  // Utility to format YYYYMMDD to YYYY/MM/DD for display
  private formatDisplayDate(dateStr: string | null): string | null {
    if (!dateStr || dateStr.length !== 8) return dateStr; // Return as is if not in YYYYMMDD format
    try {
      const year = dateStr.substring(0, 4);
      const month = dateStr.substring(4, 6);
      const day = dateStr.substring(6, 8);
      return `${year}/${month}/${day}`;
    } catch (e) {
      return dateStr; // Return original on error
    }
  }

  // Re-use formatting functions from CitySearchResultsComponent
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
