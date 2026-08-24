"use client";

import { useState } from "react";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface DateRangePickerProps {
  from: Date;
  to: Date;
  onChange: (range: { from: Date; to: Date }) => void;
}

export function DateRangePicker({ from, to, onChange }: DateRangePickerProps) {
  const [open, setOpen] = useState(false);

  function handleSelect(range: DateRange | undefined) {
    if (!range?.from) return;
    if (range.to) {
      onChange({ from: range.from, to: range.to });
      setOpen(false);
    } else {
      onChange({ from: range.from, to: range.from });
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={<Button variant="outline" className="w-full justify-start gap-2 font-normal sm:w-64" />}>
        <CalendarIcon className="size-4 text-muted-foreground" />
        {format(from, "dd/MM/yyyy", { locale: ptBR })} – {format(to, "dd/MM/yyyy", { locale: ptBR })}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="range"
          selected={{ from, to }}
          onSelect={handleSelect}
          numberOfMonths={2}
          locale={ptBR}
          defaultMonth={from}
        />
      </PopoverContent>
    </Popover>
  );
}
