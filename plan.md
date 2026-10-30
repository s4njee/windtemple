# Wind Temple — WebGPU wind, cloth and sky research site

A research site that implements, measures and documents the air and what it moves:

- cloth (flags, banners, curtains, sails);
- ribbons and strings (streamers, kite tails, bunting, chimes);
- things the wind carries (confetti, paper, feathers, kites, balloons, paper planes);
- flocks;
- the wind made visible (smoke wires, streamlines, wind maps, vortex streets, dust devils);
- the sky the wind moves (clouds, contrails, skywriting and the colour of the air).

It asks one question of each: **would you actually ship this on a website?** Every effect gets a live demo, readable source, a write-up and a practicality scorecard.

It is a sibling of [Fire Temple](../firetemple/plan.md), [Water Temple](../watertemple/plan.md), [Storm Temple](../stormtemple/plan.md), [Snow Temple](../snowtemple/plan.md) and [Earth Temple](../earthtemple/plan.md), on the same page structure and the shared temple core. It is the other half of §4.4 (Wind and growth) of the holofx [research list](../research.md). Earth Temple took the grass and the growing things, and left flags, banners and cloth here ("wind, but not earth").

Wind is invisible. Everything this family draws is something the air pushes, and the look comes from how it pushes, so the rule is the other temples': start from the mechanism, and the look follows.

- **A flag flaps because a flexible sheet in a stream is unstable.** Above a critical speed, the air's pressure on a small bend makes the bend grow, and a wave runs to the free edge (Argentina and Mahadevan). Nothing paints the wave: it comes out of the cloth and the air.
- **A falling sheet flutters or tumbles.** Which one depends on its size, thickness and weight, as a falling plate does (Andersen, Pesavento and Wang). Confetti, paper and feathers are plates; Earth Temple's leaves are the same model.
- **Behind anything in a wind, vortices peel off by turns** at a steady rate: a Strouhal number of about 0.2, times the wind speed, over the object's width. This is what clouds show behind islands, and what makes wires sing and a pole's flag start to wave.
- **A starling follows its six or seven nearest neighbours,** whatever their distance (Ballerini et al.). That is why a murmuration keeps its shape as it thins and packs, and why waves of turning cross it.
- **A kite flies at the angle where lift, drag, its weight and the line's pull balance.** A windsock fills at the speed its cone's drag lifts it. A pinwheel turns at a set fraction of the wind's speed.
- **The sky is blue, and the sunset red, from scattering by molecules and haze** (Rayleigh and Mie). Clouds are shaped by shear and rising air, and lit through their volume, which gives them their silver edges and dark bases.

Cloth comes first and gets the most care: the engine behind flags, banners, curtains and sails is the part that has to be right.

## Goals

- **Make cloth that moves like cloth,** judged against video: a flag's flapping frequency, the speed of the waves along it and how they grow towards the free edge, measured in reference clips and in the simulation at a matched wind.
- **Cover the main kinds of wind visual, each from its mechanism:**
  - **cloth:** flags, banners, curtains that part, a sheet pulled off to unveil, sheer curtains at a window, a washing line, a sail, prayer flags;
  - **ribbons and strings:** streamers, a ribbon cursor, a windsock, wind chimes, a hanging mobile, bunting, tassels;
  - **things the wind carries:** confetti, paper blown away, letters lifted off a heading, a feather, a kite, balloons, paper planes;
  - **the air made visible:** a wind tunnel, a vortex street, a wind map, incense smoke, a dust devil;
  - **flocks:** a murmuration, birds crossing a sky, a flock that forms a word;
  - **the sky:** a living sky, time-lapse clouds, sunset, contrails and skywriting.
- **Ship effects shaped like website parts:**
  - a banner across a section heading that carries its title or the page's logo, and a flag that carries an image the page gives;
  - a curtain reveal on load, an unveiling for a launch, and confetti for success;
  - a windsock that fills with scroll speed or upload progress, and a pinwheel loader;
  - a wind map hero for a weather or climate page, and a living sky behind a hero;
  - a ribbon cursor, and a heading whose letters the wind lifts away for a transition or a 404 page.
- **Say plainly when CSS does the job.** A CSS flag wave (many sliced strips with an animated offset) is the baseline to beat (3.9). So is canvas confetti that wobbles on a sine (5.10).
- **Keep motion safe.** Every effect runs through The Hero's Journey's flash, pattern and motion checks. The hazards this family brings:
  - flapping cloth is a periodic change of light and shade at a few hertz, which is flicker over a large area;
  - stripes printed on moving cloth, rows of streamlines and evenly spaced streamers are gratings, and a moving grating is worse than a still one;
  - drifting clouds and a sky in time lapse are whole-field motion;
  - a dense, dark flock over a bright sky is a moving high-contrast pattern;
  - a dust devil turns.
- **Build the reusable parts once,** shaped to move into `@mk7s/hologpu-temple-core`:
  - the 3D wind field;
  - the cloth solver and its aerodynamics;
  - the rod and ribbon solver;
  - plate aerodynamics, shared with Earth Temple's leaves;
  - the air solver and its tracers;
  - flocking;
  - the sky and clouds.

## Non-goals

