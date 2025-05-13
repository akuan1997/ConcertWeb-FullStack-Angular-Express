import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AllConcertInfoPageComponent } from './all-concert-info-page.component';

describe('AllConcertInfoPageComponent', () => {
  let component: AllConcertInfoPageComponent;
  let fixture: ComponentFixture<AllConcertInfoPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AllConcertInfoPageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AllConcertInfoPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
