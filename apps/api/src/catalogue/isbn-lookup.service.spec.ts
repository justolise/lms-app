import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { IsbnLookupService } from './isbn-lookup.service.js';

describe('IsbnLookupService', () => {
  let service: IsbnLookupService;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    service = new IsbnLookupService();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('normalize', () => {
    it('normalizes valid 13-digit ISBN with hyphens', () => {
      const result = service.normalize('978-0-13-235088-4');
      expect(result).toEqual({ isbn13: '9780132350884' });
    });

    it('converts valid 10-digit ISBN to ISBN-13 with checksum calculation', () => {
      // 0132350882 -> 9780132350884
      const result = service.normalize('0-13-235088-2');
      expect(result).toEqual({
        isbn13: '9780132350884',
        isbn10: '0132350882',
      });
    });

    it('returns null for invalid ISBN length or characters', () => {
      expect(service.normalize('12345')).toBeNull();
      expect(service.normalize('not-an-isbn-number')).toBeNull();
    });
  });

  describe('lookup', () => {
    it('returns not_found when ISBN format is invalid', async () => {
      const result = await service.lookup('invalid');
      expect(result).toEqual({ source: 'not_found' });
    });

    it('uses configured OPEN_LIBRARY_API_URL and succeeds from Open Library', async () => {
      process.env.OPEN_LIBRARY_API_URL = 'https://custom-openlibrary.local';

      const mockResponse = {
        'ISBN:9780132350884': {
          title: 'Clean Code',
          subtitle: 'A Handbook of Agile Software Craftsmanship',
          authors: [{ name: 'Robert C. Martin' }],
          publishers: [{ name: 'Prentice Hall' }],
          publish_date: 'August 1, 2008',
          notes: 'A handbook of agile craftsmanship',
          cover: { large: 'https://covers.openlibrary.org/b/id/1-L.jpg' },
        },
      };

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await service.lookup('9780132350884');

      expect(fetchSpy).toHaveBeenCalledWith(
        'https://custom-openlibrary.local/api/books?bibkeys=ISBN:9780132350884&format=json&jscmd=data',
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );

      expect(result).toEqual({
        title: 'Clean Code',
        subtitle: 'A Handbook of Agile Software Craftsmanship',
        authors: ['Robert C. Martin'],
        publisher: 'Prentice Hall',
        publishedYear: 2008,
        description: 'A handbook of agile craftsmanship',
        coverUrl: 'https://covers.openlibrary.org/b/id/1-L.jpg',
        isbn13: '9780132350884',
        isbn10: undefined,
        source: 'open_library',
      });
    });

    it('falls back to configured GOOGLE_BOOKS_API_URL when Open Library returns empty', async () => {
      process.env.OPEN_LIBRARY_API_URL = 'https://custom-openlibrary.local';
      process.env.GOOGLE_BOOKS_API_URL = 'https://custom-googlebooks.local';
      process.env.GOOGLE_BOOKS_API_KEY = 'test-api-key';

      // Open library returns empty
      const fetchSpy = vi
        .spyOn(globalThis, 'fetch')
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({}),
        } as Response)
        // Google books returns book
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            items: [
              {
                volumeInfo: {
                  title: 'Clean Code',
                  authors: ['Robert C. Martin'],
                  publisher: 'Pearson Education',
                  publishedDate: '2008-08-01',
                  language: 'en',
                  description: 'Even bad code can function.',
                  imageLinks: { thumbnail: 'https://books.google.com/thumbnail.jpg' },
                },
              },
            ],
          }),
        } as Response);

      const result = await service.lookup('9780132350884');

      expect(fetchSpy).toHaveBeenNthCalledWith(
        1,
        'https://custom-openlibrary.local/api/books?bibkeys=ISBN:9780132350884&format=json&jscmd=data',
        expect.any(Object),
      );
      expect(fetchSpy).toHaveBeenNthCalledWith(
        2,
        'https://custom-googlebooks.local/volumes?q=isbn:9780132350884&key=test-api-key',
        expect.any(Object),
      );

      expect(result).toEqual({
        title: 'Clean Code',
        subtitle: undefined,
        authors: ['Robert C. Martin'],
        publisher: 'Pearson Education',
        publishedYear: 2008,
        language: 'en',
        description: 'Even bad code can function.',
        coverUrl: 'https://books.google.com/thumbnail.jpg',
        isbn13: '9780132350884',
        isbn10: undefined,
        source: 'google_books',
      });
    });

    it('gracefully handles network failures from both sources', async () => {
      vi.spyOn(globalThis, 'fetch')
        .mockRejectedValueOnce(new Error('Open Library network timeout'))
        .mockRejectedValueOnce(new Error('Google Books network error'));

      const result = await service.lookup('9780132350884');

      expect(result).toEqual({
        isbn13: '9780132350884',
        isbn10: undefined,
        source: 'not_found',
      });
    });
  });
});
