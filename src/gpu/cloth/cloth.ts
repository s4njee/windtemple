import { createShader, withChunks } from '../shader.ts';
import { createUniformBuffer, defineUniformStruct } from '../uniforms.ts';
import { airVelocity, type Air } from '../wind/air.ts';
import shader from './cloth.wgsl';

// Stories 2.2 and 2.3: XPBD cloth with the air's force on every cell, on the GPU (cloth.wgsl, one
// workgroup and one dispatch a frame, positions in shared memory) and as a CPU twin that solves the
// same constraints in the same order, for the tests.

export const ClothParams = defineUniformStruct('ClothParams', {
  nx: 'u32',
  ny: 'u32',
  substeps: 'u32',
  dt: 'f32',
  time: 'f32',
  gravity: 'f32',
  rest_x: 'f32',
  rest_y: 'f32',
  stretch: 'f32',
  shear: 'f32',
  bend: 'f32',
  damping: 'f32',
  rho_air: 'f32',
  cn: 'f32',
  ct: 'f32',
  air_dir: 'vec3f',
  air_speed: 'f32',
  air_height: 'f32',
  air_roughness: 'f32',
  air_gust: 'f32',
  air_scale: 'f32',
  air_turbulence: 'f32',
  air_veer: 'f32',
});

/** Floats per particle: position and inverse mass, velocity, previous position, force. */
export const PARTICLE_FLOATS = 16;

export interface Fabric {
  /** Mass per area, kg/m^2. */
  density: number;
  /** Compliances, m/N: 0 is rigid. */
  stretch: number;
  shear: number;
  bend: number;
  /** Velocity lost per second to the fabric itself (the air's drag is separate). */
  damping: number;
  /** Pressure coefficient across a cell, and friction along it. */
  cn: number;
  ct: number;
}

/** Light polyester bunting, a flag's cloth. */
export const COTTON: Fabric = {
  density: 0.15,
  stretch: 1e-7,
  shear: 2e-6,
  bend: 2e-3,
  damping: 0.05,
  cn: 1.1,
  ct: 0.02,
};

export interface ClothOptions {
  /** Particles across and down. nx * ny is at most MAX_PARTICLES: one workgroup solves it. */
  nx: number;
  ny: number;
  /** Size of the cloth at rest, m. */
  width: number;
  height: number;
  /** Where particle (0, 0) starts, and the unit directions of i and j. */
  origin: readonly [number, number, number];
  across: readonly [number, number, number];
  down: readonly [number, number, number];
  fabric: Fabric;
  /** Which particles are held where they start. */
  pinned: (i: number, j: number) => boolean;
  /** Each particle's mass as a multiple of its share of the fabric: a weighted hem. Default 1. */
  weight?: (i: number, j: number) => number;
  /**
   * Substep length, s. Default 1/960: at 1/480 a banner in an 8 m/s gust stretched 13% (one
   * constraint pass a substep), at 1/960 2%.
   */
  substep?: number;
  /** Most substeps in one frame. Default 96 (a tenth of a second). */
  maxSubsteps?: number;
  gravity?: number;
  /** Air density, kg/m^3; 0 switches the air off. */
  rhoAir?: number;
}

function initialState(o: ClothOptions): Float32Array {
  const data = new Float32Array(o.nx * o.ny * PARTICLE_FLOATS);
  const dx = o.width / (o.nx - 1);
  const dy = o.height / (o.ny - 1);
  const mass = o.fabric.density * dx * dy;
  for (let j = 0; j < o.ny; j++) {
    for (let i = 0; i < o.nx; i++) {
      const k = (j * o.nx + i) * PARTICLE_FLOATS;
      for (let c = 0; c < 3; c++) {
        const p = o.origin[c]! + o.across[c]! * i * dx + o.down[c]! * j * dy;
        data[k + c] = p;
        data[k + 8 + c] = p;
      }
      data[k + 3] = o.pinned(i, j) ? 0 : 1 / (mass * (o.weight?.(i, j) ?? 1));
      data[k + 11] = data[k + 3]!;
    }
  }
  return data;
}

