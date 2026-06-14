import { Test, TestingModule } from '@nestjs/testing';
import { RentService } from './rent.service';
import { DatabaseService } from '../database/database.service';
import { MailService } from '../core/mail/mail.service';
import { StorageService } from '../core/storage/storage.service';

/**
 * RentService Unit Tests
 *
 * All external dependencies (DB, Mail, Storage) are mocked so these tests run
 * in complete isolation — no real database connection required.
 *
 * Run with: npm test
 */

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Creates a chainable Kysely query builder mock that ultimately calls `execute`. */
function createQueryBuilderMock(executeResult: unknown = []) {
  const chain: Record<string, jest.Mock> = {};
  const methods = [
    'selectFrom', 'insertInto', 'updateTable', 'deleteFrom',
    'select', 'selectAll', 'where', 'set', 'values',
    'leftJoin', 'orderBy', 'limit', 'offset', 'returning',
    'returning', 'on', 'onRef',
  ];

  methods.forEach((method) => {
    chain[method] = jest.fn().mockReturnValue(chain);
  });

  chain['execute'] = jest.fn().mockResolvedValue(executeResult);
  chain['executeTakeFirst'] = jest.fn().mockResolvedValue(
    Array.isArray(executeResult) ? executeResult[0] : executeResult,
  );
  chain['executeTakeFirstOrThrow'] = jest.fn().mockResolvedValue(
    Array.isArray(executeResult) ? executeResult[0] : executeResult,
  );

  return chain;
}

/** Active booking fixture used in multiple tests. */
function makeActiveBooking(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'booking-uuid-1',
    tenant_id: 'tenant-uuid-1',
    bed_id: 'bed-uuid-1',
    monthly_rent: '12000',
    billing_date: 5,
    status: 'ACTIVE',
    ...overrides,
  };
}

