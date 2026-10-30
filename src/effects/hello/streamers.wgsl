#include "hash.wgsl"
#include "params.wgsl"

// Hello: bunches of ribbon streamers hanging from the top of the view, one instanced draw of flat
// 2D strips into the HDR scene. Every streamer is a pure function of its index and the time, so
// there is no state and a held frame is exactly reproducible. A ribbon in a steady wind trails at
// the angle where the air's drag on it balances its weight, and flutters: a wave runs from where
// it is tied to its free end, growing as it goes, as a flag's does. It also twists, showing its
// front and its darker back by turns. Gusts travel along the row, so neighbours lift together.
// Premultiplied colour, blended "over".

@group(0) @binding(0) var<uniform> params: Params;

struct Varying {
  @builtin(position) position: vec4f,
  @location(0) s: f32,
  @location(1) face: f32,
  @location(2) @interpolate(flat) colour: vec3f,
  @location(3) across: f32,
  @location(4) @interpolate(flat) width: f32,
}

const ROWS: u32 = 12u;
const BUNCH: u32 = 3u;

// Linear colours: lilac, sky, cream and rose.
const COLOURS = array<vec3f, 4>(
  vec3f(0.42, 0.26, 0.86),
  vec3f(0.24, 0.52, 0.86),
  vec3f(0.86, 0.76, 0.52),
  vec3f(0.86, 0.34, 0.50),
);

@vertex fn streamer_vs(@builtin(vertex_index) v: u32, @builtin(instance_index) i: u32) -> Varying {
  let h = hash_2to3(vec2f(f32(i), 7.0));
  let s = f32(v / 2u) / f32(ROWS - 1u);
  let side = select(-1.0, 1.0, (v & 1u) == 1u);
  // Pixels: tied in bunches of three at knots placed anywhere across their own slot, each ribbon
  // fanning out at its own random angle, length and width. An even row of streamers is a grating
  // of stripes that the pattern rule counts, and so was a bunch of five fanned evenly.
  let bunch = i / BUNCH;
  let b = hash_2to3(vec2f(f32(bunch), 11.0));
  let slot = params.width / params.count;
  let root = vec2f((f32(bunch) + 0.2 + 0.6 * b.x) * slot + (h.x - 0.5) * 6.0, -2.0);
  let fan = (h.z - 0.5) * 0.6;
  // Depth: far streamers are shorter, narrower and dimmer, so the row is not one layer of
  // equal stripes.
  let depth = hash_2to3(vec2f(f32(i), 13.0)).x;
  let near = mix(0.45, 1.0, depth);
  let long = params.long * mix(0.35, 1.0, h.y) * near;
  // The wind: gusts travelling along the row, and the trailing angle they set.
  let gust = 0.5 + 0.5 * sin(root.x / params.width * 5.0 - params.time * 0.7 + 2.0 * h.z);
  let lean = params.wind * (0.5 + 0.5 * gust) + fan * (1.0 - 0.5 * params.wind);
  let down = vec2f(sin(lean), cos(lean));
  let across = vec2f(-down.y, down.x);
  // The flutter: a wave from the knot to the free end, growing along it, faster in a stronger wind.
  let rate = mix(0.6, 1.1, h.z) * (0.4 + params.wind);
  let wave = sin(6.0 * s - params.time * 6.283 * rate + h.x * 6.283);
  let flutter = params.wind * 0.12 * long * s * wave;
  let p = root + down * long * s + across * flutter;
  // A slow twist along the ribbon: its width seen edge-on and face-on by turns.
  let twist = cos(2.2 * s + params.time * 0.5 * rate + h.y * 6.283);
  let w = params.ribbon * near * mix(0.6, 1.6, fract(h.x * 7.3)) * max(abs(twist), 0.15);
  let at = p + across * side * 0.5 * w;
  var out: Varying;
  out.position = vec4f(at.x / params.width * 2.0 - 1.0, 1.0 - at.y / params.height * 2.0, 0.0, 1.0);
  out.s = s;
  out.face = twist;
  out.colour = COLOURS[u32(h.z * 4.0) % 4u] * mix(0.3, 1.0, depth * depth);
  out.across = side;
  out.width = w;
  return out;
}

@fragment fn streamer_fs(in: Varying) -> @location(0) vec4f {
  // The front catches the light, the back is in its own shade, and both darken near the knot.
  let lit = select(0.8, 1.0, in.face > 0.0) * mix(0.7, 1.0, smoothstep(0.0, 0.3, in.s));
  // Edges a pixel soft, so a ribbon is not a hard step of light against the page.
  let edge = saturate((1.0 - abs(in.across)) * 0.5 * in.width);
  return vec4f(in.colour * lit, 1.0) * edge;
}
