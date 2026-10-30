## How it works

One instanced draw of up to 400 flat ribbons (`streamers.wgsl`) into the HDR scene, then the shared tail with its tonemap off, over the page. A streamer is a triangle strip of twelve rows, tied at the top of the view. Everything about it is a pure function of its index and the time: where it is tied, how long it is, how it trails and how it flutters. There is no state, so a held frame and a poster are the same streamers.

- **Trailing.** A ribbon in a steady wind hangs at the angle where the air's drag on it balances its weight. Here that angle is the wind's strength plus the passing gust, which travels along the row, so neighbours lift together.
- **Flutter.** A wave runs from the knot to the free end, growing as it goes, as a flag's does, and faster in a stronger wind. It is painted here; in the cloth and rod engines (Epics 2 and 4) it will come out of the ribbon and the air.
- **Twist.** Each ribbon twists slowly along its length, so it is seen face-on and edge-on by turns, with its back a little darker than its front.
- **Bunches and depth.** Streamers are tied in bunches of three at knots placed anywhere across their own slot, each fanning out at its own angle. Far ones are shorter, narrower and dimmer. Their edges are a pixel soft.

`dose` ("intensity") sets how hard the wind blows. A bunch every 80 CSS pixels at density 1.

## Cost

On an Apple M1 Max on Dawn ([docs/studies/epic-1.md](../../../docs/studies/epic-1.md)): 0.31 ms per frame at 1080p, the output pass included. In Chrome, one frame on a 1920 × 1080 canvas reads 0.52 ms (0.42 to 0.78 over 3 loads, [browser-check.md](../../../docs/studies/browser-check.md)): Tier A on this machine. 27 kB gzipped with the shared chunks.

## Pitfalls

- **A row of streamers is a grating.** Tied one to a slot along the top, the ribbons were a row of bright stripes against the page, and the pattern check read the defaults `high`. Bunches of five fanned evenly were still a small grating in each bunch, at about 10 px. Three to a bunch at random angles brought the defaults to `low`, but `still` (ribbons hanging nearly straight) and `long` stayed `high`. Depth fixed them: far streamers shorter, narrower and dimmer, so the row is not one layer of equal stripes.
- **A bright ribbon over a dark cell flickers.** The first version read flash `low`: one cell, once in four seconds. Lightening the back from 55% to 80% of the front and twisting more slowly did not clear it alone; with the dimmer far streamers and soft edges as well, it reads `none`. Which change mattered most was not isolated.
- **The strong end drifts.** At dose 0.7 the trailing streamers read 0.051 whole-field drift against a cap of 0.05. The strong end's wind was lowered from 0.8 to 0.65.
- **Flat.** A 2D strip has no depth of its own, no light through the ribbons and no real aerodynamics. `streamers` (4.2) is the physical version.

## Safety

Flash `none`, pattern `low` at the defaults (0.17 of the area limit), and no preset over. Motion stays inside the caps up to the strong dose.

## When to use it

As the template for a new effect. For streamers on a page, `streamers` once it is built.

## References

- Wind Temple [plan.md](../../../plan.md), story 1.2.
