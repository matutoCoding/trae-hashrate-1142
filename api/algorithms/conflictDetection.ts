import type { OccupancyBlock, TimeSlot } from '../../shared/types.js';

export const checkConflict = (
  newSlot: TimeSlot,
  benchId: string,
  existingBlocks: OccupancyBlock[],
  excludeIds: string[] = []
): OccupancyBlock | null => {
  const newStart = new Date(newSlot.start).getTime();
  const newEnd = new Date(newSlot.end).getTime();

  for (const block of existingBlocks) {
    if (block.benchId !== benchId) continue;
    if (excludeIds.includes(block.id)) continue;
    if (block.status === 'cancelled') continue;

    const blockStart = new Date(block.startTime).getTime();
    const blockEnd = new Date(block.endTime).getTime();

    if (newStart < blockEnd && newEnd > blockStart) {
      return block;
    }
  }
  return null;
};

export const isAdjacentOrOverlapping = (
  slot1: TimeSlot,
  slot2: TimeSlot,
  toleranceMinutes = 0
): boolean => {
  const s1 = new Date(slot1.start).getTime();
  const e1 = new Date(slot1.end).getTime();
  const s2 = new Date(slot2.start).getTime();
  const e2 = new Date(slot2.end).getTime();
  const tolerance = toleranceMinutes * 60 * 1000;

  if (s1 <= s2 && e1 + tolerance >= s2) return true;
  if (s2 <= s1 && e2 + tolerance >= s1) return true;
  return false;
};

export const isExactlyAdjacent = (slot1: TimeSlot, slot2: TimeSlot): boolean => {
  const e1 = new Date(slot1.end).getTime();
  const s2 = new Date(slot2.start).getTime();
  const e2 = new Date(slot2.end).getTime();
  const s1 = new Date(slot1.start).getTime();
  return e1 === s2 || e2 === s1;
};
