import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HomeUpcomingTicketingInfoComponent } from './home-upcoming-ticketing-info.component';

describe('HomeUpcomingTicketingInfoComponent', () => {
  let component: HomeUpcomingTicketingInfoComponent;
  let fixture: ComponentFixture<HomeUpcomingTicketingInfoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeUpcomingTicketingInfoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HomeUpcomingTicketingInfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
