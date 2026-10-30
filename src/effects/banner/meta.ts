import type { EffectMeta } from '../types.ts';

export const meta: EffectMeta = {
  id: 'banner',
  title: 'Banner',
  epic: '3',
  tier: 'A',
  tags: ['cloth', 'text'],
  summary:
    'A banner hung from a rod by rings across a section heading, carrying its text, stirring in a breeze: XPBD cloth whose every cell the 3D wind pushes on, with light through the fabric and a sheen.',
  scorecard: {
    compute: true,
    mobile: 'untested',
    flash: 'low',
    pattern: 'none',
    lightPage: 'yes',
    features: { required: [] },
    fallback: 'The heading in CSS with a gentle skew wave, or the poster.',
    useCases: ['A section heading', 'An event or festival header', 'A shop sign'],
  },
};
