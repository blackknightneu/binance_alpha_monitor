import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Account, PointsRecord } from '../models/account.model';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class AccountService {
  private readonly STORAGE_KEY = 'binance_alpha_accounts';
  private accounts: Account[] = [];
  private accountsSubject = new BehaviorSubject<Account[]>([]);
  private selectedAccountSubject = new BehaviorSubject<Account | null>(null);
  private isBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
    this.loadAccounts();
  }

  private loadAccounts(): void {
    if (!this.isBrowser) {
      return;
    }
    
    const savedData = localStorage.getItem(this.STORAGE_KEY);
    if (savedData) {
      const parsedData = JSON.parse(savedData);
      this.accounts = parsedData.map((acc: any) => ({
        ...acc,
        lastUpdated: new Date(acc.lastUpdated),
        pointsHistory: acc.pointsHistory.map((record: any) => ({
          ...record,
          date: new Date(record.date)
        }))
      }));
      this.accountsSubject.next(this.accounts);
      
      // Load last selected account if any
      const lastSelectedId = this.isBrowser ? localStorage.getItem('lastSelectedAccount') : null;
      if (lastSelectedId) {
        const lastAccount = this.accounts.find(acc => acc.id === lastSelectedId);
        if (lastAccount) {
          this.selectedAccountSubject.next(lastAccount);
        }
      }
    }
  }

  private saveAccounts(): void {
    if (!this.isBrowser) {
      return;
    }
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.accounts));
  }

  getAccounts(): Observable<Account[]> {
    return this.accountsSubject.asObservable();
  }

  getSelectedAccount(): Observable<Account | null> {
    return this.selectedAccountSubject.asObservable();
  }

  addAccount(name: string): void {
    const newAccount: Account = {
      id: Date.now().toString(),
      name,
      balance: 0,
      lastUpdated: new Date(),
      pointsHistory: []
    };

    this.accounts.push(newAccount);
    this.accountsSubject.next(this.accounts);
    this.saveAccounts();
  }

  selectAccount(accountId: string): void {
    const account = this.accounts.find(acc => acc.id === accountId);
    if (account) {
      this.selectedAccountSubject.next(account);
      if (this.isBrowser) {
        localStorage.setItem('lastSelectedAccount', accountId);
      }
    }
  }

  updateAccountPoints(accountId: string, startBalance: number, endBalance: number, volume: number, balance = 0, bonusPoints = 0, profit = 0, deductedPoints = 0): void {
    const account = this.accounts.find(acc => acc.id === accountId);
    if (!account) return;

    // Calculate points based on balance and volume
    const balancePoints = balance > 0 ? this.calculateBalancePoints(balance) : 0;
    const volumePoints = this.calculateVolumePoints(volume);

    const newRecord: PointsRecord = {
      date: new Date(),
      startBalance,
      endBalance,
      balance,
      balancePoints,
      volumePoints,
      bonusPoints,
      // compute total including bonus and subtract deductions
      totalPoints: balancePoints + volumePoints + (bonusPoints || 0) - (deductedPoints || 0),
      volume,
      modified: false
    };

    account.balance = endBalance; // Update account balance to end of day balance
    account.lastUpdated = new Date();
    account.pointsHistory.push(newRecord);

    // Keep records sorted by date
    account.pointsHistory = account.pointsHistory
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    this.accountsSubject.next(this.accounts);
    this.selectedAccountSubject.next(account);
    this.saveAccounts();
  }

  /**
   * Get a record for a specific account and date (matching by UTC day)
   */
  getRecordForDate(accountId: string, date: Date): PointsRecord | null {
    const account = this.accounts.find(acc => acc.id === accountId);
    if (!account) return null;
    const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const record = account.pointsHistory.find(r => {
      const rDate = new Date(Date.UTC(r.date.getUTCFullYear(), r.date.getUTCMonth(), r.date.getUTCDate()));
      return rDate.getTime() === utcDate.getTime();
    });
    return record || null;
  }

  /**
   * Set or update a daily record for a specific date. This allows the calendar to save entries
   */
  setRecordForDate(accountId: string, date: Date, startBalance: number, endBalance: number, volume: number, balance: number = 0, profit: number = 0, deductedPoints: number = 0, bonusPoints: number = 0): void {
    const account = this.accounts.find(acc => acc.id === accountId);
    if (!account) return;

    // Ensure UTC date (start of day)
    const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const existing = account.pointsHistory.find(r => {
      const rDate = new Date(Date.UTC(r.date.getUTCFullYear(), r.date.getUTCMonth(), r.date.getUTCDate()));
      return rDate.getTime() === utcDate.getTime();
    });
    const balancePoints = balance > 0 ? this.calculateBalancePoints(balance) : 0;
    const volumePoints = this.calculateVolumePoints(volume);

    if (existing) {
      existing.startBalance = startBalance;
      existing.endBalance = endBalance;
      existing.volume = volume;
      existing.profit = profit;
      existing.deductedPoints = deductedPoints;
      existing.bonusPoints = bonusPoints;
      existing.balance = balance;
      existing.balancePoints = balancePoints;
      existing.volumePoints = volumePoints;
      existing.totalPoints = balancePoints + volumePoints + (bonusPoints || 0) - (deductedPoints || 0);
      existing.modified = true;
    } else {
      const newRecord: PointsRecord = {
        date: utcDate, // use UTC normalized date
        startBalance,
        endBalance,
        balance,
        balancePoints,
        volumePoints,
        bonusPoints,
        totalPoints: balancePoints + volumePoints + (bonusPoints || 0) - (deductedPoints || 0),
        volume,
        modified: false,
        profit,
        deductedPoints
      };
      account.pointsHistory.push(newRecord);
    }

    // Keep history ordered by date
    account.pointsHistory = account.pointsHistory
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    // If this is the most recent day (or today), update account balance
    const latest = account.pointsHistory[account.pointsHistory.length - 1];
    if (latest) {
      account.balance = latest.endBalance;
      // Last updated in UTC
      account.lastUpdated = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate()));
    }

    this.accountsSubject.next(this.accounts);
    this.selectedAccountSubject.next(account);
    this.saveAccounts();
  }

  /**
   * Sum alpha points for the account over the rolling 15-day window
   */
  getAlphaPoints(accountId: string): number {
    const account = this.accounts.find(acc => acc.id === accountId);
    if (!account) return 0;
    
    // Get yesterday's end of day in UTC
    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    yesterday.setUTCHours(23, 59, 59, 999);
    
    // Get cutoff date (15 days before yesterday) in UTC
    const cutoff = new Date(yesterday);
    cutoff.setUTCDate(cutoff.getUTCDate() - 14); // -14 because yesterday is already -1
    cutoff.setUTCHours(0, 0, 0, 0);
    
    return account.pointsHistory
      .filter(r => {
        const rUTC = new Date(Date.UTC(r.date.getUTCFullYear(), r.date.getUTCMonth(), r.date.getUTCDate()));
        // Include records between cutoff (inclusive) and yesterday (inclusive)
        return rUTC >= cutoff && rUTC <= yesterday;
      })
      .reduce((s, r) => s + (r.totalPoints || 0), 0);
  }

  deleteAccount(accountId: string): void {
    this.accounts = this.accounts.filter(acc => acc.id !== accountId);
    this.accountsSubject.next(this.accounts);
    
    if (this.selectedAccountSubject.value?.id === accountId) {
      this.selectedAccountSubject.next(null);
      if (this.isBrowser) {
        localStorage.removeItem('lastSelectedAccount');
      }
    }
    
    this.saveAccounts();
  }

  private calculateBalancePoints(balanceUsd: number): number {
    if (balanceUsd < 100) return 0;
    if (balanceUsd < 1000) return 1;
    if (balanceUsd < 10000) return 2;
    if (balanceUsd < 100000) return 3;
    return 4;
  }

    private calculateVolumePoints(volumeUsd: number): number {
      if (volumeUsd < 2) return 0;
    
      let points = 0;
      let base = 2;
    
      while (volumeUsd >= base) {
        points++;
        base *= 2;
      }
    
      return points;
    }

  exportToJson(): string {
    return JSON.stringify(this.accounts, null, 2);
  }

  /**
   * Export all accounts and their records into a CSV string.
   * Columns: AccountName,Date,Start,End,Vol,Profit,Deducted,Pts,15d Points
   */
  exportAllToCsv(): string {
    const header = ['AccountName','Date','Start','End','Vol','Profit','Deducted','Pts','15d Points'];
    const rows: string[] = [header.join(',')];

    for (const acc of this.accounts) {
      // sort records by date asc
      const recs = [...acc.pointsHistory].sort((a,b)=>a.date.getTime()-b.date.getTime());
      for (const r of recs) {
        const pts15 = this.getAlphaPointsAtDate(acc.id, r.date);
        const cols = [
          this.escapeCsv(acc.name),
          this.formatIsoDate(r.date),
          this.numOrEmpty(r.startBalance),
          this.numOrEmpty(r.endBalance),
          this.numOrEmpty(r.volume),
          this.numOrEmpty(r.profit ?? 0),
          this.numOrEmpty(r.deductedPoints ?? 0),
          this.numOrEmpty(r.totalPoints ?? 0),
          this.numOrEmpty(pts15)
        ];
        rows.push(cols.join(','));
      }
    }

    return rows.join('\n');
  }

  exportAccountToCsv(accountId: string): string {
    const account = this.accounts.find(a=>a.id===accountId);
    if (!account) return '';
    const header = ['AccountName','Date','Start','End','Vol','Profit','Deducted','Pts','15d Points'];
    const rows: string[] = [header.join(',')];
    const recs = [...account.pointsHistory].sort((a,b)=>a.date.getTime()-b.date.getTime());
    for (const r of recs) {
      const pts15 = this.getAlphaPointsAtDate(account.id, r.date);
      const cols = [
        this.escapeCsv(account.name),
        this.formatIsoDate(r.date),
        this.numOrEmpty(r.startBalance),
        this.numOrEmpty(r.endBalance),
        this.numOrEmpty(r.volume),
        this.numOrEmpty(r.profit ?? 0),
        this.numOrEmpty(r.deductedPoints ?? 0),
        this.numOrEmpty(r.totalPoints ?? 0),
        this.numOrEmpty(pts15)
      ];
      rows.push(cols.join(','));
    }
    return rows.join('\n');
  }

  private formatIsoDate(d: Date): string {
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth()+1).padStart(2,'0');
    const dd = String(d.getUTCDate()).padStart(2,'0');
    return `${yyyy}-${mm}-${dd}`;
  }

  private escapeCsv(s: string): string {
    if (s == null) return '';
    const str = String(s);
    if (/[",\n]/.test(str)) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  }

  private numOrEmpty(n: number | undefined | null): string {
    if (n === undefined || n === null) return '';
    return String(n);
  }

  /**
   * Compute alpha points for account as of a specific date (rolling 15 days ending at that date)
   */
  getAlphaPointsAtDate(accountId: string, date: Date): number {
    const account = this.accounts.find(acc => acc.id === accountId);
    if (!account) return 0;
    
    // Convert input date to UTC end of day
    const targetDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));
    
    // Get cutoff date (15 days before target) in UTC
    const cutoff = new Date(targetDate);
    cutoff.setUTCDate(cutoff.getUTCDate() - 14); // -14 because targetDate is already the end day
    cutoff.setUTCHours(0, 0, 0, 0);
    
    return account.pointsHistory
      .filter((r: PointsRecord) => {
        const rUTC = new Date(Date.UTC(r.date.getUTCFullYear(), r.date.getUTCMonth(), r.date.getUTCDate()));
        // Include records between cutoff (inclusive) and target date (inclusive)
        return rUTC >= cutoff && rUTC <= targetDate;
      })
      .reduce((s: number, r: PointsRecord) => s + (r.totalPoints || 0), 0);
  }

  /**
   * Import CSV content. Expected columns (header order flexible):
   * AccountName,Date,Start,End,Vol,Profit,Deducted[,Pts][,15d Points]
   * The Pts and 15d Points columns are ignored on import; points are recalculated.
   * Returns an object with counts.
   */
  importFromCsv(csvData: string): { imported: number; errors: number } {
    console.log('Starting CSV import...');
    if (!csvData) {
      console.warn('No CSV data provided');
      return { imported: 0, errors: 0 };
    }
    
    const lines = csvData.split(/\r?\n/).map(l=>l.trim()).filter(l=>l.length>0);
    if (lines.length === 0) {
      console.warn('CSV file is empty');
      return { imported: 0, errors: 0 };
    }

    // parse header
    const header = lines[0].split(',').map(h=>h.trim().toLowerCase());
    console.log('CSV Headers:', header);
    const colIndex: any = {};
    header.forEach((h, i) => {
      const key = h.replace(/\"/g,'').trim();
      colIndex[key] = i;
    });

    const required = ['accountname','date','start','end','vol','profit','deducted'];
    // Check for missing required columns
    const missingColumns = required.filter(col => !(col in colIndex));
    if (missingColumns.length > 0) {
      console.error('Missing required columns:', missingColumns);
      console.log('Available columns:', Object.keys(colIndex));
      console.log('Will attempt to use positional fallback for missing columns');
    }

    let imported = 0;
    let errors = 0;

    for (let i = 1; i < lines.length; i++) {
      const row = lines[i];
      console.log(`\nProcessing row ${i}:`, row);
      const cols = this.splitCsvRow(row);
      try {
  const accountName = (cols[colIndex['accountname']] ?? cols[0] ?? '').trim();
  const dateStr = (cols[colIndex['date']] ?? cols[1] ?? '').trim();
  const startStr = (cols[colIndex['start']] ?? cols[2] ?? '').trim();
  const endStr = (cols[colIndex['end']] ?? cols[3] ?? '').trim();
  const volStr = (cols[colIndex['vol']] ?? cols[4] ?? '').trim();
  const profitStr = (cols[colIndex['profit']] ?? cols[5] ?? '').trim();
  const deductedStr = (cols[colIndex['deducted']] ?? cols[6] ?? '').trim();
  const balanceStr = (colIndex['balance'] !== undefined ? cols[colIndex['balance']] : '').trim();

        console.log('Parsed values:', {
          accountName,
          dateStr,
          startStr,
          endStr,
          volStr,
          profitStr,
          deductedStr
        });

        if (!accountName || !dateStr) { 
          throw new Error(`Missing account or date. Account: ${accountName}, Date: ${dateStr}`); 
        }

        // Try multiple date formats
        let date: Date | null = null;
        
        // Try MM/DD/YYYY format
        if (!date) {
          const parts = dateStr.split('/');
          if (parts.length === 3) {
            const month = parseInt(parts[0], 10);
            const day = parseInt(parts[1], 10);
            const year = parseInt(parts[2], 10);
            if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
              date = new Date(Date.UTC(year, month - 1, day));
            }
          }
        }

        // Try YYYY-MM-DD format
        if (!date) {
          const parts = dateStr.split('-');
          if (parts.length === 3) {
            const year = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10);
            const day = parseInt(parts[2], 10);
            if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
              date = new Date(Date.UTC(year, month - 1, day));
            }
          }
        }

        // Try DD/MM/YYYY format
        if (!date) {
          const parts = dateStr.split('/');
          if (parts.length === 3) {
            const day = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10);
            const year = parseInt(parts[2], 10);
            if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
              date = new Date(Date.UTC(year, month - 1, day));
            }
          }
        }

        if (!date || isNaN(date.getTime())) {
          throw new Error(`Could not parse date. Supported formats: MM/DD/YYYY, YYYY-MM-DD, DD/MM/YYYY. Got: ${dateStr}`);
        }

        console.log('Parsed date:', dateStr, 'to UTC:', date.toISOString());

  const start = parseFloat(startStr || '0') || 0;
  const end = parseFloat(endStr || '0') || 0;
  const vol = parseInt(volStr || '0', 10) || 0;
  const profit = parseFloat(profitStr || '0') || 0;
  const deducted = parseFloat(deductedStr || '0') || 0;
  const balance = balanceStr ? parseFloat(balanceStr) || 0 : end;

        console.log('Converted values:', {
          date: date.toISOString(),
          start,
          end,
          vol,
          profit,
          deducted
        });

        // find or create account by name
        let account = this.accounts.find(a => a.name === accountName);
        if (!account) {
          console.log(`Creating new account: ${accountName}`);
          account = {
            id: Date.now().toString() + Math.floor(Math.random()*1000).toString(),
            name: accountName,
            balance: end,
            lastUpdated: new Date(),
            pointsHistory: []
          };
          this.accounts.push(account);
        } else {
          console.log(`Found existing account: ${accountName}`);
        }

        // set record (this will compute points properly)
  this.setRecordForDate(account.id, date, start, end, vol, balance, profit, deducted, 0);
        imported++;
        console.log('Record imported successfully');
      } catch (error: any) {
        errors++;
        console.error(`Error on row ${i}:`, error.message || 'Unknown error');
        console.error('Row data:', row);
        if (error.stack) {
          console.debug('Error stack:', error.stack);
        }
      }
    }

    // persist and notify
    this.accountsSubject.next(this.accounts);
    this.saveAccounts();
    console.log(`\nImport completed. Total imported: ${imported}, Errors: ${errors}`);
    return { imported, errors };
  }

  private splitCsvRow(row: string): string[] {
    // basic CSV split supporting quoted values
    const result: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < row.length; i++) {
      const ch = row[i];
      if (ch === '"') {
        if (inQuotes && row[i+1] === '"') { cur += '"'; i++; }
        else inQuotes = !inQuotes;
        continue;
      }
      if (ch === ',' && !inQuotes) { result.push(cur); cur = ''; continue; }
      cur += ch;
    }
    result.push(cur);
    return result.map(s=>s.trim());
  }

  importFromJson(jsonData: string): boolean {
    try {
      const parsedData = JSON.parse(jsonData);
      if (Array.isArray(parsedData)) {
        this.accounts = parsedData.map(acc => ({
          ...acc,
          lastUpdated: new Date(acc.lastUpdated),
          pointsHistory: acc.pointsHistory.map((record: any) => ({
            ...record,
            date: new Date(record.date)
          }))
        }));
        this.accountsSubject.next(this.accounts);
        this.saveAccounts();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  getLastDayBalance(accountId: string): number {
    const account = this.accounts.find(acc => acc.id === accountId);
    if (!account || account.pointsHistory.length === 0) {
      return 0;
    }
    
    // Sort history by date descending and get the last record
    const sortedHistory = [...account.pointsHistory].sort((a, b) => 
      b.date.getTime() - a.date.getTime()
    );
    
    return sortedHistory[0].endBalance;
  }

  modifyDailyRecord(accountId: string, date: Date, startBalance: number, endBalance: number): void {
    const account = this.accounts.find(acc => acc.id === accountId);
    if (!account) return;

    const record = account.pointsHistory.find(
      r => r.date.toDateString() === date.toDateString()
    );

    if (record) {
      const averageBalance = (startBalance + endBalance) / 2;
      const balancePoints = this.calculateBalancePoints(averageBalance);

      record.startBalance = startBalance;
      record.endBalance = endBalance;
      record.balancePoints = balancePoints;
      record.totalPoints = balancePoints + record.volumePoints;
      record.modified = true;

      // Update account balance if it's today's record
      if (new Date().toDateString() === date.toDateString()) {
        account.balance = endBalance;
      }

      this.accountsSubject.next([...this.accounts]);
      this.saveAccounts();
    }
  }
}