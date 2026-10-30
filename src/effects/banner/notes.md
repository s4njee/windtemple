## How it works

A banner 2.4 m wide and 0.8 m deep, hung from a rod by rings, carrying a line of text, in a breeze. It is the first effect on the cloth engine (`src/gpu/cloth/`) and the 3D wind (`src/wgsl/air.wgsl`).

- **The cloth.** 37 × 13 particles, solved by XPBD in small steps: 960 substeps a second, each predicting every particle under gravity and the air, then solving each constraint once (stretch, shear and bending, as distances on the grid), then taking the velocity from the move. Stiffness is a compliance, so it does not depend on the step. Every fourth particle along the top is pinned to a ring, so the top edge sags a little between them. The hem along the bottom weighs four times the cloth, as a hung banner's does, so it hangs rather than flies.
- **The air.** The only thing that moves the cloth is the air's pressure on each cell, treated as a flat plate: a force along the cell's normal that grows with the square of the wind's speed across it, relative to the cloth's own motion, and a weak friction along it. The wind comes from the left and a little away from the viewer, grows with height by the log profile, and gusts in fronts that sweep across (story 2.1).
- **One dispatch a frame.** The whole frame's substeps run in one compute dispatch of one workgroup. The positions live in its shared memory for the frame: 1,024 of them fill the 16 KiB a workgroup may have, so the twelve constraint phases of each substep never wait on device memory. The wind is sampled once a frame at each cell's centre. The cloth's own velocity, which the pressure depends on as much, is taken every substep.
- **Drawing.** The particles are read straight from the solver's buffer (vertex pulling), with normals from neighbouring particles, into a 4× multisampled target. The print is the text drawn once into a distance field (Temple of Time's text field), antialiased per pixel. Seen from behind, it shows through mirrored and faint. Sunlight comes through the fabric from behind, tinted by its dye and blocked by the ink. A weave's sheen grows at grazing angles: broad on cotton, strong on silk.
- **Held frames.** The cloth is run for 2.5 s in a calm wind before its first frame, so it never opens on a sheet dropping into place. When motion is held, it settles again in a calm wind, and that frame is held.

`dose` ("intensity") sets the wind: 1.8 m/s at 10 m by default (a light breeze), 4.5 m/s at the strong end, with gusts and turbulence growing with it.

## Cost

On an Apple M1 Max at 1080p: 0.42 ms a frame on Dawn ([docs/studies/epic-3.md](../../../docs/studies/epic-3.md)), the cloth's 16 substeps included. One frame in Chrome reads 1.59 ms (1.56 to 1.62 over 3 loads, [browser-check.md](../../../docs/studies/browser-check.md)), and the HUD puts the cloth's pass at 0.76 ms at 120 Hz (8 substeps a frame): **Tier A**, provisional until an integrated GPU is measured. 50 kB gzipped with the shared chunks. The 4× multisampled colour and depth targets cover the canvas, about 51 MB at DPR 2 for this view.

## Pitfalls

- **Too few substeps stretch.** At 480 substeps a second, one constraint pass each, a banner in an 8 m/s gust stretched 13%. At 960 it stretches 2%.
- **The wind was most of the cost.** At first each cell's wind was sampled by each of its four corners, at every substep: 2.26 ms of cloth in Chrome at 120 Hz. One sample a cell a frame, and each cell's force once a substep, took it to 1.50 ms. Positions in shared memory took it to 1.00, and a coarser grid (37 × 13, not 49 × 17) to 0.76.
- **Lettering is a grating.** Condensed capitals are a row of evenly spaced stems. With a cap height of 42% of the banner, the defaults read pattern `high`, and so did `still` and `canvas`, where the banner hangs flat. A moving pattern has a lower limit (0.25 of the area, against 0.4 still). Lowering the ink's contrast helped only partly. At 30% of the banner's depth the lettering reads `none` at 480, 960 and 1440 px wide, at full contrast. That holds for any heading on cloth.
- **A distance field ends in a jump.** Past the atlas's spread, each glyph's cell ends at "far", and the derivative there smeared ink along the cell's edges as faint boxes. The distance is clamped near the letters before antialiasing.
- **Lit from behind, a banner is flat.** With the sun behind the cloth, the front saw only sky and the folds did not show. The sun is in front and to the left, and backlit folds glow through.
- **A banner with no hem flies.** The first version blew back nearly level in a moderate wind, foreshortened to a sliver. A weighted hem and a gentler, more sideways wind keep it hanging.

## Safety

Flash `low`: in four seconds at the defaults, one cell of the analyser flashes once, as the banner's edge swings across the dark page. That is far under the limit of three a second. Pattern `none` at every preset at the test's 480 px, and at most `low` (0.044 of the limit, `gusty` and `silk`) measured at 1440 px wide (`experiments/banner-pattern.test.ts`). The strong dose passes too. Motion stays inside the caps up to the strong dose.

## When to use it

A section heading, an event or festival header, a shop sign: a word or two on cloth, stirring behind or above the page's own heading. Keep the lettering to a third of the banner's depth. A CSS skew wave on the heading is the cheap alternative (story 3.9 will compare them); it cannot fold, let light through or catch a gust.

## References

- Matthias Müller, Bruno Heidelberger, Marcus Hennix and John Ratcliff, "Position Based Dynamics", _Journal of Visual Communication and Image Representation_ (2007).
- Miles Macklin, Matthias Müller and Nuttapong Chentanez, "XPBD: Position-Based Simulation of Compliant Constrained Dynamics", Motion in Games 2016.
- Miles Macklin et al., "Small Steps in Physics Simulation", SCA 2019.
- Médéric Argentina and L. Mahadevan, "Fluid-flow-induced flutter of a flag", _PNAS_ (2005).
- Wind Temple [plan.md](../../../plan.md), stories 2.1 to 2.3 and 3.1.
