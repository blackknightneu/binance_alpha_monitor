import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AccountManagerComponent } from '../account-manager/account-manager.component';
import { AccountCalendarComponent } from '../account-calendar/account-calendar.component';
import { AccountService } from '../../services/account.service';
import { Observable, Subscription } from 'rxjs';
import { take } from 'rxjs/operators';
import { Account } from '../../models/account.model';
import { CustomFieldsService } from '../../services/custom-fields.service';

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
export class DashboardComponent implements OnInit, OnDestroy {
  selectedAccount$: Observable<Account | null>;
  accounts: Account[] = [];
  private subscription: Subscription = new Subscription();

  // Sync functionality
  showApiKeyModal = false;
  apiKeyInput = '';
  syncMessage = '';
  syncError = false;
  isSyncToServer = true; // Track sync direction
  isEditingApiKey = false; // Track if editing API key
  uploadAllData = false; // Option to upload all accounts instead of limited amount
  uploadAllPointHistory = false; // Option to upload all point history instead of limited amount

  // Summary data
  summaryData = {
    accountsWithVolume: 0,
    totalCost: 0,
    averageCostPer1000: 0,
    totalProfit: 0
  };

  // Comprehensive statistics for all accounts and all dates
  comprehensiveStats = {
    totalFee: 0,
    totalAirdrop: 0,
    totalPnL: 0,
    totalTradingDays: 0,
    totalVolume: 0,
    averageFeePerDay: 0
  };

  constructor(private accountService: AccountService, private customFieldsService: CustomFieldsService) {
    this.selectedAccount$ = this.accountService.getSelectedAccount();
  }

