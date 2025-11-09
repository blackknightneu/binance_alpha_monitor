import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AccountService } from '../../services/account.service';
import { Account, PointsRecord } from '../../models/account.model';
import { FormsModule } from '@angular/forms';

interface ColumnOption {
  id: string;
  label: string;
  visible: boolean;
}

@Component({
  selector: 'app-account-manager',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './account-manager.component.html',
  styleUrl: './account-manager.component.scss'
})
export class AccountManagerComponent implements OnInit, OnDestroy {
  private readonly LOGIN_TIMEZONE_OFFSET = 7; // GMT+7
  private readonly COLUMN_STORAGE_KEY = 'account-manager-visible-columns';
  accounts: Account[] = [];
  selectedAccount: Account | null = null;
  sortColumn: string = 'name';
  sortDir: 'asc' | 'desc' = 'asc';

  columnOptions: ColumnOption[] = [
    { id: 'todayStartBalance', label: 'Số dư đầu ngày hôm nay', visible: false },
    { id: 'todayCost', label: 'Chi phí hôm nay', visible: true },
    { id: 'todayBalancePoints', label: 'Điểm số dư hôm nay', visible: false },
    { id: 'todayEndBalance', label: 'Số dư cuối ngày hôm nay', visible: true },
    { id: 'todayVolumePoints', label: 'Điểm volume hôm nay', visible: false },
    { id: 'todayVolume', label: 'Volume hôm nay', visible: true },
    { id: 'todayTotalPoints', label: 'Điểm hôm nay (D-15->D-1)', visible: true },
  { id: 'tomorrowPoints', label: 'Điểm ngày mai (D-14->D)', visible: true },
  { id: 'riskDate', label: 'Ngày bị risk (ngày)', visible: false },
    { id: 'logoutCountdown', label: 'Thời gian logout', visible: true },
    { id: 'totalPnL', label: 'Tổng PnL từ trước', visible: true }
  ];

  showLoginModal = false;
  loginAccount: Account | null = null;
  loginTime: string = '';

  showRenameModal = false;
  renameAccount: Account | null = null;
  renameName: string = '';

  showRiskModal = false;
  riskAccount: Account | null = null;
  riskDateInput: string = '';

  showColumnSelector = false;
  tempColumnVisibility: Record<string, boolean> = {};

  trackColumnOption(index: number, option: ColumnOption): string {
    return option.id;
  }

  getVisibleColumnCount(): number {
    return this.columnOptions.filter(option => option.visible).length;
  }

  openColumnSelector(): void {
    this.tempColumnVisibility = this.columnOptions.reduce<Record<string, boolean>>((acc, option) => {
      acc[option.id] = option.visible;
      return acc;
    }, {});
    this.showColumnSelector = true;
  }

  toggleTempColumn(optionId: string, isChecked: boolean): void {
    this.tempColumnVisibility = {
      ...this.tempColumnVisibility,
      [optionId]: isChecked
    };
  }

  confirmColumnSelection(): void {
    this.columnOptions = this.columnOptions.map(option => ({
      ...option,
      visible: this.tempColumnVisibility[option.id] ?? false
    }));
    this.saveColumnVisibility();
    this.showColumnSelector = false;
  }

  cancelColumnSelection(): void {
    this.showColumnSelector = false;
  }

