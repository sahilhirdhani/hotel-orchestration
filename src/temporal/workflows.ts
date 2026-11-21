import { proxyActivities } from '@temporalio/workflow';
import type * as activities from './activities';
import { DeduplicatedHotel } from '../types';

const { fetchSupplierA, fetchSupplierB, deduplicateHotels, saveToRedisActivity } =
  proxyActivities<typeof activities>({
    startToCloseTimeout: '15 seconds',
    retry: {
      maximumAttempts: 3,
    },
  });

export async function hotelOrchestratorWorkflow(city: string): Promise<DeduplicatedHotel[]> {
  // 1. Call Supplier A and Supplier B in parallel
  const [offersA, offersB] = await Promise.all([
    fetchSupplierA(city),
    fetchSupplierB(city),
  ]);

  // 2. Deduplicate hotels (cheaper price or unique)
  const deduplicated = await deduplicateHotels(offersA, offersB);

  // 3. Save deduplicated list to Redis
  await saveToRedisActivity(city, deduplicated);

  // 4. Return final de-duplicated list
  return deduplicated;
}
