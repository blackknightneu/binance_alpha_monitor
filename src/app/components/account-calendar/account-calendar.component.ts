import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AccountService } from '../../services/account.service';
import { Account, PointsRecord } from '../../models/account.model';
import { GroupByMonthPipe } from '../../pipes/group-by-month.pipe';

interface CalendarDay {
  date: Date;
  label: number;
  inMonth: boolean;
  hasRecord: boolean;
  diff?: number | null;
  points?: number | null;
  isFuture: boolean;  // true if date is in future (after today UTC)
  missingVolume?: boolean; // true if today and volume is missing
}

@Component({
  selector: 'app-account-calendar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './account-calendar.component.html',
  styleUrls: ['./account-calendar.component.scss']
})
export class AccountCalendarComponent implements OnInit {
  selectedAccount: Account | null = null;
  viewYear = new Date().getFullYear();
  viewMonth = new Date().getMonth(); // 0-indexed
  days: CalendarDay[] = [];

  // editor fields
  selectedDate = new Date();
  balance = 0;           // Main balance for points
  customBalance = 0;     // Custom balance input
  profitLoss = 0;       // Calculated P&L
  startBalance = 0;      // Daily start balance
  endBalance = 0;        // Daily end balance
  volume = 0;
  profit = 0;           // daily profit collected
  deductedPoints = 0;   // manual point deductions for the day
  bonusPoints = 0;
  
  // Points calculation fields
  calculatedBalancePoints = 0;
  calculatedVolumePoints = 0;

  // Predefined options
  balanceOptions: number[] = [100, 1000, 10000, 100000];
  volumeOptions: number[] = []; // will be filled in ngOnInit

  // whether the editor panel is visible (opened when user clicks a day)
  editorVisible = false;

  recentRecords: PointsRecord[] = [];

  // UI helpers
  showCustomInput = false;
  // simple inline message for UX (toast-like)
  message = '';
  messageTimeout: any = null;

  constructor(private accountService: AccountService) {}

  ngOnInit(): void {
    this.accountService.getSelectedAccount().subscribe(acc => {
      const prevAccount = this.selectedAccount;
      this.selectedAccount = acc;
      if (acc) {
        if (!prevAccount) {
          // On first selection, try to find a month with records
          const sorted = [...acc.pointsHistory].sort((a, b) => b.date.getTime() - a.date.getTime());
          if (sorted.length > 0) {
            const lastDate = sorted[0].date;
            this.viewYear = lastDate.getUTCFullYear();
            this.viewMonth = lastDate.getUTCMonth();
          } else {
            // No records yet, show current month
            const now = new Date();
            this.viewYear = now.getUTCFullYear();
            this.viewMonth = now.getUTCMonth();
          }
        }
        this.buildCalendar();
        this.loadForDate(this.selectedDate);
        this.loadRecent();
      } else {
        this.days = [];
      }
    });
    this.buildVolumeOptions();
  }

  private buildVolumeOptions(): void {
    const opts: number[] = [];
    let v = 1024;
    const limit = 2097152; // ~2 million as requested
    while (v < limit) {
      opts.push(v);
      v *= 2;
    }
    // ensure the list includes a top value if doubling didn't hit exactly 2M
    if (opts.length === 0 || opts[opts.length - 1] < limit) opts.push(limit);
    this.volumeOptions = opts;
  }

  private showMessage(text: string, ms = 2500) {
    this.message = text;
    if (this.messageTimeout) clearTimeout(this.messageTimeout);
    this.messageTimeout = setTimeout(() => this.message = '', ms);
  }

  buildCalendar(): void {
    if (!this.selectedAccount) { this.days = []; return; }

    // Convert dates to UTC to match the records
    const firstOfMonth = new Date(Date.UTC(this.viewYear, this.viewMonth, 1));
    const startWeekday = firstOfMonth.getUTCDay(); // 0=Sun
    const daysInMonth = new Date(Date.UTC(this.viewYear, this.viewMonth + 1, 0)).getUTCDate();

    const prevMonthLast = new Date(Date.UTC(this.viewYear, this.viewMonth, 0)).getUTCDate();

    const totalCells = 42; // 6 weeks
    const arr: CalendarDay[] = [];

    // Get current UTC date for comparison
    const todayUTC = new Date();
    todayUTC.setUTCHours(0, 0, 0, 0);

    for (let i = 0; i < totalCells; i++) {
      const dayIndex = i - startWeekday + 1;
      let date: Date;
      let inMonth = true;

      if (dayIndex <= 0) {
        // previous month
        date = new Date(Date.UTC(this.viewYear, this.viewMonth - 1, prevMonthLast + dayIndex));
        inMonth = false;
      } else if (dayIndex > daysInMonth) {
        // next month
        date = new Date(Date.UTC(this.viewYear, this.viewMonth + 1, dayIndex - daysInMonth));
        inMonth = false;
      } else {
        date = new Date(Date.UTC(this.viewYear, this.viewMonth, dayIndex));
        inMonth = true;
      }

      const rec = this.accountService.getRecordForDate(this.selectedAccount!.id, date);

      const diff = rec ? (rec.endBalance - rec.startBalance) : null;
      const points = rec ? rec.totalPoints ?? null : null;
      const isFuture = date.getTime() > todayUTC.getTime();

      // Mark missing volume for today
      let missingVolume = false;
      if (rec && date.getTime() === todayUTC.getTime() && (!rec.volume || rec.volume === 0)) {
        missingVolume = true;
      }
      arr.push({ 
        date, 
        label: date.getDate(), 
        inMonth, 
        hasRecord: !!rec, 
        diff, 
        points,
        isFuture,
        missingVolume
      });
    }

    this.days = arr;
  }

