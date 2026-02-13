export const STAFF_ROLES = {
    WAITER: 'waiter',
    CAPTAIN: 'captain',
    MANAGER: 'manager',
    OWNER: 'owner'
};

export const DEFAULT_PERMISSIONS = {
    [STAFF_ROLES.WAITER]: {
        canViewReservations: true,
        canCheckIn: true,
        canChangeTables: false,
        canViewMenu: true,
        canEditMenu: false,
        canViewReports: false,
        canManageWaitlist: true
    },
    [STAFF_ROLES.CAPTAIN]: {
        canViewReservations: true,
        canCheckIn: true,
        canChangeTables: true,
        canViewMenu: true,
        canEditMenu: false,
        canViewReports: false,
        canManageWaitlist: true,
        canAssignTables: true
    },
    [STAFF_ROLES.MANAGER]: {
        canViewReservations: true,
        canCheckIn: true,
        canChangeTables: true,
        canViewMenu: true,
        canEditMenu: true,
        canViewReports: true,
        canManageWaitlist: true,
        canManageStaff: true
    },
    [STAFF_ROLES.OWNER]: {
        canViewReservations: true,
        canCheckIn: true,
        canChangeTables: true,
        canViewMenu: true,
        canEditMenu: true,
        canViewReports: true,
        canManageWaitlist: true,
        canManageStaff: true,
        canManageSettings: true,
        canViewFinancials: true
    }
};
