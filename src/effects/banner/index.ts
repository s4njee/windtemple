import {
  createCloth,
  COTTON,
  type Cloth,
  type ClothOptions,
  type Fabric,
} from '../../gpu/cloth/cloth.ts';
import { frontCamera } from '../../gpu/cloth/camera.ts';
import { linearSampler } from '../../gpu/passes/common.ts';
import { createHdrTail, OVERLAY_PARAMS, TAIL_PARAMS } from '../../gpu/post/index.ts';
import { DOSE_PARAMS, dosed, heldDose } from '../../gpu/safety/dose.ts';
import { createShader, withChunks } from '../../gpu/shader.ts';
import { ANTON } from '../../gpu/text/anton.generated.ts';
import { layoutLine } from '../../gpu/text/font.ts';
import { createTextField, type TextLine } from '../../gpu/text/text-field.ts';
import { createUniformBuffer, defineUniformStruct } from '../../gpu/uniforms.ts';
import { AIR, type Air } from '../../gpu/wind/air.ts';
import { defineEffect } from '../types.ts';
import shader from './banner.wgsl';
import { meta } from './meta.ts';

const BannerParams = defineUniformStruct('BannerParams', {
  view_proj: 'mat4x4f',
  eye: 'vec3f',
  nx: 'u32',
  sun: 'vec3f',
  ny: 'u32',
  sun_colour: 'vec3f',
  sheen: 'f32',
  sky: 'vec3f',
  translucency: 'f32',
  fabric: 'vec3f',
  rod_radius: 'f32',
  ink: 'vec3f',
  rod_a: 'vec3f',
  rod_b: 'vec3f',
});

/** The banner at rest, m: 2.4 wide and 0.8 deep, its rod 3 m up. */
const WIDTH = 2.4;
const HEIGHT = 0.8;
const TOP = 3;
const NX = 37;
const NY = 13;
/** Rings every fourth particle along the top, and at the far end. */
const pinned = (i: number, j: number) => j === 0 && (i % 4 === 0 || i === NX - 1);

const FABRICS: Record<string, { fabric: Fabric; sheen: number; translucency: number }> = {
  cotton: { fabric: COTTON, sheen: 0.25, translucency: 0.5 },
  silk: {
    fabric: { ...COTTON, density: 0.06, bend: 5e-3, damping: 0.04 },
    sheen: 0.9,
    translucency: 0.8,
  },
  canvas: {
    fabric: { ...COTTON, density: 0.35, bend: 4e-4, damping: 0.1 },
    sheen: 0.08,
    translucency: 0.15,
  },
};

/** Linear dye and ink colours. */
const COLOURS: Record<string, { fabric: [number, number, number]; ink: [number, number, number] }> =
  {
    lilac: { fabric: [0.28, 0.14, 0.6], ink: [0.86, 0.8, 0.66] },
    navy: { fabric: [0.025, 0.04, 0.12], ink: [0.86, 0.8, 0.66] },
    cream: { fabric: [0.8, 0.72, 0.54], ink: [0.04, 0.05, 0.12] },
    crimson: { fabric: [0.42, 0.025, 0.04], ink: [0.86, 0.8, 0.66] },
  };

/** The wind blows from the left and a little away from the viewer. */
const DIRECTION: [number, number] = [0.94, -0.34];

const PRINT_W = 1200;
const PRINT_H = 400;

