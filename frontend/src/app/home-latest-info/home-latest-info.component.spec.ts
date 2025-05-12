import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HomeLatestInfoComponent } from './home-latest-info.component';

describe('HomeLatestInfoComponent', () => {
  let component: HomeLatestInfoComponent;
  let fixture: ComponentFixture<HomeLatestInfoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeLatestInfoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HomeLatestInfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
