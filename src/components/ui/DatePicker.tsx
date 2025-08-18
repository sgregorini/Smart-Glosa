// components/DatePicker.tsx
import { useState } from 'react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar'; // ou onde você exportou aquele Calendar customizado
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';

interface DatePickerProps {
  selectedDate: Date | undefined;
  onSelectDate: (date: Date) => void;
  placeholder?: string;
}

export function DatePicker({ selectedDate, onSelectDate, placeholder }: DatePickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-start text-left font-normal"
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {selectedDate ? format(selectedDate, 'dd/MM/yyyy', { locale: ptBR }) : (placeholder || 'Selecionar data')}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="p-0" align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(date) => {
            if (date) {
              onSelectDate(date);
              setOpen(false); // fecha o calendário ao escolher
            }
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
