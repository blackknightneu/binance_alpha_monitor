import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';

import { AccountManagerComponent } from './account-manager.component';

describe('AccountManagerComponent', () => {
  let component: AccountManagerComponent;
  let fixture: ComponentFixture<AccountManagerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AccountManagerComponent, RouterTestingModule]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AccountManagerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
