import { Injectable, Logger } from '@nestjs/common';

export interface IsbnMetadata {
  title?: string;
  subtitle?: string;
  authors?: string[];
  publisher?: string;
  publishedYear?: number;
  language?: string;
  description?: string;
  coverUrl?: string;
  isbn13?: string;
  isbn10?: string;
  source: 'open_library' | 'google_books' | 'not_found';
}

@Injectable()
export class IsbnLookupService {
  private readonly logger = new Logger(IsbnLookupService.name);

  /**
   * Normalize a raw ISBN string to its 13-digit form.
   * Strips hyphens and spaces.
   * Returns null for unrecognized inputs.
   */
  normalize(raw: string): { isbn13: string; isbn10?: string } | null {
    const cleaned = raw.replace(/[\s-]/g, '');

    if (/^\d{13}$/.test(cleaned)) {
      return { isbn13: cleaned };
    }

    if (/^\d{9}[\dX]$/i.test(cleaned)) {
      // Convert ISBN-10 → ISBN-13
      const digits = cleaned.slice(0, 9);
      const prefix = `978${digits}`;
      const checksum =
        (10 -
          (prefix
            .split('')
            .reduce(
              (sum, d, i) => sum + parseInt(d) * (i % 2 === 0 ? 1 : 3),
              0,
            ) %
            10)) %
        10;
      return { isbn13: `${prefix}${checksum}`, isbn10: cleaned.toUpperCase() };
    }

    return null;
  }

  async lookup(isbn: string): Promise<IsbnMetadata> {
    const normalized = this.normalize(isbn);
    if (!normalized) {
      return { source: 'not_found' };
    }

    // 1. Try Open Library first (free, no key required)
    try {
      const olResult = await this.lookupOpenLibrary(normalized.isbn13);
      if (olResult) {
        return { ...olResult, isbn13: normalized.isbn13, isbn10: normalized.isbn10, source: 'open_library' };
      }
    } catch (err) {
      this.logger.warn(`Open Library lookup failed for ${normalized.isbn13}: ${String(err)}`);
    }

    // 2. Fall back to Google Books
    try {
      const gbResult = await this.lookupGoogleBooks(normalized.isbn13);
      if (gbResult) {
        return { ...gbResult, isbn13: normalized.isbn13, isbn10: normalized.isbn10, source: 'google_books' };
      }
    } catch (err) {
      this.logger.warn(`Google Books lookup failed for ${normalized.isbn13}: ${String(err)}`);
    }

    return { isbn13: normalized.isbn13, isbn10: normalized.isbn10, source: 'not_found' };
  }

  private async lookupOpenLibrary(isbn13: string): Promise<Partial<IsbnMetadata> | null> {
    const url = `https://openlibrary.org/api/books?bibkeys=ISBN:${isbn13}&format=json&jscmd=data`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;

    const data = (await res.json()) as Record<string, unknown>;
    const key = `ISBN:${isbn13}`;
    const book = data[key] as Record<string, unknown> | undefined;
    if (!book) return null;

    const publishersRaw = book['publishers'] as Array<{ name: string }> | undefined;
    const authorsRaw = book['authors'] as Array<{ name: string }> | undefined;
    const publishDateRaw = book['publish_date'] as string | undefined;
    const coversRaw = book['cover'] as Record<string, string> | undefined;

    const publishedYear = publishDateRaw
      ? parseInt(publishDateRaw.slice(-4), 10) || undefined
      : undefined;

    return {
      title: (book['title'] as string | undefined) ?? undefined,
      subtitle: (book['subtitle'] as string | undefined) ?? undefined,
      authors: authorsRaw?.map((a) => a.name) ?? [],
      publisher: publishersRaw?.[0]?.name ?? undefined,
      publishedYear: isNaN(publishedYear ?? NaN) ? undefined : publishedYear,
      description: ((book['notes'] as Record<string, string> | string | undefined) as string | undefined) ?? undefined,
      coverUrl: coversRaw?.['large'] ?? coversRaw?.['medium'] ?? undefined,
    };
  }

  private async lookupGoogleBooks(isbn13: string): Promise<Partial<IsbnMetadata> | null> {
    const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
    const keyParam = apiKey ? `&key=${apiKey}` : '';
    const url = `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn13}${keyParam}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;

    const data = (await res.json()) as {
      totalItems?: number;
      items?: Array<{ volumeInfo?: Record<string, unknown> }>;
    };

    if (!data.items || data.items.length === 0) return null;
    const vol = data.items[0].volumeInfo;
    if (!vol) return null;

    const publishedDateRaw = vol['publishedDate'] as string | undefined;
    const publishedYear = publishedDateRaw
      ? parseInt(publishedDateRaw.slice(0, 4), 10) || undefined
      : undefined;

    const imageLinks = vol['imageLinks'] as Record<string, string> | undefined;

    return {
      title: (vol['title'] as string | undefined) ?? undefined,
      subtitle: (vol['subtitle'] as string | undefined) ?? undefined,
      authors: (vol['authors'] as string[] | undefined) ?? [],
      publisher: (vol['publisher'] as string | undefined) ?? undefined,
      publishedYear: isNaN(publishedYear ?? NaN) ? undefined : publishedYear,
      language: (vol['language'] as string | undefined) ?? undefined,
      description: (vol['description'] as string | undefined) ?? undefined,
      coverUrl:
        imageLinks?.['extraLarge'] ??
        imageLinks?.['large'] ??
        imageLinks?.['thumbnail'] ??
        undefined,
    };
  }
}
