import { motion } from 'framer-motion';
import { Clock, AlertTriangle, CreditCard } from 'lucide-react';
import { TimeSlot } from '@/types/restaurant';
import { cn } from '@/lib/utils';

interface TimeSlotPickerProps {
  timeSlots: TimeSlot[];
  selectedTime: string | null;
  onSelectTime: (time: string) => void;
}

const TimeSlotPicker = ({ timeSlots, selectedTime, onSelectTime }: TimeSlotPickerProps) => {
  return (
    <div className="bg-card rounded-2xl p-6 shadow-card">
      <h3 className="font-display text-xl font-semibold mb-4 flex items-center gap-2">
        <Clock className="h-5 w-5 text-primary" />
        Selecciona un horario
      </h3>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
        {timeSlots.map((slot) => (
          <motion.button
            key={slot.time}
            whileHover={slot.available ? { scale: 1.05 } : {}}
            whileTap={slot.available ? { scale: 0.95 } : {}}
            onClick={() => slot.available && onSelectTime(slot.time)}
            disabled={!slot.available}
            className={cn(
              'relative p-3 rounded-xl border-2 transition-all duration-200 text-center',
              slot.available && !slot.isPeak && 'border-border hover:border-primary hover:bg-primary/5',
              slot.available && slot.isPeak && 'border-warning/50 bg-warning/5 hover:border-warning',
              !slot.available && 'border-border bg-muted opacity-50 cursor-not-allowed',
              selectedTime === slot.time && 'border-primary bg-primary text-primary-foreground'
            )}
          >
            <span className={cn(
              'font-semibold text-lg',
              selectedTime === slot.time && 'text-primary-foreground'
            )}>
              {slot.time}
            </span>
            
            {slot.isPeak && slot.available && selectedTime !== slot.time && (
              <div className="absolute -top-2 -right-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-warning text-warning-foreground">
                  <AlertTriangle className="h-3 w-3" />
                </span>
              </div>
            )}
          </motion.button>
        ))}
      </div>

      {/* Peak Hour Notice */}
      <div className="mt-4 p-4 bg-warning/10 rounded-xl border border-warning/20">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-foreground">Horarios pico</p>
            <p className="text-sm text-muted-foreground">
              Los horarios marcados con ⚠️ requieren un anticipo para confirmar la reserva.
            </p>
          </div>
        </div>
      </div>

      {/* Selected Time Info */}
      {selectedTime && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4"
        >
          {timeSlots.find(s => s.time === selectedTime)?.requiresDeposit && (
            <div className="p-4 bg-primary/10 rounded-xl border border-primary/20">
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium text-primary">Anticipo requerido</p>
                  <p className="text-sm text-muted-foreground">
                    ${timeSlots.find(s => s.time === selectedTime)?.depositAmount} MXN para confirmar
                  </p>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default TimeSlotPicker;
