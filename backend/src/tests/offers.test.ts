import request from 'supertest';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mocks
const mockData = jest.fn();
const mockError = jest.fn();

// Mock Supabase with robust chain
const mockSelect = jest.fn();
const mockEq = jest.fn();
const mockOrder = jest.fn();
const mockGte = jest.fn();
const mockFrom = jest.fn();
const mockInsert = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();
const mockSingle = jest.fn();

jest.mock('../config/supabase.js', () => ({
    supabase: {
        from: mockFrom
    },
    supabaseAdmin: {
        from: mockFrom
    }
}));

import app from '../index.js';

const setupSupabaseMock = () => {
    mockData.mockReturnValue(null);
    mockError.mockReturnValue(null);

    const promiseChain = {
        then: (resolve: any) => {
            const data = mockData();
            const error = mockError();
            resolve({ data, error, count: data?.length || 0 });
        }
    };

    const chain: any = { ...promiseChain };
    chain.select = mockSelect;
    chain.eq = mockEq;
    chain.gte = mockGte;
    chain.order = mockOrder;
    chain.insert = mockInsert;
    chain.update = mockUpdate;
    chain.delete = mockDelete;
    chain.single = mockSingle;

    mockFrom.mockReturnValue(chain);
    mockSelect.mockReturnValue(chain);
    mockEq.mockReturnValue(chain);
    mockGte.mockReturnValue(chain);
    mockOrder.mockReturnValue(chain);
    mockInsert.mockReturnValue(chain);
    mockUpdate.mockReturnValue(chain);
    mockDelete.mockReturnValue(chain);
    mockSingle.mockReturnValue(chain);
};

describe('Offers Endpoints', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        setupSupabaseMock();
    });

    describe('GET /api/offers', () => {
        it('should return active offers', async () => {
            const mockOffers = [{ id: '1', title: 'Promo 2x1' }];
            mockData.mockReturnValue(mockOffers);

            const res = await request(app).get('/api/offers');

            expect(res.statusCode).toBe(200);
            expect(res.body.data).toEqual(mockOffers);
        });

        it('should handle empty offers list', async () => {
            mockData.mockReturnValue([]);

            const res = await request(app).get('/api/offers');

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toEqual([]);
        });
    });

    describe('GET /api/offers/restaurants/:restaurantId', () => {
        it('should return offers for a specific restaurant', async () => {
            const mockOffers = [
                { id: 'offer-1', title: '2x1 en tacos', discount_value: '2x1' }
            ];
            mockData.mockReturnValue(mockOffers);

            const res = await request(app).get('/api/offers/restaurants/restaurant-123');

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
        });

        it('should return empty array when restaurant has no offers', async () => {
            mockData.mockReturnValue([]);

            const res = await request(app).get('/api/offers/restaurants/restaurant-123');

            expect(res.statusCode).toBe(200);
            expect(res.body.data).toEqual([]);
        });
    });

    describe('POST /api/offers/restaurants/:restaurantId (without auth)', () => {
        it('should reject when not authenticated', async () => {
            const res = await request(app)
                .post('/api/offers/restaurants/restaurant-123')
                .send({
                    title: 'Test',
                    description: 'Test',
                    discount: '10%'
                });

            expect(res.statusCode).toBe(401);
            expect(res.body.success).toBe(false);
        });
    });

    describe('PATCH /api/offers/:offerId (without auth)', () => {
        it('should reject when not authenticated', async () => {
            const res = await request(app)
                .patch('/api/offers/offer-123')
                .send({
                    title: 'Updated Title'
                });

            expect(res.statusCode).toBe(401);
            expect(res.body.success).toBe(false);
        });
    });

    describe('DELETE /api/offers/:offerId (without auth)', () => {
        it('should reject when not authenticated', async () => {
            const res = await request(app)
                .delete('/api/offers/offer-123');

            expect(res.statusCode).toBe(401);
            expect(res.body.success).toBe(false);
        });
    });
});

describe('Offers Edge Cases', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        setupSupabaseMock();
    });

    it('should handle database errors gracefully', async () => {
        mockData.mockReturnValue(null);
        mockError.mockReturnValue({ message: 'Database error' });

        const res = await request(app).get('/api/offers');

        expect(res.statusCode).toBe(500);
        expect(res.body.success).toBe(false);
    });
});
