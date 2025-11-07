import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AccountManagerComponent } from '../account-manager/account-manager.component';
import { AccountCalendarComponent } from '../account-calendar/account-calendar.component';
import { AccountService } from '../../services/account.service';
import { Observable } from 'rxjs';
import { take } from 'rxjs/operators';
import { Account } from '../../models/account.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    AccountManagerComponent,
    AccountCalendarComponent
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss'
})
export class DashboardComponent {
  selectedAccount$: Observable<Account | null>;

  constructor(private accountService: AccountService) {
    this.selectedAccount$ = this.accountService.getSelectedAccount();
  }

  getAlphaPoints(accountId: string | undefined): number {
    if (!accountId) return 0;
    return this.accountService.getAlphaPoints(accountId);
  }

  getLastBalance(accountId: string | undefined): number {
    if (!accountId) return 0;
    return this.accountService.getLastDayBalance(accountId);
  }

  exportSelected(): void {
    this.accountService.getSelectedAccount().pipe(take(1)).subscribe(acc => {
      if (!acc) return;
      const json = JSON.stringify(acc, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${acc.name.replace(/\s+/g,'_') || 'account'}_${acc.id}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    });
  }

  exportSelectedCsv(): void {
    this.accountService.getSelectedAccount().pipe(take(1)).subscribe(acc => {
      if (!acc) return;
      const csv = this.accountService.exportAccountToCsv(acc.id);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${acc.name.replace(/\s+/g,'_') || 'account'}_${acc.id}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    });
  }

  exportAllCsv(): void {
    const csv = this.accountService.exportAllToCsv();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alpha_accounts_export.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  // import area bindings
  csvImportText = '';
  importResult = '';

  importCsvFromText(): void {
    if (!this.csvImportText) { this.importResult = 'No CSV provided'; return; }
    const res = this.accountService.importFromCsv(this.csvImportText);
    this.importResult = `Imported: ${res.imported}, Errors: ${res.errors}`;
  }
}
