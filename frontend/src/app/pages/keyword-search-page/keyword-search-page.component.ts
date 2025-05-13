import { Component } from '@angular/core';
import { NavBarComponent } from '../../shared/nav-bar/nav-bar.component';
import { HeroSectionComponent } from '../../shared/hero-section/hero-section.component';
import { KeywordSearchComponent } from './keyword-search/keyword-search.component';
import { AboutComponent } from '../../shared/about/about.component';

@Component({
  selector: 'app-keyword-search-page',
  standalone: true,
  imports: [
    NavBarComponent,
    HeroSectionComponent,
    KeywordSearchComponent,
    AboutComponent
  ],
  templateUrl: './keyword-search-page.component.html',
  styleUrl: './keyword-search-page.component.css'
})
export class KeywordSearchPageComponent {

}
