import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AccountService } from '../../services/account.service';
import { Account } from '../../models/account.model';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-account-manager',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './account-manager.component.html',
  styleUrl: './account-manager.component.scss'
})
export class AccountManagerComponent implements OnInit, OnDestroy {
  accounts: Account[] = [];
  selectedAccount: Account | null = null;
  sortColumn: string = 'name';
  sortDir: 'asc' | 'desc' = 'asc';

  showLoginModal = false;
  loginAccount: Account | null = null;
  loginTime: string = '';

  // Returns true if account has no input volume trade
  hasNoVolume(account: Account): boolean {
    if (!account || !account.pointsHistory || account.pointsHistory.length === 0) {
      return true;
    }
    const todayUTC = new Date();
    todayUTC.setUTCHours(0,0,0,0);
    const todayRecord = this.getOrCreateRecord(account, todayUTC);
    // Nếu todayRecord là record tạo mới (không có trong pointsHistory), volume = 0
    return !account.pointsHistory.some(r => {
      const rUTC = new Date(Date.UTC(r.date.getUTCFullYear(), r.date.getUTCMonth(), r.date.getUTCDate()));
      return rUTC.getTime() === todayUTC.getTime();
    }) || todayRecord.volume === 0;
  }

  constructor(public accountService: AccountService) {}

  ngOnInit(): void {
    this.accountService.getAccounts().subscribe(accounts => {
      this.accounts = accounts;
    });

    this.accountService.getSelectedAccount().subscribe(account => {
      this.selectedAccount = account;
    });
    // Xóa interval cập nhật countdown logout
  }

  ngOnDestroy(): void {
    // Xóa interval cập nhật countdown logout
  }

  sortBy(column: string): void {
    if (this.sortColumn === column) {
      this.sortDir = this.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDir = 'asc';
    }
  }

  // Phân trang: chỉ hiển thị 20 account gần nhất
  getDisplayedAccounts(): Account[] {
    const accounts = [...this.accounts];
    const dir = this.sortDir === 'asc' ? 1 : -1;
    accounts.sort((a, b) => {
      switch (this.sortColumn) {
        case 'stt':
          return (a.id.localeCompare(b.id)) * dir;
        case 'name':
          return a.name.localeCompare(b.name) * dir;
        case 'balance':
          return (a.balance - b.balance) * dir;
        case 'tomorrowPoints':
          return (this.getTomorrowPoints(a) - this.getTomorrowPoints(b)) * dir;
        case 'todayPoints':
          return (this.getTodayPoints(a) - this.getTodayPoints(b)) * dir;
        case 'pnl':
          return (this.getPnL(a) - this.getPnL(b)) * dir;
        case 'tradeVolume':
          return (this.getTodayTradeVolume(a) - this.getTodayTradeVolume(b)) * dir;
        case 'logoutCountdown':
          // Sort by ms left to logout
          const msA = a.lastLogin ? (new Date(a.lastLogin).getTime() + 5*24*60*60*1000 - new Date().getTime()) : -Infinity;
          const msB = b.lastLogin ? (new Date(b.lastLogin).getTime() + 5*24*60*60*1000 - new Date().getTime()) : -Infinity;
          return (msA - msB) * dir;
        default:
          return 0;
      }
    });
  return accounts;
  }

  // Xóa tất cả tài khoản
  deleteAllAccounts(): void {
    if (confirm('Are you sure you want to delete ALL accounts?')) {
      (this.accounts ?? []).forEach((acc: Account) => {
        if (acc && acc.id) {
          this.accountService.deleteAccount(acc.id);
        }
      });
    }
  }

  deleteAccount(accountId: string): void {
    if (confirm('Are you sure you want to delete this account?')) {
      this.accountService.deleteAccount(accountId);
    }
  }

  getPnL(account: Account): number {
    if (!account || !account.pointsHistory) return 0;
    // Trả về PnL của NGÀY HÔM NAY: (endBalance - startBalance) + profit
    const todayUTC = new Date();
    todayUTC.setUTCHours(0,0,0,0);
    const todayRecord = this.getOrCreateRecord(account, todayUTC);
    if (!todayRecord) return 0;
    const start = todayRecord.startBalance ?? 0;
    const end = todayRecord.endBalance ?? todayRecord.balance ?? 0;
    const profit = todayRecord.profit ?? 0;
    return (end - start) + profit;
  }

  selectAccount(accountId: string): void {
    this.accountService.selectAccount(accountId);
  }

  // Điểm hôm nay: sum D-15 đến D-1
  getTodayPoints(account: Account): number {
    if (!account || !account.pointsHistory || account.pointsHistory.length === 0) return 0;
    const today = new Date();
    today.setUTCHours(0,0,0,0);
    const d1 = new Date(today); d1.setUTCDate(today.getUTCDate()-1);
    const d15 = new Date(today); d15.setUTCDate(today.getUTCDate()-15);
    return account.pointsHistory
      .filter(r => {
        const rUTC = new Date(Date.UTC(r.date.getUTCFullYear(), r.date.getUTCMonth(), r.date.getUTCDate()));
        return rUTC >= d15 && rUTC <= d1;
      })
      .reduce((s, r) => s + (r.totalPoints || 0), 0);
  }

