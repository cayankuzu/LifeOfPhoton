/**
 * Adaptive, crack-free triangle subdivision.
 *
 * Why. Relativistic aberration maps straight lines to arcs, but the GPU draws
 * straight edges between transformed vertices. The error of that chord grows with
 * the ANGLE an edge subtends at the observer, so the tessellation has to be fine
 * where geometry passes close to the observer's path and can stay coarse far from
 * it. The observer travels along a fixed line (x = 0, y = eye height); an edge at
 * distance d from that line never subtends more than length / d. The rule is
 * therefore
 *
 *     split an edge when   length > clamp(k · d, minEdge, maxEdge)
 *
 * with d measured at the edge midpoint. The decision depends on the edge alone, so
 * the two triangles sharing an edge always agree and no T-junction can open.
 */

export interface SubdivisionOptions {
  /** Largest angle an edge may subtend at closest approach, rad (k above). */
  readonly maxAngle: number;
  /** Edges are never split below this length, m. */
  readonly minEdge: number;
  /** Edges are always split above this length, m. */
  readonly maxEdge: number;
  /** Height of the observer's path above y = 0, m. */
  readonly axisHeight: number;
  /**
   * Lower bound on the distance to the observer, m. A block that is known to be at
   * least this far away (a distant level of detail) cannot subtend more than
   * length / minDistance, however close it lies to the observer's path.
   */
  readonly minDistance?: number;
  /**
   * Safety limits. Both end the refinement between two passes, never inside one: a
   * pass that stopped half-way would leave a triangle split and its neighbour not,
   * and open a crack.
   */
  readonly maxPasses?: number;
  readonly maxTriangles?: number;
}

/** Interleaved triangle soup: `stride` floats per vertex, the first three being the position. */
export interface TriangleSoup {
  readonly stride: number;
  data: Float32Array;
  /** Number of vertices (three per triangle). */
  count: number;
}

/**
 * Longest length allowed for an edge whose end points have the lateral coordinates
 * (ax, ay) and (bx, by). It depends on the edge alone — this is what keeps the
 * subdivision free of cracks.
 */
export function edgeLimit(ax: number, ay: number, bx: number, by: number, options: SubdivisionOptions): number {
  const mx = 0.5 * (ax + bx);
  const my = 0.5 * (ay + by) - options.axisHeight;
  const distance = Math.max(Math.sqrt(mx * mx + my * my), options.minDistance ?? 0);
  return Math.min(options.maxEdge, Math.max(options.minEdge, options.maxAngle * distance));
}

/** Number of triangles a pass over the soup would produce: every edge over its limit adds one. */
function trianglesAfterPass(source: Float32Array, triangles: number, stride: number, options: SubdivisionOptions): number {
  let total = 0;
  for (let t = 0; t < triangles; t++) {
    const i0 = t * 3 * stride;
    const i1 = i0 + stride;
    const i2 = i1 + stride;
    const x0 = source[i0],
      y0 = source[i0 + 1],
      z0 = source[i0 + 2];
    const x1 = source[i1],
      y1 = source[i1 + 1],
      z1 = source[i1 + 2];
    const x2 = source[i2],
      y2 = source[i2 + 1],
      z2 = source[i2 + 2];
    total += 1;
    if (Math.hypot(x1 - x0, y1 - y0, z1 - z0) > edgeLimit(x0, y0, x1, y1, options)) total++;
    if (Math.hypot(x2 - x1, y2 - y1, z2 - z1) > edgeLimit(x1, y1, x2, y2, options)) total++;
    if (Math.hypot(x0 - x2, y0 - y2, z0 - z2) > edgeLimit(x2, y2, x0, y0, options)) total++;
  }
  return total;
}

/**
 * Subdivides the soup in place until every edge satisfies the rule. All vertex
 * attributes are interpolated linearly; attributes that must stay constant across
 * a triangle (flags) are constant already and therefore survive unchanged.
 */
