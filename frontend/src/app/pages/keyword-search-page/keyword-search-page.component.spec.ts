import { ComponentFixture, TestBed } from '@angular/core/testing';

import { KeywordSearchPageComponent } from './keyword-search-page.component';

describe('KeywordSearchPageComponent', () => {
  let component: KeywordSearchPageComponent;
  let fixture: ComponentFixture<KeywordSearchPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KeywordSearchPageComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(KeywordSearchPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
