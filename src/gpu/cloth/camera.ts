// A camera that looks straight at a cloth along -z, for flags and banners seen face on.

export interface FrontCamera {
  /** Column-major clip-from-world matrix, depth 0 at `near` to 1 at `far`. */
  viewProj: Float32Array;
  eye: [number, number, number];
}

export interface FrontCameraOptions {
  /** Drawing-buffer width over height. */
  aspect: number;
  /** The point the view is centred on, m. */
  centre: readonly [number, number, number];
  /** Half the width and height around the centre that must be in view, m. */
  halfWidth: number;
  halfHeight: number;
  /** Tangent of half the vertical field of view. Default 0.27 (about 30 degrees). */
  tanHalf?: number;
  near?: number;
  far?: number;
}

export function frontCamera(options: FrontCameraOptions): FrontCamera {
  const t = options.tanHalf ?? 0.27;
  const [cx, cy, cz] = options.centre;
  const distance = Math.max(options.halfWidth / (t * options.aspect), options.halfHeight / t);
  const eye: [number, number, number] = [cx, cy, cz + distance];
  const near = options.near ?? 0.05;
  const far = options.far ?? distance * 4;
  const sx = 1 / (t * options.aspect);
  const sy = 1 / t;
  // w is the distance in front of the eye, eye.z - z; depth runs 0 to 1 from near to far.
  const a = far / (far - near);
  const b = (-near * far) / (far - near);
  const m = new Float32Array(16);
  m[0] = sx;
  m[12] = -sx * eye[0];
  m[5] = sy;
  m[13] = -sy * eye[1];
  m[10] = -a;
  m[14] = a * eye[2] + b;
  m[11] = -1;
  m[15] = eye[2];
  return { viewProj: m, eye };
}
