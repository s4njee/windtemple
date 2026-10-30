import { createHdrTail, OVERLAY_PARAMS, TAIL_PARAMS } from '../../gpu/post/index.ts';
import { DOSE_PARAMS, dosed, heldDose } from '../../gpu/safety/dose.ts';
import { createShader, withChunks } from '../../gpu/shader.ts';
import { createUniformBuffer, defineUniformStruct } from '../../gpu/uniforms.ts';
import { defineEffect } from '../types.ts';
import shader from './streamers.wgsl';
import { meta } from './meta.ts';

const Params = defineUniformStruct('Params', {
  width: 'f32',
  height: 'f32',
  time: 'f32',
  wind: 'f32',
  long: 'f32',
  ribbon: 'f32',
  count: 'f32',
});

/** The most streamers the widest row draws. */
const MAX_STREAMERS = 400;
/** Vertices per streamer: twelve rows of two. */
const VERTICES = 24;

const NO_TONEMAP = { output: { tonemap: 'none' } } as const;

export const effect = defineEffect({
  meta,
  params: {
    ...DOSE_PARAMS,
    length: { type: 'number', default: 1, min: 0.3, max: 2, step: 0.05 },
    density: { type: 'number', default: 1, min: 0.2, max: 2, step: 0.05 },
    ...TAIL_PARAMS,
    bloom: { ...TAIL_PARAMS.bloom, default: 0 },
    ...OVERLAY_PARAMS,
    alpha: { ...OVERLAY_PARAMS.alpha, default: 'coverage' },
  },
  presets: {
    breeze: {},
    still: { dose: 0.1 },
    long: { length: 1.8 },
  },

  async create({ device, format, hdr, params, profiler }) {
    const tail = createHdrTail(device, { format, hdr, label: 'hello' });
    const uniforms = createUniformBuffer(device, Params, 'hello params');
    const module = createShader(device, withChunks(shader, { 'params.wgsl': Params.wgsl }));
    const pipeline = device.createRenderPipeline({
      label: 'hello streamers',
      layout: 'auto',
      vertex: { module, entryPoint: 'streamer_vs' },
      fragment: {
        module,
        entryPoint: 'streamer_fs',
        // Premultiplied "over", colour and coverage alike.
        targets: [
          {
            format: tail.scene.format,
            blend: {
              color: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha' },
              alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha' },
            },
          },
        ],
      },
      primitive: { topology: 'triangle-strip' },
    });
    const bindGroup = device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [{ binding: 0, resource: { buffer: uniforms.buffer } }],
    });
    let width = 1;
    let height = 1;
    let dpr = 1;
    let clock = 0;

    return {
      resize(w, h, pixelRatio) {
        width = w;
        height = h;
        dpr = pixelRatio;
        tail.resize(w, h);
      },
      frame(time, encoder, target) {
        clock += time.delta;
        const dose = time.still ? heldDose(params.dose) : params.dose;
        // A bunch of three every 80 CSS pixels at density 1.
        const bunches = Math.min(
          MAX_STREAMERS / 3,
          Math.max(1, Math.round((width / dpr / 80) * params.density)),
        );
        uniforms.set({
          width,
          height,
          time: clock,
          wind: dosed(dose, 0, 0.35, 0.65),
          long: Math.min(height * 0.7, 160 * dpr * params.length),
          ribbon: 6 * dpr,
          count: bunches,
        });
        uniforms.upload();
        const pass = encoder.beginRenderPass({
          label: 'hello streamers',
          colorAttachments: [
            {
              view: tail.scene.view,
              loadOp: 'clear',
              clearValue: { r: 0, g: 0, b: 0, a: 0 },
              storeOp: 'store',
            },
          ],
          timestampWrites: profiler.pass('streamers'),
        });
        pass.setPipeline(pipeline);
        pass.setBindGroup(0, bindGroup);
        pass.draw(VERTICES, bunches * 3);
        pass.end();
        // Ribbons are darker than paper white: no tonemap curve to grey them.
        tail.encode(encoder, target, time, params, profiler, NO_TONEMAP);
      },
      destroy() {
        uniforms.destroy();
        tail.destroy();
      },
    };
  },
});
