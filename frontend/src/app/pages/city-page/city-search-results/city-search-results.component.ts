import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common'; // DatePipe removed if not used directly for formatting
import { ActivatedRoute } from '@angular/router';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Subscription, of, Observable, finalize } from 'rxjs'; // Added finalize
import { switchMap, catchError, tap } from 'rxjs/operators';
import { Concert } from '../../../shared/models/concert.model';

export interface ApiConcertResponse {
  data: Concert[];
  nbHits: number;
  page?: number; // API might send this
  totalPages?: number; // API might send this
}

// --- NEW: Define DisplayMode type ---
export type DisplayMode = 'loadMore' | 'pagination';

@Component({
  selector: 'app-city-search-results',
  standalone: true,
  imports: [
    CommonModule,
  ],
  templateUrl: './city-search-results.component.html',
  styleUrls: ['./city-search-results.component.css']
})
export class CitySearchResultsComponent implements OnInit, OnDestroy {
  searchResults: Concert[] = [];
  isLoading: boolean = false;
  errorMessage: string | null = null;
  currentCity: string | null = null;

  // --- MODIFIED/NEW: State for display modes and loading ---
  displayMode: DisplayMode = 'loadMore'; // Default mode
  isLoadingMore: boolean = false;        // For "Load More" button
  allDataLoaded: boolean = false;        // For "Load More" mode

  currentPage: number = 0; // For loadMore: last loaded page. For pagination: current active page.
                           // Will be 0 before first loadMore, 1 for first page in pagination.
  totalPages: number = 0;
  itemsPerPage: number = 30; // Consistent with your existing itemsPerPage
  paginationPages: number[] = [];
  totalItems: number = 0;

