import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, tap, of, finalize } from 'rxjs';

export interface ApiConcertResponse {
  data: any[];
  page: number;
  totalPages: number;
  nbHits: number;
}

@Component({
  selector: 'app-home-concert-info',
  standalone: true,
  imports: [
    CommonModule,
  ],
  templateUrl: './home-concert-info.component.html',
  styleUrls: ['./home-concert-info.component.css']
})
export class HomeConcertInfoComponent implements OnInit {
  private http = inject(HttpClient); // 注入 HttpClient 的方式不變

  concertsData: ApiConcertResponse | null = null;
  isLoading: boolean = false;
  errorMessage: string | null = null;

  private apiUrl = 'http://localhost:3000/api/more-data';

  ngOnInit(): void {
    this.fetchConcertInfo();
  }

  fetchConcertInfo(): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.concertsData = null;

    let params = new HttpParams();
    params = params.append('page', '1');
    params = params.append('limit', '6');

    this.http.get<ApiConcertResponse>(this.apiUrl, { params })
      .pipe(
        tap(response => {
          console.log('API 成功回應:', response);
          this.concertsData = response;
        }),
        catchError(error => {
          console.error('API 呼叫失敗:', error);
          this.errorMessage = `資料載入失敗: ${error.message || '請稍後再試'}`;
          return of(null);
        }),
        finalize(() => {
          this.isLoading = false;
        })
      )
      .subscribe();
  }
}