  private loadColumnVisibility(): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    const stored = window.localStorage.getItem(this.COLUMN_STORAGE_KEY);
    if (!stored) {
      return;
    }
    try {
      const parsed = JSON.parse(stored) as Record<string, boolean>;
      this.columnOptions = this.columnOptions.map(option => ({
        ...option,
        visible: parsed[option.id] ?? option.visible
      }));
    } catch (error) {
      console.warn('Failed to restore column visibility', error);
    }
  }

  private saveColumnVisibility(): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    const visibility = this.columnOptions.reduce<Record<string, boolean>>((acc, option) => {
      acc[option.id] = option.visible;
      return acc;
    }, {});
    window.localStorage.setItem(this.COLUMN_STORAGE_KEY, JSON.stringify(visibility));
  }

  private getTodayRecord(account: Account): PointsRecord | null {
    if (!account || !account.pointsHistory) return null;
    const todayUTC = new Date();
    todayUTC.setUTCHours(0, 0, 0, 0);
    return this.getOrCreateRecord(account, todayUTC) ?? null;
  }

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
    }) || !todayRecord || todayRecord.volume === 0;
  }

  constructor(public accountService: AccountService) {}

  ngOnInit(): void {
    this.loadColumnVisibility();
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
        case 'todayStartBalance':
          return (this.getTodayStartBalance(a) - this.getTodayStartBalance(b)) * dir;
        case 'todayCost':
          return (this.getTodayCost(a) - this.getTodayCost(b)) * dir;
        case 'todayBalancePoints':
          return (this.getTodayBalancePoints(a) - this.getTodayBalancePoints(b)) * dir;
        case 'todayEndBalance':
          return (this.getTodayEndBalance(a) - this.getTodayEndBalance(b)) * dir;
        case 'todayVolumePoints':
          return (this.getTodayVolumePoints(a) - this.getTodayVolumePoints(b)) * dir;
        case 'todayVolume':
          return (this.getTodayTradeVolume(a) - this.getTodayTradeVolume(b)) * dir;
        case 'todayTotalPoints':
          return (this.getTodayPoints(a) - this.getTodayPoints(b)) * dir;
        case 'tomorrowPoints':
          return (this.getTomorrowPoints(a) - this.getTomorrowPoints(b)) * dir;
        case 'riskDate': {
          const fallback = dir === 1 ? Number.MAX_SAFE_INTEGER : Number.MIN_SAFE_INTEGER;
          const aTime = a.riskDate ? a.riskDate.getTime() : fallback;
          const bTime = b.riskDate ? b.riskDate.getTime() : fallback;
          return (aTime - bTime) * dir;
        }
        case 'totalPnL':
          return (this.getTotalPnL(a) - this.getTotalPnL(b)) * dir;
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
  getOrCreateRecord(account: Account, date: Date): PointsRecord | null {
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
        endBalance: defaultBalance,
        volume: defaultVolume,
        volumePoints: prevRecord.volumePoints ?? 0,
        balancePoints: prevRecord.balancePoints ?? 0,
        totalPoints: 0,
        profit: 0,
        modified: false,
        deductedPoints: 0,
        bonusPoints: 0
      };
    }
    // Nếu không có ngày trước đó, trả về mặc định theo yêu cầu
    return {
      date: dateUTC,
      balance: 1000,
      startBalance: 1000,
      endBalance: 1000,
      volume: 32768,
      volumePoints: 0,
      balancePoints: 0,
      totalPoints: 0,
      profit: 0,
      modified: false,
      deductedPoints: 0,
      bonusPoints: 0
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
  getTodayVolumePoints(account: Account): number {
    return this.getTodayRecord(account)?.volumePoints ?? 0;
  }
  getTodayBalance(account: Account): number {
    if (!account || !account.pointsHistory) return 0;
    const todayUTC = new Date();
    todayUTC.setUTCHours(0,0,0,0);
    const todayRecord = this.getOrCreateRecord(account, todayUTC);
    return todayRecord?.balance ?? 0;
  }
  getTodayBalancePoints(account: Account): number {
    return this.getTodayRecord(account)?.balancePoints ?? 0;
  }
  getTodayStartBalance(account: Account): number {
    if (!account || !account.pointsHistory) return 0;
    const todayUTC = new Date();
    todayUTC.setUTCHours(0,0,0,0);
    const todayRecord = this.getOrCreateRecord(account, todayUTC);
    return todayRecord?.startBalance ?? 0;
  }
  getTodayEndBalance(account: Account): number {
    return this.getTodayRecord(account)?.endBalance ?? this.getLatestEndBalance(account);
  }

  getTodayCost(account: Account): number {
    const todayRecord = this.getTodayRecord(account);
    if (!todayRecord) return 0;
    const start = todayRecord.startBalance ?? 0;
    const end = todayRecord.endBalance ?? todayRecord.balance ?? 0;
    return start - end;
  }

  getTotalPnL(account: Account): number {
    if (!account || !account.pointsHistory) return 0;
    return account.pointsHistory.reduce((sum, record) => {
      const start = record.startBalance ?? 0;
      const end = record.endBalance ?? record.balance ?? 0;
      const profit = record.profit ?? 0;
      return sum + (start - end) + profit;
    }, 0);
  }

  getLatestEndBalance(account: Account): number {
    if (!account || !account.pointsHistory || account.pointsHistory.length === 0) return 0;
    const latestRecord = account.pointsHistory.reduce((latest, current) => {
      if (!latest) return current;
      return current.date > latest.date ? current : latest;
    }, undefined as PointsRecord | undefined);
    return latestRecord?.endBalance ?? latestRecord?.balance ?? 0;
  }

  confirmLoginWithTime(): void {
    if (this.loginAccount && this.loginTime) {
      const loginDate = this.parseLoginTimeToDate(this.loginTime) ?? new Date();
      this.loginAccount.lastLogin = loginDate;
      this.accounts = this.accounts.map(acc => acc.id === this.loginAccount!.id ? { ...acc, lastLogin: loginDate } : acc);
      this.closeLoginModal();
    }
  }

  openLoginModal(account: Account): void {
    this.loginAccount = account;
    const now = new Date();
    this.loginTime = this.formatDateForLoginInput(now);
    this.showLoginModal = true;
  }

  closeLoginModal(): void {
    this.showLoginModal = false;
    this.loginAccount = null;
    this.loginTime = '';
  }

  openRenameModal(account: Account): void {
    this.renameAccount = account;
    this.renameName = account?.name ?? '';
    this.showRenameModal = true;
  }

  confirmRename(): void {
    if (!this.renameAccount) {
      return;
    }
    const trimmedName = this.renameName?.trim();
    if (!trimmedName) {
      alert('Tên tài khoản không được để trống');
      return;
    }
    this.accountService.updateAccountName(this.renameAccount.id, trimmedName);
    this.accounts = this.accounts.map(acc => acc.id === this.renameAccount!.id ? { ...acc, name: trimmedName } : acc);
    if (this.selectedAccount?.id === this.renameAccount.id) {
      this.selectedAccount = { ...this.selectedAccount, name: trimmedName };
    }
    this.closeRenameModal();
  }

  closeRenameModal(): void {
    this.showRenameModal = false;
    this.renameAccount = null;
    this.renameName = '';
  }

  openRiskModal(account: Account): void {
    this.riskAccount = account;
    const baseDate = account.riskDate ?? new Date();
    this.riskDateInput = this.formatDateForRiskInput(baseDate);
    this.showRiskModal = true;
  }

  confirmRiskDate(): void {
    if (!this.riskAccount) {
      return;
    }
    if (!this.riskDateInput) {
      alert('Vui lòng chọn ngày bị risk');
      return;
    }
    const parsed = this.parseRiskDateInput(this.riskDateInput);
    if (!parsed) {
      alert('Ngày không hợp lệ');
      return;
    }
    this.accountService.updateRiskDate(this.riskAccount.id, parsed);
    this.accounts = this.accounts.map(acc => acc.id === this.riskAccount!.id ? { ...acc, riskDate: parsed } : acc);
    if (this.selectedAccount?.id === this.riskAccount.id) {
      this.selectedAccount = { ...this.selectedAccount, riskDate: parsed };
    }
    this.closeRiskModal();
  }

  clearRiskDate(): void {
    if (!this.riskAccount) {
      return;
    }
    this.accountService.updateRiskDate(this.riskAccount.id, null);
    this.accounts = this.accounts.map(acc => acc.id === this.riskAccount!.id ? { ...acc, riskDate: undefined } : acc);
    if (this.selectedAccount?.id === this.riskAccount.id) {
      this.selectedAccount = { ...this.selectedAccount, riskDate: undefined };
    }
    this.closeRiskModal();
  }

  closeRiskModal(): void {
    this.showRiskModal = false;
    this.riskAccount = null;
    this.riskDateInput = '';
  }

  getRiskDays(account: Account): number {
    if (!account.riskDate) {
      return 0;
    }
    const today = new Date();
    const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
    const riskUtc = Date.UTC(account.riskDate.getUTCFullYear(), account.riskDate.getUTCMonth(), account.riskDate.getUTCDate());
    const diff = Math.round((todayUtc - riskUtc) / (1000 * 60 * 60 * 24));
    return diff < 0 ? 0 : diff;
  }

  formatRiskDisplay(account: Account): string {
    if (!account.riskDate) {
      return 'Chưa risk';
    }
    const days = this.getRiskDays(account);
    const dateText = this.formatDateForDisplay(account.riskDate);
    return `${dateText} (${days} ngày)`;
  }

  private formatDateForRiskInput(date: Date): string {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private parseRiskDateInput(value: string): Date | null {
    const parts = value.split('-').map(Number);
    if (parts.length !== 3 || parts.some(num => Number.isNaN(num))) {
      return null;
    }
    const [year, month, day] = parts;
    return new Date(Date.UTC(year, month - 1, day));
  }

  private formatDateForDisplay(date: Date): string {
    const day = String(date.getUTCDate()).padStart(2, '0');
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const year = date.getUTCFullYear();
    return `${day}/${month}/${year}`;
  }

  private formatDateForLoginInput(date: Date): string {
    const tzMillis = this.LOGIN_TIMEZONE_OFFSET * 60 * 60 * 1000;
    const tzDate = new Date(date.getTime() + tzMillis);
    const year = tzDate.getUTCFullYear();
    const month = String(tzDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(tzDate.getUTCDate()).padStart(2, '0');
    const hours = String(tzDate.getUTCHours()).padStart(2, '0');
    const minutes = String(tzDate.getUTCMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }

  private parseLoginTimeToDate(value: string): Date | null {
    if (!value) return null;
    const [datePart, timePart] = value.split('T');
    if (!datePart || !timePart) return null;
    const [year, month, day] = datePart.split('-').map(Number);
    const [hour, minute] = timePart.split(':').map(Number);
    if ([year, month, day, hour, minute].some(num => Number.isNaN(num))) return null;
    return new Date(Date.UTC(year, month - 1, day, hour - this.LOGIN_TIMEZONE_OFFSET, minute));
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
    return `${days}d ${hours}h`;
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
