# Safety

Wind Temple inherits The Hero's Journey's checks, unchanged: the WCAG 2.3.1 flash and red-flash analyser, the regular-pattern analyser after the ITC (Ofcom) guidance, whole-field motion caps from optical flow, red-capped colour, the start gate and held frames. Their rules, sources and limits are written up in [The Hero's Journey's docs/safety.md](../../herosjourney/docs/safety.md). Every effect and preset here runs through them in `npm test`, at the default and at the strong dose (0.7).

The hazards this family expects are in [plan.md](../plan.md): flapping cloth as flicker, stripes and streamlines as moving gratings, skies as whole-field motion, and dense flocks as moving patterns.

What this family has found so far:

- **A row of streamers is a grating.** `hello`'s ribbons, tied one to a slot along the top of the view, were a row of bright stripes, and the pattern analyser read the defaults `high`. Even bunches of five fanned evenly were small gratings of about 10 px. Bunches of three at random angles, with far streamers shorter, narrower and dimmer, bring the defaults to `low` (0.17 of the area limit) and every preset under the limit.
- **A bright ribbon over a dark cell flickers.** `hello` first read flash `low` (one cell, once in four seconds). A lighter back face and a slower twist did not clear it alone; with far streamers dimmed and edges softened as well, it reads `none`.
- **Trailing streamers drift.** At the strong dose, streamers trailing downwind read just over the whole-field drift cap (0.051 against 0.05), as Earth Temple's leaning grass read as a zoom. The strong end's wind is lowered.