  ngOnInit(): void {
    this.subscription.add(
      this.accountService.getAccounts().subscribe(accounts => {
        this.accounts = accounts;
        this.calculateSummary();
        this.calculateComprehensiveStats();
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  private calculateSummary(): void {
    // Create today's date in UTC
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

    let accountsWithVolume = 0;
    let totalCost = 0;
    let totalVolume = 0;
    let totalProfit = 0;

    for (const account of this.accounts) {
      const todayRecord = this.accountService.getRecordForDate(account.id, today);
      if (todayRecord) {
        // Count accounts with volume > 0
        if (todayRecord.volume > 0) {
          accountsWithVolume++;
        }
        // Sum costs for all accounts with records today
        totalCost += ((todayRecord.endBalance ?? 0) - (todayRecord.startBalance ?? 0));
        totalVolume += todayRecord.volume;
        totalProfit += todayRecord.profit || 0;
      }
    }

    const averageCostPer1000 = totalVolume > 0 ? (totalCost / (totalVolume / 4000)) : 0;

    this.summaryData = {
      accountsWithVolume,
      totalCost,
      averageCostPer1000,
      totalProfit
    };
  }

  private calculateComprehensiveStats(): void {
    let totalFee = 0;
    let totalAirdrop = 0;
    let totalPnL = 0;
    let totalTradingDays = 0;
    let totalVolume = 0;

    for (const account of this.accounts) {
      // Get all records for this account
      const records = account.pointsHistory;
      
      for (const record of records) {
        // Fee = endBalance - startBalance (cost paid)
        const fee = (record.endBalance ?? 0) - (record.startBalance ?? 0);
        totalFee += fee;
        
        // Airdrop = profit from the record
        totalAirdrop += record.profit || 0;
        
        // PnL = profit - fee (net profit/loss)
        totalPnL += (record.profit || 0) + fee;
      
      }
    }

    const averageFeePerDay = totalTradingDays > 0 ? (totalFee / totalTradingDays) : 0;

    this.comprehensiveStats = {
      totalFee,
      totalAirdrop,
      totalPnL,
      totalTradingDays,
      totalVolume,
      averageFeePerDay
    };
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

  // Sync data to server
  syncToServer(): void {
    this.isSyncToServer = true;
    this.isEditingApiKey = false;
    // Check if API key exists in localStorage
    const storedApiKey = localStorage.getItem('sync_api_key');

    if (storedApiKey) {
      this.performSync(storedApiKey);
    } else {
      this.showApiKeyModal = true;
      this.apiKeyInput = '';
      this.syncMessage = '';
      this.syncError = false;
    }
  }

  // Sync data from server to local
  async syncFromServer(): Promise<void> {
    this.isSyncToServer = false;
    this.isEditingApiKey = false;
    const apiKey = localStorage.getItem('sync_api_key');
    if (!apiKey) {
      this.showApiKeyModal = true;
      this.syncMessage = 'Vui lòng nhập API Key để đồng bộ từ server';
      return;
    }

    try {
      this.syncMessage = 'Đang tải dữ liệu từ server...';
      this.syncError = false;

      // Make API call to get data from server
      const response = await fetch(`https://binancealphaapi.vercel.app/api/data?apiKey=${apiKey}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
        mode: 'cors'
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      // Update local storage with server data
      if (result.accounts && Array.isArray(result.accounts)) {
        // Update accounts in localStorage
        localStorage.setItem('accounts', JSON.stringify(result.accounts));
        this.accounts = result.accounts;
      }

      if (result.customFields && typeof result.customFields === 'object') {
        // Update custom fields in localStorage and service
        localStorage.setItem('customFields', JSON.stringify(result.customFields));
        // Update the service's BehaviorSubject directly
        this.customFieldsService['customFieldsSubject'].next(result.customFields);
      }

      this.syncMessage = `Đã đồng bộ thành công! ${result.accounts?.length || 0} tài khoản và ${Object.keys(result.customFields || {}).length} trường tùy chỉnh`;
      this.syncError = false;

      // Show success message briefly
      setTimeout(() => {
        this.syncMessage = '';
      }, 3000);

    } catch (error: any) {
      console.error('Sync from server error:', error);
      this.syncMessage = 'Lỗi tải dữ liệu từ server: ' + (error.message || 'Unknown error');
      this.syncError = true; 
    }
  }

  closeApiKeyModal(): void {
    this.showApiKeyModal = false;
    this.apiKeyInput = '';
    this.syncMessage = '';
    this.syncError = false;
    this.isEditingApiKey = false;
    this.uploadAllData = false; // Reset upload option
    this.uploadAllPointHistory = false; // Reset point history option
  }

  confirmSync(): void {
    if (!this.apiKeyInput.trim()) return;

    // Save API key to localStorage for future use
    localStorage.setItem('sync_api_key', this.apiKeyInput.trim());

    this.showApiKeyModal = false;

    // If editing API key, just close modal without performing sync
    if (this.isEditingApiKey) {
      this.isEditingApiKey = false;
      this.syncMessage = 'API Key đã được cập nhật!';
      this.syncError = false;
      setTimeout(() => {
        this.syncMessage = '';
      }, 2000);
      return;
    }

    // Otherwise, perform the sync operation
    this.performSync(this.apiKeyInput.trim());
  }

  private async performSync(apiKey: string): Promise<void> {
    try {
      // Collect all data from local storage
      const accountsData = (this.uploadAllData ? this.accounts : this.accounts.slice(0, 500)).map(account => ({
        ...account,
        // Limit or include all point history based on user preference
        pointsHistory: this.uploadAllPointHistory ? 
          (account.pointsHistory || []) : 
          (account.pointsHistory || [])
      }));
      const customFieldsData = this.customFieldsService.getCustomFields();
      
      // Calculate total point history records
      const totalPointHistoryRecords = accountsData.reduce((sum, account) => 
        sum + (account.pointsHistory?.length || 0), 0);
      
      this.syncMessage = `Đang đồng bộ dữ liệu... (Upload ${accountsData.length}/${this.accounts.length} tài khoản, ${totalPointHistoryRecords} point records)`;
      this.syncError = false;
      
      const bodyData = {
        accounts: accountsData,
        customFields: customFieldsData,
        timestamp: new Date().toISOString(),
        uploadAllData: this.uploadAllData,
        uploadAllPointHistory: this.uploadAllPointHistory,
        totalAccounts: this.accounts.length,
        totalPointHistoryRecords: totalPointHistoryRecords
      };

      // Make API call to server
      const response = await fetch('https://binancealphaapi.vercel.app/api/data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
        mode: 'cors',
        body: JSON.stringify({
          apiKey: apiKey,
          bodyData: bodyData
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      // Calculate actual uploaded point history records
      const actualPointHistoryRecords = accountsData.reduce((sum, account) => 
        sum + (account.pointsHistory?.length || 0), 0);
      
      this.syncMessage = `Đồng bộ thành công! Đã upload ${accountsData.length}/${this.accounts.length} tài khoản, ${actualPointHistoryRecords} point records và ${Object.keys(customFieldsData).length} trường tùy chỉnh`;
      this.syncError = false;
      
      // Show success message briefly
      setTimeout(() => {
        this.syncMessage = '';
      }, 3000);

    } catch (error: any) {
      console.error('Sync error:', error);
      this.syncMessage = 'Lỗi đồng bộ: ' + (error.message || 'Unknown error');
      this.syncError = true;
      
      // Clear API key if authentication failed
      if (error.message.includes('401') || error.message.includes('auth')) {
        localStorage.removeItem('sync_api_key');
      }
    }
  }

  // Edit API Key
  editApiKey(): void {
    const currentApiKey = localStorage.getItem('sync_api_key');
    this.showApiKeyModal = true;
    this.apiKeyInput = currentApiKey || '';
    this.syncMessage = '';
    this.syncError = false;
    this.isEditingApiKey = true;
  }
}
