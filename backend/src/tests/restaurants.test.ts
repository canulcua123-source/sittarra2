import request from 'supertest';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mocks for Supabase
const mockData = jest.fn(); // holds the resolved data
const mockError = jest.fn(); // holds the resolved error

// Chainable mocks
const mockRange = jest.fn();
const mockOrder = jest.fn();
const mockLimit = jest.fn();
const mockEq = jest.fn();
const mockOr = jest.fn();
const mockGte = jest.fn();
const mockIn = jest.fn();
const mockSingle = jest.fn();
const mockSelect = jest.fn();
const mockFrom = jest.fn();

// Mock Supabase client
jest.mock('../config/supabase.js', () => ({
    supabase: {
        from: mockFrom
    }
}));

// Import app AFTER mocks
import app from '../index.js';

const setupSupabaseMock = () => {
    // Reset return values
    mockData.mockReturnValue(null);
    mockError.mockReturnValue(null);

    // Promise chain resolver
    const promiseChain = {
        then: (resolve: any) => {
            const data = mockData();
            const error = mockError();
            resolve({ data, error, count: data?.length || 0 });
        }
    };

    // Recursive chain object containing all methods
    const chain: any = {
        ...promiseChain
    };

    // Define methods
    chain.select = mockSelect;
    chain.eq = mockEq;
    chain.or = mockOr;
    chain.order = mockOrder;
    chain.range = mockRange;
    chain.limit = mockLimit;
    chain.single = mockSingle;
    chain.gte = mockGte;
    chain.in = mockIn;
    chain.gt = jest.fn().mockReturnValue(chain);

    // Link mocks to return the chain
    mockFrom.mockReturnValue(chain);
    mockSelect.mockReturnValue(chain);
    mockEq.mockReturnValue(chain);
    mockOr.mockReturnValue(chain);
    mockOrder.mockReturnValue(chain);
    mockRange.mockReturnValue(chain);
    mockLimit.mockReturnValue(chain);
    mockGte.mockReturnValue(chain);
    mockIn.mockReturnValue(chain);

    // .single() is terminal
    mockSingle.mockImplementation(() => {
        return Promise.resolve({ data: mockData(), error: mockError() });
    });
};

describe('Restaurant Endpoints', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        setupSupabaseMock();
    });

    describe('GET /api/restaurants', () => {
        it('should return a list of restaurants', async () => {
            const mockRestaurants = [
                { id: '1', name: 'Restaurante Prueba' },
                { id: '2', name: 'Tacos Deluxe' }
            ];
            mockData.mockReturnValue(mockRestaurants);

            const res = await request(app).get('/api/restaurants');

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(res.body.data).toHaveLength(2);
            expect(mockSelect).toHaveBeenCalled();
        });

        it('should filter by zone', async () => {
            mockData.mockReturnValue([]);
            await request(app).get('/api/restaurants?zone=Norte');
            expect(mockEq).toHaveBeenCalledWith('zone', 'Norte');
        });

        it('should search by name', async () => {
            mockData.mockReturnValue([]);
            await request(app).get('/api/restaurants?search=tacos');
            // Check if .or() was called with search term
            expect(mockOr).toHaveBeenCalledWith(expect.stringContaining('tacos'));
        });
    });

    describe('GET /api/restaurants/:id', () => {
        it('should return restaurant details', async () => {
            const mockRestaurant = { id: '123', name: 'Detalle Rest' };
            mockData.mockReturnValue(mockRestaurant);

            const res = await request(app).get('/api/restaurants/123');

            expect(res.statusCode).toBe(200);
            expect(res.body.data.name).toBe('Detalle Rest');
            expect(mockEq).toHaveBeenCalledWith('id', '123');
        });

        it('should return 404 if not found', async () => {
            mockData.mockReturnValue(null);
            const res = await request(app).get('/api/restaurants/999');
            expect(res.statusCode).toBe(404);
        });
    });

    describe('GET /api/restaurants/:id/menu', () => {
        it('should return menu items', async () => {
            const mockMenu = [{ id: 'm1', name: 'Taco' }];
            mockData.mockReturnValue(mockMenu);

            const res = await request(app).get('/api/restaurants/123/menu');

            expect(res.statusCode).toBe(200);
            expect(res.body.data).toEqual(mockMenu);
            expect(mockEq).toHaveBeenCalledWith('restaurant_id', '123');
        });
    });
});
