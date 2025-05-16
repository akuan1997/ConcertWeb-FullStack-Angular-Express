import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router'; // RouterLink 被引用但可能未使用
import { HttpClient, HttpParams } from '@angular/common/http';
// 修正1：導入 Observable
import { Subscription, of, Observable } from 'rxjs'; // <--- 加入 Observable
// 修正7：移除未使用的 finalize (如果確定不再需要)
import { switchMap, catchError, tap } from 'rxjs/operators'; // finalize,
import { Concert } from '../../../shared/models/concert.model';

export interface ApiConcertResponse {
  data: Concert[];
  nbHits: number;
  page?: number;
  totalPages?: number;
}

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

  currentPage: number = 1;
  totalPages: number = 0;
  itemsPerPage: number = 30;
  paginationPages: number[] = [];
  totalItems: number = 0;

  private routeSubscription!: Subscription;
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);

  private apiUrl = 'http://localhost:3000/api/gitCitySelectionData';

  ngOnInit(): void {
    this.routeSubscription = this.route.queryParams.pipe(
      tap(params => {
        this.currentCity = params['cit'] || null;
        this.currentPage = 1;
        this.resetStateBeforeFetch();
        console.log('City from query params:', this.currentCity, 'Page reset to 1');
      }),
      switchMap(params => {
        const city = params['cit'];
        return this.fetchData(city, this.currentPage);
      })
    ).subscribe(
      // 修正2: 為 subscribe 的 next 回調的參數添加類型
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

  // 修正3: fetchData 返回類型明確指定為 Observable<ApiConcertResponse>
  private fetchData(city: string | null, page: number): Observable<ApiConcertResponse> {
    if (!city) {
      this.errorMessage = '請從上方選單選擇一個城市。';
      this.isLoading = false;
      return of({ data: [], nbHits: 0, page: 1, totalPages: 0 });
    }

    this.isLoading = true;
    this.errorMessage = null;

    const httpParams = new HttpParams()
      .set('cit', city)
      .set('page', page.toString())
      .set('limit', this.itemsPerPage.toString());

    return this.http.get<ApiConcertResponse>(this.apiUrl, { params: httpParams }).pipe(
      catchError(err => {
        console.error(`API Error fetching city ${city}, page ${page}:`, err);
        this.errorMessage = `無法載入 ${city} 的演唱會資訊，請稍後再試。`;
        return of({ data: [], nbHits: 0, page , totalPages: 0 });
      })
    );
  }

  // 修正4: handleApiResponse 參數 'response' 添加類型
  private handleApiResponse(response: ApiConcertResponse): void {
    this.searchResults = response.data;
    this.totalItems = response.nbHits;

    this.totalPages = response.totalPages !== undefined
      ? response.totalPages
      : Math.ceil(this.totalItems / this.itemsPerPage);

    this.currentPage = response.page !== undefined
      ? response.page
      : this.currentPage;

    this.calculatePaginationPages();
    this.isLoading = false;

    if (this.currentCity && response.data.length === 0 && this.currentPage === 1 && !this.errorMessage) {
      this.errorMessage = `在 ${this.currentCity} 沒有找到相關的演唱會資訊。`;
    } else if (response.data.length === 0 && this.currentPage > 1 && !this.errorMessage) {
      console.log(`在 ${this.currentCity} 的第 ${this.currentPage} 頁沒有更多數據了。`);
    }
    console.log('Handled API response. Results:', this.searchResults.length, 'Total Items:', this.totalItems, 'Total Pages:', this.totalPages, 'Current Page:', this.currentPage);
  }


  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage && !this.isLoading) {
      this.isLoading = true;
      this.currentPage = page;
      this.fetchData(this.currentCity, this.currentPage)
        .subscribe(
          // 修正5: 為 subscribe 的 next 回調的參數添加類型
          (response: ApiConcertResponse) => this.handleApiResponse(response)
        );
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

  formatArrayDisplay(arr: string[] | undefined | null, separator: string = '、'): string {
    if (!arr || arr.length === 0) return '未提供';
    const filteredArr = arr.filter(item => item && item.trim() !== '' && item.trim() !== '-');
    if (filteredArr.length === 0) return '未提供';
    return filteredArr.join(separator);
  }

  formatPriceDisplay(prices: (number | string)[] | undefined | null): string {
    if (!prices || prices.length === 0) return '洽詢主辦單位';
    const cleanedPrices = prices.map(p => String(p).trim()).filter(p => p && p !== '-' && p !== '');
    if (cleanedPrices.length === 0) return '洽詢主辦單位';
    const numericPrices = cleanedPrices.map(p => parseFloat(p)).filter(n => !isNaN(n)).sort((a, b) => a - b);
    const nonNumericPrices = cleanedPrices.filter(p => isNaN(parseFloat(p)));
    let displayPrices: string[] = [];
    if (numericPrices.length > 0) {
      if (numericPrices.length === 1) displayPrices.push(String(numericPrices[0]));
      else {
        const minPrice = numericPrices[0];
        const maxPrice = numericPrices[numericPrices.length - 1];
        displayPrices.push(minPrice === maxPrice ? String(minPrice) : `${minPrice} - ${maxPrice}`);
      }
      displayPrices = displayPrices.map(p => p + ' 元');
    }
    displayPrices.push(...nonNumericPrices);
    if (displayPrices.length === 0) return '洽詢主辦單位';
    return displayPrices.join(' / ');
  }

  // 修正6: 如果 reloadDataForCity 確實沒有使用，可以安全地移除或註解掉
  // reloadDataForCity(): void {
  //   if (this.currentCity) {
  //     this.isLoading = true;
  //     this.fetchData(this.currentCity, this.currentPage)
  //         .subscribe(
  //            (response: ApiConcertResponse) => this.handleApiResponse(response)
  //         );
  //   } else {
  //     this.errorMessage = "無法重試：未指定城市。";
  //   }
  // }

  ngOnDestroy(): void {
    if (this.routeSubscription) {
      this.routeSubscription.unsubscribe();
    }
  }
}
