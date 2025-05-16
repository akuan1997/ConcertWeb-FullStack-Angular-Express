import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Subscription, of } from 'rxjs';
import { switchMap, catchError, tap, finalize } from 'rxjs/operators';
import { Concert } from '../../../shared/models/concert.model';

export interface ApiConcertResponse {
  data: Concert[];
  nbHits: number; // Total number of items matching the query (for pagination)
  // If your API returns current page and total pages, use those instead
  // currentPage?: number;
  // totalPages?: number;
}

@Component({
  selector: 'app-city-search-results',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    // DatePipe is not directly used in the new template, but keep if needed elsewhere
  ],
  templateUrl: './city-search-results.component.html',
  styleUrls: ['./city-search-results.component.css']
})
export class CitySearchResultsComponent implements OnInit, OnDestroy {
  searchResults: Concert[] = [];
  isLoading: boolean = false;
  errorMessage: string | null = null;
  currentCity: string | null = null;
  // nbHits is now represented by totalItems for pagination
  // nbHits: number = 0; // Replaced by totalItems logic for pagination

  // Pagination properties
  currentPage: number = 1;
  totalPages: number = 0;
  itemsPerPage: number = 30;
  paginationPages: number[] = [];
  totalItems: number = 0; // Total items from API, equivalent to old nbHits