export function subdivideAdaptive(soup: TriangleSoup, options: SubdivisionOptions): void {
  const stride = soup.stride;
  const maxPasses = options.maxPasses ?? 12;
  const maxTriangles = options.maxTriangles ?? 400_000;

  for (let pass = 0; pass < maxPasses; pass++) {
    const source = soup.data;
    const triangles = soup.count / 3;
    // A pass at most quadruples the soup; only when that could pass the budget is its size counted
    if (triangles * 4 > maxTriangles && trianglesAfterPass(source, triangles, stride, options) > maxTriangles) break;
    // worst case every triangle becomes four
    let out = new Float32Array(Math.min(triangles * 4, maxTriangles) * 3 * stride);
    let cursor = 0;
    let splitAny = false;

    const ensure = (floats: number): void => {
      if (cursor + floats <= out.length) return;
      const grown = new Float32Array(Math.max(out.length * 2, cursor + floats));
      grown.set(out.subarray(0, cursor));
      out = grown;
    };
    const copyVertex = (from: Float32Array, offset: number): void => {
      for (let k = 0; k < stride; k++) out[cursor + k] = from[offset + k];
      cursor += stride;
    };

    const mid01 = new Float32Array(stride);
    const mid12 = new Float32Array(stride);
    const mid20 = new Float32Array(stride);
    const midpoint = (target: Float32Array, a: number, b: number): void => {
      for (let k = 0; k < stride; k++) target[k] = 0.5 * (source[a + k] + source[b + k]);
    };
    const emit = (a: Float32Array, ao: number, b: Float32Array, bo: number, c: Float32Array, co: number): void => {
      ensure(3 * stride);
      copyVertex(a, ao);
      copyVertex(b, bo);
      copyVertex(c, co);
    };

    for (let t = 0; t < triangles; t++) {
      const i0 = t * 3 * stride;
      const i1 = i0 + stride;
      const i2 = i1 + stride;
      const x0 = source[i0],
        y0 = source[i0 + 1],
        z0 = source[i0 + 2];
      const x1 = source[i1],
        y1 = source[i1 + 1],
        z1 = source[i1 + 2];
      const x2 = source[i2],
        y2 = source[i2 + 1],
        z2 = source[i2 + 2];

      const s01 = Math.hypot(x1 - x0, y1 - y0, z1 - z0) > edgeLimit(x0, y0, x1, y1, options);
      const s12 = Math.hypot(x2 - x1, y2 - y1, z2 - z1) > edgeLimit(x1, y1, x2, y2, options);
      const s20 = Math.hypot(x0 - x2, y0 - y2, z0 - z2) > edgeLimit(x2, y2, x0, y0, options);
      const splits = (s01 ? 1 : 0) + (s12 ? 1 : 0) + (s20 ? 1 : 0);

      if (splits === 0) {
        emit(source, i0, source, i1, source, i2);
        continue;
      }
      splitAny = true;
      if (s01) midpoint(mid01, i0, i1);
      if (s12) midpoint(mid12, i1, i2);
      if (s20) midpoint(mid20, i2, i0);

      if (splits === 3) {
        emit(source, i0, mid01, 0, mid20, 0);
        emit(mid01, 0, source, i1, mid12, 0);
        emit(mid20, 0, mid12, 0, source, i2);
        emit(mid01, 0, mid12, 0, mid20, 0);
      } else if (splits === 1) {
        if (s01) {
          emit(source, i0, mid01, 0, source, i2);
          emit(mid01, 0, source, i1, source, i2);
        } else if (s12) {
          emit(source, i0, source, i1, mid12, 0);
          emit(source, i0, mid12, 0, source, i2);
        } else {
          emit(source, i0, source, i1, mid20, 0);
          emit(mid20, 0, source, i1, source, i2);
        }
      } else if (!s01) {
        emit(mid20, 0, mid12, 0, source, i2);
        emit(source, i0, source, i1, mid12, 0);
        emit(source, i0, mid12, 0, mid20, 0);
      } else if (!s12) {
        emit(source, i0, mid01, 0, mid20, 0);
        emit(mid01, 0, source, i1, source, i2);
        emit(mid01, 0, source, i2, mid20, 0);
      } else {
        emit(mid01, 0, source, i1, mid12, 0);
        emit(source, i0, mid01, 0, mid12, 0);
        emit(source, i0, mid12, 0, source, i2);
      }
    }

    soup.data = out.subarray(0, cursor);
    soup.count = cursor / stride;
    if (!splitAny) break;
  }
}

/** Result of welding a triangle soup into an indexed mesh. */
export interface IndexedMesh {
  readonly vertices: Float32Array;
  readonly indices: Uint32Array;
  readonly vertexCount: number;
}

/**
 * Welds vertices that are identical in every attribute (after quantisation) and
 * returns an indexed mesh. Cuts the vertex-shader work roughly by a factor of five.
 *
 * Open-addressing hash table over the quantised attribute tuple; candidates are
 * confirmed by comparing every component, so a hash collision can never merge
 * two different vertices.
 */
export function weld(soup: TriangleSoup, quantum = 1e-4): IndexedMesh {
  const stride = soup.stride;
  const count = soup.count;
  const inverse = 1 / quantum;
  const quantised = new Int32Array(count * stride);
  for (let i = 0; i < quantised.length; i++) quantised[i] = Math.round(soup.data[i] * inverse);

  let capacity = 1;
  while (capacity < count * 2) capacity <<= 1;
  const mask = capacity - 1;
  const table = new Int32Array(capacity).fill(-1); // slot -> first soup vertex with that tuple
  const assigned = new Int32Array(count); // soup vertex -> welded index (valid for table entries)
  const indices = new Uint32Array(count);
  const vertices = new Float32Array(count * stride);
  let next = 0;

  for (let v = 0; v < count; v++) {
    const offset = v * stride;
    let hash = 0x811c9dc5;
    for (let k = 0; k < stride; k++) hash = Math.imul(hash ^ quantised[offset + k], 0x01000193);
    let slot = (hash ^ (hash >>> 15)) & mask;
    for (;;) {
      const candidate = table[slot];
      if (candidate === -1) {
        table[slot] = v;
        assigned[v] = next;
        vertices.set(soup.data.subarray(offset, offset + stride), next * stride);
        indices[v] = next++;
        break;
      }
      const other = candidate * stride;
      let same = true;
      for (let k = 0; k < stride; k++) {
        if (quantised[other + k] !== quantised[offset + k]) {
          same = false;
          break;
        }
      }
      if (same) {
        indices[v] = assigned[candidate];
        break;
      }
      slot = (slot + 1) & mask;
    }
  }
  return { vertices: vertices.subarray(0, next * stride), indices, vertexCount: next };
}
