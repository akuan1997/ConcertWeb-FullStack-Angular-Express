import { Component } from '@angular/core';

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

export interface ApiKeywordSearchResponse {
  data: Concert[];
  page: number;
  totalPages: number;
}

@Component({
  selector: 'app-city-search-results',
  standalone: true,
  imports: [
  ],
  templateUrl: './city-search-results.component.html',
  styleUrl: './city-search-results.component.css'
})
export class CitySearchResultsComponent {

}
