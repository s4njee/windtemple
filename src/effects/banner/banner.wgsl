#include "banner-params.wgsl"

// Story 3.1: a banner hanging from a rod by rings, drawn from the cloth's particles (vertex
// pulling, cloth.wgsl's layout) with its print, and the rod.
//
// The cloth is lit from both sides. Its front carries the print, a text line drawn into a distance
// field once; its back shows the print through, faintly. Sunlight comes through the fabric from
// behind, tinted by its dye and blocked by the ink, and a weave's sheen grows at grazing angles.

struct Particle {
  x: vec4f,
  v: vec4f,
  prev: vec4f,
  f: vec4f,
}

@group(0) @binding(0) var<uniform> B: BannerParams;
@group(0) @binding(1) var<storage, read> P: array<Particle>;
@group(0) @binding(2) var print: texture_2d<f32>;
@group(0) @binding(3) var samp: sampler;

fn point(i: u32, j: u32) -> vec3f {
  return P[j * B.nx + i].x.xyz;
}

struct ClothVarying {
  @builtin(position) position: vec4f,
  @location(0) world: vec3f,
  @location(1) normal: vec3f,
  @location(2) uv: vec2f,
}

// Two triangles a cell: corners (0, 0), (1, 0), (0, 1), then (0, 1), (1, 0), (1, 1).
const CORNER_I = array<u32, 6>(0u, 1u, 0u, 0u, 1u, 1u);
const CORNER_J = array<u32, 6>(0u, 0u, 1u, 1u, 0u, 1u);

@vertex fn cloth_vs(@builtin(vertex_index) v: u32) -> ClothVarying {
  let cell = v / 6u;
  let c = v % 6u;
  let i = cell % (B.nx - 1u) + CORNER_I[c];
  let j = cell / (B.nx - 1u) + CORNER_J[c];
  let p = point(i, j);
  // The normal from the neighbours either side, one-sided at the edges.
  let across = point(min(i + 1u, B.nx - 1u), j) - point(max(i, 1u) - 1u, j);
  let down = point(i, min(j + 1u, B.ny - 1u)) - point(i, max(j, 1u) - 1u);
  var out: ClothVarying;
  out.position = B.view_proj * vec4f(p, 1.0);
  out.world = p;
  out.normal = cross(down, across);
  out.uv = vec2f(f32(i) / f32(B.nx - 1u), f32(j) / f32(B.ny - 1u));
  return out;
}

@fragment fn cloth_fs(in: ClothVarying, @builtin(front_facing) front: bool) -> @location(0) vec4f {
  // The side seen: the print faces the camera at rest.
  let n = normalize(in.normal) * select(-1.0, 1.0, front);
  let view = normalize(B.eye - in.world);
  let sun = normalize(B.sun);
  // The print: distance in print pixels, negative inside the letters. Seen from behind it shows
  // through mirrored, as it would.
  // Clamped near the letters: past the atlas's spread each glyph's cell ends in a jump to "far",
  // whose derivative would smear ink along the cell's edge.
  let d = min(textureSampleLevel(print, samp, in.uv, 0.0).r, 6.0);
  let aa = clamp(fwidth(d), 0.75, 4.0);
  let ink = (1.0 - smoothstep(-aa, aa, d)) * select(0.25, 1.0, front);
  // A hem along the bottom, a fold of the same cloth that is darker.
  let hem = smoothstep(0.935, 0.95, in.uv.y);
  let dye = mix(B.fabric, B.ink, ink) * (1.0 - 0.35 * hem);
  let lit = max(dot(n, sun), 0.0);
  // Light through the fabric from behind, coloured by its dye on the way through.
  let through = max(-dot(n, sun), 0.0) * B.translucency * (1.0 - 0.8 * ink);
  let sky = B.sky * (0.55 + 0.45 * n.y);
  let grazing = pow(1.0 - saturate(abs(dot(n, view))), 4.0);
  let sheen = B.sheen * grazing * (0.3 + 0.7 * lit);
  let colour = dye * (B.sun_colour * lit + sky) + dye * dye * B.sun_colour * through + sheen * B.sun_colour * mix(dye, vec3f(1.0), 0.4);
  return vec4f(colour, 1.0);
}

struct RodVarying {
  @builtin(position) position: vec4f,
  @location(0) across: f32,
}

@vertex fn rod_vs(@builtin(vertex_index) v: u32) -> RodVarying {
  let along = f32(CORNER_I[v]);
  let side = f32(CORNER_J[v]) * 2.0 - 1.0;
  let axis = normalize(B.rod_b - B.rod_a);
  let mid = mix(B.rod_a - axis * B.rod_radius * 3.0, B.rod_b + axis * B.rod_radius * 3.0, along);
  let out_of = normalize(cross(axis, normalize(B.eye - mid)));
  var out: RodVarying;
  out.position = B.view_proj * vec4f(mid + out_of * side * B.rod_radius, 1.0);
  out.across = side;
  return out;
}

@fragment fn rod_fs(in: RodVarying) -> @location(0) vec4f {
  // A turned wooden rod: lit as a cylinder, brightest a little above its middle.
  let s = clamp(in.across, -1.0, 1.0);
  let facing = sqrt(1.0 - s * s);
  let lit = saturate(0.55 * facing - 0.45 * s);
  let wood = vec3f(0.16, 0.08, 0.035);
  let shine = pow(saturate(facing * 0.8 - s * 0.6), 24.0) * 0.4;
  return vec4f(wood * (0.25 + 1.6 * lit) * B.sun_colour * 0.5 + shine, 1.0);
}