  prevMonth(): void {
    if (this.viewMonth === 0) { this.viewMonth = 11; this.viewYear--; }
    else this.viewMonth--;
    this.buildCalendar();
  }

  nextMonth(): void {
    if (this.viewMonth === 11) { this.viewMonth = 0; this.viewYear++; }
    else this.viewMonth++;
    this.buildCalendar();
  }

  selectDay(day: CalendarDay): void {
    if (!this.selectedAccount || day.isFuture) return;
    this.selectedDate = new Date(day.date);
    this.loadForDate(this.selectedDate);
    this.editorVisible = true;
  }

  loadForDate(date: Date): void {
    if (!this.selectedAccount) return;
    const rec = this.accountService.getRecordForDate(this.selectedAccount.id, date);
    if (rec) {
      this.balance = rec.balance;
      this.customBalance = rec.balance;
      // show custom input when balance isn't one of predefined options
      this.showCustomInput = this.balance > 0 && !this.balanceOptions.includes(this.balance);
      this.startBalance = rec.startBalance;
      this.endBalance = rec.endBalance;
      this.volume = rec.volume;
      this.profit = rec.profit ?? 0;
      this.deductedPoints = rec.deductedPoints ?? 0;
      this.bonusPoints = rec.bonusPoints ?? 0;
      this.updateBalancePoints();
      this.updateVolumePoints();
      this.updateProfitLoss();
    } else {
      const last = this.accountService.getLastDayBalance(this.selectedAccount.id);
      this.balance = 0;
      this.customBalance = 0;
      this.startBalance = last;
      this.endBalance = last;
      this.volume = 0;
      this.bonusPoints = 0;
      this.profit = 0;
      this.deductedPoints = 0;
      this.calculatedBalancePoints = 0;
      this.calculatedVolumePoints = 0;
      this.profitLoss = 0;
      this.showCustomInput = false;
    }
  }

  updateBalancePoints(): void {
    if (this.balance > 0) {
      this.calculatedBalancePoints = this.accountService['calculateBalancePoints'](this.balance);
    } else {
      this.calculatedBalancePoints = 0;
    }
  }

  updateVolumePoints(): void {
    if (this.volume > 0) {
      this.calculatedVolumePoints = this.accountService['calculateVolumePoints'](this.volume);
    } else {
      this.calculatedVolumePoints = 0;
    }
  }

  updateProfitLoss(): void {
    this.profitLoss = this.endBalance - this.startBalance;
  }

  onCustomBalanceChange(): void {
    if (this.customBalance > 0) {
      this.balance = this.customBalance;
      this.updateBalancePoints();
    }
  }

  onBalanceSelectChange(value: number): void {
    if (value === -1) {
      // user chose Custom... show the input to allow entry
      this.showCustomInput = true;
      // keep balance in sync with customBalance
      this.balance = this.customBalance || 0;
    } else {
      this.showCustomInput = false;
      this.balance = value;
    }
    this.updateBalancePoints();
  }

  saveForDate(): void {
    if (!this.selectedAccount) { this.showMessage('Vui lòng chọn tài khoản trước'); return; }
    // validation
    if (this.startBalance < 0 || this.endBalance < 0 || this.volume < 0) {
      this.showMessage('Vui lòng nhập giá trị không âm');
      return;
    }

    const date = new Date(Date.UTC(this.selectedDate.getUTCFullYear(), this.selectedDate.getUTCMonth(), this.selectedDate.getUTCDate()));
    this.accountService.setRecordForDate(
      this.selectedAccount.id,
      date,
      this.startBalance,
      this.endBalance,
      this.volume,
      this.balance, // balance for points calculation
      this.profit,
      this.deductedPoints,
      this.bonusPoints
    );
    this.buildCalendar();
    this.loadRecent();
  this.showMessage('Đã lưu');
    // close the editor modal after saving
    this.editorVisible = false;
  }

  loadRecent(): void {
    if (!this.selectedAccount) {
      this.recentRecords = [];
      return;
    }
    
    // Sort by date descending and take latest 16 days
    this.recentRecords = [...this.selectedAccount.pointsHistory]
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 16);
  }
}