- **Garments, characters and self-colliding cloth.** Cloth here is a sheet held at its edges, as page parts are. Self-collision is studied (2.8) and built only if a story needs it.
- **Meteorology.** The wind map shows real wind if a public-domain sample is used (6.5), but nothing here forecasts or claims accuracy. Clouds are shaped by noise and shear, not a weather model.
- **Grass, leaves, petals and seeds.** These are Earth Temple's, the dandelion included. Confetti and paper here share Earth's falling-plate model (5.1), and whoever builds it first puts it in the core.
- **Fire's smoke, steam and mist.** These are Fire Temple's and Water Temple's. Smoke here is a tracer that shows the air (smoke wires, incense), and reuses Fire Temple's smoke shading.
- **Snow and blizzards, storm clouds, lightning and rain.** These are Snow Temple's, Storm Temple's and Water Temple's. The clouds here are fair-weather, sunset and time-lapse skies, and the wind field is shared.
- **Wind on water.** Waves and catspaws on a lake are Water Temple's.
- **National flags, real logos and sacred text.** A flag carries the page's own image, a plain colour or a pattern made here. A real country's flag is not a default: it is political, and most flags are stripes, which are gratings. The prayer flags (3.8) are plain, with no mantras printed.
- **Effects over live page pixels.** A canvas cannot read the page (Fire Temple's [backdrop strategy](../firetemple/docs/backdrop-strategy.md)). A banner prints an image, a canvas or re-rendered text that the page gives; paper blown off the page (5.3) is re-rendered content.
- **Screen shake, and wind that moves the page itself.** Shaking the page is a motion hazard and never a good idea.
- **Sound.** Wind chimes (4.5) and singing wires are visual only.

## Decisions

These are defaults chosen so work can start. Each is cheap to revisit before Epic 1 is finished.

| Decision         | Default                                                                                                                                                                                                                                      | Why                                                                                                                                                                                                                                                                           |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Foundation       | Earth Temple's shell (from Snow Temple, The Hero's Journey, Moon Temple, Storm Temple, The Bazaar and Fire Temple) on `@mk7s/hologpu-temple-core`                                                                                            | It is the newest copy, and has the flash, pattern and motion checks, the start gate, OKLab colour, the study harness and the browser check. It also has the stateless wind field this family starts from, Moon Temple's night vision, the text field and the stroke renderer. |
| Build tooling    | Vite + TypeScript (strict), with WGSL `#include` resolved per effect at build time                                                                                                                                                           | Same as every temple, so shader text never reaches the first load.                                                                                                                                                                                                            |
| Rendering API    | Raw WebGPU + WGSL, thin helpers                                                                                                                                                                                                              | The research subject is WebGPU itself.                                                                                                                                                                                                                                        |
| Colour pipeline  | Linear HDR `rgba16float` scene → bloom → tonemap → sRGB, OKLab for colour operations. Thin geometry (strings, ribbon edges, cloth silhouettes) is drawn with 4× MSAA, only where it is drawn, and resolved before the tail                   | A sunlit sky and backlit silk are brighter than paper white. Earth Temple found that multisampling only what is drawn saves most of 4× MSAA's memory.                                                                                                                         |
| Cloth solver     | XPBD on the GPU with small steps: many substeps of one constraint iteration each (Macklin et al.). Positions in `f32` storage buffers. A small cloth may run in one workgroup; 2.2 compares that with Jacobi and graph-coloured passes       | Small steps are stable at any frame rate and stiff without many iterations. A page's cloth is small (a few thousand particles), so dispatch overhead, not arithmetic, may be what costs: the study decides.                                                                   |
| Air              | Stateless wind by default: a pure function of position and time (the carried-over gust field, widened to 3D). A simulated air grid only where something must disturb the wind: vortex streets, a wind tunnel, the pointer as a fan           | Stateless wind costs nothing per object and survives a pause, a resize and a held frame. A grid costs memory and steps, and is paid only where its look is the point.                                                                                                         |
| Stateful scrub   | An effect that a scroll scrubs through a simulation bakes the run once into a keyframe buffer and plays it back. It never re-simulates backwards                                                                                             | Simulations cannot run in reverse. Baking makes an unveiling or a curtain scroll-scrubbable, as the arrival-time reveal makes growth scrubbable.                                                                                                                              |
| Intensity        | Hero's Journey's shared `dose` control, labelled "intensity": wind speed, gustiness, how many things fly and how fast the sky moves, together. Default 0.35                                                                                  | One control a page can turn down, and the analysers' contract already holds up to its strong end. The key stays `dose` so the contract matches across families.                                                                                                               |
| Safety checks    | Flash, red-flash, pattern and motion checks over every effect and preset, at the default and at the strong dose, in `npm test`, plus Earth Temple's shimmer test (flash over 5 × 5 px regions) for strings, ribbons and flapping cloth (2.7) | Flapping folds are flicker, stripes and streamlines are gratings, skies are whole-field motion, and thin strings shimmer below the flash analyser's cells.                                                                                                                    |
| Realism check    | Reference video licensed CC0 or CC BY (Wikimedia Commons), credited in `docs/realism/`, or the user's own. Flapping frequency, wave speed and fall paths are measured from it as well as judged by eye                                       | Wind is motion, so a still photograph says little. Unlike grass, cloth in wind has numbers that can be measured from video and matched.                                                                                                                                       |
| Accent           | Lilac (`#c79bff` dark, `#7438c2` light). Tier B moves from violet to teal, as in Moon Temple                                                                                                                                                 | No colour was named. Sky blue is taken three times (Snow, Storm and Water Temple). Lilac sits in the free gap between the violet-blues (Moon Temple, The Bazaar) and The Hero's Journey's magenta. Pale silver-blue is the alternative. Revisit if the user names one.        |
| Neutrals         | Cool greys, a little blue, light and dark equally                                                                                                                                                                                            | Cloth, smoke and sky read differently on a light page and a dark one, and both are tested.                                                                                                                                                                                    |
| CSS prefix, port | `wd-` (Water Temple has `wt-`), dev port 5510, launch config `windtemple`                                                                                                                                                                    | Unused by the other families. 5373, 5390, 5410 to 5500, 5441 and 5471 are taken by the other holofx projects.                                                                                                                                                                 |
| Hosting          | Cloudflare Pages (classic) project `windtemple`, direct upload                                                                                                                                                                               | No server needed. Create the project with `wrangler pages project create --force`, or wrangler converts the repo to Workers.                                                                                                                                                  |
| No-WebGPU        | A poster per effect, and a CSS version where one is honest (story 10.4)                                                                                                                                                                      | A CSS wave is a real fallback for a small banner, and CSS streamers for a header. They are not one for a sail or a murmuration.                                                                                                                                               |

## Carried over from the other temples

These findings shape this plan, so they need not be rediscovered.

- **The wind field** (Earth Temple 2.4, after Snow Temple 2.1 and 2.2). A stateless gust field carried along the wind, a steady lean with a slow veer, and flutter at each object's own frequency with its own phase. It is tested: neighbours move together and distant things do not. Here it is widened to 3D, with the wind growing with height (2.1).
- **Fluid solvers and smoke** (Fire Temple Epic 6, 3.10). Stable fluids in 2D and 3D, MacCormack advection and vorticity confinement, and Beer–Lambert smoke with cheap self-shadowing. The air solver (6.1) starts from them.
- **The volume ray-march kernel** (Fire Temple 3.12, Snow Temple 2.2). Clouds (8.2) use the same integration as fire's volumes and the blizzard.
- **Indirect draws from compute** (Moon Temple 3.5, Earth Temple 2.3). Things are appended in compute with an atomic counter and drawn with `drawIndirect`. Confetti and flocks are drawn this way.
- **Point-source rendering** (Moon Temple Epic 2, ported in Star Temple 1.7). Energy-conserving spots that do not shimmer as they move: distant birds, foil glints and dust in a dust devil.
- **Ribbons against accumulation** (Fire Temple 7.7). Ribbons are sharp and belong to their particle, but cost vertices. An accumulation buffer is cheap but smears. The wind map's trails and the ribbon cursor choose between them.
- **The stroke renderer** (Storm Temple). Thick, joined HDR lines: streamlines, smoke wires, kite lines and contrails.
- **The font distance field** (Temple of Time 1.6, in Earth Temple). Text printed on a banner, letters lifted off a heading, a flock forming a word, and skywriting.
- **Evenly spaced things are a grating** (Earth Temple 1.2; Temple of Time's lattices). A row of evenly spaced blades failed the pattern rule; a row of streamers, a rake of smoke wires or a field of streamlines will too. Spacing is jittered, and the analyser checks it.
- **Parallax breaks up whole-field motion** (Snow Temple 2.1). Things at one depth moving together read as whole-field drift, and things at many depths do not. A sky of clouds at one height drifting together is the bad case.
- **Optical flow cannot see sparse, faint particles** (Snow Temple 2.4). Confetti, feathers and distant birds are checked against the motion caps from their own transforms as well.
- **The motion check reads leaning things as a zoom** (Earth Temple 3.1). A strip whose tips move and whose bases do not reads as zooming. Streamers tied along an edge and flags on poles are the same shape.
- **Near things are out of focus** (Snow Temple 2.1, Earth Temple 3.2). Near confetti and near birds are large and fast. Drawn sharp, they trip the flash check, and photographs show them blurred anyway.
- **Glitter is flicker** (Fire Temple `flicker.wgsl`, Snow Temple 6.4). Foil confetti and sunlit spray are built from band-limited signals with a capped rate.
- **Thin things shimmer below the analyser's cells** (Earth Temple 2.7). The flash analysis over 5 × 5 pixel regions finds sub-pixel geometry flickering where the coarse cells see nothing. Strings, kite lines and ribbon edges run through it.
- **Multisampled thin geometry needs centroid interpolation** (Earth Temple). A pixel centre just outside a thin strip extrapolates its attributes, and `pow()` of a negative result is NaN, drawn as white specks.
- **Uniforms written between passes in one command buffer all arrive with the last value** (Moon Temple). XPBD's substeps each need their own values, so per-step values are kept in a buffer.
- **Reset per-frame counters in the command buffer, not by a buffer write** (Earth Temple). A write lands before the whole command buffer.
- **Half-float writes truncate on Apple GPUs** (Fire Temple 5.6). Cloth positions, velocities and anything that accumulates are stored in `f32`.
- **A held frame shows what playing would** (Earth Temple). Earth Temple's held frames had to match what playing showed. A held frame of a simulation is a settled state: the cloth at rest in a lull, never mid-flap.
- **A scene that does not change is drawn once** (Snow Temple 4.2). The sky, distant hills and a cloud layer that moves slowly are cached per size and refreshed rarely.
- **CI's software Vulkan crashes on a texture read after a workgroup barrier** (Snow Temple, Mesa 25.2's lavapipe). Compute shaders read textures before their first barrier, and a single-workgroup cloth solver must be written with this in mind.
- **Scratch work needs a home.** Long sweeps and probes go in `experiments/`, outside test, typecheck and lint.

