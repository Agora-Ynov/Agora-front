import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SiteFooterComponent } from './site-footer.component';

describe('SiteFooterComponent', () => {
  let fixture: ComponentFixture<SiteFooterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SiteFooterComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SiteFooterComponent);
    fixture.detectChanges();
  });

  it('crée le composant', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });
});
