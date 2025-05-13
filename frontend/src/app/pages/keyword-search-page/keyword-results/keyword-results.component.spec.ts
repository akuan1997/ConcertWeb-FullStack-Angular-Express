import { ComponentFixture, TestBed } from '@angular/core/testing';

import { KeywordResultsComponent } from './keyword-results.component';

describe('KeywordResultsComponent', () => {
  let component: KeywordResultsComponent;
  let fixture: ComponentFixture<KeywordResultsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KeywordResultsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(KeywordResultsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
