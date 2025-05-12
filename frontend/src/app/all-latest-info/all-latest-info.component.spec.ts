import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AllLatestInfoComponent } from './all-latest-info.component';

describe('AllLatestInfoComponent', () => {
  let component: AllLatestInfoComponent;
  let fixture: ComponentFixture<AllLatestInfoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AllLatestInfoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AllLatestInfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