## Findings so far

- **Bright streamers are a grating, even jittered.** Earth Temple's fix for its row of blades, jittered roots over three slots, was not enough here. Its blades were dim green against the page, and pastel ribbons are bright. Streamers tied that way read pattern `high`, and so did even bunches of five, which were small gratings of about 10 px. What passed was bunches of three at random angles, with depth: far streamers shorter, narrower and dimmer, so the row is not one layer of equal stripes. It reads `low` (0.17 of the area limit), and no preset is over. Every row of bright things here (bunting, prayer flags, tassels, smoke wires) will need the same: depth, randomness and gaps, not just jitter.
- **Trailing streamers drift.** At the strong dose, streamers trailing downwind read 0.051 whole-field drift, just over the cap of 0.05. The strong end's wind was lowered.
- **Flags flap on their own.** The air's pressure on each cell of the cloth, and nothing else, is enough: a flag nudged once and left in a perfectly steady wind dies down below about 2 m/s and keeps flapping above it, faster in a stronger wind (f·L/U about 0.27), in waves that run to the free edge and grow. A flag exactly in line with a steady wind feels nothing and never starts, so the wind needs its veer and turbulence.
- **On the GPU, a small cloth is a latency problem, not an arithmetic one.** A dispatch costs about 5 µs in Chrome, so a dispatch per constraint colour per substep would be a millisecond of overhead. One dispatch a frame, with the positions in shared memory, cut the banner's cloth from 2.26 ms to 0.76 ms at 120 Hz, together with sampling the wind once a frame and a coarser grid.
- **Sample the wind once a frame.** The wind varies over metres and seconds, and sampling it every substep at every corner of every cell was most of the solver's cost. The cloth's own velocity, which the pressure depends on as much, is still taken every substep.
- **Lettering is a grating.** Condensed capitals across a banner are a row of evenly spaced stems. At 42% of the banner's depth they read pattern `high`, worse when the cloth hangs flat and when it moves. At 30% they read `none` at full contrast. Every heading on cloth or in the sky starts from that size.

## Overlaps and who owns what

