import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HomeConcertInfoComponent } from './home-concert-info.component';

describe('HomeConcertInfoComponent', () => {
  let component: HomeConcertInfoComponent;
  let fixture: ComponentFixture<HomeConcertInfoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HomeConcertInfoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HomeConcertInfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
