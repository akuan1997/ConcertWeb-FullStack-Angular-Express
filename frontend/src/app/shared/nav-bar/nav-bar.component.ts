import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms'; // <--- 導入 FormsModule

@Component({
  selector: 'app-nav-bar',
  standalone: true,
  imports: [
    RouterLink,
    FormsModule
  ],
  templateUrl: './nav-bar.component.html',
  styleUrl: './nav-bar.component.css'
})
export class NavBarComponent {
  private router = inject(Router); // 注入 Router 服務

  // 你現有的 onSearchSubmit 方法 (用於關鍵字搜尋)
  onSearchSubmit(searchTerm: string): void {
    if (searchTerm && searchTerm.trim() !== '') {
      this.router.navigate(['/keywordSearch'], { queryParams: { text: searchTerm.trim() } });
    }
  }

  // 新增的方法，用於處理日期搜尋
  onDateSearchSubmit(startDateValue: string, endDateValue: string): void {
    const queryParams: any = {};

    // HTML input type="date" 返回的格式是 "YYYY-MM-DD"
    // 我們的 API 期望的格式是 "YYYYMMDD"
    if (startDateValue) {
      queryParams.start_date = startDateValue.replace(/-/g, ''); // 移除 '-'
    }
    if (endDateValue) {
      queryParams.end_date = endDateValue.replace(/-/g, ''); // 移除 '-'
    }

    // 只有當至少提供一個日期時才進行導航
    if (Object.keys(queryParams).length > 0) {
      this.router.navigate(['/dateSearch'], { queryParams }); // 導航到日期搜尋結果頁
    } else {
      // 可選：如果沒有選擇任何日期，可以給予提示或不做任何事
      console.log('請至少選擇一個開始或結束日期');
      // alert('請至少選擇一個開始或結束日期');
    }
  }
}
