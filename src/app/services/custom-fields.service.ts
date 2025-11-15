import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { CustomFieldDefinition } from '../models/account.model';

@Injectable({
  providedIn: 'root'
})
export class CustomFieldsService {
  private readonly STORAGE_KEY = 'custom-field-definitions';
  private customFieldsSubject = new BehaviorSubject<CustomFieldDefinition[]>([]);
  public customFields$ = this.customFieldsSubject.asObservable();

  constructor() {
    this.loadCustomFields();
  }

  getCustomFields(): CustomFieldDefinition[] {
    return this.customFieldsSubject.value;
  }

  addCustomField(field: Omit<CustomFieldDefinition, 'id'>): void {
    const newField: CustomFieldDefinition = {
      ...field,
      id: this.generateId()
    };

    const currentFields = this.getCustomFields();
    const updatedFields = [...currentFields, newField];
    this.customFieldsSubject.next(updatedFields);
    this.saveCustomFields(updatedFields);
  }

  updateCustomField(id: string, updates: Partial<CustomFieldDefinition>): void {
    const currentFields = this.getCustomFields();
    const updatedFields = currentFields.map(field =>
      field.id === id ? { ...field, ...updates } : field
    );
    this.customFieldsSubject.next(updatedFields);
    this.saveCustomFields(updatedFields);
  }

  deleteCustomField(id: string): void {
    const currentFields = this.getCustomFields();
    const updatedFields = currentFields.filter(field => field.id !== id);
    this.customFieldsSubject.next(updatedFields);
    this.saveCustomFields(updatedFields);
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private loadCustomFields(): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }

    const stored = window.localStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      try {
        const fields = JSON.parse(stored) as CustomFieldDefinition[];
        this.customFieldsSubject.next(fields);
      } catch (error) {
        console.warn('Failed to load custom fields', error);
      }
    }
  }

  private saveCustomFields(fields: CustomFieldDefinition[]): void {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }

    try {
      window.localStorage.setItem(this.STORAGE_KEY, JSON.stringify(fields));
    } catch (error) {
      console.warn('Failed to save custom fields', error);
    }
  }
}