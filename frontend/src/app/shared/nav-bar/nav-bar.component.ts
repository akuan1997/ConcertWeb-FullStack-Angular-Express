import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms'; // <--- 導入 FormsModule

@Component({
  selector: 'app-nav-bar',
  standalone: true,
  imports: [
    RouterLink,
    FormsModule // <--- 添加 FormsModule 到 imports
  ],
  templateUrl: './nav-bar.component.html',
  styleUrl: './nav-bar.component.css'
})
export class NavBarComponent {
  private router = inject(Router); // 注入 Router 服務

  onSearchSubmit(searchTerm: string): void {
    const trimmedSearchTerm = searchTerm.trim();
    if (trimmedSearchTerm) {
      // 導航到 keywordSearch 頁面，並將搜尋詞作為查詢參數傳遞
      this.router.navigate(['/keywordSearch'], { queryParams: { text: trimmedSearchTerm } });
      // 如果你想在提交後清空搜尋框，可以這樣做 (需要 ViewChild 或將 input 綁定到組件屬性)
      // 但對於跳轉到新頁面，通常不需要立即清空原頁面的輸入框
    } else {
      // 可選：如果搜尋詞為空，可以給用戶提示或不執行任何操作
      console.log('Search term is empty.');
      // 或者導航到一個通用的搜尋頁面（如果有的話）
      // this.router.navigate(['/search']);
    }
  }
}
