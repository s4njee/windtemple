#include "air.wgsl"
#include "cloth-params.wgsl"

// cloth.wgsl -- XPBD cloth in one workgroup (stories 2.2 and 2.3). Twin of ClothModel in cloth.ts.
//
// A grid of particles, nx across and ny down, solved by extended position-based dynamics
// (Macklin, Mueller and Chentanez) in small steps (Macklin et al.): each substep predicts every
// particle under gravity and the air's force, solves each constraint once, and takes the
// velocity from the move. Stiffness is a compliance, so it does not depend on the step.
//
// The whole frame is one dispatch of one workgroup: every substep runs inside it, with a storage
// barrier between phases. A page's cloth is small (a banner is under a thousand particles), and a
// dispatch per constraint colour per substep would be hundreds of dispatches a frame.
//
// Constraints are distances on the grid, coloured so that no two in a colour share a particle,
// which lets a colour be solved in parallel and the colours in turn (Gauss-Seidel):
//   0, 1  stretch across and down, by parity of the column or row;
//   2, 3  shear along both diagonals, by parity of the column;
//   4, 5  bending as distances across two cells, by parity of the column (or row) halved.
//
// The air pushes on each cell of the grid as a flat plate: pressure along the cell's normal, from
// the wind relative to the cloth, that grows with the square of that speed, and a weak friction
// along the face. Nothing else moves the cloth; any flapping comes from the cloth and the air.
// The wind itself is sampled once a frame at each cell's centre: it varies over metres and
// seconds, and sampling it every substep was most of the solver's cost. The cloth's own motion,
// which the pressure depends on as much, is taken every substep.

struct Particle {
  /** Position, m, and inverse mass (0 for a pinned particle). */
  x: vec4f,
  v: vec4f,
  prev: vec4f,
  /** The air's force this substep, N. */
  f: vec4f,
}

@group(0) @binding(0) var<uniform> C: ClothParams;
@group(0) @binding(1) var<storage, read_write> P: array<Particle>;
/** Per cell: the wind at its centre this frame, and the air's force on it this substep. */
@group(0) @binding(2) var<storage, read_write> cells: array<Cell>;

struct Cell {
  wind: vec4f,
  force: vec4f,
}

/**
 * Positions and inverse masses, in shared memory for the whole frame: the twelve constraint
 * phases of each substep touch nothing else, so they never wait on device memory. 1024 of them
 * is exactly the default 16 KiB a workgroup may have, so a cloth here is at most 1024 particles.
 */
const MAX_PARTICLES: u32 = 1024u;
const PER_THREAD: u32 = MAX_PARTICLES / 256u;
var<workgroup> X: array<vec4f, MAX_PARTICLES>;

const THREADS: u32 = 256u;

fn at(i: u32, j: u32) -> u32 {
  return j * C.nx + i;
}

fn air_now(t: f32) -> Air {
  return Air(C.air_dir, C.air_speed, C.air_height, C.air_roughness, C.air_gust, C.air_scale, C.air_turbulence, C.air_veer, t);
}

fn cell_centre(i: u32, j: u32) -> vec3f {
  return 0.25 * (X[at(i, j)].xyz + X[at(i + 1u, j)].xyz + X[at(i, j + 1u)].xyz + X[at(i + 1u, j + 1u)].xyz);
}

/** The air's force on the cell with corners (i, j) and (i + 1, j + 1), in a wind `wind`. */
fn cell_force(i: u32, j: u32, wind: vec3f) -> vec3f {
  let moving = 0.25 * (P[at(i, j)].v.xyz + P[at(i + 1u, j)].v.xyz + P[at(i, j + 1u)].v.xyz + P[at(i + 1u, j + 1u)].v.xyz);
  // Half the cross product of the diagonals: the cell's area along its normal.
  let normal = 0.5 * cross(X[at(i + 1u, j + 1u)].xyz - X[at(i, j)].xyz, X[at(i, j + 1u)].xyz - X[at(i + 1u, j)].xyz);
  let area = length(normal);
  if (area < 1e-12) {
    return vec3f(0.0);
  }
  let n = normal / area;
  let rel = wind - moving;
  let across = dot(rel, n);
  let along = rel - across * n;
  return 0.5 * C.rho_air * area * (C.cn * across * abs(across) * n + C.ct * length(rel) * along);
}

fn solve(a: u32, b: u32, rest: f32, alpha: f32) {
  let pa = X[a];
  let pb = X[b];
  let w = pa.w + pb.w;
  if (w <= 0.0) {
    return;
  }
  let d = pa.xyz - pb.xyz;
  let len = length(d);
  if (len < 1e-9) {
    return;
  }
  let n = d / len;
  let dl = -(len - rest) / (w + alpha);
  X[a] = vec4f(pa.xyz + pa.w * dl * n, pa.w);
  X[b] = vec4f(pb.xyz - pb.w * dl * n, pb.w);
}