describe('RentService', () => {
  let service: RentService;
  let mockDb: Record<string, jest.Mock>;

  // ─── Module Bootstrap ────────────────────────────────────────────────────────
  beforeEach(async () => {
    mockDb = createQueryBuilderMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RentService,
        {
          provide: DatabaseService,
          useValue: mockDb,
        },
        {
          provide: MailService,
          useValue: { sendMail: jest.fn().mockResolvedValue(undefined) },
        },
        {
          provide: StorageService,
          useValue: {
            uploadFile: jest.fn().mockResolvedValue({ url: 'https://r2.example.com/receipt.pdf' }),
          },
        },
      ],
    }).compile();

    service = module.get<RentService>(RentService);
  });

  afterEach(() => jest.clearAllMocks());

  // ─── generateMonthlyRent ────────────────────────────────────────────────────

  describe('generateMonthlyRent', () => {
    const NOW = new Date('2026-07-01T08:00:00Z');

    beforeEach(() => jest.useFakeTimers().setSystemTime(NOW));
    afterEach(() => jest.useRealTimers());

    it('should generate a new rent record for each active booking with no existing record', async () => {
      const activeBookings = [
        makeActiveBooking({ id: 'booking-1', tenant_id: 'tenant-1' }),
        makeActiveBooking({ id: 'booking-2', tenant_id: 'tenant-2' }),
      ];

      // selectFrom('bookings').selectAll().where().execute() → active bookings
      mockDb.selectFrom.mockImplementation((table: string) => {
        if (table === 'bookings') {
          return {
            ...mockDb,
            execute: jest.fn().mockResolvedValue(activeBookings),
            executeTakeFirst: jest.fn().mockResolvedValue(activeBookings[0]),
          };
        }
        if (table === 'rent_records') {
          // No existing record → undefined (allow insert)
          return {
            ...mockDb,
            executeTakeFirst: jest.fn().mockResolvedValue(undefined),
          };
        }
        return mockDb;
      });

      const insertExecute = jest.fn().mockResolvedValue([{ id: 'rr-new' }]);
      mockDb.insertInto.mockReturnValue({ ...mockDb, execute: insertExecute });

      const result = await service.generateMonthlyRent();

      expect(result).toEqual({ generated: 2 });
      // Should have attempted to insert exactly twice (one per booking)
      expect(insertExecute).toHaveBeenCalledTimes(2);
    });

    it('should NOT create a duplicate record when one already exists for the same period', async () => {
      const activeBookings = [makeActiveBooking()];
      const existingRecord = { id: 'existing-rent-record' };

      mockDb.selectFrom.mockImplementation((table: string) => {
        if (table === 'bookings') {
          return {
            ...mockDb,
            execute: jest.fn().mockResolvedValue(activeBookings),
          };
        }
        if (table === 'rent_records') {
          // Record ALREADY EXISTS for this period
          return {
            ...mockDb,
            executeTakeFirst: jest.fn().mockResolvedValue(existingRecord),
          };
        }
        return mockDb;
      });

      const insertExecute = jest.fn().mockResolvedValue([]);
      mockDb.insertInto.mockReturnValue({ ...mockDb, execute: insertExecute });

      const result = await service.generateMonthlyRent();

      expect(result).toEqual({ generated: 0 });
      // Critical: NO insert must have been called
      expect(insertExecute).not.toHaveBeenCalled();
    });

    it('should handle zero active bookings gracefully', async () => {
      mockDb.selectFrom.mockImplementation((table: string) => {
        if (table === 'bookings') {
          return { ...mockDb, execute: jest.fn().mockResolvedValue([]) };
        }
        return mockDb;
      });

      const insertExecute = jest.fn().mockResolvedValue([]);
      mockDb.insertInto.mockReturnValue({ ...mockDb, execute: insertExecute });

      const result = await service.generateMonthlyRent();

      expect(result).toEqual({ generated: 0 });
      expect(insertExecute).not.toHaveBeenCalled();
    });

    it('should use correct period_month and period_year from the current date', async () => {
      // Freeze time to July 2026
      const activeBookings = [makeActiveBooking()];

      mockDb.selectFrom.mockImplementation((table: string) => {
        if (table === 'bookings') {
          return { ...mockDb, execute: jest.fn().mockResolvedValue(activeBookings) };
        }
        if (table === 'rent_records') {
          return { ...mockDb, executeTakeFirst: jest.fn().mockResolvedValue(undefined) };
        }
        return mockDb;
      });

      const capturedValues: unknown[] = [];
      const valuesChain = {
        ...mockDb,
        execute: jest.fn().mockResolvedValue([{ id: 'rr-1' }]),
      };
      mockDb.insertInto.mockReturnValue({
        values: jest.fn().mockImplementation((v) => {
          capturedValues.push(v);
          return valuesChain;
        }),
      });

      await service.generateMonthlyRent();

      expect(capturedValues.length).toBe(1);
      const insertedRecord = capturedValues[0] as Record<string, unknown>;
      expect(insertedRecord.period_month).toBe(7);   // July
      expect(insertedRecord.period_year).toBe(2026);
      expect(insertedRecord.status).toBe('PENDING');
      expect(insertedRecord.rent_amount).toBe('12000');
    });

    it('should generate records for multiple bookings even when one already has a record', async () => {
      // booking-1 has existing record, booking-2 does not
      const activeBookings = [
        makeActiveBooking({ id: 'booking-1', tenant_id: 'tenant-1' }),
        makeActiveBooking({ id: 'booking-2', tenant_id: 'tenant-2' }),
      ];

      let rentQueryCount = 0;
      mockDb.selectFrom.mockImplementation((table: string) => {
        if (table === 'bookings') {
          return { ...mockDb, execute: jest.fn().mockResolvedValue(activeBookings) };
        }
        if (table === 'rent_records') {
          rentQueryCount++;
          return {
            ...mockDb,
            // First call: existing record; second call: no record
            executeTakeFirst: jest.fn().mockResolvedValue(
              rentQueryCount === 1 ? { id: 'existing' } : undefined,
            ),
          };
        }
        return mockDb;
      });

      const insertExecute = jest.fn().mockResolvedValue([{ id: 'new-rr' }]);
      mockDb.insertInto.mockReturnValue({ ...mockDb, execute: insertExecute });

      const result = await service.generateMonthlyRent();

      expect(result).toEqual({ generated: 1 });
      expect(insertExecute).toHaveBeenCalledTimes(1);
    });
  });

  // ─── findAll ──────────────────────────────────────────────────────────────────

  describe('findAll', () => {
    it('should return all rent records without filters', async () => {
      const records = [
        { id: 'rr-1', status: 'PENDING', tenant_name: 'John' },
        { id: 'rr-2', status: 'PAID', tenant_name: 'Jane' },
      ];

      mockDb.selectFrom.mockReturnValue({
        ...mockDb,
        execute: jest.fn().mockResolvedValue(records),
      });

      const result = await service.findAll({});

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
    });

    it('should apply status filter when provided', async () => {
      const records = [{ id: 'rr-1', status: 'OVERDUE', tenant_name: 'John' }];

      const whereMock = jest.fn().mockReturnValue({
        ...mockDb,
        execute: jest.fn().mockResolvedValue(records),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
      });

      mockDb.selectFrom.mockReturnValue({
        ...mockDb,
        where: whereMock,
        execute: jest.fn().mockResolvedValue(records),
      });

      const result = await service.findAll({ status: 'OVERDUE' });
      expect(result).toHaveLength(1);
    });
  });

  // ─── findDue ──────────────────────────────────────────────────────────────────

  describe('findDue', () => {
    it('should return only PENDING, PARTIAL, and OVERDUE records', async () => {
      const dueRecords = [
        { id: 'rr-1', status: 'PENDING', balance: '12000' },
        { id: 'rr-2', status: 'OVERDUE', balance: '8000' },
      ];

      mockDb.selectFrom.mockReturnValue({
        ...mockDb,
        execute: jest.fn().mockResolvedValue(dueRecords),
      });

      const result = await service.findDue();

      expect(Array.isArray(result)).toBe(true);
      expect(result.every((r: { status: string }) => ['PENDING', 'PARTIAL', 'OVERDUE'].includes(r.status))).toBe(true);
    });
  });
});
