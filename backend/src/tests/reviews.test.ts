import request from 'supertest';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mocks
const mockData = jest.fn();
const mockError = jest.fn();

// Mock Supabase with robust chain
const mockSelect = jest.fn();
const mockInsert = jest.fn();
const mockEq = jest.fn();
const mockOrder = jest.fn();
const mockLimit = jest.fn();
const mockSingle = jest.fn();
const mockFrom = jest.fn();

jest.mock('../config/supabase.js', () => ({
    supabase: {
        from: mockFrom
    }
}));

// Mock JWT for protected routes
jest.mock('jsonwebtoken', () => ({
    verify: jest.fn().mockReturnValue({ userId: 'user123', role: 'customer' }),
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
    chain.insert = mockInsert;
    chain.eq = mockEq;
    chain.order = mockOrder;
    chain.limit = mockLimit;
    chain.single = mockSingle;

    mockFrom.mockReturnValue(chain);
    mockSelect.mockReturnValue(chain);
    mockInsert.mockReturnValue(chain);
    mockEq.mockReturnValue(chain);
    mockOrder.mockReturnValue(chain);
    mockLimit.mockReturnValue(chain);

    mockSingle.mockImplementation(() => Promise.resolve({ data: mockData(), error: mockError() }));
};

describe('Reviews Endpoints', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        setupSupabaseMock();
    });

    describe('GET /api/reviews/restaurant/:id', () => {
        it('should return reviews for a restaurant', async () => {
            const mockReviews = [{ id: 'r1', rating: 5, comment: 'Great!' }];
            mockData.mockReturnValue(mockReviews);

            const res = await request(app).get('/api/reviews/restaurant/123');

            expect(res.statusCode).toBe(200);
            expect(res.body.data).toEqual(mockReviews);
        });
    });

    describe('POST /api/reviews', () => {
        it('should create a review', async () => {
            const newReview = { id: 'r1', rating: 5 };
            mockData.mockReturnValue(newReview); // Insert return

            const res = await request(app)
                .post('/api/reviews')
                .send({
                    restaurantId: 'rest123',
                    rating: 5,
                    comment: 'Love it'
                })
                .set('Authorization', 'Bearer token');

            expect(res.statusCode).toBe(201);
        });
    });
});