export const effect = defineEffect({
  meta,
  params: {
    ...DOSE_PARAMS,
    text: { type: 'text', default: 'Wind Temple', maxLength: 24 },
    fabric: { type: 'select', default: 'cotton', options: Object.keys(FABRICS) },
    colour: { type: 'select', default: 'lilac', options: Object.keys(COLOURS) },
    ...TAIL_PARAMS,
    bloom: { ...TAIL_PARAMS.bloom, default: 0 },
    ...OVERLAY_PARAMS,
    alpha: { ...OVERLAY_PARAMS.alpha, default: 'coverage' },
  },
  presets: {
    breeze: {},
    still: { dose: 0.1 },
    gusty: { dose: 0.6 },
    silk: { fabric: 'silk', colour: 'crimson' },
    canvas: { fabric: 'canvas', colour: 'cream' },
  },

  async create({ device, format, hdr, params, profiler }) {
    const tail = createHdrTail(device, { format, hdr, label: 'banner' });
    const uniforms = createUniformBuffer(device, BannerParams, 'banner params');
    const module = createShader(
      device,
      withChunks(shader, { 'banner-params.wgsl': BannerParams.wgsl }),
    );
    const field = createTextField(device, ANTON);
    const sampler = linearSampler(device);
    const print = device.createTexture({
      label: 'banner print',
      size: [PRINT_W, PRINT_H],
      format: 'r16float',
      usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
    });
    const capEm = (ANTON.glyphs.H!.bounds[3] - ANTON.glyphs.H!.bounds[1]) / ANTON.unitsPerEm;

    const depthStencil: GPUDepthStencilState = {
      format: 'depth24plus',
      depthWriteEnabled: true,
      depthCompare: 'less',
    };
    const target: GPUColorTargetState = { format: tail.scene.format };
    const multisample = { count: 4 };
    const clothPipeline = device.createRenderPipeline({
      label: 'banner cloth',
      layout: 'auto',
      vertex: { module, entryPoint: 'cloth_vs' },
      fragment: { module, entryPoint: 'cloth_fs', targets: [target] },
      // Seen from the front, a cell's corners run clockwise on screen.
      primitive: { topology: 'triangle-list', cullMode: 'none', frontFace: 'cw' },
      depthStencil,
      multisample,
    });
    const rodPipeline = device.createRenderPipeline({
      label: 'banner rod',
      layout: 'auto',
      vertex: { module, entryPoint: 'rod_vs' },
      fragment: { module, entryPoint: 'rod_fs', targets: [target] },
      primitive: { topology: 'triangle-list' },
      depthStencil,
      multisample,
    });

    let cloth: Cloth | undefined;
    let clothGroup: GPUBindGroup | undefined;
    let rodGroup: GPUBindGroup | undefined;
    let fabricKey = '';
    let printed = '';
    let colour: GPUTexture | undefined;
    let depth: GPUTexture | undefined;
    let width = 1;
    let height = 1;
    let wasStill = false;

    const air = (dose: number, time: number): Air => ({
      ...AIR,
      dir: DIRECTION,
      speed: dosed(dose, 0.3, 1.8, 4.5),
      gust: dosed(dose, 0.2, 0.6, 0.8),
      turbulence: dosed(dose, 0.04, 0.12, 0.16),
      time,
    });

    const build = (key: string) => {
      cloth?.destroy();
      const options: ClothOptions = {
        nx: NX,
        ny: NY,
        width: WIDTH,
        height: HEIGHT,
        origin: [-WIDTH / 2, TOP, 0],
        across: [1, 0, 0],
        down: [0, -1, 0],
        fabric: FABRICS[key]!.fabric,
        pinned,
        // A weighted hem, as hung banners have, so it hangs rather than flies.
        weight: (_, j) => (j === NY - 1 ? 4 : 1),
      };
      cloth = createCloth(device, options);
      // Settled before the first frame, so it never opens on a sheet dropping into place.
      cloth.settle(2.5, air(heldDose(params.dose), -2.5));
      clothGroup = device.createBindGroup({
        layout: clothPipeline.getBindGroupLayout(0),
        entries: [
          { binding: 0, resource: { buffer: uniforms.buffer } },
          { binding: 1, resource: { buffer: cloth.buffer } },
          { binding: 2, resource: print.createView() },
          { binding: 3, resource: sampler },
        ],
      });
      rodGroup = device.createBindGroup({
        layout: rodPipeline.getBindGroupLayout(0),
        entries: [{ binding: 0, resource: { buffer: uniforms.buffer } }],
      });
      fabricKey = key;
    };

    // The line in print pixels: cap height half the banner's depth, fitted to 86% of its width.
    const line = (text: string): TextLine => {
      let size = (0.3 * PRINT_H) / capEm;
      const em = layoutLine(ANTON, text, 0.04).width;
      if (em * size > 0.72 * PRINT_W) size = (0.72 * PRINT_W) / Math.max(em, 1e-3);
      return {
        text,
        x: PRINT_W / 2,
        y: PRINT_H * 0.47 + (capEm * size) / 2,
        size,
        tracking: 0.04,
        align: 'centre',
      };
    };

    return {
      resize(w, h) {
        width = w;
        height = h;
        tail.resize(w, h);
        colour?.destroy();
        depth?.destroy();
        colour = device.createTexture({
          label: 'banner msaa colour',
          size: [w, h],
          format: tail.scene.format,
          sampleCount: 4,
          usage: GPUTextureUsage.RENDER_ATTACHMENT,
        });
        depth = device.createTexture({
          label: 'banner msaa depth',
          size: [w, h],
          format: 'depth24plus',
          sampleCount: 4,
          usage: GPUTextureUsage.RENDER_ATTACHMENT,
        });
      },
      frame(time, encoder, view) {
        if (params.fabric !== fabricKey || !cloth)
          build(params.fabric in FABRICS ? params.fabric : 'cotton');
        const text = params.text.trim().toUpperCase() || ' ';
        if (text !== printed) {
          field.draw(encoder, print.createView(), PRINT_W, PRINT_H, line(text));
          printed = text;
        }
        const c = cloth!;
        if (time.still) {
          // Held frames are lulls: settle once in a calm wind, then hold.
          if (!wasStill) c.settle(2.5, air(heldDose(params.dose), c.clock));
        } else {
          c.step(encoder, time.delta, air(params.dose, c.clock), profiler.pass('cloth'));
        }
        wasStill = !!time.still;

        const camera = frontCamera({
          aspect: width / height,
          centre: [0, TOP - HEIGHT / 2 - 0.02, 0],
          halfWidth: (WIDTH / 2) * 1.12,
          halfHeight: (HEIGHT / 2) * 1.5,
        });
        const look = COLOURS[params.colour] ?? COLOURS.lilac!;
        const fabric = FABRICS[fabricKey]!;
        uniforms.set({
          view_proj: camera.viewProj,
          eye: camera.eye,
          nx: NX,
          ny: NY,
          sun: [-0.5, 0.65, 0.58],
          sun_colour: [2.2, 2.05, 1.85],
          sheen: fabric.sheen,
          sky: [0.32, 0.36, 0.44],
          translucency: fabric.translucency,
          fabric: look.fabric,
          rod_radius: 0.018,
          ink: look.ink,
          rod_a: [-WIDTH / 2, TOP + 0.004, 0.022],
          rod_b: [WIDTH / 2, TOP + 0.004, 0.022],
        });
        uniforms.upload();
        const pass = encoder.beginRenderPass({
          label: 'banner',
          colorAttachments: [
            {
              view: colour!.createView(),
              resolveTarget: tail.scene.view,
              loadOp: 'clear',
              clearValue: { r: 0, g: 0, b: 0, a: 0 },
              storeOp: 'discard',
            },
          ],
          depthStencilAttachment: {
            view: depth!.createView(),
            depthLoadOp: 'clear',
            depthClearValue: 1,
            depthStoreOp: 'discard',
          },
          timestampWrites: profiler.pass('draw'),
        });
        pass.setPipeline(clothPipeline);
        pass.setBindGroup(0, clothGroup!);
        pass.draw((NX - 1) * (NY - 1) * 6);
        pass.setPipeline(rodPipeline);
        pass.setBindGroup(0, rodGroup!);
        pass.draw(6);
        pass.end();
        tail.encode(encoder, view, time, params, profiler);
      },
      destroy() {
        cloth?.destroy();
        colour?.destroy();
        depth?.destroy();
        print.destroy();
        field.destroy();
        uniforms.destroy();
        tail.destroy();
      },
    };
  },
});
