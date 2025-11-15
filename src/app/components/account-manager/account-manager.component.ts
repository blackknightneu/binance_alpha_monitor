import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AccountService } from '../../services/account.service';
import { LanguageService, Language } from '../../services/language.service';
import { CustomFieldsService } from '../../services/custom-fields.service';
import { Account, PointsRecord, CustomFieldDefinition } from '../../models/account.model';
import { FormsModule } from '@angular/forms';

interface ColumnOption {
  id: string;
  labels: Record<Language, string>;
  visible: boolean;
  width?: string;
}

interface TextBundle {
  title: string;
  createAccount: string;
  exportCsv: string;
  exportCsvAria: string;
  importCsv: string;
  importCsvAria: string;
  localWarning: string;
  columnSelectorButton: string;
  columnSummaryTemplate: string;
  stt: string;
  name: string;
  actions: string;
  rename: string;
  risk: string;
  login: string;
  delete: string;
  noAccounts: string;
  loginModalTitle: string;
  loginModalLabel: string;
  confirm: string;
  cancel: string;
  riskModalTitle: string;
  riskModalAccount: string;
  riskModalDateLabel: string;
  save: string;
  remove: string;
  columnModalTitle: string;
  renameModalTitle: string;
  renameModalSubtitle: string;
  renameModalInput: string;
  riskNotSet: string;
  daysSuffix: string;
  logoutExpired: string;
  confirmDeleteAccount: string;
  riskDateRequired: string;
  riskDateInvalid: string;
  customManageFields: string;
  customAddNewField: string;
  customFieldName: string;
  customFieldType: string;
  customTextType: string;
  customBooleanType: string;
  customAddField: string;
  customNoFieldsDefined: string;
  customEditInfo: string;
  customSave: string;
  languageEnglish: string;
  languageVietnamese: string;
  switchToEnglish: string;
  switchToVietnamese: string;
}

