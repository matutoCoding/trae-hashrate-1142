import type { OccupancyBlock, TimeSlot } from '../../shared/types.js';
import { isAdjacentOrOverlapping } from './conflictDetection.js';
import { genId } from '../utils/dateUtils.js';

export interface MergeResult {
  merged: boolean;
  newBlock: OccupancyBlock;
  mergedBlockIds: string[];
}

export const findMergeableBlocks = (
  newSlot: TimeSlot,
  benchId: string,
  existingBlocks: OccupancyBlock[],
  toleranceMinutes = 0
): OccupancyBlock[] => {
  return existingBlocks.filter((b) => {
    if (b.benchId !== benchId) return false;
    if (b.status === 'cancelled') return false;
    return isAdjacentOrOverlapping(newSlot, { start: b.startTime, end: b.endTime }, toleranceMinutes);
  });
};

export const mergeTimeSlots = (slots: TimeSlot[]): TimeSlot => {
  let minStart = Infinity;
  let maxEnd = -Infinity;
  for (const slot of slots) {
    const s = new Date(slot.start).getTime();
    const e = new Date(slot.end).getTime();
    if (s < minStart) minStart = s;
    if (e > maxEnd) maxEnd = e;
  }
  return {
    start: new Date(minStart).toISOString(),
    end: new Date(maxEnd).toISOString(),
  };
};

export const mergeWithExisting = (
  newReservationId: string,
  newSlot: TimeSlot,
  benchId: string,
  existingBlocks: OccupancyBlock[],
  status: OccupancyBlock['status'] = 'pending'
): MergeResult => {
  const mergeable = findMergeableBlocks(newSlot, benchId, existingBlocks);

  if (mergeable.length === 0) {
    return {
      merged: false,
      newBlock: {
        id: genId(),
        benchId,
        reservationIds: [newReservationId],
        startTime: newSlot.start,
        endTime: newSlot.end,
        status,
      },
      mergedBlockIds: [],
    };
  }

  const allSlots: TimeSlot[] = [newSlot, ...mergeable.map((b) => ({ start: b.startTime, end: b.endTime }))];
  const mergedSlot = mergeTimeSlots(allSlots);
  const allReservationIds = Array.from(
    new Set([newReservationId, ...mergeable.flatMap((b) => b.reservationIds)])
  );

  return {
    merged: true,
    newBlock: {
      id: genId(),
      benchId,
      reservationIds: allReservationIds,
      startTime: mergedSlot.start,
      endTime: mergedSlot.end,
      status,
      mergedFrom: mergeable.map((b) => b.id),
    },
    mergedBlockIds: mergeable.map((b) => b.id),
  };
};

export const canMergeBlocks = (block1: OccupancyBlock, block2: OccupancyBlock): boolean => {
  if (block1.benchId !== block2.benchId) return false;
  if (block1.status === 'cancelled' || block2.status === 'cancelled') return false;
  if (block1.status !== block2.status) return false;
  return isAdjacentOrOverlapping(
    { start: block1.startTime, end: block1.endTime },
    { start: block2.startTime, end: block2.endTime }
  );
};
