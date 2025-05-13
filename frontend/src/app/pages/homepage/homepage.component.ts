import { Component } from '@angular/core';
import { NavBarComponent} from '../../shared/nav-bar/nav-bar.component';
import { HeroSectionComponent} from '../../shared/hero-section/hero-section.component';
import { HomeConcertInfoComponent} from './home-concert-info/home-concert-info.component';
import { HomeUpcomingTicketingInfoComponent} from './home-upcoming-ticketing-info/home-upcoming-ticketing-info.component';
import { AboutComponent } from '../../shared/about/about.component';

@Component({
  selector: 'app-homepage',
  standalone: true,
  imports: [
    NavBarComponent,
    HeroSectionComponent,
    HomeConcertInfoComponent,
    HomeUpcomingTicketingInfoComponent,
    AboutComponent,
  ],
  templateUrl: './homepage.component.html',
  styleUrl: './homepage.component.css'
})
export class HomepageComponent {

}
