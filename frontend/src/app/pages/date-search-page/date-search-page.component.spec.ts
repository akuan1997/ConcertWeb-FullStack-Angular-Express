import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DateSearchPageComponent } from './date-search-page.component';

describe('DateSearchPageComponent', () => {
  let component: DateSearchPageComponent;
  let fixture: ComponentFixture<DateSearchPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DateSearchPageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DateSearchPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
