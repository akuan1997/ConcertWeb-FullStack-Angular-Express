import { Component } from '@angular/core';
import { NavBarComponent} from '../../shared/nav-bar/nav-bar.component';
import { HeroSectionComponent} from '../../shared/hero-section/hero-section.component';
import { DateSearchComponent } from './date-search/date-search.component';
import { DateResultsComponent } from './date-results/date-results.component';
import { AboutComponent} from '../../shared/about/about.component';

@Component({
  selector: 'app-date-search-page',
  standalone: true,
  imports: [
    NavBarComponent,
    HeroSectionComponent,
    DateSearchComponent,
    DateResultsComponent,
    AboutComponent
  ],
  templateUrl: './date-search-page.component.html',
  styleUrl: './date-search-page.component.css'
})
export class DateSearchPageComponent {

}
