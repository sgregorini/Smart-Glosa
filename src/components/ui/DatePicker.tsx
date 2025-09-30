// src/components/ui/DatePicker.tsx
import * as React from 'react'
import * as Popover from '@radix-ui/react-popover'
import { CalendarIcon } from 'lucide-react'

type DatePickerProps = {
  selectedDate?: Date
  onSelectDate?: (d?: Date) => void
  placeholder?: string
  /** container onde o popover vai portalizar (ex.: o DialogContent) */
  portalContainer?: HTMLElement | null
  /** se true, não fecha ao selecionar (útil para escolher 2 datas) */
  stayOpenOnSelect?: boolean
}

export function DatePicker({
  selectedDate,
  onSelectDate,
  placeholder = 'Selecionar data',
  portalContainer,
  stayOpenOnSelect = false,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)

  const formatted =
    selectedDate ? selectedDate.toLocaleDateString('pt-BR') : ''

  // Fecha o popover ao selecionar, a menos que stayOpenOnSelect=true
  const handleDayClick = (day: Date) => {
    onSelectDate?.(day)
    if (!stayOpenOnSelect) setOpen(false)
  }

  return (
    <Popover.Root open={open} onOpenChange={setOpen} modal={false}>
      <Popover.Trigger asChild>
        <button
          type="button"
          className="w-full inline-flex items-center justify-between rounded-md border bg-background px-3 py-2 text-sm"
        >
          <span className={formatted ? 'text-foreground' : 'text-muted-foreground'}>
            {formatted || placeholder}
          </span>
          <CalendarIcon className="h-4 w-4 opacity-60" />
        </button>
      </Popover.Trigger>

      <Popover.Portal container={portalContainer ?? undefined}>
        <Popover.Content
          align="start"
          sideOffset={6}
          className="z-50 rounded-md border bg-popover p-2 shadow-md"
          // evita o Dialog “roubar” o foco quando abrimos o popover
          onOpenAutoFocus={(e) => e.preventDefault()}
          // evita que um clique no calendário seja interpretado como “outside”
          onPointerDownOutside={(e) => {
            // se você quiser fechar ao clicar fora, remova este guard
            // aqui mantemos o comportamento padrão do Radix (fecha)
          }}
        >
          {/* Calendário simplificado sem libs externas */}
          <CalendarView
            value={selectedDate}
            onChange={handleDayClick}
          />

          <Popover.Arrow className="fill-popover border-none" />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

/** Calendário mínimo (mês atual) — pode trocar pelo da sua lib preferida */
function CalendarView({
  value,
  onChange,
}: {
  value?: Date
  onChange: (d: Date) => void
}) {
  const [cursor, setCursor] = React.useState<Date>(() => {
    return value ? new Date(value) : new Date()
  })

  const year = cursor.getFullYear()
  const month = cursor.getMonth()

  const start = new Date(year, month, 1)
  const startWeekday = start.getDay() // 0=domingo
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const weeks: Array<(Date | null)[]> = []
  let week: (Date | null)[] = []
  // padding antes
  for (let i = 0; i < startWeekday; i++) week.push(null)
  for (let d = 1; d <= daysInMonth; d++) {
    week.push(new Date(year, month, d))
    if (week.length === 7) {
      weeks.push(week)
      week = []
    }
  }
  if (week.length) {
    while (week.length < 7) week.push(null)
    weeks.push(week)
  }

  const isSameDay = (a?: Date | null, b?: Date | null) =>
    !!a && !!b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()

  return (
    <div className="w-[280px]">
      {/* header */}
      <div className="flex items-center justify-between px-1 py-2">
        <button
          type="button"
          className="rounded px-2 py-1 text-sm hover:bg-accent"
          onClick={() => setCursor(new Date(year, month - 1, 1))}
        >
          ‹
        </button>
        <div className="text-sm font-medium">
          {cursor.toLocaleString('pt-BR', { month: 'long' })} {year}
        </div>
        <button
          type="button"
          className="rounded px-2 py-1 text-sm hover:bg-accent"
          onClick={() => setCursor(new Date(year, month + 1, 1))}
        >
          ›
        </button>
      </div>

      {/* weekdays */}
      <div className="grid grid-cols-7 gap-1 px-1 text-center text-xs text-muted-foreground">
        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      {/* days */}
      <div className="mt-1 grid grid-cols-7 gap-1 px-1 pb-1">
        {weeks.flat().map((day, idx) => {
          const selected = isSameDay(day, value)
          return (
            <button
              key={idx}
              type="button"
              disabled={!day}
              onMouseDown={(e) => e.preventDefault()} // evita “roubo” de foco
              onClick={() => day && onChange(day)}
              className={[
                'h-8 rounded text-sm hover:bg-accent',
                !day ? 'opacity-0 cursor-default' : '',
                selected ? 'bg-primary text-primary-foreground hover:bg-primary' : '',
              ].join(' ')}
            >
              {day ? day.getDate() : ''}
            </button>
          )
        })}
      </div>
    </div>
  )
}
