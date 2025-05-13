import { Routes } from '@angular/router';
import { HomepageComponent} from './pages/homepage/homepage.component';
import { AllConcertInfoPageComponent } from './pages/all-concert-info-page/all-concert-info-page.component';
import { DateSearchPageComponent } from './pages/date-search-page/date-search-page.component';
import { KeywordSearchPageComponent } from './pages/keyword-search-page/keyword-search-page.component';

export const routes: Routes = [
  { path: '', component: HomepageComponent },
  { path: 'homepage', component: HomepageComponent },
  { path: 'allConcertInfo', component: AllConcertInfoPageComponent },
  { path: 'dateSearch', component: DateSearchPageComponent },
  { path: 'keywordSearch', component: KeywordSearchPageComponent },
];
