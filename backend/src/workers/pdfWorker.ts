import { Queue, Worker, Job } from "bullmq";
import IORedis from "ioredis";

/**
 * PDF processing worker skeleton (Redis / BullMQ).
 *
 * Today it is a stub that logs the job. The next iteration will:
 *   1. Extract text from the PDF (e.g. pdf-parse / pdfjs).
 *   2. Split into chapters and persist them (Chapter model).
 *   3. Generate questions (Question model) and flip book.textExtracted = true.
 *
 * Standalone run:  npm run worker
 * The API enqueues jobs via enqueuePdfJob(); it fails fast (503) if Redis
 * is unreachable, so the REST API keeps working without Redis in dev.
 */

export const PDF_QUEUE_NAME = "pdf-processing";

export type PdfJobData = {
  bookId: number;
  storageKey: string;
};

function redisConnectionOptions() {
  const url = new URL(process.env.REDIS_URL || "redis://localhost:6379");
  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    password: url.password || undefined,
    username: url.username || undefined,
    maxRetriesPerRequest: null,
    enableOfflineQueue: false,
    connectTimeout: 2000,
    lazyConnect: true,
  };
}

let queue: Queue<PdfJobData> | null = null;

export function getPdfQueue(): Queue<PdfJobData> {
  if (!queue) {
    queue = new Queue<PdfJobData>(PDF_QUEUE_NAME, { connection: redisConnectionOptions() });
  }
  return queue;
}

/** Enqueue a PDF extraction job. Throws when Redis is unavailable. */
export async function enqueuePdfJob(data: PdfJobData): Promise<string | undefined> {
  const pdfQueue = getPdfQueue();
  const job = await pdfQueue.add("extract-text", data, {
    attempts: 2,
    backoff: { type: "exponential", delay: 1000 },
    removeOnComplete: true,
    removeOnFail: true,
  });
  return job.id;
}

// ---------------------------------------------------------------------------
// Worker: consumes jobs from the queue. Stub for now.
// ---------------------------------------------------------------------------
async function processPdfJob(job: Job<PdfJobData>): Promise<{ ok: boolean; bookId: number }> {
  const { bookId, storageKey } = job.data;
  console.log(`[pdf-worker] processing book #${bookId} (file: ${storageKey})`);
  // TODO(worker): extract text -> save chapters -> generate questions
  //                -> prisma.book.update({ where: { id: bookId }, data: { textExtracted: true } })
  return { ok: true, bookId };
}

export function startWorker(): Worker<PdfJobData> {
  const worker = new Worker<PdfJobData>(PDF_QUEUE_NAME, processPdfJob, {
    connection: {
      ...redisConnectionOptions(),
      // The worker needs an ordinary connection; BullMQ requires this flag.
      maxRetriesPerRequest: null,
    },
  });
  worker.on("completed", (job) => {
    console.log(`[pdf-worker] job ${job.id} completed for book #${job.data.bookId}`);
  });
  worker.on("failed", (job, err) => {
    console.error(`[pdf-worker] job ${job?.id} failed:`, err.message);
  });
  console.log(`[pdf-worker] listening on queue "${PDF_QUEUE_NAME}"`);
  return worker;
}

// Run standalone: `npm run worker`
if (require.main === module) {
  startWorker();
}