  private routeSubscription!: Subscription;
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);

  private apiUrl = `${window.location.origin}/api/getCitySelectionData`;

  ngOnInit(): void {
    this.routeSubscription = this.route.queryParams.pipe(
      tap(params => {
        const cityChanged = this.currentCity !== params['cit'];
        this.currentCity = params['cit'] || null;
        if (cityChanged) { // If city changed, reset fully for the new mode/city
          this.loadInitialDataForCity();
        } else if (!this.searchResults.length && this.currentCity) { // Initial load for a city
          this.loadInitialDataForCity();
        }
      }),
      // We will call fetchConcerts directly from loadInitialDataForCity or goToPage
      // So, we don't need switchMap here to directly fetch.
      // The tap above is enough to trigger re-initialization if city changes.
    ).subscribe();

    // If queryParams are already present on init (e.g. direct navigation with params)
    const initialCity = this.route.snapshot.queryParams['cit'];
    if (initialCity && !this.currentCity) { // Ensure it runs if not caught by subscription immediately
      this.currentCity = initialCity;
      this.loadInitialDataForCity();
    } else if (!initialCity && !this.searchResults.length && !this.errorMessage) {
      this.errorMessage = '請從上方選單選擇一個城市。'; // Handle case where no city is selected initially
    }
  }

  // --- NEW: Initialize data loading based on city and current mode ---
  loadInitialDataForCity(): void {
    if (!this.currentCity) {
      this.errorMessage = '請從上方選單選擇一個城市。';
      this.isLoading = false;
      return;
    }
    this.searchResults = [];
    this.allDataLoaded = false;
    this.totalPages = 0;
    this.totalItems = 0;
    // For 'loadMore', page starts at 0 to fetch page 1. For 'pagination', it starts at 1.
    this.currentPage = (this.displayMode === 'loadMore') ? 0 : 1;
    this.fetchConcerts(); // Call the main fetching logic
  }

  // --- MODIFIED: Renamed fetchData to fetchConcerts, and adapted for modes ---
  fetchConcerts(pageToFetch?: number): void { // pageToFetch is for pagination mode

    if (!this.currentCity) {
      this.errorMessage = '未選擇城市，無法載入資料。';
      this.isLoading = false; // Ensure loading is false if no city
      this.isLoadingMore = false;
      return;
    }

    if (this.displayMode === 'loadMore' && this.allDataLoaded && pageToFetch === undefined) {
      console.log('Load More: All data already loaded for', this.currentCity);
      return;
    }
    if (this.isLoading || (this.displayMode === 'loadMore' && this.isLoadingMore)) {
      console.log('Already loading data for', this.currentCity);
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
      targetPage = pageToFetch !== undefined ? pageToFetch : this.currentPage;
    } else { // loadMore or initial load for pagination
      targetPage = this.currentPage + 1; // For loadMore, currentPage is last loaded page (0 initially)
      // For pagination initial, currentPage is 1, targetPage is 1 (handled by pageToFetch)
      // If pagination initial and pageToFetch is undefined, targetPage=1
      // if (this.displayMode === 'pagination' && this.currentPage === 0 && pageToFetch === undefined) targetPage = 1;
    }


    if (this.totalPages > 0 && targetPage > this.totalPages) {
      console.warn(`Attempted to fetch page ${targetPage} but total pages is ${this.totalPages} for ${this.currentCity}`);
      this.isLoading = false;
      this.isLoadingMore = false;
      if (this.displayMode === 'loadMore') this.allDataLoaded = true; // Mark as loaded if tried to go past
      return;
    }
    if (this.displayMode === 'pagination' && targetPage < 1) {
      console.warn(`Attempted to fetch invalid page ${targetPage} for ${this.currentCity}`);
      this.isLoading = false;
      this.isLoadingMore = false;
      return;
    }

    const httpParams = new HttpParams()
      .set('cit', this.currentCity)
      .set('page', targetPage.toString())
      .set('limit', this.itemsPerPage.toString());

    this.http.get<ApiConcertResponse>(this.apiUrl, { params: httpParams }).pipe(
      tap(response => this.handleApiResponse(response, targetPage)), // Pass targetPage to know what was fetched
      catchError(err => {
        console.error(`API Error fetching city ${this.currentCity}, page ${targetPage}:`, err);
        this.errorMessage = `無法載入 ${this.currentCity} 的演唱會資訊：${err.message || '請稍後再試'}`;
        if (this.displayMode === 'loadMore') this.allDataLoaded = true; // Prevent further load more attempts on error
        return of({ data: [], nbHits: this.totalItems, page: targetPage, totalPages: this.totalPages }); // Return current state on error
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
        this.currentPage = fetchedPage; // Update current page to the one just fetched
        if (this.currentPage >= this.totalPages || response.data.length < this.itemsPerPage || response.data.length === 0) {
          this.allDataLoaded = true;
        }
      } else { // Pagination mode
        this.searchResults = response.data;
        this.currentPage = fetchedPage;
      }

      if (this.currentCity && this.searchResults.length === 0 && !this.errorMessage) {
        if (this.displayMode === 'loadMore' && this.allDataLoaded) {
          // This is fine, just means no results found initially or after loading all
        } else if (this.displayMode === 'pagination' && this.currentPage === 1) {
          // Message handled by template based on searchResults.length
        }
      }
      this.calculatePaginationPages(); // Update pagination UI if in pagination mode
    } else {
      console.warn('API response missing data or unexpected format for city', this.currentCity, response);
      if (this.searchResults.length === 0) { // Only set error if no data is currently shown
        this.errorMessage = '從伺服器獲取到的資料格式不正確。';
      }
      if (this.displayMode === 'loadMore') this.allDataLoaded = true; // Assume all loaded if bad response
    }
  }

  // --- NEW: Method to switch display mode ---
  setDisplayMode(mode: DisplayMode): void {
    if (this.displayMode === mode || this.isLoading || this.isLoadingMore) return; // No change or busy
    this.displayMode = mode;
    // Important: Reset and reload data for the new mode
    this.loadInitialDataForCity();
  }

  // --- MODIFIED: goToPage for pagination mode ---
  goToPage(page: number): void {
    if (this.displayMode !== 'pagination' || this.isLoading) {
      return;
    }
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      // this.currentPage = page; // currentPage will be updated in handleApiResponse
      this.fetchConcerts(page); // Fetch specific page for pagination
    }
  }

  // calculatePaginationPages remains the same
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

  // formatArrayDisplay and formatPriceDisplay remain the same
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
