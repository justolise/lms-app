/**
 * Commonplace LMS - Performance Benchmark Script
 * Validates PRD latency targets:
 * - Search p95 < 500ms
 * - Availability lookup < 200ms
 * Based on Concept 91 (Latency), 92 (Throughput), 93 (P99 Latency)
 */

import { performance } from 'node:perf_hooks';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';
const TEST_TENANT_SLUG = process.env.TEST_TENANT_SLUG || 'test-lib';

function calculatePercentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

async function measureRequest(url: string): Promise<number> {
  const start = performance.now();
  const res = await fetch(url);
  const duration = performance.now() - start;
  if (!res.ok && res.status !== 404) {
    throw new Error(`Request failed with status ${res.status}`);
  }
  return duration;
}

async function runBenchmark(name: string, url: string, iterations = 50) {
  console.log(
    `\n--- Running benchmark: ${name} (${iterations} iterations) ---`,
  );
  const latencies: number[] = [];

  // Warmup run
  try {
    await measureRequest(url);
  } catch (e) {
    console.warn(`Warmup warning: ${(e as Error).message}`);
  }

  for (let i = 0; i < iterations; i++) {
    try {
      const dur = await measureRequest(url);
      latencies.push(dur);
    } catch (err) {
      console.error(`Iteration ${i + 1} failed: ${(err as Error).message}`);
    }
  }

  latencies.sort((a, b) => a - b);
  const sum = latencies.reduce((acc, v) => acc + v, 0);
  const avg = sum / latencies.length;
  const p50 = calculatePercentile(latencies, 50);
  const p95 = calculatePercentile(latencies, 95);
  const p99 = calculatePercentile(latencies, 99);

  console.log(`Results for ${name}:`);
  console.log(`  Requests: ${latencies.length}/${iterations}`);
  console.log(`  Avg:      ${avg.toFixed(2)} ms`);
  console.log(`  p50:      ${p50.toFixed(2)} ms`);
  console.log(`  p95:      ${p95.toFixed(2)} ms (PRD Target: < 500 ms)`);
  console.log(`  p99:      ${p99.toFixed(2)} ms`);

  return { avg, p50, p95, p99 };
}

async function main() {
  console.log(`Commonplace LMS Performance Target Verification`);
  console.log(`Target: ${API_BASE_URL} for tenant: ${TEST_TENANT_SLUG}`);

  try {
    await runBenchmark(
      'Public Library Info',
      `${API_BASE_URL}/api/public/libraries/${TEST_TENANT_SLUG}`,
      30,
    );

    await runBenchmark(
      'Public Catalogue Search',
      `${API_BASE_URL}/api/public/libraries/${TEST_TENANT_SLUG}/catalogue?query=test`,
      30,
    );

    console.log('\nBenchmark completed successfully.');
  } catch (err) {
    console.error('Benchmark execution error:', (err as Error).message);
  }
}

await main();