function uniformValues(o: ClothOptions, substeps: number, time: number, air: Air) {
  return {
    nx: o.nx,
    ny: o.ny,
    substeps,
    dt: o.substep ?? 1 / 960,
    time,
    gravity: o.gravity ?? 9.81,
    rest_x: o.width / (o.nx - 1),
    rest_y: o.height / (o.ny - 1),
    stretch: o.fabric.stretch,
    shear: o.fabric.shear,
    bend: o.fabric.bend,
    damping: o.fabric.damping,
    rho_air: o.rhoAir ?? 1.2,
    cn: o.fabric.cn,
    ct: o.fabric.ct,
    air_dir: [air.dir[0], 0, air.dir[1]] as [number, number, number],
    air_speed: air.speed,
    air_height: air.height,
    air_roughness: air.roughness,
    air_gust: air.gust,
    air_scale: air.scale,
    air_turbulence: air.turbulence,
    air_veer: air.veer,
  };
}

export interface Cloth {
  readonly options: ClothOptions;
  /** The particles, PARTICLE_FLOATS floats each: bind as read-only storage to draw. */
  readonly buffer: GPUBuffer;
  /** The cloth's own clock, s: the time of the next substep. */
  readonly clock: number;
  /**
   * Advances by `delta` seconds of whole substeps (the rest carries to the next frame) in one
   * compute pass. `air.time` is ignored: the air is sampled at the cloth's own clock.
   */
  step(
    encoder: GPUCommandEncoder,
    delta: number,
    air: Air,
    timestampWrites?: GPUComputePassTimestampWrites,
  ): void;
  /**
   * Runs `seconds` in its own submissions, a tenth of a second each, in `air`: to settle the cloth
   * before its first frame or before a held one. The clock does not move.
   */
  settle(seconds: number, air: Air): void;
  /** Back to the starting state. */
  reset(): void;
  destroy(): void;
}

/** The most particles one cloth may have: its positions fill one workgroup's 16 KiB. */
export const MAX_PARTICLES = 1024;

export function createCloth(device: GPUDevice, options: ClothOptions): Cloth {
  const count = options.nx * options.ny;
  if (count > MAX_PARTICLES)
    throw new RangeError(`a cloth is at most ${MAX_PARTICLES} particles, not ${count}`);
  const substep = options.substep ?? 1 / 960;
  const maxSubsteps = options.maxSubsteps ?? 96;
  const buffer = device.createBuffer({
    label: 'cloth particles',
    size: count * PARTICLE_FLOATS * 4,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
  });
  const start = initialState(options);
  device.queue.writeBuffer(buffer, 0, start);
  const uniforms = createUniformBuffer(device, ClothParams, 'cloth params');
  const module = createShader(
    device,
    withChunks(shader, { 'cloth-params.wgsl': ClothParams.wgsl }),
  );
  const pipeline = device.createComputePipeline({
    label: 'cloth step',
    layout: 'auto',
    compute: { module, entryPoint: 'cloth_step' },
  });
  const cells = device.createBuffer({
    label: 'cloth cells',
    size: (options.nx - 1) * (options.ny - 1) * 32,
    usage: GPUBufferUsage.STORAGE,
  });
  const group = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: uniforms.buffer } },
      { binding: 1, resource: { buffer } },
      { binding: 2, resource: { buffer: cells } },
    ],
  });
  let clock = 0;
  let owed = 0;

  const encodeSteps = (
    encoder: GPUCommandEncoder,
    substeps: number,
    time: number,
    air: Air,
    timestampWrites?: GPUComputePassTimestampWrites,
  ) => {
    uniforms.set(uniformValues(options, substeps, time, air));
    uniforms.upload();
    const pass = encoder.beginComputePass({ label: 'cloth step', timestampWrites });
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, group);
    pass.dispatchWorkgroups(1);
    pass.end();
  };

  return {
    options,
    buffer,
    get clock() {
      return clock;
    },
    step(encoder, delta, air, timestampWrites) {
      owed += Math.max(0, delta);
      const whole = Math.floor(owed / substep + 1e-6);
      owed -= whole * substep;
      const substeps = Math.min(whole, maxSubsteps);
      if (substeps === 0) return;
      encodeSteps(encoder, substeps, clock, air, timestampWrites);
      clock += substeps * substep;
    },
    settle(seconds, air) {
      const rounds = Math.ceil(seconds / (maxSubsteps * substep));
      for (let r = 0; r < rounds; r++) {
        const encoder = device.createCommandEncoder({ label: 'cloth settle' });
        encodeSteps(encoder, maxSubsteps, air.time + r * maxSubsteps * substep, air);
        device.queue.submit([encoder.finish()]);
      }
    },
    reset() {
      device.queue.writeBuffer(buffer, 0, start);
      clock = 0;
      owed = 0;
    },
    destroy() {
      buffer.destroy();
      cells.destroy();
      uniforms.destroy();
    },
  };
}

