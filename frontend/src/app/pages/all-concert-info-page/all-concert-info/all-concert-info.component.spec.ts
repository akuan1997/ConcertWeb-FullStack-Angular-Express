import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AllConcertInfoComponent } from './all-concert-info.component';

describe('AllConcertInfoComponent', () => {
  let component: AllConcertInfoComponent;
  let fixture: ComponentFixture<AllConcertInfoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AllConcertInfoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AllConcertInfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