type TextKey = keyof TextBundle;

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

  get language(): Language {
    return this.languageService.currentLanguage();
  }

  // Custom Fields
  customFields: CustomFieldDefinition[] = [];
  showCustomFieldsModal = false;
  showAddFieldModal = false;
  newFieldName = '';
  newFieldType: 'text' | 'boolean' = 'text';
  editingField: CustomFieldDefinition | null = null;
  showEditCustomFieldsModal = false;
  editAccount: Account | null = null;
  customFieldValues: Record<string, any> = {};

  private readonly translations: Record<Language, TextBundle> = {
    vi: {
      title: 'Quản lý tài khoản',
      createAccount: 'Tạo',
            exportCsv: 'Xuất',
      exportCsvAria: 'Tải xuống CSV',
            importCsv: 'Tải lên',
      importCsvAria: 'Tải lên CSV',
      localWarning: 'Dữ liệu chỉ lưu trên trình duyệt của bạn. Nếu muốn sử dụng ở trình duyệt hoặc máy khác, vui lòng export dữ liệu và import lại.',
      columnSelectorButton: 'Chọn tùy chọn hiển thị',
      columnSummaryTemplate: 'Đang hiển thị {current} / {total} tùy chọn',
      stt: 'STT',
      name: 'Tên',
      actions: 'Thao tác',
      rename: 'Đổi tên tài khoản',
      risk: 'Ghi nhận ngày bị risk',
      login: 'Ghi nhận đăng nhập',
      delete: 'Xóa tài khoản',
      noAccounts: 'Chưa có tài khoản nào. Nhấn "Tạo tài khoản" để thêm mới.',
      loginModalTitle: 'Ghi nhận đăng nhập cho tài khoản',
      loginModalLabel: 'Thời gian đăng nhập (GMT+7):',
      confirm: 'Xác nhận',
      cancel: 'Hủy',
      riskModalTitle: 'Ghi nhận ngày bị risk',
      riskModalAccount: 'Tài khoản:',
      riskModalDateLabel: 'Ngày bị risk',
      save: 'Lưu',
      remove: 'Xóa',
      columnModalTitle: 'Chọn tùy chọn hiển thị',
      renameModalTitle: 'Đổi tên tài khoản',
      renameModalSubtitle: 'Tài khoản hiện tại:',
      renameModalInput: 'Tên mới',
      riskNotSet: '',
      daysSuffix: 'ngày',
      logoutExpired: 'Đã logout',
      confirmDeleteAccount: 'Bạn có chắc chắn muốn xóa tài khoản này?',
      riskDateRequired: 'Vui lòng chọn ngày bị risk',
      riskDateInvalid: 'Ngày không hợp lệ',
      languageEnglish: 'English',
      languageVietnamese: 'Tiếng Việt',
  switchToEnglish: 'Chuyển sang tiếng Anh',
  switchToVietnamese: 'Chuyển sang tiếng Việt',
      customManageFields: 'Quản lý thông tin thêm',
      customAddNewField: 'Thêm trường mới',
      customFieldName: 'Tên trường',
      customFieldType: 'Loại',
      customTextType: 'Văn bản',
      customBooleanType: 'Có/Không',
      customAddField: 'Thêm',
      customNoFieldsDefined: 'Chưa có trường thông tin nào',
      customEditInfo: 'Chỉnh sửa thông tin thêm',
      customSave: 'Lưu'
    },
    en: {
      title: 'Account Management',
      createAccount: 'New',
      exportCsv: 'Export',
      exportCsvAria: 'Download',
      importCsv: 'Import',
      importCsvAria: 'Upload',
      localWarning: 'Data is stored only in your browser. To use it on another browser or device, please export it and then import again.',
      columnSelectorButton: 'Select visible options',
      columnSummaryTemplate: 'Showing {current} / {total} options',
      stt: 'No.',
      name: 'Name',
      actions: 'Actions',
      rename: 'Rename account',
      risk: 'Record risk date',
      login: 'Record login',
      delete: 'Delete account',
      noAccounts: 'No accounts yet. Click "Create account" to add one.',
      loginModalTitle: 'Record login for account',
      loginModalLabel: 'Login time (GMT+7):',
      confirm: 'Confirm',
      cancel: 'Cancel',
      riskModalTitle: 'Record risk date',
      riskModalAccount: 'Account:',
      riskModalDateLabel: 'Risk date',
      save: 'Save',
      remove: 'Remove',
      columnModalTitle: 'Select visible options',
      renameModalTitle: 'Rename account',
      renameModalSubtitle: 'Current account:',
      renameModalInput: 'New name',
      riskNotSet: 'Not risked',
      daysSuffix: 'days',
      logoutExpired: 'Logged out',
      confirmDeleteAccount: 'Are you sure you want to delete this account?',
      riskDateRequired: 'Please choose a risk date',
      riskDateInvalid: 'Invalid date',
      languageEnglish: 'English',
      languageVietnamese: 'Vietnamese',
  switchToEnglish: 'Switch to English',
  switchToVietnamese: 'Switch to Vietnamese',
      customManageFields: 'Manage Additional Information',
      customAddNewField: 'Add New Field',
      customFieldName: 'Field Name',
      customFieldType: 'Type',
      customTextType: 'Text',
      customBooleanType: 'Yes/No',
      customAddField: 'Add',
      customNoFieldsDefined: 'No fields defined yet',
      customEditInfo: 'Edit Additional Information',
      customSave: 'Save'
    }
  };

  columnOptions: ColumnOption[] = [
    {
      id: 'todayStartBalance',
      labels: {
        vi: 'Số dư đầu ngày',
        en: "Start balance"
      },
      visible: true,
      width: '120px'
    },
    {
      id: 'todayPnL',
      labels: {
        vi: 'Lãi/Lỗ trong ngày',
        en: "PnL (today)"
      },
      visible: true,
      width: '100px'
    },
    {
      id: 'todayProfit',
      labels: {
        vi: 'Lợi nhuận hôm nay',
        en: "Today's profit"
      },
      visible: true,
      width: '120px'
    },
    {
      id: 'todayBalancePoints',
      labels: {
        vi: 'Điểm số dư hôm nay',
        en: "Balance points"
      },
      visible: false,
      width: '120px'
    },
    {
      id: 'todayEndBalance',
      labels: {
        vi: 'Số dư cuối ngày',
        en: "End balance"
      },
      visible: true,
      width: '120px'
    },
    {
      id: 'todayVolumePoints',
      labels: {
        vi: 'Điểm volume hôm nay',
        en: "Today's volume points"
      },
      visible: false,
      width: '120px'
    },
    {
      id: 'todayVolume',
      labels: {
        vi: 'Khối lượng (USD)',
        en: "Volume (USD)"
      },
      visible: true,
      width: '120px'
    },
    {
      id: 'todayTotalPoints',
      labels: {
        vi: 'Điểm hôm nay',
        en: 'Points today'
      },
      visible: true,
      width: '120px'
    },
    {
      id: 'tomorrowPoints',
      labels: {
        vi: 'Điểm ngày mai',
        en: 'Points tomorrow'
      },
      visible: true,
      width: '120px'
    },
    {
      id: 'riskDate',
      labels: {
        vi: 'Ngày bị risk (ngày)',
        en: 'Risk date (days)'
      },
      visible: false,
      width: '150px'
    },
    {
      id: 'logoutCountdown',
      labels: {
        vi: 'Thời gian logout',
        en: 'Logout'
      },
      visible: true,
      width: '150px'
    },
    {
      id: 'totalPnL',
      labels: {
        vi: 'Tổng PnL từ trước',
        en: 'Total PnL'
      },
      visible: true,
      width: '120px'
    },
    {
      id: 'showRenameButton',
      labels: {
        vi: 'Thao tác: Hiện nút Đổi tên',
        en: 'Actions: Show Rename button'
      },
      visible: true
    },
    {
      id: 'showRiskButton',
      labels: {
        vi: 'Thao tác: Hiện nút Ghi nhận risk',
        en: 'Actions: Show Record Risk button'
      },
      visible: true
    },
    {
      id: 'showLoginButton',
      labels: {
        vi: 'Thao tác: Hiện nút Ghi nhận login',
        en: 'Actions: Show Record Login button'
      },
      visible: true
    },
    {
      id: 'showDeleteButton',
      labels: {
        vi: 'Thao tác: Hiện nút Xóa tài khoản',
        en: 'Actions: Show Delete Account button'
      },
      visible: true
    }
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

  getColumnVisibility(columnId: string): boolean {
    return this.columnOptions.find(option => option.id === columnId)?.visible ?? true;
  }

  isAnyActionVisible(): boolean {
    return this.getColumnVisibility('showRenameButton') ||
           this.getColumnVisibility('showRiskButton') ||
           this.getColumnVisibility('showLoginButton') ||
           this.getColumnVisibility('showDeleteButton');
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

  t(key: TextKey): string {
    return this.translations[this.language][key];
  }

  getColumnLabel(option: ColumnOption): string {
    return option.labels[this.language];
  }

  getColumnSummaryText(): string {
    const template = this.t('columnSummaryTemplate');
    return template
      .replace('{current}', String(this.getVisibleColumnCount()))
      .replace('{total}', String(this.columnOptions.length));
  }

  getLanguageToggleLabel(): string {
    return this.language === 'vi' ? this.t('languageEnglish') : this.t('languageVietnamese');
  }

  getLanguageToggleAriaLabel(): string {
    return this.language === 'vi' ? this.t('switchToEnglish') : this.t('switchToVietnamese');
  }

  toggleLanguage(): void {
    this.languageService.toggleLanguage();
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
    return account.pointsHistory.find(r => {
      const rDate = new Date(Date.UTC(r.date.getUTCFullYear(), r.date.getUTCMonth(), r.date.getUTCDate()));
      return rDate.getTime() === todayUTC.getTime();
    }) || null;
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

  constructor(public accountService: AccountService, private languageService: LanguageService, private customFieldsService: CustomFieldsService) {}

  ngOnInit(): void {
    this.loadColumnVisibility();
    this.accountService.getAccounts().subscribe(accounts => {
      this.accounts = accounts;
    });

    this.accountService.getSelectedAccount().subscribe(account => {
      this.selectedAccount = account;
    });

    // Load custom fields
    this.customFieldsService.customFields$.subscribe(fields => {
      this.customFields = fields;
      this.updateColumnOptionsForCustomFields();
    });

    // Xóa interval cập nhật countdown logout
  }

  // Custom Fields Management
  openCustomFieldsModal(): void {
    this.showCustomFieldsModal = true;
  }

  closeCustomFieldsModal(): void {
    this.showCustomFieldsModal = false;
  }

  openAddFieldModal(): void {
    this.newFieldName = '';
    this.newFieldType = 'text';
    this.showAddFieldModal = true;
  }

  closeAddFieldModal(): void {
    this.showAddFieldModal = false;
    this.newFieldName = '';
    this.newFieldType = 'text';
  }

  addCustomField(): void {
    if (!this.newFieldName.trim()) {
      alert('Tên trường không được để trống');
      return;
    }

    this.customFieldsService.addCustomField({
      name: this.newFieldName.trim(),
      type: this.newFieldType
    });

    this.closeAddFieldModal();
  }

  editCustomField(field: CustomFieldDefinition): void {
    this.editingField = { ...field };
    // TODO: Implement edit modal
  }

  deleteCustomField(fieldId: string): void {
    if (confirm('Bạn có chắc chắn muốn xóa trường này?')) {
      this.customFieldsService.deleteCustomField(fieldId);
    }
  }

  openEditCustomFieldsModal(account: Account): void {
    this.editAccount = account;
    this.customFieldValues = { ...(account.customFields || {}) };
    this.showEditCustomFieldsModal = true;
  }

  closeEditCustomFieldsModal(): void {
    this.showEditCustomFieldsModal = false;
    this.editAccount = null;
    this.customFieldValues = {};
  }

  saveCustomFieldValues(): void {
    if (!this.editAccount) return;

    const updatedAccount = {
      ...this.editAccount,
      customFields: { ...this.customFieldValues },
      lastUpdated: new Date()
    };

    this.accountService.updateAccount(updatedAccount);
    this.closeEditCustomFieldsModal();
  }

  getCustomFieldValue(account: Account, fieldId: string): any {
    return account.customFields?.[fieldId] ?? '';
  }

  getFieldDefinition(columnId: string): CustomFieldDefinition | undefined {
    if (!columnId.startsWith('custom_')) return undefined;
    const fieldId = columnId.replace('custom_', '');
    return this.customFields.find(field => field.id === fieldId);
  }

  private updateColumnOptionsForCustomFields(): void {
    // Remove existing custom field columns
    this.columnOptions = this.columnOptions.filter(option => !option.id.startsWith('custom_'));

    // Add new custom field columns
    const customFieldColumns: ColumnOption[] = this.customFields.map(field => ({
      id: `custom_${field.id}`,
      labels: {
        vi: field.name,
        en: field.name
      },
      visible: true,
      width: '120px'
    }));

    // Insert custom field columns before action columns
    const actionColumnIndex = this.columnOptions.findIndex(option => option.id.startsWith('show'));
    if (actionColumnIndex !== -1) {
      this.columnOptions.splice(actionColumnIndex, 0, ...customFieldColumns);
    } else {
      this.columnOptions.push(...customFieldColumns);
    }
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
        case 'todayPnL':
          return (this.getTodayPnL(a) - this.getTodayPnL(b)) * dir;
        case 'todayProfit':
          return (this.getTodayProfit(a) - this.getTodayProfit(b)) * dir;
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
          // Handle custom fields sorting
          if (this.sortColumn.startsWith('custom_')) {
            const fieldDef = this.getFieldDefinition(this.sortColumn);
            if (fieldDef) {
              const aValue = this.getCustomFieldValue(a, fieldDef.id);
              const bValue = this.getCustomFieldValue(b, fieldDef.id);

              if (fieldDef.type === 'boolean') {
                return (aValue ? 1 : 0) - (bValue ? 1 : 0) * dir;
              } else {
                // Text sorting
                return String(aValue || '').localeCompare(String(bValue || '')) * dir;
              }
            }
          }
          return 0;
      }
    });
  return accounts;
  }

  deleteAccount(accountId: string): void {
    if (confirm(this.t('confirmDeleteAccount'))) {
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
        deductedPoints: 0
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
      deductedPoints: 0
    };
  }

  // Sử dụng cho các trường hợp cần lấy dữ liệu ngày hôm nay
  getTodayTradeVolume(account: Account): number {
    if (!account || !account.pointsHistory) return 0;
    const todayRecord = this.getTodayRecord(account);
    return todayRecord ? todayRecord.volume : 0;
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

  getTodayPnL(account: Account): number {
    const todayRecord = this.getTodayRecord(account);
    if (!todayRecord) return 0;
    const start = todayRecord.startBalance ?? 0;
    const end = todayRecord.endBalance ?? todayRecord.balance ?? 0;
    const profit = 0;//todayRecord.profit ?? 0;
    return (end - start) + profit;
  }

  getTodayProfit(account: Account): number {
    const todayRecord = this.getTodayRecord(account);
    return todayRecord?.profit ?? 0;
  }

  getTotalPnL(account: Account): number {
    if (!account || !account.pointsHistory) return 0;
    return account.pointsHistory.reduce((sum, record) => {
      const start = record.startBalance ?? 0;
      const end = record.endBalance ?? record.balance ?? 0;
      const profit = record.profit ?? 0;
      const dailyPnL = (end - start) + profit;
      return sum + dailyPnL;
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
      alert(this.t('riskDateRequired'));
      return;
    }
    const parsed = this.parseRiskDateInput(this.riskDateInput);
    if (!parsed) {
      alert(this.t('riskDateInvalid'));
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
      return this.t('riskNotSet');
    }
    const days = this.getRiskDays(account);
    const dateText = this.formatDateForDisplay(account.riskDate);
  const suffix = this.language === 'en' ? (days === 1 ? 'day' : this.t('daysSuffix')) : this.t('daysSuffix');
    return `${dateText} (${days} ${suffix})`;
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
    if (msLeft <= 0) return this.t('logoutExpired');
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
