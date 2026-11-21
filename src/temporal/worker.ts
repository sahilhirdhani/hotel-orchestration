import { Worker } from '@temporalio/worker';
import * as activities from './activities';
import { config } from '../config';

async function run() {
  const worker = await Worker.create({
    workflowsPath: require.resolve('./workflows'),
    activities,
    taskQueue: config.temporal.taskQueue,
  });

  console.log(`[Temporal Worker] Listening on task queue: ${config.temporal.taskQueue}`);
  await worker.run();
}

run().catch((err) => {
  console.error('[Temporal Worker] Failed to start:', err);
  process.exit(1);
});