  // Điểm ngày mai: sum D-14 đến D (bao gồm hôm nay)
  getTomorrowPoints(account: Account): number {
    if (!account || !account.pointsHistory || account.pointsHistory.length === 0) return 0;
    const today = new Date();
    today.setUTCHours(0,0,0,0);
    const d14 = new Date(today); d14.setUTCDate(today.getUTCDate()-14);
    return account.pointsHistory
      .filter(r => {
        const rUTC = new Date(Date.UTC(r.date.getUTCFullYear(), r.date.getUTCMonth(), r.date.getUTCDate()));
        return rUTC >= d14 && rUTC <= today;
      })
      .reduce((s, r) => s + (r.totalPoints || 0), 0);
  }

  // Helper: lấy record của ngày bất kỳ, nếu chưa có thì tạo mới dựa trên ngày trước đó
  getOrCreateRecord(account: Account, date: Date): any {
    if (!account || !account.pointsHistory) return null;
    const dateUTC = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    let record = account.pointsHistory.find(r => {
      const rUTC = new Date(Date.UTC(r.date.getUTCFullYear(), r.date.getUTCMonth(), r.date.getUTCDate()));
      return rUTC.getTime() === dateUTC.getTime();
    });
    if (record) return record;
    // Nếu chưa có, lấy ngày trước đó
    const prevDate = new Date(dateUTC); prevDate.setUTCDate(dateUTC.getUTCDate() - 1);
    const prevRecord = account.pointsHistory.find(r => {
      const rUTC = new Date(Date.UTC(r.date.getUTCFullYear(), r.date.getUTCMonth(), r.date.getUTCDate()));
      return rUTC.getTime() === prevDate.getTime();
    });
    if (prevRecord) {
      const defaultBalance = prevRecord.endBalance ?? prevRecord.balance ?? 1000;
      const defaultVolume = prevRecord.volume ?? 32768;
      return {
        date: dateUTC,
        balance: defaultBalance,
        startBalance: defaultBalance,
        endBalance: undefined, // Để trống cho ngày mới
        volume: defaultVolume,
        totalPoints: 0,
        profit: 0
      };
    }
    // Nếu không có ngày trước đó, trả về mặc định theo yêu cầu
    return {
      date: dateUTC,
      balance: 1000,
      startBalance: 1000,
      endBalance: undefined, // Để trống cho ngày mới
      volume: 32768,
      totalPoints: 0,
      profit: 0
    };
  }

  // Sử dụng cho các trường hợp cần lấy dữ liệu ngày hôm nay
  getTodayTradeVolume(account: Account): number {
    if (!account || !account.pointsHistory) return 0;
    const todayUTC = new Date();
    todayUTC.setUTCHours(0,0,0,0);
    const todayRecord = this.getOrCreateRecord(account, todayUTC);
    return todayRecord?.volume ?? 0;
  }
  getTodayBalance(account: Account): number {
    if (!account || !account.pointsHistory) return 0;
    const todayUTC = new Date();
    todayUTC.setUTCHours(0,0,0,0);
    const todayRecord = this.getOrCreateRecord(account, todayUTC);
    return todayRecord?.balance ?? 0;
  }
  getTodayStartBalance(account: Account): number {
    if (!account || !account.pointsHistory) return 0;
    const todayUTC = new Date();
    todayUTC.setUTCHours(0,0,0,0);
    const todayRecord = this.getOrCreateRecord(account, todayUTC);
    return todayRecord?.startBalance ?? 0;
  }

  confirmLoginWithTime(): void {
    if (this.loginAccount && this.loginTime) {
      // Chuyển loginTime từ string sang Date
      const loginDate = new Date(this.loginTime);
      this.loginAccount.lastLogin = loginDate;
      this.accounts = this.accounts.map(acc => acc.id === this.loginAccount!.id ? { ...acc, lastLogin: loginDate } : acc);
      this.closeLoginModal();
    }
  }

  openLoginModal(account: Account): void {
    this.loginAccount = account;
    // Mặc định là thời gian hiện tại, format yyyy-MM-ddTHH:mm
    const now = new Date();
    this.loginTime = now.toISOString().slice(0,16);
    this.showLoginModal = true;
  }

  closeLoginModal(): void {
    this.showLoginModal = false;
    this.loginAccount = null;
    this.loginTime = '';
  }

  // Tính thời gian còn lại đến logout (5 ngày sau login)
  getLogoutCountdown(account: Account): string {
    if (!account.lastLogin) return '';
    const now = new Date();
    const logoutTime = new Date(account.lastLogin);
    logoutTime.setDate(logoutTime.getDate() + 5);
    const msLeft = logoutTime.getTime() - now.getTime();
    if (msLeft <= 0) return 'Đã logout';
    const days = Math.floor(msLeft / (1000 * 60 * 60 * 24));
    const hours = Math.floor((msLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((msLeft % (1000 * 60 * 60)) / (1000 * 60));
    let result = '';
    if (days > 0) result += days + ' ngày ';
    if (hours > 0) result += hours + ' giờ ';
    result += minutes + ' phút';
    return result.trim();
  }

  importData(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        const content = e.target?.result as string;
        const res = this.accountService.importFromCsv(content);
        alert(`Imported: ${res.imported}, Errors: ${res.errors}`);
      };
      reader.readAsText(file);
    }
  }

  exportData(): void {
    const csv = this.accountService.exportAllToCsv();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'binance-alpha-accounts.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }
}
