import request from 'supertest';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// 1. Mock external dependencies BEFORE importing app
jest.mock('bcryptjs', () => ({
    genSalt: jest.fn().mockResolvedValue('salt'),
    hash: jest.fn().mockResolvedValue('hashed_password'),
    compare: jest.fn().mockResolvedValue(true) // Always match passwords
}));

// Mocks for Supabase
const mockSingle = jest.fn();
const mockEq = jest.fn();
const mockSelect = jest.fn();
const mockInsert = jest.fn();
const mockDelete = jest.fn();
const mockFrom = jest.fn();

jest.mock('../config/supabase.js', () => ({
    supabase: {
        from: mockFrom
    },
    supabaseAdmin: {
        from: mockFrom
    }
}));

// Import app AFTER mocks
import app from '../index.js';

const setupSupabaseMock = () => {
    // Reset mocks for each test
    mockFrom.mockReturnValue({
        select: mockSelect,
        insert: mockInsert,
        update: jest.fn().mockReturnValue({ eq: mockEq }), // Add update for role upgrade
        delete: mockDelete
    });

    mockSelect.mockReturnValue({
        eq: mockEq,
        single: mockSingle
    });

    mockEq.mockReturnValue({
        single: mockSingle,
        eq: mockEq // Support chaining multiple .eq()
    });

    mockInsert.mockReturnValue({
        select: jest.fn().mockReturnValue({
            single: mockSingle
        })
    });

    mockDelete.mockReturnValue({
        eq: mockEq
    });
};

describe('Auth Endpoints', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        setupSupabaseMock();

        // Default bcrypt behavior
        const bcrypt = require('bcryptjs');
        bcrypt.compare.mockResolvedValue(true);
    });

    describe('POST /api/auth/customer/register', () => {
        it('should register a new customer successfully', async () => {
            // 1. Check existing user -> null
            mockSingle.mockResolvedValueOnce({ data: null, error: null });

            // 2. Insert user -> success
            const newUser = {
                id: '123',
                email: 'test@example.com',
                role: 'customer',
                name: 'Test User'
            };
            mockSingle.mockResolvedValueOnce({ data: newUser, error: null });

            const res = await request(app)
                .post('/api/auth/customer/register')
                .send({
                    name: 'Test User',
                    email: 'test@example.com',
                    password: 'password123'
                });

            expect(res.statusCode).toBe(201);
            expect(res.body.success).toBe(true);
            expect(res.body.data.user).toEqual(newUser);
        });

        it('should fail if email already exists', async () => {
            // 1. Check existing user -> found
            mockSingle.mockResolvedValueOnce({ data: { id: 'exists' }, error: null });

            const res = await request(app)
                .post('/api/auth/customer/register')
                .send({
                    name: 'Test User',
                    email: 'existing@example.com',
                    password: 'password123'
                });

            expect(res.statusCode).toBe(400);
            expect(res.body.error).toMatch(/registrado/i);
        });
    });

    describe('POST /api/auth/customer/login', () => {
        it('should login successfully', async () => {
            // 1. Find user -> success
            const user = {
                id: '123',
                email: 'test@example.com',
                role: 'customer',
                password_hash: 'hashed_password'
            };
            mockSingle.mockResolvedValueOnce({ data: user, error: null });

            const res = await request(app)
                .post('/api/auth/customer/login')
                .send({
                    email: 'test@example.com',
                    password: 'password123'
                });

            expect(res.statusCode).toBe(200);
            expect(res.body.data.token).toBeDefined();
        });

        it('should fail with invalid credentials (user not found)', async () => {
            // 1. Find user -> null
            mockSingle.mockResolvedValueOnce({ data: null, error: 'Not found' });

            const res = await request(app)
                .post('/api/auth/customer/login')
                .send({
                    email: 'wrong@example.com',
                    password: 'password123'
                });

            expect(res.statusCode).toBe(401);
        });

        it('should fail with invalid credentials (wrong password)', async () => {
            // 1. Find user -> success
            mockSingle.mockResolvedValueOnce({
                data: { id: '123', password_hash: 'hash' },
                error: null
            });

            // 2. Compare password -> false
            const bcrypt = require('bcryptjs');
            bcrypt.compare.mockResolvedValueOnce(false);

            const res = await request(app)
                .post('/api/auth/customer/login')
                .send({
                    email: 'test@example.com',
                    password: 'wrongpassword'
                });

            expect(res.statusCode).toBe(401);
        });
    });

    describe('POST /api/auth/restaurant/register', () => {
        it('should register a new restaurant owner and restaurant', async () => {
            // 1. Check existing user -> null
            mockSingle.mockResolvedValueOnce({ data: null, error: null });

            // 2. Create User -> success
            const newUser = { id: 'user1', email: 'owner@test.com', role: 'restaurant_admin' };
            mockSingle.mockResolvedValueOnce({ data: newUser, error: null });

            // 3. Create Restaurant -> success
            const newRest = { id: 'rest1', name: 'New Rest' };
            mockSingle.mockResolvedValueOnce({ data: newRest, error: null });

            const res = await request(app)
                .post('/api/auth/restaurant/register')
                .send({
                    owner_name: 'Owner',
                    email: 'owner@test.com',
                    password: 'pass',
                    restaurant: { name: 'New Rest' }
                });

            expect(res.statusCode).toBe(201);
            expect(res.body.data.user.id).toBe('user1');
            expect(res.body.data.restaurant.id).toBe('rest1');
        });

        it('should upgrade existing customer to restaurant admin if credentials match', async () => {
            // 1. Check existing user -> Found (customer)
            const existingUser = {
                id: 'user1',
                email: 'owner@test.com',
                role: 'customer',
                password_hash: 'hashed'
            };
            mockSingle.mockResolvedValueOnce({ data: existingUser, error: null });

            // 2. Verify password -> Matches (via mock implementation, verify bcrypt call)
            // (default mock is true)

            // 3. Update Role -> success (mocked by setupSupabaseMock update())
            // Note: we need to ensure mockFrom.update works. update() returns { eq: ... }

            // 4. Create Restaurant -> success
            const newRest = { id: 'rest1', name: 'New Rest' };
            mockSingle.mockResolvedValueOnce({ data: newRest, error: null });

            const res = await request(app)
                .post('/api/auth/restaurant/register')
                .send({
                    owner_name: 'Owner',
                    email: 'owner@test.com',
                    password: 'pass',
                    restaurant: { name: 'New Rest' }
                });

            expect(res.statusCode).toBe(201);
            expect(res.body.data.user.role).toBe('restaurant_admin');
            // Check that role was actually updated? We'd need to spy on mockFrom
        });

        it('should fail if email exists but password does not match', async () => {
            // 1. Check existing user -> Found
            mockSingle.mockResolvedValueOnce({
                data: { id: 'user1', password_hash: 'hashed' },
                error: null
            });

            // 2. Compare password -> false
            const bcrypt = require('bcryptjs');
            bcrypt.compare.mockResolvedValueOnce(false);

            const res = await request(app)
                .post('/api/auth/restaurant/register')
                .send({
                    owner_name: 'Owner',
                    email: 'owner@test.com',
                    password: 'wrongpass',
                    restaurant: { name: 'New Rest' }
                });

            expect(res.statusCode).toBe(400); // 400 for bad password on existing account
            expect(res.body.error).toMatch(/contraseña no coincide/i);
        });
    });
});
