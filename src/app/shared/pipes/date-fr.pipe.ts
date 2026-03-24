import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'dateFr', standalone: true })
export class DateFrPipe implements PipeTransform {
  transform(value: string | Date | null | undefined, format: 'short' | 'long' | 'time' | 'datetime' = 'short'): string {
    if (!value) return '';

    const date = typeof value === 'string' ? new Date(value) : value;
    if (isNaN(date.getTime())) return '';

    const locale = 'fr-FR';

    switch (format) {
      case 'long':
        return date.toLocaleDateString(locale, {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      case 'time':
        return date.toLocaleTimeString(locale, {
          hour: '2-digit',
          minute: '2-digit',
        });
      case 'datetime':
        return date.toLocaleString(locale, {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      default:
        return date.toLocaleDateString(locale, {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        });
    }
  }
}
