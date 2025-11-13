import { Injectable, signal } from '@angular/core';

export type Language = 'vi' | 'en';

@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  currentLanguage = signal<Language>('vi');

  toggleLanguage(): void {
    this.currentLanguage.update(lang => lang === 'vi' ? 'en' : 'vi');
  }
}