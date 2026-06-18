export const addHours = (date: Date, hours: number): Date => {
  const result = new Date(date);
  result.setHours(result.getHours() + hours);
  return result;
};

export const addMinutes = (date: Date, minutes: number): Date => {
  const result = new Date(date);
  result.setMinutes(result.getMinutes() + minutes);
  return result;
};

export const formatDateTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

export const formatTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const getHoursUntil = (dateStr: string): number => {
  const target = new Date(dateStr).getTime();
  const now = Date.now();
  return Math.max(0, (target - now) / (1000 * 60 * 60));
};

export const isOverdue = (deadline: string): boolean => {
  return new Date(deadline).getTime() < Date.now();
};

export const getStartOfDay = (date: Date): Date => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

export const getEndOfDay = (date: Date): Date => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

export const getDaysInWeek = (baseDate: Date = new Date()): Date[] => {
  const startOfWeek = getStartOfDay(baseDate);
  const dayOfWeek = startOfWeek.getDay();
  startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek + 1);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(d.getDate() + i);
    return d;
  });
};

export const generateTimeSlots = (
  startHour = 8,
  endHour = 22,
  slotDurationMinutes = 60
): { label: string; value: number }[] => {
  const slots: { label: string; value: number }[] = [];
  for (let h = startHour; h < endHour; h++) {
    for (let m = 0; m < 60; m += slotDurationMinutes) {
      const hour = h.toString().padStart(2, '0');
      const minute = m.toString().padStart(2, '0');
      slots.push({
        label: `${hour}:${minute}`,
        value: h * 60 + m,
      });
    }
  }
  return slots;
};

export const setDateTime = (date: Date, minutesFromMidnight: number): Date => {
  const d = new Date(date);
  d.setHours(Math.floor(minutesFromMidnight / 60), minutesFromMidnight % 60, 0, 0);
  return d;
};

export const genId = (): string => {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
};
