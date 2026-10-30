import { describe, expect, it } from 'vitest';
import {
  ClothModel,
  COTTON,
  createCloth,
  PARTICLE_FLOATS,
  type ClothOptions,
} from '../src/gpu/cloth/cloth.ts';
import { AIR, type Air } from '../src/gpu/wind/air.ts';
import { getTestDevice } from './gpu.ts';

// Story 2.2: XPBD cloth. The GPU solver does what its CPU twin does; a hanging cloth barely
// stretches; with the air off, energy never grows; the answer settles as the substeps shrink; and
// a run at 15 frames a second stays stable and close to one at 60.

/** A small banner hanging from a rod by rings, every fourth particle along the top. */
const BANNER: ClothOptions = {
  nx: 17,
  ny: 7,
  width: 0.8,
  height: 0.3,
  origin: [-0.4, 2, 0],
  across: [1, 0, 0],
  down: [0, -1, 0],
  fabric: COTTON,
  pinned: (i, j) => j === 0 && i % 4 === 0,
};

const STILL: Air = { ...AIR, speed: 0, gust: 0, turbulence: 0 };

async function readParticles(device: GPUDevice, buffer: GPUBuffer): Promise<Float32Array> {
  const read = device.createBuffer({
    size: buffer.size,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
  });
  const encoder = device.createCommandEncoder();
  encoder.copyBufferToBuffer(buffer, 0, read, 0, buffer.size);
  device.queue.submit([encoder.finish()]);
  await read.mapAsync(GPUMapMode.READ);
  const out = new Float32Array(read.getMappedRange().slice(0));
  read.unmap();
  read.destroy();
  return out;
}

/** The worst stretch of any edge across or down, as a fraction of its rest length. */
function worstStretch(p: Float32Array, o: ClothOptions): number {
  const at = (i: number, j: number) => (j * o.nx + i) * PARTICLE_FLOATS;
  const dist = (a: number, b: number) =>
    Math.hypot(p[a]! - p[b]!, p[a + 1]! - p[b + 1]!, p[a + 2]! - p[b + 2]!);
  const rx = o.width / (o.nx - 1);
  const ry = o.height / (o.ny - 1);
  let worst = 0;
  for (let j = 0; j < o.ny; j++)
    for (let i = 0; i < o.nx; i++) {
      if (i + 1 < o.nx) worst = Math.max(worst, dist(at(i, j), at(i + 1, j)) / rx - 1);
      if (j + 1 < o.ny) worst = Math.max(worst, dist(at(i, j), at(i, j + 1)) / ry - 1);
    }
  return worst;
}

const positionGap = (a: Float32Array, b: Float32Array) => {
  let worst = 0;
  for (let k = 0; k < a.length; k += PARTICLE_FLOATS)
    worst = Math.max(
      worst,
      Math.hypot(a[k]! - b[k]!, a[k + 1]! - b[k + 1]!, a[k + 2]! - b[k + 2]!),
    );
  return worst;
};

describe('XPBD cloth', () => {
  it('solves on the GPU as its CPU twin does, in a gusty wind', async () => {
    const device = await getTestDevice();
    const air: Air = { ...AIR, dir: [0.8, -0.6], speed: 5 };
    const gpu = createCloth(device, BANNER);
    const cpu = new ClothModel(BANNER);
    for (let frame = 0; frame < 30; frame++) {
      const encoder = device.createCommandEncoder();
      gpu.step(encoder, 1 / 60, air);
      device.queue.submit([encoder.finish()]);
      cpu.step(1 / 60, air);
    }
    const p = await readParticles(device, gpu.buffer);
    // Half a second in, the two have moved centimetres and agree to a fraction of a millimetre.
    expect(positionGap(p, cpu.p)).toBeLessThan(5e-4);
    expect(gpu.clock).toBeCloseTo(0.5, 6);
    gpu.destroy();
  });

  it('barely stretches, hanging at rest', () => {
    const cloth = new ClothModel(BANNER);
    for (let k = 0; k < 180; k++) cloth.step(1 / 60, STILL);
    expect(worstStretch(cloth.p, BANNER)).toBeLessThan(0.01);
  });

  it('never gains energy with the air off', () => {
    // Held by one corner, it swings down from horizontal.
    const options: ClothOptions = {
      ...BANNER,
      down: [0, 0, 1],
      pinned: (i, j) => i === 0 && j === 0,
      rhoAir: 0,
      fabric: { ...COTTON, damping: 0 },
    };
    const cloth = new ClothModel(options);
    const start = cloth.energy();
    let worst = -Infinity;
    for (let k = 0; k < 240; k++) {
      cloth.step(1 / 60, STILL);
      worst = Math.max(worst, cloth.energy() - start);
    }
    expect(worst).toBeLessThan(1e-6);
  });

  it('settles on one answer as the substeps shrink', () => {
    const run = (substep: number) => {
      const cloth = new ClothModel({ ...BANNER, substep, maxSubsteps: 1000 });
      for (let k = 0; k < 30; k++) cloth.step(1 / 60, { ...AIR, speed: 4 });
      return cloth.p;
    };
    const fine = run(1 / 3840);
    const gaps = [1 / 240, 1 / 480, 1 / 960, 1 / 1920].map((s) => positionGap(run(s), fine));
    for (let k = 1; k < gaps.length; k++) expect(gaps[k]!).toBeLessThan(gaps[k - 1]!);
  });

  it('stays stable at 15 frames a second', () => {
    const air: Air = { ...AIR, speed: 8 };
    const slow = new ClothModel(BANNER);
    const fast = new ClothModel(BANNER);
    for (let k = 0; k < 30; k++) slow.step(1 / 15, air);
    for (let k = 0; k < 120; k++) fast.step(1 / 60, air);
    expect(slow.p.every(Number.isFinite)).toBe(true);
    expect(worstStretch(slow.p, BANNER)).toBeLessThan(0.05);
    // The same substeps, but the wind is sampled once a frame, so four times less often: close,
    // not the same. The cloth's centre is within a few centimetres of the 60 fps run's.
    const centre = (p: Float32Array) => {
      const c = [0, 0, 0];
      for (let k = 0; k < p.length; k += PARTICLE_FLOATS)
        for (let i = 0; i < 3; i++) c[i]! += p[k + i]! / (p.length / PARTICLE_FLOATS);
      return c;
    };
    const [a, b] = [centre(slow.p), centre(fast.p)];
    expect(Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!, a[2]! - b[2]!)).toBeLessThan(0.05);
  });
});
