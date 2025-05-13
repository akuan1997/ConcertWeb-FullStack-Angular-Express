import { Component } from '@angular/core';
import { AboutComponent } from '../../shared/about/about.component';
import { AllConcertInfoComponent } from './all-concert-info/all-concert-info.component';
import { HeroSectionComponent } from '../../shared/hero-section/hero-section.component';
import { NavBarComponent } from '../../shared/nav-bar/nav-bar.component';

@Component({
  selector: 'app-all-concert-info-page',
  standalone: true,
  imports: [
    AboutComponent,
    AllConcertInfoComponent,
    HeroSectionComponent,
    NavBarComponent
  ],
  templateUrl: './all-concert-info-page.component.html',
  styleUrl: './all-concert-info-page.component.css'
})
export class AllConcertInfoPageComponent {

}
