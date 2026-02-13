import request from 'supertest';
import app from '../index.js'; // Ensure this path is correct based on your exports

describe('Health Check Endpoint', () => {
    it('GET /health should return 200 and success message', async () => {
        const res = await request(app).get('/health');

        expect(res.statusCode).toEqual(200);
        expect(res.body).toHaveProperty('success', true);
        expect(res.body).toHaveProperty('message', 'Mesa Feliz API is running');
    });
});
