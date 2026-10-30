// Story 1.6: what this family leans on beyond Fire Temple's and Earth Temple's support matrices,
// probed in headless Chrome on this machine's GPU from the dev server (WebGPU needs a secure
// context). Writes docs/studies/support-probe.json.
//
//   node experiments/support-probe.mjs [--base http://localhost:5510]

import { writeFileSync } from 'node:fs';
import { launchChrome, sleep } from '../scripts/chrome.mjs';

const args = process.argv.slice(2);
const base = (
  args.includes('--base') ? args[args.indexOf('--base') + 1] : 'http://localhost:5510'
).replace(/\/$/, '');

const PROBE = `(async () => {
  const adapter = await navigator.gpu.requestAdapter({ powerPreference: 'high-performance' });
  const features = ['float32-filterable', 'timestamp-query', 'shader-f16', 'subgroups'];
  const has = Object.fromEntries(features.map((f) => [f, adapter.features.has(f)]));
  const limits = {};
  for (const key of ['maxComputeWorkgroupStorageSize', 'maxComputeInvocationsPerWorkgroup', 'maxComputeWorkgroupSizeX', 'maxStorageBufferBindingSize', 'maxStorageBuffersPerShaderStage'])
    limits[key] = adapter.limits[key];
  const device = await adapter.requestDevice({
    requiredFeatures: features.filter((f) => adapter.features.has(f) && f !== 'subgroups'),
  });
  const errors = [];
  device.onuncapturederror = (e) => errors.push(e.error.message);
  const storage = (size) => device.createBuffer({ size, usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST | GPUBufferUsage.INDIRECT });
  const readBack = async (buffer, size) => {
    const read = device.createBuffer({ size, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
    const e = device.createCommandEncoder();
    e.copyBufferToBuffer(buffer, 0, read, 0, size);
    device.queue.submit([e.finish()]);
    await read.mapAsync(GPUMapMode.READ);
    const out = new Uint32Array(read.getMappedRange().slice(0));
    read.unmap();
    return out;
  };

  // 1. A full 16 KiB workgroup array, as the cloth solver keeps its positions, filled and summed.
  const shared = device.createShaderModule({ code: \`
    var<workgroup> X: array<vec4f, 1024>;
    @group(0) @binding(0) var<storage, read_write> out: array<u32, 4>;
    @compute @workgroup_size(256) fn main(@builtin(local_invocation_index) t: u32) {
      for (var k = t; k < 1024u; k += 256u) { X[k] = vec4f(f32(k)); }
      workgroupBarrier();
      if (t == 0u) { var s = 0.0; for (var k = 0u; k < 1024u; k++) { s += X[k].x; } out[0] = u32(s); }
    }\` });
  const sharedOut = storage(16);
  {
    const p = device.createComputePipeline({ layout: 'auto', compute: { module: shared, entryPoint: 'main' } });
    const e = device.createCommandEncoder();
    const pass = e.beginComputePass();
    pass.setPipeline(p);
    pass.setBindGroup(0, device.createBindGroup({ layout: p.getBindGroupLayout(0), entries: [{ binding: 0, resource: { buffer: sharedOut } }] }));
    pass.dispatchWorkgroups(1);
    pass.end();
    device.queue.submit([e.finish()]);
  }
  const sharedSum = (await readBack(sharedOut, 16))[0];

  // 2. Indirect dispatch from counts a compute pass wrote, and 3. fixed-point float sums by u32
  // atomics: 4096 invocations each add 0.001 in 1/65536 units.
  const code = \`
    @group(0) @binding(0) var<storage, read_write> args: array<u32, 3>;
    @group(0) @binding(1) var<storage, read_write> sum: array<atomic<u32>, 1>;
    @compute @workgroup_size(1) fn write_args() { args[0] = 64u; args[1] = 1u; args[2] = 1u; }\`;
  const module = device.createShaderModule({ code });
  // The adder must not bind the arguments buffer at all: bound as storage in the pass that reads
  // it as indirect arguments, it is the same conflict.
  const addModule = device.createShaderModule({ code: \`
    @group(0) @binding(0) var<storage, read_write> sum: array<atomic<u32>, 1>;
    @compute @workgroup_size(64) fn add() { atomicAdd(&sum[0], u32(round(0.001 * 65536.0))); }\` });
  const args = storage(16);
  const sum = storage(16);
  {
    const layout = device.createBindGroupLayout({ entries: [0, 1].map((binding) => ({ binding, visibility: GPUShaderStage.COMPUTE, buffer: { type: 'storage' } })) });
    const pl = device.createPipelineLayout({ bindGroupLayouts: [layout] });
    const group = device.createBindGroup({ layout, entries: [{ binding: 0, resource: { buffer: args } }, { binding: 1, resource: { buffer: sum } }] });
    const writer = device.createComputePipeline({ layout: pl, compute: { module, entryPoint: 'write_args' } });
    const adder = device.createComputePipeline({ layout: 'auto', compute: { module: addModule, entryPoint: 'add' } });
    const addGroup = device.createBindGroup({ layout: adder.getBindGroupLayout(0), entries: [{ binding: 0, resource: { buffer: sum } }] });
    // In one pass this is a validation error: a buffer written as storage cannot be read as
    // indirect arguments in the same synchronization scope. The counts are written in a pass of
    // their own.
    const e = device.createCommandEncoder();
    const first = e.beginComputePass();
    first.setBindGroup(0, group);
    first.setPipeline(writer);
    first.dispatchWorkgroups(1);
    first.end();
    const second = e.beginComputePass();
    second.setBindGroup(0, addGroup);
    second.setPipeline(adder);
    second.dispatchWorkgroupsIndirect(args, 0);
    second.end();
    device.queue.submit([e.finish()]);
  }
  const fixed = (await readBack(sum, 16))[0];

  // 4. What a dispatch costs: one trivial dispatch in a compute pass against 240 of them (a
  // dispatch per constraint colour per substep, 15 phases x 16 substeps), timed with timestamps
  // written by the compute pass itself.
  let dispatch = null;
  if (has['timestamp-query']) {
    const tiny = device.createShaderModule({ code: \`
      @group(0) @binding(0) var<storage, read_write> b: array<f32, 256>;
      @compute @workgroup_size(256) fn main(@builtin(local_invocation_index) t: u32) { b[t] = b[t] * 0.5 + 1.0; }\` });
    const p = device.createComputePipeline({ layout: 'auto', compute: { module: tiny, entryPoint: 'main' } });
    const buf = storage(1024);
    const group = device.createBindGroup({ layout: p.getBindGroupLayout(0), entries: [{ binding: 0, resource: { buffer: buf } }] });
    const query = device.createQuerySet({ type: 'timestamp', count: 2 });
    const resolve = device.createBuffer({ size: 16, usage: GPUBufferUsage.QUERY_RESOLVE | GPUBufferUsage.COPY_SRC });
    const time = async (n) => {
      const runs = [];
      for (let r = 0; r < 12; r++) {
        const e = device.createCommandEncoder();
        const pass = e.beginComputePass({ timestampWrites: { querySet: query, beginningOfPassWriteIndex: 0, endOfPassWriteIndex: 1 } });
        pass.setPipeline(p);
        pass.setBindGroup(0, group);
        for (let k = 0; k < n; k++) pass.dispatchWorkgroups(1);
        pass.end();
        e.resolveQuerySet(query, 0, 2, resolve, 0);
        device.queue.submit([e.finish()]);
        const read = device.createBuffer({ size: 16, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ });
        const c = device.createCommandEncoder();
        c.copyBufferToBuffer(resolve, 0, read, 0, 16);
        device.queue.submit([c.finish()]);
        await read.mapAsync(GPUMapMode.READ);
        const [a, b] = new BigUint64Array(read.getMappedRange());
        runs.push(Number(b - a) / 1e6);
        read.unmap();
      }
      runs.sort((x, y) => x - y);
      return runs[6];
    };
    const one = await time(1);
    const many = await time(240);
    dispatch = { oneMs: one, manyMs: many, perDispatchUs: ((many - one) / 239) * 1000 };
  }
  await device.queue.onSubmittedWorkDone();
  const info = adapter.info ?? {};
  return JSON.stringify({
    userAgent: navigator.userAgent,
    adapter: { vendor: info.vendor, architecture: info.architecture, description: info.description },
    features: has,
    limits,
    sharedArray: { expected: 523776, got: sharedSum },
    indirectAndFixedPoint: { expected: 4096 * Math.round(0.001 * 65536), got: fixed },
    dispatch,
    errors,
  });
})()`;

const chrome = await launchChrome();
try {
  await chrome.page('Page.navigate', { url: `${base}/` });
  await sleep(1500);
  const result = JSON.parse(await chrome.evaluate(PROBE));
  console.log(JSON.stringify(result, null, 2));
  writeFileSync('docs/studies/support-probe.json', JSON.stringify(result, null, 2) + '\n');
} finally {
  chrome.close();
}
