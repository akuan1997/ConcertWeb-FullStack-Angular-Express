import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common'; // CommonModule for *ngIf, *ngFor, etc. DatePipe for formatting dates
import { ActivatedRoute, RouterLink } from '@angular/router'; // ActivatedRoute to get query params, RouterLink for navigation
import { HttpClient, HttpParams } from '@angular/common/http'; // For making HTTP requests
import { Subscription, of } from 'rxjs';
import { switchMap, catchError, tap } from 'rxjs/operators';

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

export interface ApiConcertResponse {
  data: Concert[];
  nbHits: number;
}

@Component({
  selector: 'app-city-search-results',
  standalone: true,
  imports: [
    CommonModule, // 提供了 *ngIf, *ngFor, async pipe 等
    RouterLink,   // 如果你需要在這個組件內有其他 routerLink
    DatePipe      // 如果你需要格式化日期
  ],
  templateUrl: './city-search-results.component.html',
  styleUrls: ['./city-search-results.component.css'] // Corrected property name
})
export class CitySearchResultsComponent implements OnInit, OnDestroy {
  concerts: Concert[] = [];
  isLoading: boolean = false;
  error: string | null = null;
  currentCity: string | null = null;
  nbHits: number = 0;

  private routeSubscription!: Subscription;
  private http = inject(HttpClient); // 使用 inject 函數注入 HttpClient
  private route = inject(ActivatedRoute); // 使用 inject 函數注入 ActivatedRoute

  // 假設你的後端 API 端點是 /api/data (請根據你的實際情況修改)
  private apiUrl = 'http://localhost:3000/api/data'; // <<--- 修改這裡為你的 API 端點

  ngOnInit(): void {
    this.routeSubscription = this.route.queryParams.pipe(
      tap(params => {
        this.currentCity = params['cit'] || null;
        this.isLoading = true;
        this.error = null;
        this.concerts = []; // 清空之前的結果
        this.nbHits = 0;
        console.log('City from query params:', this.currentCity);
      }),
      switchMap(params => {
        const city = params['cit'];
        if (city) {
          let httpParams = new HttpParams().set('cit', city);
          // 如果你的 API URL 已經包含了基礎路徑，例如 'http://localhost:3000/api/data'
          // 就不需要再拼接了
          return this.http.get<ApiConcertResponse>(this.apiUrl, { params: httpParams }).pipe(
            catchError(err => {
              console.error('API Error:', err);
              this.error = `無法載入 ${city} 的演唱會資訊，請稍後再試。`;
              return of({ data: [], nbHits: 0 }); // 返回一個空的 Observable 以免中斷流
            })
          );
        } else {
          // 如果沒有 cit 參數，可以選擇顯示所有，或提示用戶選擇城市
          this.error = '請從上方選單選擇一個城市。';
          return of({ data: [], nbHits: 0 }); // 返回一個空的 Observable
        }
      })
    ).subscribe({
      next: (response) => {
        this.concerts = response.data;
        this.nbHits = response.nbHits;
        this.isLoading = false;
        if (this.currentCity && response.data.length === 0 && !this.error) {
          this.error = `在 ${this.currentCity} 沒有找到相關的演唱會資訊。`;
        }
        console.log('Fetched data:', response);
      },
      error: (err) => { // 這個 error 主要處理 switchMap 之前的流錯誤 (雖然在此例中 catchError 已處理 API 錯誤)
        console.error('Subscription Error:', err);
        this.error = '發生未知錯誤，請稍後再試。';
        this.isLoading = false;
      }
    });
  }

  ngOnDestroy(): void {
    if (this.routeSubscription) {
      this.routeSubscription.unsubscribe();
    }
  }

  // 輔助函數，用於安全地顯示圖片，如果 pin 為空則使用預設圖片
  getPinImageUrl(pinUrl?: string): string {
    return pinUrl || 'https://via.placeholder.com/300x200?text=No+Image';
  }
}
