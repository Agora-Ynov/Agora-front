import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuthService } from '../../core/auth/auth.service';
import { HasRoleDirective } from './has-role.directive';

@Component({
  standalone: true,
  imports: [HasRoleDirective],
  template: `<div *appHasRole="'SUPERADMIN'" data-testid="ok">visible</div>`,
})
class HostComponent {}

describe('HasRoleDirective', () => {
  let fixture: ComponentFixture<HostComponent>;
  let auth: { hasRole: jest.Mock };

  beforeEach(async () => {
    auth = { hasRole: jest.fn() };
    await TestBed.configureTestingModule({
      imports: [HostComponent],
    })
      .overrideProvider(AuthService, { useValue: auth })
      .compileComponents();

    fixture = TestBed.createComponent(HostComponent);
  });

  it('affiche le contenu si le rôle est autorisé', () => {
    auth.hasRole.mockReturnValue(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid="ok"]')).toBeTruthy();
  });

  it('masque le contenu si le rôle est refusé', () => {
    auth.hasRole.mockReturnValue(false);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-testid="ok"]')).toBeNull();
  });
});
