import { Component } from '@angular/core';
import { NavBarComponent } from '../../shared/nav-bar/nav-bar.component';
import { HeroSectionComponent } from '../../shared/hero-section/hero-section.component';
import { CityDataComponent } from './city-data/city-data.component';
import { AboutComponent } from '../../shared/about/about.component';

@Component({
  selector: 'app-city-page',
  standalone: true,
  imports: [
    NavBarComponent,
    HeroSectionComponent,
    CityDataComponent,
    AboutComponent,
  ],
  templateUrl: './city-page.component.html',
  styleUrl: './city-page.component.css'
})
export class CityPageComponent {

}
