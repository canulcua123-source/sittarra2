import { cn } from '@/lib/utils';
import { Clock, CheckCircle, XCircle, AlertCircle, Calendar, Ban } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export type ReservationStatus =
    | 'pending'
    | 'confirmed'
    | 'arrived'
    | 'completed'
    | 'cancelled'
    | 'no_show';

interface StatusBadgeProps {
    status: ReservationStatus;
    size?: 'sm' | 'md' | 'lg';
    showIcon?: boolean;
}

const statusConfig: Record<ReservationStatus, {
    label: string;
    icon: typeof Clock;
    variant: 'default' | 'secondary' | 'destructive' | 'outline';
    className: string;
}> = {
    pending: {
        label: 'Reserva Pendiente',
        icon: Clock,
        variant: 'outline',
        className: 'border-yellow-500 text-yellow-700 bg-yellow-50',
    },
    confirmed: {
        label: 'Confirmada',
        icon: CheckCircle,
        variant: 'default',
        className: 'bg-green-500 text-white',
    },
    arrived: {
        label: 'En Mesa',
        icon: Calendar,
        variant: 'default',
        className: 'bg-blue-500 text-white',
    },
    completed: {
        label: 'Completada',
        icon: CheckCircle,
        variant: 'secondary',
        className: 'bg-gray-500 text-white',
    },
    cancelled: {
        label: 'Cancelada',
        icon: XCircle,
        variant: 'outline',
        className: 'border-gray-400 text-gray-600 bg-gray-50',
    },
    no_show: {
        label: 'No Asistió',
        icon: Ban,
        variant: 'destructive',
        className: 'bg-red-500 text-white',
    },
};

const StatusBadge = ({ status, size = 'md', showIcon = true }: StatusBadgeProps) => {
    const config = statusConfig[status];
    const Icon = config.icon;

    const sizeClasses = {
        sm: 'text-xs px-2 py-0.5',
        md: 'text-sm px-3 py-1',
        lg: 'text-base px-4 py-1.5',
    };

    const iconSizes = {
        sm: 'h-3 w-3',
        md: 'h-4 w-4',
        lg: 'h-5 w-5',
    };

    return (
        <Badge
            className={cn(
                'font-medium inline-flex items-center gap-1.5',
                config.className,
                sizeClasses[size]
            )}
        >
            {showIcon && <Icon className={iconSizes[size]} />}
            {config.label}
        </Badge>
    );
};

export default StatusBadge;
