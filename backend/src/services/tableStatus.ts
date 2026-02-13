import { supabaseAdmin } from '../config/supabase.js';

export enum TableLogicalStatus {
    FREE = 'FREE',
    RESERVED = 'RESERVED',
    OCCUPIED = 'OCCUPIED',
    NEXT_RESERVATION = 'NEXT_RESERVATION',
    OUT_OF_SERVICE = 'OUT_OF_SERVICE'
}

export interface TableStatusReport {
    tableId: string;
    number: number;
    logicalStatus: TableLogicalStatus;
    currentReservation?: any;
    nextReservation?: any;
    remainingTimeMinutes?: number;
}

/**
 * TableStatusService
 * Centralizes the logic to calculate the real-time status of tables.
 */
export class TableStatusService {
    /**
     * Get the status report for all tables in a restaurant for a specific time (usually now).
     */
    static async getRestaurantStatusReport(restaurantId: string): Promise<TableStatusReport[]> {
        // 1. Get all active tables
        const { data: tables, error: tablesError } = await supabaseAdmin
            .from('tables')
            .select('*')
            .eq('restaurant_id', restaurantId)
            .eq('is_active', true)
            .order('number', { ascending: true });

        if (tablesError) throw tablesError;

        // 2. Get today's reservations
        const today = new Date().toISOString().split('T')[0];
        const { data: reservations, error: resError } = await supabaseAdmin
            .from('reservations')
            .select('*')
            .eq('restaurant_id', restaurantId)
            .eq('date', today)
            .not('status', 'in', '("cancelled", "no_show")');

        if (resError) throw resError;

        const now = new Date();
        const currentTimeString = now.toTimeString().split(' ')[0]; // HH:mm:ss

        return tables.map(table => {
            const tableReservations = reservations
                .filter(r => r.table_id === table.id)
                .sort((a, b) => a.time.localeCompare(b.time));

            // Find current active reservation (if any)
            // A reservation is "current" if it has started and hasn't ended or if the user is arrived/seated.
            const currentRes = tableReservations.find(r =>
                (r.status === 'arrived' || r.status === 'seated') ||
                (r.time <= currentTimeString && (!r.end_time || r.end_time > currentTimeString) && r.status === 'confirmed')
            );

            // Find next upcoming reservation
            const nextRes = tableReservations.find(r =>
                r.time > currentTimeString && ['pending', 'confirmed'].includes(r.status)
            );

            let logicalStatus = TableLogicalStatus.FREE;
            let remainingTimeMinutes = undefined;

            if (table.status === 'blocked' || table.status === 'disabled') {
                logicalStatus = TableLogicalStatus.OUT_OF_SERVICE;
            } else if (currentRes) {
                logicalStatus = TableLogicalStatus.OCCUPIED;
                if (currentRes.end_time) {
                    remainingTimeMinutes = this.calculateRemainingMinutes(currentTimeString, currentRes.end_time);
                }
            } else if (nextRes) {
                const minutesUntilNext = this.calculateRemainingMinutes(currentTimeString, nextRes.time);

                if (minutesUntilNext <= 30) {
                    logicalStatus = TableLogicalStatus.RESERVED;
                } else if (minutesUntilNext <= 90) {
                    logicalStatus = TableLogicalStatus.NEXT_RESERVATION;
                } else {
                    logicalStatus = TableLogicalStatus.FREE;
                }
                remainingTimeMinutes = minutesUntilNext;
            }

            return {
                tableId: table.id,
                number: table.number,
                logicalStatus,
                currentReservation: currentRes,
                nextReservation: nextRes,
                remainingTimeMinutes
            };
        });
    }

    private static calculateRemainingMinutes(startTime: string, endTime: string): number {
        const startParts = startTime.split(':').map(Number);
        const endParts = endTime.split(':').map(Number);

        const startMinutes = startParts[0] * 60 + startParts[1];
        const endMinutes = endParts[0] * 60 + endParts[1];

        let diff = endMinutes - startMinutes;
        if (diff < 0) diff += 1440; // Handle midnight wrap

        return diff;
    }
}
