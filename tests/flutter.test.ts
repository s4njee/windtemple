import { describe, expect, it } from 'vitest';
import { COTTON, createCloth, PARTICLE_FLOATS, type ClothOptions } from '../src/gpu/cloth/cloth.ts';
import { AIR, type Air } from '../src/gpu/wind/air.ts';
import { getTestDevice } from './gpu.ts';

// Story 2.3: the air's pressure on each cell is all that drives the cloth, so a flag's flapping
// has to come out of it. A flag on a pole in a steady wind, nudged once by a second of turbulence
// and then left: below a critical speed the nudge dies away, above it the flag keeps flapping, at a
// frequency that grows with the wind, in waves that run from the pole to the free edge and grow on
// the way.

const NX = 21;
const NY = 13;
const FLAG: ClothOptions = {
  nx: NX,
  ny: NY,
  width: 1,
  height: 0.6,
  origin: [0, 3, 0],
  across: [1, 0, 0],
  down: [0, -1, 0],
  fabric: COTTON,
  pinned: (i) => i === 0,
};
/** Along the middle row, 0.3, 0.5, 0.7 and 0.9 of the way from the pole. */
const STATIONS = [6, 10, 14, 18];
const FPS = 60;

interface Run {
  /** Sideways (z) position at each station, a frame at a time, after a two-second settle. */
  z: number[][];
  /** Largest particle speed at the end, m/s. */
  fastest: number;
}

async function fly(speed: number, seconds = 10): Promise<Run> {
  const device = await getTestDevice();
  const steady: Air = { ...AIR, speed, gust: 0, turbulence: 0, veer: 0 };
  const cloth = createCloth(device, FLAG);
  const read = device.createBuffer({
    size: cloth.buffer.size,
    usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
  });
  const z = STATIONS.map(() => [] as number[]);
  let p = new Float32Array(0);
  for (let frame = 0; frame < seconds * FPS; frame++) {
    const encoder = device.createCommandEncoder();
    // The nudge: one second of turbulence, then a perfectly steady wind.
    cloth.step(
      encoder,
      1 / FPS,
      frame < FPS ? { ...steady, turbulence: speed > 0 ? 0.1 : 0 } : steady,
    );
    if (frame >= 2 * FPS) encoder.copyBufferToBuffer(cloth.buffer, 0, read, 0, cloth.buffer.size);
    device.queue.submit([encoder.finish()]);
    if (frame < 2 * FPS) continue;
    await read.mapAsync(GPUMapMode.READ);
    p = new Float32Array(read.getMappedRange().slice(0));
    read.unmap();
    STATIONS.forEach((i, s) => z[s]!.push(p[((NY >> 1) * NX + i) * PARTICLE_FLOATS + 2]!));
  }
  let fastest = 0;
  for (let k = 0; k < p.length; k += PARTICLE_FLOATS)
    fastest = Math.max(fastest, Math.hypot(p[k + 4]!, p[k + 5]!, p[k + 6]!));
  read.destroy();
  cloth.destroy();
  return { z, fastest };
}

const rms = (s: number[]) => {
  const mean = s.reduce((a, b) => a + b, 0) / s.length;
  return Math.sqrt(s.reduce((a, b) => a + (b - mean) ** 2, 0) / s.length);
};

/** Flapping frequency, Hz, from mean crossings. */
const frequency = (s: number[]) => {
  const mean = s.reduce((a, b) => a + b, 0) / s.length;
  let crossings = 0;
  for (let i = 1; i < s.length; i++) if ((s[i - 1]! - mean) * (s[i]! - mean) < 0) crossings++;
  return crossings / 2 / (s.length / FPS);
};

/** Phase lag, radians, of the motion at frequency `f`: larger is later. */
const phase = (s: number[], f: number) => {
  let re = 0;
  let im = 0;
  s.forEach((v, t) => {
    re += v * Math.cos((2 * Math.PI * f * t) / FPS);
    im -= v * Math.sin((2 * Math.PI * f * t) / FPS);
  });
  return -Math.atan2(im, re);
};

describe('a flag in a steady wind', () => {
  it('hangs still with no wind', async () => {
    const { z, fastest } = await fly(0, 5);
    expect(fastest).toBeLessThan(1e-3);
    expect(rms(z[3]!)).toBeLessThan(1e-4);
  });

  it('lets a nudge die away below its critical speed', async () => {
    const tip = (await fly(1)).z[3]!;
    const half = tip.length / 2;
    expect(rms(tip.slice(half))).toBeLessThan(0.7 * rms(tip.slice(0, half)));
  });

  it('keeps flapping above it, faster in a stronger wind', async () => {
    const strouhal: number[] = [];
    for (const speed of [4, 8, 12]) {
      const tip = (await fly(speed)).z[3]!;
      const half = tip.length / 2;
      // Sustained: as large in the last four seconds as in the first, and centimetres across.
      expect(rms(tip.slice(half))).toBeGreaterThan(0.7 * rms(tip.slice(0, half)));
      expect(rms(tip)).toBeGreaterThan(0.02);
      // Frequency times length over speed: about constant once the flag is streaming.
      strouhal.push((frequency(tip) * FLAG.width) / speed);
    }
    for (const st of strouhal) {
      expect(st).toBeGreaterThan(0.15);
      expect(st).toBeLessThan(0.35);
    }
    expect(Math.abs(strouhal[2]! / strouhal[1]! - 1)).toBeLessThan(0.15);
  });

  it('flaps in waves that run to the free edge and grow on the way', async () => {
    const { z } = await fly(8);
    const f = frequency(z[3]!);
    const phases = z.map((s) => phase(s, f));
    for (let s = 1; s < phases.length; s++) {
      const step = Math.atan2(
        Math.sin(phases[s]! - phases[s - 1]!),
        Math.cos(phases[s]! - phases[s - 1]!),
      );
      expect(step).toBeGreaterThan(0);
    }
    const sizes = z.map(rms);
    for (let s = 1; s < sizes.length; s++) expect(sizes[s]!).toBeGreaterThan(sizes[s - 1]!);
  });
});
