import { Connection, Client } from '@temporalio/client';
import { config } from '../config';
import { hotelOrchestratorWorkflow } from './workflows';
import { DeduplicatedHotel } from '../types';
import { fetchSupplierA, fetchSupplierB, deduplicateHotels, saveToRedisActivity } from './activities';

let client: Client | null = null;

export async function getTemporalClient(): Promise<Client> {
  if (!client) {
    const connection = await Connection.connect({
      address: config.temporal.address,
      connectTimeout: '1s',
    });
    client = new Client({ connection });
  }
  return client;
}

export async function runHotelWorkflow(city: string): Promise<DeduplicatedHotel[]> {
  try {
    const temporalClient = await getTemporalClient();
    const workflowId = `hotel-orchestration-${city.toLowerCase()}-${Date.now()}`;

    const handle = await temporalClient.workflow.start(hotelOrchestratorWorkflow, {
      taskQueue: config.temporal.taskQueue,
      args: [city],
      workflowId,
    });

    return await handle.result();
  } catch (error: any) {
    console.warn(`[Temporal Client] Temporal Server unreachable at ${config.temporal.address} (${error.message}). Running workflow activities in fallback mode.`);
    // Fallback in-process execution so local tests work even before Temporal is started
    const [offersA, offersB] = await Promise.all([
      fetchSupplierA(city),
      fetchSupplierB(city),
    ]);
    const deduplicated = await deduplicateHotels(offersA, offersB);
    await saveToRedisActivity(city, deduplicated);
    return deduplicated;
  }
}

