import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UpcomingTicketingComponent } from './upcoming-ticketing.component';

describe('UpcomingTicketingComponent', () => {
  let component: UpcomingTicketingComponent;
  let fixture: ComponentFixture<UpcomingTicketingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UpcomingTicketingComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UpcomingTicketingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