/** One colour of one family of constraints, shared among the workgroup. */
fn solve_colour(family: u32, parity: u32, tid: u32, dt2: f32) {
  let nx = C.nx;
  let ny = C.ny;
  var per = 0u;
  var lines = 0u;
  switch family {
    case 0u: { per = (nx - parity) / 2u; lines = ny; }
    case 1u: { per = (ny - parity) / 2u; lines = nx; }
    case 2u, 3u: { per = (nx - parity) / 2u; lines = ny - 1u; }
    case 4u: { per = 2u * ((nx + 3u) / 4u); lines = ny; }
    default: { per = 2u * ((ny + 3u) / 4u); lines = nx; }
  }
  let diag = sqrt(C.rest_x * C.rest_x + C.rest_y * C.rest_y);
  for (var k = tid; k < per * lines; k += THREADS) {
    let line = k / per;
    let m = k % per;
    switch family {
      case 0u: {
        let i = parity + 2u * m;
        solve(at(i, line), at(i + 1u, line), C.rest_x, C.stretch / dt2);
      }
      case 1u: {
        let j = parity + 2u * m;
        solve(at(line, j), at(line, j + 1u), C.rest_y, C.stretch / dt2);
      }
      case 2u: {
        let i = parity + 2u * m;
        solve(at(i, line), at(i + 1u, line + 1u), diag, C.shear / dt2);
      }
      case 3u: {
        let i = parity + 2u * m;
        solve(at(i + 1u, line), at(i, line + 1u), diag, C.shear / dt2);
      }
      case 4u: {
        let i = 4u * (m / 2u) + 2u * parity + m % 2u;
        if (i + 2u < nx) {
          solve(at(i, line), at(i + 2u, line), 2.0 * C.rest_x, C.bend / dt2);
        }
      }
      default: {
        let j = 4u * (m / 2u) + 2u * parity + m % 2u;
        if (j + 2u < ny) {
          solve(at(line, j), at(line, j + 2u), 2.0 * C.rest_y, C.bend / dt2);
        }
      }
    }
  }
}

@compute @workgroup_size(256) fn cloth_step(@builtin(local_invocation_index) tid: u32) {
  let count = C.nx * C.ny;
  let dt = C.dt;
  let dt2 = dt * dt;
  let cx = C.nx - 1u;
  let cell_count = cx * (C.ny - 1u);
  // Each thread owns particles tid, tid + 256, ...: their previous positions and velocities stay in
  // its registers; the velocities also go to device memory, where the cells read them.
  var prev: array<vec3f, PER_THREAD>;
  var vel: array<vec3f, PER_THREAD>;
  for (var n = 0u; n < PER_THREAD; n++) {
    let k = tid + n * THREADS;
    if (k < count) {
      X[k] = P[k].x;
      vel[n] = P[k].v.xyz;
    }
  }
  workgroupBarrier();
  let air = air_now(C.time);
  for (var k = tid; k < cell_count; k += THREADS) {
    cells[k].wind = vec4f(air_velocity(cell_centre(k % cx, k / cx), air), 0.0);
  }
  for (var s = 0u; s < C.substeps; s++) {
    for (var k = tid; k < cell_count; k += THREADS) {
      var f = vec3f(0.0);
      if (C.rho_air > 0.0) {
        f = cell_force(k % cx, k / cx, cells[k].wind.xyz);
      }
      cells[k].force = vec4f(f, 0.0);
    }
    storageBarrier();
    // Predict: gravity and a quarter of the air's force on each cell a particle is a corner of.
    for (var n = 0u; n < PER_THREAD; n++) {
      let k = tid + n * THREADS;
      if (k < count && X[k].w > 0.0) {
        let i = k % C.nx;
        let j = k / C.nx;
        var f = vec3f(0.0);
        if (i > 0u && j > 0u) { f += cells[(j - 1u) * cx + i - 1u].force.xyz; }
        if (i + 1u < C.nx && j > 0u) { f += cells[(j - 1u) * cx + i].force.xyz; }
        if (i > 0u && j + 1u < C.ny) { f += cells[j * cx + i - 1u].force.xyz; }
        if (i + 1u < C.nx && j + 1u < C.ny) { f += cells[j * cx + i].force.xyz; }
        let x = X[k];
        let v = vel[n] * (1.0 - C.damping * dt) + dt * (vec3f(0.0, -C.gravity, 0.0) + 0.25 * f * x.w);
        prev[n] = x.xyz;
        X[k] = vec4f(x.xyz + dt * v, x.w);
      }
    }
    workgroupBarrier();
    for (var family = 0u; family < 6u; family++) {
      for (var parity = 0u; parity < 2u; parity++) {
        solve_colour(family, parity, tid, dt2);
        workgroupBarrier();
      }
    }
    for (var n = 0u; n < PER_THREAD; n++) {
      let k = tid + n * THREADS;
      if (k < count && X[k].w > 0.0) {
        vel[n] = (X[k].xyz - prev[n]) / dt;
        P[k].v = vec4f(vel[n], 0.0);
      }
    }
    storageBarrier();
  }
  for (var n = 0u; n < PER_THREAD; n++) {
    let k = tid + n * THREADS;
    if (k < count) {
      P[k].x = X[k];
      if (X[k].w > 0.0 && C.substeps > 0u) {
        P[k].prev = vec4f(prev[n], X[k].w);
      }
    }
  }
}
