import type { EffectMeta } from '../types.ts';

export const meta: EffectMeta = {
  id: 'hello',
  title: 'Hello',
  epic: '1',
  tier: 'A',
  tags: ['scaffold', 'ribbons'],
  summary:
    'The smallest effect: bunches of flat ribbon streamers hanging from the top of the view, trailing and fluttering in gusts, one instanced draw through the HDR tail, over the page. Every later effect starts from this shape.',
  scorecard: {
    compute: false,
    mobile: 'untested',
    flash: 'none',
    pattern: 'low',
    lightPage: 'yes',
    features: { required: [] },
    fallback: 'CSS-animated ribbons, or the poster.',
    useCases: ['The template for new effects'],
  },
};