/** The same cloth on the CPU, constraint for constraint in the shader's order. */
export class ClothModel {
  readonly p: Float32Array;
  clock = 0;
  private owed = 0;

  constructor(readonly options: ClothOptions) {
    this.p = initialState(options);
  }

  step(delta: number, air: Air): void {
    const substep = this.options.substep ?? 1 / 960;
    this.owed += Math.max(0, delta);
    const whole = Math.floor(this.owed / substep + 1e-6);
    this.owed -= whole * substep;
    const n = Math.min(whole, this.options.maxSubsteps ?? 96);
    if (n === 0) return;
    // The wind at each cell's centre, once for the frame, as the shader samples it.
    const { nx, ny } = this.options;
    const winds: [number, number, number][] = [];
    const a: Air = { ...air, time: this.clock };
    for (let j = 0; j + 1 < ny; j++)
      for (let i = 0; i + 1 < nx; i++) {
        const centre = [0, 0, 0];
        for (const [di, dj] of [
          [0, 0],
          [1, 0],
          [0, 1],
          [1, 1],
        ] as const)
          for (let c = 0; c < 3; c++)
            centre[c]! += 0.25 * this.p[((j + dj) * nx + i + di) * PARTICLE_FLOATS + c]!;
        winds.push(airVelocity(centre[0]!, centre[1]!, centre[2]!, a));
      }
    for (let s = 0; s < n; s++) this.substep(winds, air);
    this.clock += n * substep;
  }

