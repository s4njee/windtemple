import { it } from 'vitest';
import { measurePatterns } from '../tests/pattern.ts';

// Story 3.1: the banner's lettering against the pattern rule, at each preset and at three view
// sizes. Writes its readings to $OUT.
//
//   OUT=out.txt npx vitest run --config experiments/vite.config.ts experiments/banner-pattern.test.ts

it('banner presets', { timeout: 900000 }, async () => {
  const lines: string[] = [];
  for (const [w, h] of [[480, 270], [960, 540], [1440, 810]] as const)
    for (const preset of [undefined, 'still', 'gusty', 'silk', 'canvas']) {
      const r = await measurePatterns('banner', { preset, seconds: 2, width: w, height: h });
      lines.push(`${w} ${preset ?? 'defaults'} ${r.verdict} ${r.area.toFixed(3)}`);
    }
  (await import('node:fs')).writeFileSync(process.env.OUT ?? 'output/banner-pattern.txt', lines.join('\n') + '\n');
});