| Nearby work                                             | Where                            | Wind Temple's part                                                                                                                                               |
| ------------------------------------------------------- | -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cloth`, `ribbons` (unbuilt stretches)                  | hologpu                          | Built here (Epics 2 and 4) and moved into the core (10.6), where hologpu can take them.                                                                          |
| Falling leaves and their aerodynamics (unbuilt 4.1)     | Earth Temple                     | One falling-plate model for leaves, confetti, paper and feathers (5.1). Whoever builds it first puts it in the core; leaves stay there, confetti and paper here. |
| Dandelion, samaras, pollen                              | Earth Temple                     | Not here.                                                                                                                                                        |
| `smoke`, smoke plume (unbuilt 10.1), stable fluids      | Fire Temple, hologpu             | The solvers and smoke shading are reused. Smoke here shows the air (6.2, 6.6), not combustion.                                                                   |
| Mist, steam, fogged glass, bubbles                      | Water Temple                     | Not rebuilt.                                                                                                                                                     |
| Snowfall and `blizzard`                                 | Snow Temple                      | Not rebuilt. The wind field is shared.                                                                                                                           |
| `storm-sky` clouds and rain                             | Storm Temple                     | Storm skies stay there. Fair-weather, sunset and time-lapse skies are here, on the shared volume kernel.                                                         |
| `moon-through-cloud`, `lunar-corona`                    | Moon Temple                      | Its thin-cloud optics are reused for cirrus.                                                                                                                     |
| Planet atmospheres seen from space                      | Star Temple                      | The sky from the ground is here (8.1). The atmosphere's lookup tables are shared code, so Star Temple's view from orbit can use them.                            |
| Meadow cumulus and cloud shadows (`clouds.wgsl`)        | Earth Temple, The Eightfold Path | Earth Temple's 2D cloud layer is the cheap starting point and baseline; 8.2 builds volumes.                                                                      |
| `boids`, spatial hash                                   | hologpu                          | Its grid neighbour search is used or compared. A murmuration needs topological neighbours (7.1).                                                                 |
| `flow-particles`; line integral convolution (§4.7)      | hologpu, research list           | The wind map and LIC are here (6.2, 6.5). A fields-and-forces family would take LIC from the core.                                                               |
| `particle-trails`                                       | Fire Temple 7.7                  | Its findings choose the trails.                                                                                                                                  |
| `streamline` speed lines                                | Temple of Time 3.4               | A graphic style, not air. No overlap beyond the name.                                                                                                            |
| Page curl and folds (§4.6 Paper and print, not started) | research list                    | Paper blown away (5.3) is a falling plate, not a curl. If a paper family starts, its curl can meet the cloth solver.                                             |
| Fur and hair                                            | Earth Temple (3.6)               | Not here. Tassels (4.8) are strings, not fur.                                                                                                                    |

## Practicality tiers

Every effect is tagged with a tier. Budgets are starting targets, to be validated in Epic 11.

| Tier            | Meaning                                             | Shape                                                                                         | GPU budget @1080p                   |
| --------------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------- | ----------------------------------- |
| **A** Drop-in   | Safe as ambient decoration, including mobile        | One or two passes, stateless motion, or a small cloth: a pennant, streamers, a feather        | ≤ 2 ms on integrated GPU            |
| **B** Feature   | Hero sections and interactive set pieces            | GPU cloth up to ~10,000 particles, ten thousand confetti pieces, a 2D air grid, a cloud layer | ≤ 6 ms on integrated GPU            |
| **C** Showpiece | Dedicated page or landing experience, desktop-first | A volumetric sky, a murmuration of tens of thousands of birds, 3D air, several cloths at once | ≤ 12 ms on discrete / Apple Silicon |

Budgets include the HDR tail and MSAA resolve. Cloth studies report particles, substeps and constraint passes beside milliseconds. Effects that keep state report its memory.

## Architecture sketch

```
windtemple/
  index.html
  vite.config.ts
  src/
    main.ts            bootstrap: one shared GPU session, mounts an effect
    gpu/               device, canvas, frame loop, shaders, uniforms, targets, passes, post/
                       (bloom, tonemap, colour stage, night vision), dom-rects, pointer, scroll,
                       safety/ (dose, pattern, motion, colour caps, gate), text/ and strokes/,
                       plus
                       wind/ (the 3D gust field, the wind's growth with height),
                       cloth/ (XPBD mesh, constraints, aerodynamics, pins and colliders, printing),
                       rod/ (strings and ribbons: XPBD rods with twist),
                       flight/ (falling plates, kites, gliders, buoyancy),
                       air/ (simulated air: stable fluids, lattice Boltzmann, obstacles, tracers),
                       flock/ (topological neighbours, murmuration),
                       sky/ (atmosphere tables, volumetric clouds) and points/ (from Moon Temple)
    wgsl/              shared chunks: hash, noise, sdf, oklab, plus wind, cloth shading,
                       atmosphere and cloud density
    effects/<id>/      meta.ts (eager), index.ts + *.wgsl (lazy chunk), notes.md, poster.webp
    shell/             app frame, gallery, effect page, contexts, controls, notes, scorecard, HUD
    lib/               the library entry: mount an effect on a caller's canvas
  tests/               vitest on Dawn's Node bindings: real WebGPU, no browser
                       (flash.ts, pattern.ts and motion.ts run over every effect and preset)
  experiments/         scratch sweeps and probes; not part of the test run
  docs/                research output: support matrix delta, cost studies, realism/ (reference
                       clips, credits, measurements and side-by-sides), findings
```

The effect contract is Earth Temple's, unchanged, `dose` included, so effects and shell code move between the families. Cloth that hangs from or drapes over page elements reads their rectangles through the context, as Snow Temple's settling snow does.

## Definition of done (per effect story)

1. **Budget.** It runs inside its tier budget on the reference devices, with the numbers recorded. Until the device matrix exists (11.2), the only reference device is the development machine, an M1 Max. It is measured per frame on Dawn and as one frame in Chrome, and gets the lowest tier whose budget neither number exceeds. An A or B label is provisional until 11.2, and the scorecard says so.
2. **Parameters.** They are exposed through the schema with `dose` honoured, and there are at least two presets.
3. **Lifecycle.** It handles resize, DPR changes, device loss, offscreen pause and `prefers-reduced-motion`. The held frame shows a calm moment: the wind at a lull and cloth settled, never mid-gust or mid-flap. Cloth sized to an element survives a resize without a jump.
4. **Flash, red flash, pattern and motion.** It stays under all four at its defaults and at the strong dose. Every preset that goes over is declared and starts behind the gate. Cloth, strings and ribbons also pass the shimmer test (2.7) at many frame phases.
5. **State.** Where it keeps state (cloth, air, confetti, flocks), it is stable at any frame rate down to 15 fps, settles when the wind drops, and is reset or resumed cleanly after a resize, a pause or a parameter change. Nothing blows up after a tab has been hidden for minutes.
6. **Realism.** For cloth and things in flight, the motion is compared with reference video in `docs/realism/`, by measured frequency and speed where they can be measured, and the notes say what still gives it away.
7. **Contexts.** It is shown in at least one realistic web context, over a dark and a light page and at phone size, and its screenshots have been looked at.
8. **Notes.** `notes.md` is written: how it works and what the mechanism is, cost, pitfalls, safety, when to use it, and references. Where a CSS version exists, the notes say how close it gets.
9. **Release.** The scorecard is filled in and the fallback poster captured.

## Milestones

| Milestone                   | Scope                           | Proves                                                                               |
| --------------------------- | ------------------------------- | ------------------------------------------------------------------------------------ |
| **M0** Vertical slice       | Epic 1, stories 2.1–2.3, 3.1    | Tooling → the 3D wind → GPU cloth whose flapping is not painted → the drop-in banner |
| **M1** Cloth                | Rest of Epics 2 and 3           | Shading, colliders, safety and realism against video: flags, curtains, sails         |
| **M2** Ribbons and strings  | Epic 4                          | Rods with twist, as streamers, cursors, windsocks, chimes and bunting                |
| **M3** On the air           | Epic 5                          | Falling plates, kites and balloons as page parts                                     |
| **M4** The air made visible | Epic 6                          | Simulated air around page elements, and the ways to show it                          |
| **M5** Flocks               | Epic 7                          | Topological flocking at murmuration scale                                            |
| **M6** The sky              | Epic 8                          | Atmosphere and volumetric clouds at page cost                                        |
| **M7** On the page          | Epic 9, stories 10.1–10.5, 11.2 | Web-native usefulness, on more than one device                                       |
| **M8** Release              | Rest of Epics 10 and 11         | Published findings, shared pieces moved into the core                                |

Cloth comes first and must not be rushed. M4 and M6 depend only on Epic 1 (and Fire Temple's solvers and kernel), so either can run alongside M1 to M3. M2 needs the cloth engine's aerodynamics (2.3). M3's confetti (5.2) needs the point renderer (1.7). M5 depends on nothing but Epic 1.

Story format: `ID Title [tier] (size)`. Sizes: S ≈ a day or less, M ≈ a few days, L ≈ a week or more.

---

## Epic 1 — Foundation and tooling

- [x] **1.1 Scaffold** (S) — Earth Temple's committed tree copied (`git archive HEAD`). Its effects and its earth-only code are removed:
  - the blade engine;
  - the flower and plant models;
  - the leaf and petal optics;
  - the trample field.

  The wind field, the text field, the stroke renderer, the fold library, night vision, the palettes and the safety checks stay. The `et-` prefix is renamed `wd-`; watch template literals such as `` `--et-${string}` ``. Lilac accent and cool neutrals, with the tier colours checked against it. Dev port 5510, launch config `windtemple`. `dose` is labelled "intensity".

  _Done from Earth Temple's commit 4e84725. Removed: its fifteen effects, `grass/`, `flower/`, `plant/`, `optics/`, the trample field, the blade and petal chunks, their tests, studies and experiments. `et-` is now `wd-`, port 5510, launch config `windtemple`. Lilac accent on cool, blue-grey neutrals in both themes. Tier B moved to teal; green, teal and amber stay clear of the accent, and `tests/contrast.test.ts` passes. The favicon is a lilac pennant on a pole._

- [x] **1.2 `hello`** [A] (S) — the smallest effect: a row of flat ribbon streamers hanging from the top of the view, trailing at the angle the wind sets and fluttering in travelling gusts, in one instanced pass with no compute and no state, with `dose` wired from the start.

  _`hello`: up to 400 streamers, a strip of twelve rows each, a pure function of index and time in one instanced draw. Each trails at an angle set by the wind and the passing gust. A wave runs from its knot to its free end, growing along it, and it twists slowly, showing its darker back by turns. Tied in bunches of three at random angles, with far streamers shorter, narrower and dimmer, because a row of them was a grating. 0.31 ms on Dawn, 0.52 ms in Chrome (0.42 to 0.78 over 3 loads): Tier A. Flash `none`, pattern `low`, and motion inside the caps up to the strong dose. It started in all eight browser-check views with no console errors._

- [x] **1.3 Repository and CI** (S) — its own git repository (`s4njee/windtemple`). The other families' repositories were created private and made public on the user's word, since private repositories cannot run Actions on this account. The CI workflow runs on software Vulkan (lint, format, typecheck, tests, build) and is green once.

  _Public repository `s4njee/windtemple`, created private and made public on the user's word. CI green on its first run once public (446ce5e)._

- [x] **1.4 Deploy** (S) — Cloudflare Pages project `windtemple` (classic, created with `--force`), and an `npm run deploy` that builds, checks the bundle and uploads `dist`.

  _Live at <https://windtemple.pages.dev>, deployed from 446ce5e (classic Pages project, created with `--force` from a scratch directory)._

- [ ] **1.5 Posters, catalogue and the holofx site** (S) — posters from held frames, `catalogue.json`, and Wind Temple in the holofx site's dropdown, lab and effect pages.

  _Posters for `hello` and `banner`, and `catalogue.json`, done. Still to do: the holofx site._

- [x] **1.6 Support matrix delta** (S) — what this family leans on beyond Fire Temple's [support matrix](../firetemple/docs/support-matrix.md) and Earth Temple's [delta](../earthtemple/docs/support-matrix.md):
  - `maxComputeWorkgroupStorageSize` (16 KiB by default) and `maxComputeInvocationsPerWorkgroup` (256), for a small cloth solved in one workgroup;
  - the cost of a dispatch, and of many small dispatches in one compute pass, for XPBD's substeps;
  - `dispatchWorkgroupsIndirect`, for confetti and flocks whose counts change;
  - storage atomics on `u32` as fixed point, since WGSL has no float atomics, for scattering forces;
  - `float32-filterable`, for air velocity textures;
  - `subgroups` where offered, for flock neighbour reductions;
  - timestamp queries inside compute passes, to time substeps.

  _[docs/support-matrix.md](docs/support-matrix.md), by `node experiments/support-probe.mjs` in headless Chrome 156 on this Mac. A full 16 KiB workgroup array works (32 KiB is offered, the default is asked for). A trivial dispatch costs 4.5 to 4.9 µs: a dispatch per constraint colour per substep would be 1.1 ms a frame of overhead alone, which is why the cloth runs in one. Indirect dispatch works from counts written in a separate pass; written, or merely bound as storage, in the pass that reads them, it is a validation error. Fixed-point sums by `u32` atomics are exact. `float32-filterable`, `subgroups` and timestamps in compute passes are offered._

- [x] **1.7 Point-source renderer** (S) — Moon Temple's energy-conserving points, aperture and glare, from Star Temple's port (its 1.7), in `src/gpu/points/`. Tested as there: a moving point's total energy holds steady across pixels.

  _Copied from Star Temple's committed tree (71e7279): `src/gpu/points.ts` and its shader, `glare/`, `optics/aperture.ts` and `shapes.ts`, `src/wgsl/aperture.wgsl`, with `tests/points.test.ts` and `tests/glare.test.ts`, which pass here unchanged. Nothing uses them yet._

- [x] **1.8 Fire Temple's solvers and kernel** (S) — the 2D and 3D stable-fluids solvers, MacCormack advection, vorticity confinement, smoke shading and the volume ray-march kernel, ported with their tests, for Epics 6 and 8.

  _Copied from Fire Temple's committed tree: `src/gpu/sim/` (2D and 3D stable fluids, multigrid pressure, obstacles and their shapes, the stirring helper), `src/gpu/volume/` (the reduced-resolution volume kernel, blue-noise jitter, depth-aware upsampling), `src/gpu/scene/camera.ts`, the half-float helpers, and the `fluid`, `smoke` and `volume` chunks, with their tests and Fire Temple's `library.ts` and `wgsl-eval.ts` test helpers. 181 tests pass here. Fire Temple's firelight half of its smoke-light tests is not ported. Nothing uses them yet._

## Epic 2 — The cloth engine

The engine behind every flag, banner, curtain and sail, and the part that has to be right. Position-based dynamics as games use it (Müller et al.; Macklin et al.), with aerodynamics on every triangle, rebuilt for WebGPU and measured. Its flapping must come out of the cloth and the air, never be painted on.

- [x] **2.1 The wind in 3D** [—] (M) — `src/gpu/wind/`. Earth Temple's ground wind (its 2.4) widened:
  - a wind that grows with height, by the log wind profile;
  - gusts as fronts of 3D noise carried along the wind, with a turbulence intensity;
  - a slow veer;
  - sampled at any point and time by a WGSL chunk and its TypeScript twin.

  The wind stays stateless. Tested: the shader matches its twin; the mean speed grows with height as the profile says; points a metre apart move together and points tens of metres apart do not.

  _`src/wgsl/air.wgsl` and its twin `src/gpu/wind/air.ts`: the log wind profile (4 m/s at 10 m over grass by default), gust fronts of 3D value noise carried along at the mean speed and stretched across the wind, turbulence in three components (the vertical half the others) scaled to the asked-for intensity (the noise's measured rms is 0.185, so it is scaled by 5.4), and a slow veer. Tested (`tests/air.test.ts`): the shader matches its twin within 2e-4 of the speed; the mean follows the profile; the turbulence is within 15% of what is asked; speeds a metre apart correlate above 0.8, and 60 m apart across the wind below 0.3._

- [x] **2.2 XPBD cloth** [—] (L) — `src/gpu/cloth/`. Particles on a grid mesh, with:
  - stretch and shear constraints, and bending by an isometric model (Bergou et al.);
  - stiffness as XPBD compliance (Macklin, Müller and Chentanez), so it does not depend on the step or the iteration count;
  - small steps: many substeps of one iteration each, the frame's time split evenly and clamped at low frame rates;
  - three ways to solve on the GPU:
    - Jacobi with averaging;
    - Gauss–Seidel over constraint colours (a grid's structural constraints need four);
    - a small cloth solved entirely in one workgroup's shared memory, with every substep in one dispatch.

  A CPU twin solves the same cloth for the tests. Tested:
  - stretch under 1% hanging at rest;
  - energy never grows with the wind off;
  - the answer converges as substeps rise;
  - the GPU matches the twin;
  - a run at 15 fps stays stable and close to one at 60.

  _`src/gpu/cloth/cloth.{ts,wgsl}`. One of the three solvers is built: the whole frame's substeps in one dispatch of one workgroup of 256, positions in its shared memory (so a cloth is at most 1,024 particles), constraints in twelve colours of Gauss–Seidel with a workgroup barrier between them. The probe (1.6) puts a dispatch at about 5 µs, so the dispatch-per-colour and Jacobi solvers are left for 2.8 to compare. Bending is distances across two cells, not Bergou's isometric model, which is still to try. The default substep is 1/960 s: at 1/480 a banner in an 8 m/s gust stretched 13%, at 1/960 2%. A weighted hem is an option (`weight`). Tested (`tests/cloth.test.ts`): the GPU matches the twin within half a millimetre after half a second of gusty wind; a hanging banner stretches under 1%; with the air off, a cloth swinging from one corner never gains energy; the answer converges as substeps shrink from 1/240 to 1/1920; a run at 15 fps stays finite, under 5% stretch, and its centre within 5 cm of the 60 fps run's. Not the same run: the wind is sampled once a frame (2.3)._

- [x] **2.3 Aerodynamics** [—] (M) — the force of the air on each triangle, from the wind (2.1) relative to the triangle's own motion:
  - pressure drag along the normal, which grows with the square of the speed across the face;
  - a weaker friction along it.

  Nothing else drives the cloth, so the flapping must come from the instability. Tested:
  - with no wind a sheet hangs still;
  - in a steady wind a flag past its critical speed flaps, and below it does not;
  - the flapping frequency grows in proportion to the wind speed, at a Strouhal-like constant to compare with 2.9's video;
  - waves run from the pole to the free edge and grow along the way.

  _In `cloth.wgsl`: each cell is a flat plate, pushed along its normal by ½ρ C_n A v_n|v_n| (C_n 1.1) of the wind relative to the cloth, with a weak friction along it (C_t 0.02); a quarter goes to each corner. The wind is sampled once a frame at each cell's centre, and the cloth's own velocity every substep: sampling the wind every substep at every corner was most of the solver's cost. Tested on a 1 × 0.6 m flag on a pole (`tests/flutter.test.ts`), nudged by one second of turbulence and then left in a perfectly steady wind: with no wind it hangs still; at 1 m/s the nudge dies away; at 4, 8 and 12 m/s it keeps flapping, as large in the last four seconds as in the first, so the flutter is an instability of the cloth and the air, not the nudge decaying; f·L/U is 0.20, 0.27 and 0.27, within 15% between 8 and 12 m/s; the phase lags at every step from the pole to the free edge, and the amplitude grows. Comparing those numbers with real flags is 2.9's. A flag hung exactly in line with a steady wind feels no force at all and never starts: it needs the veer or turbulence the default wind has._

- [ ] **2.4 Pins, attachments and colliders** [—] (M) — the ways cloth is held and touched:
  - pinned edges and corners;
  - rings that slide along a rail, for curtains;
  - a pole the cloth wraps;
  - spheres and capsules;
  - page elements as boxes from `dom-rects.ts`, so cloth can drape over a card;
  - the pointer as a collider and as a hand that grabs and drags.

  Tested: no particle ends inside a collider after a step; a grabbed point follows the pointer without stretching the cloth more than 2%.

- [ ] **2.5 Shading cloth** [—] (M) — normals from the mesh, and two-sided lighting with each side's own colour. The terms:
  - **Translucency:** light through thin fabric, so a backlit flag glows and its folds show as darker bands.
  - **Sheen:** a weave's sheen, broad on cotton and sharp on silk and satin, after a production sheen model (Estevez and Kulla), checked against Irawan and Marschner's woven-cloth measurements.
  - **Velvet:** for the heavy curtains.
  - **Prints:** an image, canvas or text field (from the font distance field) that the page gives, printed on the cloth in its own texture space, so a fold hides it and does not stretch it.
  - **Edges:** multisampled edges, with centroid interpolation.

  Tested: energy is kept; a printed image keeps its texels' area within 1% on a flat cloth.

- [ ] **2.6 Cloth on the page** [—] (S) — cloth sized to an element:
  - It is remeshed on resize, carrying its state over, so it does not jump.
  - It is run to rest before the first frame, so the first frame is not a sheet falling into place.
  - Its held frame is a settled state at a lull.
  - It is reset cleanly after a pause longer than a few seconds.
  - It is baked into a keyframe buffer and played back when a scroll scrubs it.

  Tested: a resize mid-gust moves no particle further than a step would; a scrubbed bake matches the live run frame for frame.

- [ ] **2.7 Flutter safety** [—] (S) — flapping cloth is a periodic change of light and shade at a few hertz. The flash check runs over the whole cloth and over 5 × 5 pixel regions (Earth Temple's shimmer test) at many frame phases. Measured:
  - the banner width, wind speed and fold contrast at which a full-width banner trips the flash rule;
  - how much a stripe printed on moving cloth reads as a grating.

  The defaults sit inside both, and the notes give the limits.

- [ ] **2.8 Study: solvers** [—] (M) — Jacobi, coloured Gauss–Seidel and the one-workgroup solver, by particles per millisecond and by look, on Dawn and in Chrome. Also measured:
  - substeps against iterations;
  - the largest cloth for each tier;
  - where a CPU solver (JavaScript or WebAssembly) beats the GPU for a small cloth;
  - what self-collision by a spatial hash costs, and whether any story here needs it.

- [ ] **2.9 Realism against video** [—] (M) — flags in reference clips (Wikimedia Commons, CC0 or CC BY, or the user's own), measured frame by frame:
  - flapping frequency against the wind speed, where the clip gives it or it can be estimated;
  - wave speed along the flag;
  - how the amplitude grows to the free edge.

  The simulation is run at a matched wind and shown side by side. The notes say what still gives it away.

## Epic 3 — Flags, banners and curtains

- [x] **3.1 `banner`** [A → B] (S) — the drop-in: a pennant or a banner hanging across a section heading, carrying the heading's text or the page's logo, stirring in a soft breeze. Small enough for one workgroup. Compared with a CSS wave in 3.9.

  _`banner`: 2.4 × 0.8 m of cotton, 37 × 13 particles, hung by rings every fourth particle, with a hem four times as heavy, carrying a line of text (default "Wind Temple") from the text field. Fabrics cotton, silk and canvas; colours lilac, navy, cream and crimson. Drawn by vertex pulling into a 4× multisampled target, two-sided, with light through the fabric, a sheen, and a wooden rod. Settled for 2.5 s before its first frame, and again in a calm wind when motion is held. 0.42 ms on Dawn, 1.59 ms in Chrome (1.56 to 1.62 over 3 loads), the cloth's pass 0.76 ms at 120 Hz: **Tier A**. The cloth first cost 2.26 ms in Chrome at 120 Hz. Sampling the wind once a cell a frame took it to 1.50, shared memory to 1.00, and a coarser grid to 0.76. Lettering at 42% of the depth read pattern `high` (condensed capitals are a row of stems); at 30% it reads `none` at full contrast. Flash `low` (one cell, once in four seconds, the edge over a dark page). The CSS comparison is 3.9's._

- [ ] **3.2 `flag`** [B] (M) — a flag on a pole in a steady wind with gusts, carrying an image the page gives, against a sky:
  - presets for silk, cotton and heavy canvas;
  - the pointer turns the wind;
  - it backlights when the sun is behind it.
- [ ] **3.3 `curtain-reveal`** [B] (M) — theatre curtains that part to reveal a section, on load or on a click: heavy velvet gathered on a rail, its folds swinging as it opens. The pointer pushes it. Reduced motion shows a fade.
- [ ] **3.4 `unveil`** [B] (M) — a sheet pulled off an element, as at a product launch: it slides over the card's box, catches on its corners and falls away. Scroll scrubs a baked run (2.6).
- [ ] **3.5 `sheer-curtain`** [A → B] (S) — a sheer net curtain at an open window, breathing in and out in a breeze, backlit by the day outside. Calm enough to sit behind hero text.
- [ ] **3.6 `washing-line`** [B] (M) — cards or product images pegged on a line, swinging and flapping on it. Drag one to unpeg it and see it fly. A gallery component.
- [ ] **3.7 `sail`** [B] (M) — a sail that fills and luffs as the wind veers, with the pointer steering it: its belly from the pressure across it, its leading edge shivering when it is too close to the wind. A travel or sailing page's hero.
- [ ] **3.8 `prayer-flags`** [B] (S) — a garland of small flags strung across a section in the five colours in their order, each flag its own cloth, the string sagging between posts. The notes credit the Tibetan tradition. The flags are plain, with no mantras printed.
- [ ] **3.9 Study: CSS and SVG flags** [—] (S) — the common CSS flag (an element sliced into strips, each offset on a sine), SVG turbulence displacement and Canvas 2D, against 3.1. What each costs, and what it cannot do: fold over itself, catch light through the cloth, or respond to a gust.

## Epic 4 — Ribbons, strings and things that hang

- [ ] **4.1 Rods and ribbons** [—] (M) — `src/gpu/rod/`. XPBD rods with orientation and twist (Kugelstadt and Schömer's Cosserat rods):
  - strings and lines as thin rods;
  - ribbons as rods with a width and a preferred bending plane, with 2.3's aerodynamics on their faces, which is what makes a streamer flutter and twist;
  - a catenary for a slack line under its own weight.

  Tested: length is kept within 1%; twist is conserved with no torque; a slack line hangs as a catenary.

- [ ] **4.2 `streamers`** [A] (S) — `hello` made physical: ribbon streamers tied along a vent, a door frame or a section's top edge, lifting and fluttering in gusts. A CSS version is beside it.
- [ ] **4.3 `ribbon-cursor`** [B] (S) — a ribbon trailing the pointer like a gymnast's ribbon, twisting and turning to show its back as it follows. Compared with Fire Temple 7.7's trails.
- [ ] **4.4 `windsock`** [A → B] (S) — a windsock that fills as the scroll speeds up, or as an upload makes progress. It fills at the speed where its cone's drag lifts it, and droops in a lull. A speed or progress indicator.
- [ ] **4.5 `wind-chimes`** [B] (M) — tubes hanging from a ring, swinging in a draft and striking each other. Hovering sets them going. Visual only.
- [ ] **4.6 `mobile`** [B] (M) — a hanging mobile of cards, balanced arm by arm and turning slowly in the draft: navigation or a gallery. Balance comes from torques, so a heavier card hangs nearer its pivot. In the spirit of Calder's mobiles, with no copy of one.
- [ ] **4.7 `bunting`** [A] (S) — triangular pennants on a sagging string, each flicking in the gusts, for a festival or party header. The string is a catenary under tension; the pennants are small cloths or, at Tier A, stiff plates on hinges.
- [ ] **4.8 `tassels`** [B] (S) — a fringe of tassels or threads along a card's lower edge, swinging as the card moves or the pointer brushes it. Thin strings, through the shimmer test.

## Epic 5 — On the air

Things the wind carries. Most are falling plates, which flutter from side to side or tumble end over end, depending on their size, thickness and weight.

- [ ] **5.1 Falling plates** [—] (M) — `src/gpu/flight/`. Andersen, Pesavento and Wang's quasi-steady model of a falling plate: lift from circulation, drag and added mass. Regimes:
  - fluttering, tumbling and chaotic falls, set by thickness and size;
  - a spinning plate's Magnus lift.

  Shared with Earth Temple's falling leaves (its 4.1): whoever builds it first puts it in the core. Tested: the regimes come out where the paper puts them; terminal speeds match the plate's weight and drag.

- [ ] **5.2 `confetti`** [A → B] (M) — a burst on a success state:
  - paper squares and foil strips, fluttering and tumbling down by 5.1;
  - foil glints as point sources (1.7), their rate capped;
  - settling on the tops of page elements.

  Compute with indirect draws. Near pieces are blurred.

- [ ] **5.3 `paper-blown-away`** [B] (M) — a transition: the outgoing section, re-rendered as content, comes apart into sheets that a gust lifts and carries off, each tumbling by 5.1.
- [ ] **5.4 `letters-on-the-wind`** [B] (M) — a heading's letters (from the font distance field) lifted off one by one, fluttering away downwind, then drifting back into place. A transition or a 404 page.
- [ ] **5.5 `feather`** [A] (S) — a feather drifting down in a slow pendulum fall, spinning on its quill: a plate with a heavy edge. A calm loader.
- [ ] **5.6 `kite`** [B] (M) — a kite on a line, following the pointer. It flies at the angle where lift, drag, its weight and the line's pull balance. It swoops and stalls in gusts, and its tail is a ribbon (4.1). The line is a rod with sag, so a slack line droops.
- [ ] **5.7 `balloons`** [B] (M) — helium balloons on strings, tugging and bobbing in the wind, buoyancy against drag. On success they are let go, rising and drifting downwind. Their strings are rods, and their skins have a thin highlight.
- [ ] **5.8 `paper-plane`** [B] (M) — a paper plane thrown from the pointer: a glider's slow rise and fall (Lanchester's phugoid), a stall if thrown too steeply, and a landing on a page element.
- [ ] **5.9 Study: plates against keyframes** [—] (S) — 5.2's confetti against canvas confetti that wobbles on a sine, which most sites use: cost per piece, pieces per tier, and how close the cheap version gets.

## Epic 6 — The air made visible

- [ ] **6.1 Simulated air** [—] (L) — `src/gpu/air/`. Two solvers:
  - Fire Temple's 2D stable fluids (1.8), with page elements as obstacles from `dom-rects.ts` and the pointer as a fan;
  - a lattice Boltzmann solver (D2Q9), compared with it. It is local, parallel, and good at vortex shedding at moderate Reynolds numbers.

  Measured: cost per cell step; the Strouhal number behind a cylinder (about 0.2 over a wide range of Reynolds numbers); stability at a page's frame rates.

- [ ] **6.2 Tracers** [—] (M) — the ways to show the air over a velocity texture, each its own renderer:
  - smoke wires (streaklines from a rake);
  - dye injection;
  - particles with trails (Fire Temple 7.7's choice);
  - line integral convolution (Cabral and Leedom);
  - arrows.

  Streamlines and a rake of smoke wires are parallel lines, a grating, so their spacing and contrast are checked by the pattern rule.

- [ ] **6.3 `wind-tunnel`** [B] (M) — a heading or logo in a wind tunnel: smoke streaks flow round it, separate from its edges and shed vortices behind it. The pointer adds an obstacle. A science or engineering hero.
- [ ] **6.4 `vortex-street`** [B] (S) — a Kármán vortex street behind a card or behind the pointer, as clouds show downwind of islands in satellite pictures. A divider or a footer.
- [ ] **6.5 `wind-map`** [B] (M) — an animated wind map after Viégas and Wattenberg's _Wind Map_ and Beccario's _earth_: particles with fading trails over a region or the world. Two sources:
  - a synthetic field;
  - a baked sample of real winds. NOAA's GFS output is public domain, and Natural Earth's coastlines are too. Fetching them needs the user's go-ahead when the story is built.

  A hero for a weather or climate page.

- [ ] **6.6 `incense`** [A] (S) — a thin thread of smoke rising from incense or a snuffed wick, laminar at first and breaking into turbulence as it rises, leaning in the pointer's draft. Fire Temple's smoke shading. Calm, for a wellness page.
- [ ] **6.7 `dust-devil`** [B] (M) — a column of spinning air (a Burgers–Rott vortex) wandering across a section, lifting dust and debris as points. Its rotation is checked against the motion caps.
- [ ] **6.8 `fan`** [C] (M) — the pointer as a fan blowing on a section full of things from the other epics (streamers, papers, a curtain), all coupled to one air grid. The playground that shows the engines together.
- [ ] **6.9 Study: air** [—] (S) — stable fluids against lattice Boltzmann, by cost and look; grid resolution per tier; LIC against particles; and a stateless curl-noise field as the cheapest stand-in.

## Epic 7 — Flocks

- [ ] **7.1 Flocking** [—] (M) — `src/gpu/flock/`. Reynolds' rules (separation, alignment, cohesion), with each bird's six or seven nearest neighbours whatever their distance (Ballerini et al.). The neighbours are found from a spatial hash (hologpu's grid). Compared with Hildenbrandt, Carere and Hemelrijk's _StarDisplay_ model. Tested:
  - the neighbours match a CPU reference;
  - the flock holds together as it thins and packs;
  - nothing blows up at low frame rates.
- [ ] **7.2 `murmuration`** [C] (L) — starlings at dusk: tens of thousands of point birds, with waves of turning rippling through them and a falcon (the pointer) they part around. Points from 1.7. A dense, dark flock over a bright sky is a moving pattern, so its density and contrast are checked.
- [ ] **7.3 `birds-crossing`** [A] (S) — a few birds crossing a hero's sky, flapping and gliding, or circling on a thermal. Ambient, and sparse enough for Tier A.
- [ ] **7.4 `flock-text`** [B] (M) — a flock that gathers into a word (from the text field) and scatters when the pointer comes near. A transition, compared against boids with metric neighbours.
- [ ] **7.5 Study: flocks** [—] (S) — cost by bird count and neighbour search on Dawn and in Chrome, birds per tier, and the JavaScript baseline.

## Epic 8 — The sky

- [ ] **8.1 Atmosphere** [—] (M) — `src/gpu/sky/`. Hillaire's lookup-table sky at page cost:
  - transmittance, multiple scattering, the sky view and aerial perspective;
  - the sun placed by time of day and place.

  Tested against Bruneton and Neyret's precomputed scattering at a few sun angles. The tables are shared code, so Star Temple's atmosphere from orbit can use them.

- [ ] **8.2 Volumetric clouds** [—] (L) — clouds after Schneider's for _Horizon Zero Dawn_:
  - shapes from Perlin–Worley noise, under a coverage map;
  - ray-marched with Fire Temple's kernel at low resolution, with temporal reprojection;
  - lit by 8.1's sky, with a two-lobed phase function for silver edges and the darkening of thin edges facing the sun.

  The wind moves them, faster with height. Compared with Earth Temple's 2D cloud layer on cost and look.

- [ ] **8.3 `sky-hero`** [B] (M) — a living sky behind a hero, with clouds drifting. The time of day comes from the visitor's clock or from the scroll.
- [ ] **8.4 `time-lapse`** [C] (M) — clouds racing, forming and dissolving as in a time-lapse film. This is the family's whole-field motion case: its speed is capped, and the strong presets are declared and gated.
- [ ] **8.5 `sunset`** [B] (S) — golden hour into blue hour: the sky's colour from 8.1, and clouds lit from below as the sun sets. The scroll sets the sun.
- [ ] **8.6 `contrails`** [A] (S) — aircraft contrails drawn across a blue sky, spreading and drifting downwind in the wind's shear. A divider or a progress line.
- [ ] **8.7 `skywriting`** [B] (M) — a word written in smoke by a plane, from the text field, drifting and spreading in the wind until it can no longer be read. A launch announcement.
- [ ] **8.8 Study: skies** [—] (S) — clouds' cost by resolution and step count, per tier, against Earth Temple's 2D layer and a CSS gradient sky.

## Epic 9 — On the page

- [ ] **9.1 Celebration** [B] (M) — a form's or checkout's success state: confetti (5.2), balloons let go (5.7) and bunting (4.7), with `dose` low enough to sit beside the form.
- [ ] **9.2 Launch** [B] (M) — a product launch page: curtains part (3.3), the product is unveiled (3.4) and its name is skywritten (8.7).
- [ ] **9.3 Weather and climate** [B] (M) — a wind map hero (6.5), a living sky (8.3) and a windsock (4.4) reading the scroll.
- [ ] **9.4 Loaders and indicators** [A] (S) — a pinwheel spinner that turns at the wind's speed, a feather (5.5) and a windsock filling with progress, each as a drop-in, beside CSS spinners.
- [ ] **9.5 Wind energy** [B] (M) — a sustainability page with wind turbines turning in the gust field, each at its tip-speed ratio, and a wind map of the region behind them.
- [ ] **9.6 Headings** [A → B] (S) — banners (3.1), letters on the wind (5.4) and skywriting (8.7) as one set of heading treatments.

## Epic 10 — Production readiness

- [ ] **10.1 Library entry** (S) — mount any effect on a caller's canvas, with element tracking for cloth that hangs from or drapes over page elements, as the other families do.
- [ ] **10.2 Simulations on low-end devices** (M) — cloth resolution, substeps, confetti counts, flock sizes and cloud resolution by device, and what each looks like on a phone at DPR 3.
- [ ] **10.3 Accessibility** (M) — `docs/accessibility.md`:
  - flash, pattern and motion over every preset;
  - the flutter, stripe and whole-sky limits from 2.7, 6.2 and 8.4;
  - held frames and the start gate;
  - cloth and confetti on the page that never hide text or controls for longer than a moment.
- [ ] **10.4 CSS fallbacks** (S) — for each Tier A effect, the best CSS or SVG version beside it, with its cost and what it cannot do.
- [ ] **10.5 Adaptive quality** (S) — cloth resolution, substeps, counts, air grid size and cloud steps scale with the measured frame time, from the shared rungs.
- [ ] **10.6 Into the temple core** (M) — move the following into `@mk7s/hologpu-temple-core`:
  - the 3D wind (2.1);
  - the cloth solver and aerodynamics (2.2–2.4);
  - rods and ribbons (4.1);
  - falling plates (5.1);
  - the air solvers and tracers (6.1, 6.2);
  - flocking (7.1);
  - the atmosphere and clouds (8.1, 8.2).

## Epic 11 — Measurement and findings

- [ ] **11.1 Cost studies** (S) — every epic's effects on Dawn and in Chrome, with particles, substeps, pieces and birds beside milliseconds, and memory and state size, filed in `docs/studies/`.
- [ ] **11.2 Device matrix** (M) — an integrated GPU, a phone, and Safari and Firefox, to settle the provisional tiers and check compute-heavy simulation everywhere.
- [ ] **11.3 Cloth crossover** (S) — 3.9's answer on more devices: when CSS, Canvas 2D and WebGPU each stop being the right choice for a flag.
- [ ] **11.4 Decision guide** (S) — which effect for which job, how much simulation a page can afford, and the cases where the answer is "don't".

## Risks and open questions

- **State on a page.** Cloth, air, confetti and flocks keep state. A pause, a resize, a hidden tab and a held frame each need a settled state, and scrubbing by scroll needs a bake. If 2.6's rules don't hold for every engine, some effects stay out of the page contexts.
- **Small simulations, large overheads.** A page's cloth is a few thousand particles. Many small dispatches a frame may cost more than the arithmetic, and a WebAssembly solver may win on the CPU. 2.8 is the experiment. The one-workgroup solver is limited by shared memory (16 KiB by default), which holds about 1,300 particles' positions.
- **Flapping as flash.** A banner across the page flapping at three or four times a second, with strongly shaded folds, is the flash rule's case. 2.7 finds the limit, and it may be lower than a real flag's look needs.
- **Moving gratings.** Stripes on cloth, rakes of smoke wires and fields of streamlines move. The pattern guidance treats moving patterns as worse than still ones, but the analyser checks frames one at a time. Does it need a moving-pattern reading?
- **Whole-field skies.** Clouds at one height drifting together are whole-field motion. Is a living sky inside the motion caps at a speed that still reads as alive, or does it have to sit nearly still behind text?
- **Murmurations.** A dense, dark flock over a bright sky is a moving high-contrast pattern. Its default may have to be sparser than the real thing.
- **Realism is partly measurable.** Flapping frequency and wave speed can be measured from video, but a clip rarely gives the wind speed. The comparison is of shapes and ratios, not absolutes, and the notes say so.
- **Data and reference licences.** NOAA's GFS output and Natural Earth's coastlines are public domain. Reference clips must allow showing them on a public site, with credit. The user's own video would avoid the question.
- **Overlap with Earth Temple.** The falling-plate model is wanted by both families. Building it twice would waste the work, so it goes to the core as soon as either builds it.
- **Cultural care.** Prayer flags are a living religious tradition. The notes credit it, the flags are plain, and the effect is offered for what it is, not as decoration with a borrowed meaning.
- **Accent.** Lilac is a proposal; check it in the holofx site's dropdown beside the other families before committing to it.
- **Scope.** Seven effect epics is a lot. Cloth is first and must not be rushed. The sky (Epic 8) could be its own family if this one runs long.

## Starting references

From memory, as the other families' plans began; each is to be confirmed against the source when its story is built.

- Matthias Müller, Bruno Heidelberger, Marcus Hennix and John Ratcliff, "Position Based Dynamics", _Journal of Visual Communication and Image Representation_ (2007).
- Miles Macklin, Matthias Müller and Nuttapong Chentanez, "XPBD: Position-Based Simulation of Compliant Constrained Dynamics", Motion in Games 2016.
- Miles Macklin, Kier Storey, Michelle Lu, Pierre Terdiman, Nuttapong Chentanez, Stefan Jeschke and Matthias Müller, "Small Steps in Physics Simulation", SCA 2019.
- Marco Fratarcangeli and Fabio Pellacini, "Scalable Partitioning for Parallel Position Based Dynamics", Eurographics 2015.
- Xavier Provot, "Deformation constraints in a mass-spring model to describe rigid cloth behavior", Graphics Interface 1995.
- David Baraff and Andrew Witkin, "Large Steps in Cloth Simulation", SIGGRAPH 1998.
- Miklós Bergou, Max Wardetzky, David Harmon, Denis Zorin and Eitan Grinspun, "A Quadratic Bending Model for Inextensible Surfaces", SGP 2006.
- Tassilo Kugelstadt and Elmar Schömer, "Position and Orientation Based Cosserat Rods", SCA 2016.
- Médéric Argentina and L. Mahadevan, "Fluid-flow-induced flutter of a flag", _PNAS_ (2005).
- Michael Shelley and Jun Zhang, "Flapping and Bending Bodies Interacting with Fluid Flows", _Annual Review of Fluid Mechanics_ (2011).
- Piti Irawan and Steve Marschner, "Specular Reflection from Woven Cloth", _ACM Transactions on Graphics_ (2012).
- Alejandro Conty Estevez and Christopher Kulla, "Production Friendly Microfacet Sheen BRDF", Sony Pictures Imageworks (2017).
- Anders Andersen, Umberto Pesavento and Z. Jane Wang, "Unsteady aerodynamics of fluttering and tumbling plates", _Journal of Fluid Mechanics_ (2005).
- Frederick Lanchester, _Aerodonetics_ (1908): the phugoid.
- Theodore von Kármán (1911) and Vincenc Strouhal (1878): the vortex street and its frequency.
- Jos Stam, "Stable Fluids", SIGGRAPH 1999.
- Ronald Fedkiw, Jos Stam and Henrik Wann Jensen, "Visual Simulation of Smoke", SIGGRAPH 2001.
- Timm Krüger et al., _The Lattice Boltzmann Method: Principles and Practice_ (2017).
- Brian Cabral and Leith Leedom, "Imaging Vector Fields Using Line Integral Convolution", SIGGRAPH 1993.
- Fernanda Viégas and Martin Wattenberg, _Wind Map_ (hint.fm, 2012).
- Cameron Beccario, _earth_ (earth.nullschool.net, 2013).
- Craig Reynolds, "Flocks, Herds, and Schools: A Distributed Behavioral Model", SIGGRAPH 1987.
- Michele Ballerini et al., "Interaction ruling animal collective behavior depends on topological rather than metric distance: evidence from a field study", _PNAS_ (2008).
- Andrea Cavagna et al., "Scale-free correlations in starling flocks", _PNAS_ (2010).
- Hanno Hildenbrandt, Claudio Carere and Charlotte Hemelrijk, "Self-organized aerial displays of thousands of starlings: a model", _Behavioral Ecology_ (2010).
- Sébastien Hillaire, "A Scalable and Production Ready Sky and Atmosphere Rendering Technique", EGSR 2020.
- Eric Bruneton and Fabrice Neyret, "Precomputed Atmospheric Scattering", EGSR 2008.
- Andrew Schneider and Nathan Vos, "The Real-time Volumetric Cloudscapes of _Horizon Zero Dawn_", SIGGRAPH 2015 Advances in Real-Time Rendering.
- Sébastien Hillaire, "Physically Based Sky, Atmosphere and Cloud Rendering in Frostbite", SIGGRAPH 2016 Physically Based Shading course.
- Miles Loyd, "Crosswind kite power", _Journal of Energy_ (1980).
