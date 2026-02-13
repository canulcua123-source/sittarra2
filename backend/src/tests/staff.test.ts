import request from 'supertest';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mocks
const mockData = jest.fn();
const mockError = jest.fn();

// Mock Supabase
const mockSelect = jest.fn();
const mockEq = jest.fn();
const mockOrder = jest.fn();
const mockFrom = jest.fn();

jest.mock('../config/supabase.js', () => ({
    supabase: {
        from: mockFrom
    }
}));

// Mock JWT with different roles per test if needed, 
// but jest.mock raises to top. We can use logic inside mock or spyOn.
// Simple approach: Mock for success case (authorized staff)
jest.mock('jsonwebtoken', () => ({
    verify: jest.fn().mockReturnValue({ userId: 'staff123', role: 'restaurant_admin', restaurantId: 'rest123' }),
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
    chain.order = mockOrder;

    mockFrom.mockReturnValue(chain);
    mockSelect.mockReturnValue(chain);
    mockEq.mockReturnValue(chain);
    mockOrder.mockReturnValue(chain);
};

describe('Staff Endpoints', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        setupSupabaseMock();
    });

    describe('GET /api/staff/reservations', () => {
        it('should return reservations for the staff restaurant', async () => {
            const mockRes = [{ id: 'res1', status: 'pending' }];
            mockData.mockReturnValue(mockRes);

            const res = await request(app)
                .get('/api/staff/reservations')
                .set('Authorization', 'Bearer token');

            expect(res.statusCode).toBe(200);
            expect(res.body.data).toEqual(mockRes);
        });
    });
});
