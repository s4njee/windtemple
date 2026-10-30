# Wind Temple

A research gallery of WebGPU wind, cloth and sky:

- flags, banners and curtains;
- streamers, kites and chimes;
- confetti and paper on the air;
- flocks;
- the wind made visible, in smoke wires, wind maps and vortex streets;
- clouds.

Each effect is built from its mechanism, and comes with a live demo, readable source, a write-up and a practicality scorecard. It is judged the way the temples judge theirs: **would you actually ship this on a website?**

Wind is invisible, so everything here is something the air pushes, and the look comes from how it pushes. A flag flaps because a flexible sheet in a stream is unstable, not because a wave is painted on it. A falling sheet flutters or tumbles depending on its size and weight. Vortices peel off behind anything in a wind at a steady rate. A starling follows its six or seven nearest neighbours. Cloth comes first: an XPBD solver with aerodynamics on every triangle, measured against video of real flags.

Safety comes from The Hero's Journey's checks. Every effect has an intensity control from 0 to 1, calm by default. In `npm test`, every effect and preset runs at the default and at the strong end (0.7) through:

- the WCAG 2.3.1 flash and red-flash analyser;
- a regular-pattern analyser after the broadcast guidance;
- caps on whole-field rotation, zoom and drift.

Presets past the limits start paused behind a click-to-start notice. See [docs/safety.md](docs/safety.md).

It is built on Fire Temple's page structure and the shared temple core (`@mk7s/hologpu-temple-core`), from Earth Temple's copy of the shell. The accent is lilac. See [plan.md](./plan.md) for the roadmap.

## Getting started

```sh
npm install
npm run dev        # http://localhost:5510
npm test           # unit tests, plus the flash, pattern and motion checks and the held-frame audit over every effect
npm run build      # registry, typecheck, static build to dist/ and the bundle check
npm run study -- --epic 1   # cost study on Dawn: docs/studies/epic-1.md and the Scorecard numbers
npm run shot -- hello --times 2 --bg dark,light   # render an effect headlessly to PNG (output/shots)
npm run browser-check -- --report docs/studies/browser-check.md   # every effect in headless Chrome (dev server running)
npm run posters -- --force   # fallback posters from held frames, as WebP
npm run deploy     # build and upload dist/ to Cloudflare Pages (project windtemple)
```

`?effect=<id>` opens an effect, `&hud=1` the performance HUD, and `&p.<param>=<value>` sets a parameter, `&p.dose=0.6` (intensity) included.

## Effects

| Id       | What                                                                                                                                                                | Tier |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| `hello`  | The smallest effect: bunches of flat ribbon streamers hanging from the top of the view, trailing and fluttering in gusts, one instanced draw                        | A    |
| `banner` | A banner hung from a rod by rings, carrying a line of text, stirring in a breeze: XPBD cloth that only the 3D wind's pressure moves, solved in one dispatch a frame | A    |

## Layout

```
src/gpu/wind/air.ts         the wind in 3D (twin of src/wgsl/air.wgsl): the log wind profile, gust
                            fronts carried along, turbulence and veer
src/gpu/wind/wind.ts        Earth Temple's ground wind (twin of src/wgsl/wind.wgsl)
src/gpu/cloth/              XPBD cloth in one workgroup, positions in shared memory, the air's
                            pressure on every cell (cloth.wgsl), its CPU twin, and a face-on camera
src/gpu/points.ts, glare/,  Moon Temple's energy-conserving points, aperture and glare (via Star Temple)
  optics/
src/gpu/sim/, volume/       Fire Temple's 2D and 3D stable fluids, obstacles and volume ray-march kernel
src/gpu/post/               the HDR tail: bloom, tonemap, colour stage, and Moon Temple's night vision
src/gpu/hash.ts             twins of the shader hashes, so CPU models make the same random choices
src/gpu/safety/             dose, the pattern analyser, motion estimate, colour caps and the start gate's rules
src/gpu/colour/             OKLab and OKLCH, palettes, Display P3
src/gpu/strokes/            the stroke renderer, for streamlines, lines and trails
src/gpu/symmetry/fold.ts    the 17 wallpaper groups and the rosettes as folds
src/gpu/text/               a font as a signed distance field (Temple of Time's), for text on cloth and in the sky
src/effects/<id>/           meta.ts, index.ts, shaders, notes.md, poster.webp
docs/studies/               cost studies and the browser check
```

## License

MIT. The Anton font, in `fonts/` for the text field, is under the SIL Open Font License 1.1 (`fonts/Anton-OFL.txt`).