  /** One substep in the frame's winds, one a cell. */
  private substep(winds: readonly (readonly [number, number, number])[], air: Air): void {
    const o = this.options;
    const u = uniformValues(o, 1, this.clock, air);
    const { nx, ny } = o;
    const p = this.p;
    const dt = u.dt;
    const dt2 = dt * dt;
    const at = (i: number, j: number) => (j * nx + i) * PARTICLE_FLOATS;
    const cellForce = (i: number, j: number): [number, number, number] => {
      const k = [at(i, j), at(i + 1, j), at(i, j + 1), at(i + 1, j + 1)];
      const moving = [0, 0, 0];
      for (const q of k) for (let c = 0; c < 3; c++) moving[c]! += 0.25 * p[q + 4 + c]!;
      const e = [0, 1, 2].map((c) => p[k[3]! + c]! - p[k[0]! + c]!);
      const g = [0, 1, 2].map((c) => p[k[2]! + c]! - p[k[1]! + c]!);
      const normal = [
        0.5 * (e[1]! * g[2]! - e[2]! * g[1]!),
        0.5 * (e[2]! * g[0]! - e[0]! * g[2]!),
        0.5 * (e[0]! * g[1]! - e[1]! * g[0]!),
      ];
      const area = Math.hypot(normal[0]!, normal[1]!, normal[2]!);
      if (area < 1e-12) return [0, 0, 0];
      const n = normal.map((v) => v / area);
      const wind = winds[j * (nx - 1) + i]!;
      const rel = wind.map((v, c) => v - moving[c]!);
      const across = rel[0]! * n[0]! + rel[1]! * n[1]! + rel[2]! * n[2]!;
      const speed = Math.hypot(rel[0]!, rel[1]!, rel[2]!);
      const f = 0.5 * u.rho_air * area;
      return [0, 1, 2].map(
        (c) =>
          f *
          (u.cn * across * Math.abs(across) * n[c]! + u.ct * speed * (rel[c]! - across * n[c]!)),
      ) as [number, number, number];
    };

    const count = nx * ny;
    const forces = new Float32Array(count * 3);
    if (u.rho_air > 0) {
      const cell: [number, number, number][] = [];
      for (let j = 0; j + 1 < ny; j++) for (let i = 0; i + 1 < nx; i++) cell.push(cellForce(i, j));
      const cx = nx - 1;
      for (let j = 0; j < ny; j++)
        for (let i = 0; i < nx; i++) {
          const k = j * nx + i;
          const add = (f: [number, number, number]) => {
            for (let c = 0; c < 3; c++) forces[k * 3 + c]! += 0.25 * f[c]!;
          };
          if (i > 0 && j > 0) add(cell[(j - 1) * cx + i - 1]!);
          if (i + 1 < nx && j > 0) add(cell[(j - 1) * cx + i]!);
          if (i > 0 && j + 1 < ny) add(cell[j * cx + i - 1]!);
          if (i + 1 < nx && j + 1 < ny) add(cell[j * cx + i]!);
        }
    }
    for (let k = 0; k < count; k++) {
      const q = k * PARTICLE_FLOATS;
      const w = p[q + 3]!;
      if (!(w > 0)) continue;
      for (let c = 0; c < 3; c++) {
        const gravity = c === 1 ? -u.gravity : 0;
        const v = p[q + 4 + c]! * (1 - u.damping * dt) + dt * (gravity + forces[k * 3 + c]! * w);
        p[q + 4 + c] = v;
        p[q + 8 + c] = p[q + c]!;
        p[q + c] = p[q + c]! + dt * v;
      }
    }

    const solve = (a: number, b: number, rest: number, alpha: number) => {
      const wa = p[a + 3]!;
      const wb = p[b + 3]!;
      const w = wa + wb;
      if (!(w > 0)) return;
      const d = [p[a]! - p[b]!, p[a + 1]! - p[b + 1]!, p[a + 2]! - p[b + 2]!];
      const len = Math.hypot(d[0]!, d[1]!, d[2]!);
      if (len < 1e-9) return;
      const dl = -(len - rest) / (w + alpha);
      for (let c = 0; c < 3; c++) {
        const n = d[c]! / len;
        p[a + c] = p[a + c]! + wa * dl * n;
        p[b + c] = p[b + c]! - wb * dl * n;
      }
    };
    const diag = Math.hypot(u.rest_x, u.rest_y);
    for (let family = 0; family < 6; family++) {
      for (let parity = 0; parity < 2; parity++) {
        if (family === 0)
          for (let j = 0; j < ny; j++)
            for (let i = parity; i + 1 < nx; i += 2)
              solve(at(i, j), at(i + 1, j), u.rest_x, u.stretch / dt2);
        if (family === 1)
          for (let i = 0; i < nx; i++)
            for (let j = parity; j + 1 < ny; j += 2)
              solve(at(i, j), at(i, j + 1), u.rest_y, u.stretch / dt2);
        if (family === 2)
          for (let j = 0; j + 1 < ny; j++)
            for (let i = parity; i + 1 < nx; i += 2)
              solve(at(i, j), at(i + 1, j + 1), diag, u.shear / dt2);
        if (family === 3)
          for (let j = 0; j + 1 < ny; j++)
            for (let i = parity; i + 1 < nx; i += 2)
              solve(at(i + 1, j), at(i, j + 1), diag, u.shear / dt2);
        if (family === 4)
          for (let j = 0; j < ny; j++)
            for (let i = 0; i + 2 < nx; i++)
              if (Math.floor(i / 2) % 2 === parity)
                solve(at(i, j), at(i + 2, j), 2 * u.rest_x, u.bend / dt2);
        if (family === 5)
          for (let i = 0; i < nx; i++)
            for (let j = 0; j + 2 < ny; j++)
              if (Math.floor(j / 2) % 2 === parity)
                solve(at(i, j), at(i, j + 2), 2 * u.rest_y, u.bend / dt2);
      }
    }
    for (let k = 0; k < count; k++) {
      const q = k * PARTICLE_FLOATS;
      if (!(p[q + 3]! > 0)) continue;
      for (let c = 0; c < 3; c++) p[q + 4 + c] = (p[q + c]! - p[q + 8 + c]!) / dt;
    }
  }

  /** Kinetic plus gravitational energy, J. */
  energy(): number {
    const o = this.options;
    let e = 0;
    for (let k = 0; k < o.nx * o.ny; k++) {
      const q = k * PARTICLE_FLOATS;
      if (!(this.p[q + 3]! > 0)) continue;
      const mass = 1 / this.p[q + 3]!;
      const v2 = this.p[q + 4]! ** 2 + this.p[q + 5]! ** 2 + this.p[q + 6]! ** 2;
      e += mass * (0.5 * v2 + (o.gravity ?? 9.81) * this.p[q + 1]!);
    }
    return e;
  }
}