  private routeSubscription!: Subscription;
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);

  private apiUrl = 'http://localhost:3000/api/data'; // Your API endpoint

  ngOnInit(): void {
    this.routeSubscription = this.route.queryParams.pipe(
      tap(params => {
        this.currentCity = params['cit'] || null;
        this.resetStateBeforeFetch();
        console.log('City from query params:', this.currentCity);
      }),
      switchMap(params => {
        const city = params['cit'];
        if (city) {
          // For pagination, your API needs to accept page and limit/size parameters
          let httpParams = new HttpParams()
            .set('cit', city)
            .set('page', this.currentPage.toString())
            .set('limit', this.itemsPerPage.toString()); // Or 'size', 'per_page' depending on your API

          this.isLoading = true; // Set loading true just before the HTTP call
          return this.http.get<ApiConcertResponse>(this.apiUrl, { params: httpParams }).pipe(
            catchError(err => {
              console.error('API Error:', err);
              this.errorMessage = `無法載入 ${city} 的演唱會資訊，請稍後再試。`;
              return of({ data: [], nbHits: 0 }); // Return empty to prevent stream interruption
            }),
            finalize(() => { // Ensure isLoading is set to false after the stream completes or errors
              // this.isLoading = false; // Moved to subscribe's next/error for better control
            })
          );
        } else {
          this.errorMessage = '請從上方選單選擇一個城市。';
          this.isLoading = false; // No city, so not loading
          return of({ data: [], nbHits: 0 });
        }
      })
    ).subscribe({
      next: (response) => {
        this.searchResults = response.data;
        this.totalItems = response.nbHits; // This is the total count for the city query

        // Calculate total pages based on totalItems and itemsPerPage
        this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage);

        this.calculatePaginationPages();
        this.isLoading = false;

        if (this.currentCity && response.data.length === 0 && !this.errorMessage) {
          this.errorMessage = `在 ${this.currentCity} 沒有找到相關的演唱會資訊。`;
        }
        console.log('Fetched data:', response, 'Total Pages:', this.totalPages);
      },
      error: (err) => {
        console.error('Subscription Error:', err);
        // This error is for issues in the RxJS chain itself, API errors are caught above
        this.errorMessage = '發生未知錯誤，請稍後再試。';
        this.isLoading = false;
        this.searchResults = [];
        this.totalPages = 0;
        this.calculatePaginationPages();
      }
    });
  }

  private resetStateBeforeFetch(): void {
    this.isLoading = true; // Initially true, will be false after fetch or if no city
    this.errorMessage = null;
    this.searchResults = [];
    this.currentPage = 1; // Reset to first page for new city search
    this.totalPages = 0;
    this.totalItems = 0;
    this.paginationPages = [];
  }

  // --- Pagination Logic ---
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage && !this.isLoading) {
      this.currentPage = page;
      // Trigger data fetch for the new page.
      // We need to re-trigger the part of the stream that fetches data.
      // A simple way is to update queryParams, but that re-runs the whole ngOnInit chain.
      // For a cleaner approach, you might refactor the fetching logic into a separate method.
      // For now, let's simulate re-triggering (assuming ngOnInit will pick up new currentPage):
      this.fetchDataForCurrentCityAndPage();
    }
  }

  private fetchDataForCurrentCityAndPage(): void {
    if (!this.currentCity) {
      this.errorMessage = '無法重新載入資料：未指定城市。';
      return;
    }
    this.isLoading = true;
    this.errorMessage = null;
    this.searchResults = []; // Clear previous page results

    let httpParams = new HttpParams()
      .set('cit', this.currentCity)
      .set('page', this.currentPage.toString())
      .set('limit', this.itemsPerPage.toString());

    this.http.get<ApiConcertResponse>(this.apiUrl, { params: httpParams }).pipe(
      catchError(err => {
        console.error('API Error on page change:', err);
        this.errorMessage = `無法載入 ${this.currentCity} 第 ${this.currentPage} 頁的資訊。`;
        return of({ data: [], nbHits: this.totalItems }); // Keep totalItems
      }),
      finalize(() => {
        this.isLoading = false;
      })
    ).subscribe(response => {
      this.searchResults = response.data;
      // nbHits from paginated response might only reflect items on *this* page,
      // or it might still be the total. Assuming API keeps returning total with nbHits.
      // If nbHits is only for current page, then totalItems should not be updated here.
      // this.totalItems = response.nbHits; // Assuming nbHits is always the grand total
      // this.totalPages = Math.ceil(this.totalItems / this.itemsPerPage); // Recalculate if totalItems changed
      this.calculatePaginationPages(); // Update visible page numbers
    });
  }


  calculatePaginationPages(): void {
    if (this.totalPages === 0) {
      this.paginationPages = [];
      return;
    }

    const maxPagesToShow = 5; // Max number of page links (e.g., 1, 2, 3, 4, 5 or ..., 3, 4, 5, 6, 7, ...)
    const sidePages = Math.floor(maxPagesToShow / 2); // Number of pages to show on each side of current page

    let startPage = Math.max(1, this.currentPage - sidePages);
    let endPage = Math.min(this.totalPages, this.currentPage + sidePages);

    // Adjust if we are near the beginning
    if (this.currentPage - sidePages < 1) {
      endPage = Math.min(this.totalPages, maxPagesToShow);
    }

    // Adjust if we are near the end
    if (this.currentPage + sidePages > this.totalPages) {
      startPage = Math.max(1, this.totalPages - maxPagesToShow + 1);
    }

    // Ensure we don't exceed maxPagesToShow if totalPages is small
    if (this.totalPages <= maxPagesToShow) {
      startPage = 1;
      endPage = this.totalPages;
    }


    this.paginationPages = Array.from({ length: (endPage - startPage) + 1 }, (_, i) => startPage + i);
  }


  // --- Helper Functions for Template ---
  formatArrayDisplay(arr: string[] | undefined | null, separator: string = '、'): string {
    if (!arr || arr.length === 0) {
      return '未提供';
    }
    // Filter out empty or placeholder strings if necessary
    const filteredArr = arr.filter(item => item && item.trim() !== '' && item.trim() !== '-');
    if (filteredArr.length === 0) {
      return '未提供';
    }
    return filteredArr.join(separator);
  }

  formatPriceDisplay(prices: (number | string)[] | undefined | null): string {
    if (!prices || prices.length === 0) {
      return '洽詢主辦單位';
    }
    const cleanedPrices = prices
      .map(p => String(p).trim()) // Convert to string and trim
      .filter(p => p && p !== '-' && p !== ''); // Filter out empty/placeholder

    if (cleanedPrices.length === 0) {
      return '洽詢主辦單位';
    }

    // Attempt to convert to numbers for sorting, but handle non-numeric gracefully
    const numericPrices = cleanedPrices
      .map(p => parseFloat(p))
      .filter(n => !isNaN(n))
      .sort((a, b) => a - b);

    const nonNumericPrices = cleanedPrices.filter(p => isNaN(parseFloat(p)));

    let displayPrices: string[] = [];
    if (numericPrices.length > 0) {
      if (numericPrices.length === 1) {
        displayPrices.push(String(numericPrices[0]));
      } else {
        // Display as a range if multiple different numeric prices
        const minPrice = numericPrices[0];
        const maxPrice = numericPrices[numericPrices.length - 1];
        if (minPrice === maxPrice) {
          displayPrices.push(String(minPrice));
        } else {
          displayPrices.push(`${minPrice} - ${maxPrice}`);
        }
      }
      displayPrices = displayPrices.map(p => p + ' 元');
    }

    // Add any non-numeric prices (like "免費", "洽詢")
    displayPrices.push(...nonNumericPrices);

    if (displayPrices.length === 0) return '洽詢主辦單位'; // Should not happen if cleanedPrices had items

    return displayPrices.join(' / '); // Or '、' or other separator
  }


  // This function would be called by a "Retry" button if you add one
  reloadDataForCity(): void {
    if (this.currentCity) {
      // Reset current page to 1 for a full retry, or keep current page
      // this.currentPage = 1;
      this.fetchDataForCurrentCityAndPage();
    } else {
      this.errorMessage = "無法重試：未指定城市。";
    }
  }

  ngOnDestroy(): void {
    if (this.routeSubscription) {
      this.routeSubscription.unsubscribe();
    }
  }
}
