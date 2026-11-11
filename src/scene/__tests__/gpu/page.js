/**
 * The part of the GPU tests that runs in the browser (see browser.ts and ../gpu.test.ts).
 *
 * It is evaluated in a blank page after three.js, the very ES module build the
 * application bundles, has been imported from node_modules as window.THREE. It
 * renders with a WebGLRenderer configured as the application's canvas, so the
 * programs it compiles are assembled exactly as the application's are: the same
 * prefix of defines and declarations for the same material options. Everything it
 * returns is plain JSON.
 */
(() => {
  const THREE = window.THREE;
  const state = { renderer: null, gl: null, uniforms: null, textures: {}, programs: {} };

  /** A three.js constant given by name (for example "DoubleSide"), anything else as it is. */
  const constant = (value) => (typeof value === 'string' && value in THREE ? THREE[value] : value);

  function dataTexture(spec) {
    const arrays = { Uint8: Uint8Array, Uint16: Uint16Array, Float32: Float32Array };
    const texture = new THREE.DataTexture(new arrays[spec.arrayType](spec.data), spec.width, spec.height);
    Object.assign(texture, spec.properties);
    texture.needsUpdate = true;
    return texture;
  }

  function uniformValue(spec) {
    switch (spec.type) {
      case 'float':
        return spec.value;
      case 'vec2':
        return new THREE.Vector2(...spec.value);
      case 'vec3':
        return new THREE.Vector3(...spec.value);
      case 'vec4':
        return new THREE.Vector4(...spec.value);
      case 'texture':
        return state.textures[spec.value];
      default:
        throw new Error(`unknown uniform type ${spec.type}`);
    }
  }

  /** The shared uniforms with some of them replaced; the shared objects themselves are left alone. */
  function uniformsWith(overrides = {}) {
    const result = { ...state.uniforms };
    for (const [name, spec] of Object.entries(overrides)) result[name] = { value: uniformValue(spec) };
    return result;
  }

  /** Compiler and linker messages of a program, with the offending source lines. */
  function describeProgram(gl, program, vertexShader, fragmentShader) {
    const excerpt = (shader) => {
      const log = gl.getShaderInfoLog(shader) || '';
      const lines = (gl.getShaderSource(shader) || '').split('\n');
      const quoted = [...log.matchAll(/ERROR: \d+:(\d+)/g)].map((match) => {
        const line = Number(match[1]);
        return `    ${line}: ${(lines[line - 1] || '').trim()}`;
      });
      return log.trim() + (quoted.length ? '\n' + quoted.join('\n') : '');
    };
    return {
      linked: Boolean(gl.getProgramParameter(program, gl.LINK_STATUS)),
      vertexCompiled: Boolean(gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)),
      fragmentCompiled: Boolean(gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)),
      vertexLog: excerpt(vertexShader),
      fragmentLog: excerpt(fragmentShader),
      programLog: (gl.getProgramInfoLog(program) || '').trim(),
    };
  }

  const reported = [];

  /** The context, configured as the application's <Canvas> configures it (UrbanScene.tsx, pinned by the test). */
  function init({ renderer: options, uniforms, textures }) {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    document.body.appendChild(canvas);
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, ...options.context });
    } catch (error) {
      return { webgl2: false, reason: String(error && error.message ? error.message : error) };
    }
    renderer.toneMapping = constant(options.toneMapping);
    renderer.outputColorSpace = constant(options.outputColorSpace);
    renderer.setPixelRatio(1);
    renderer.setSize(64, 64, false);
    renderer.debug.checkShaderErrors = true;
    renderer.debug.onShaderError = (gl, program, vertexShader, fragmentShader) => {
      reported.push(describeProgram(gl, program, vertexShader, fragmentShader));
    };
    const gl = renderer.getContext();
    state.renderer = renderer;
    state.gl = gl;
    for (const [name, spec] of Object.entries(textures)) state.textures[name] = dataTexture(spec);
    state.uniforms = {};
    for (const [name, spec] of Object.entries(uniforms)) state.uniforms[name] = { value: uniformValue(spec) };
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    return {
      webgl2: typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext,
      renderer: String(gl.getParameter(info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER)),
      vendor: String(gl.getParameter(info ? info.UNMASKED_VENDOR_WEBGL : gl.VENDOR)),
      version: String(gl.getParameter(gl.VERSION)),
      colorBufferFloat: renderer.extensions.has('EXT_color_buffer_float'),
      colorBufferHalfFloat: renderer.extensions.has('EXT_color_buffer_half_float'),
      samples: Number(gl.getParameter(gl.SAMPLES)),
    };
  }

  /** A drawable for each kind of geometry the application uses, with every attribute its shader reads. */
  function drawable(kind, material) {
    if (kind === 'points') {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0.5, -1, 0.3, 0.6, -0.8], 3));
      geometry.setAttribute('aStar', new THREE.Float32BufferAttribute([-2, Math.log(6000), 0, -3, Math.log(4000), -1], 3));
      const points = new THREE.Points(geometry, material);
      points.frustumCulled = false;
      return points;
    }
    if (kind === 'box') {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), material);
      mesh.frustumCulled = false;
      return mesh;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute([-1, 0, -5, 1, 0, -5, 0, 2, -5], 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1], 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute([0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5], 3));
    geometry.setAttribute('aSurface', new THREE.Float32BufferAttribute([1, 0, 1, 1, 0, 1, 1, 0, 1], 3));
    const mesh = new THREE.Mesh(geometry, material);
    mesh.frustumCulled = false;
    return mesh;
  }

  /**
   * Builds the application's materials, draws each once (on the canvas, or into a target
   * like the application's half-float star target) and reports how every program compiled
   * and linked. The assembled sources are kept for transformFeedback below.
   */
  function compileScene({ materials, starTarget }) {
    const { renderer, gl } = state;
    reported.length = 0;
    const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 1500);
    camera.position.set(0, 1.85, 0);
    camera.updateMatrixWorld();
    const target = new THREE.WebGLRenderTarget(
      64,
      64,
      Object.fromEntries(Object.entries(starTarget).map(([k, v]) => [k, constant(v)]))
    );
    const results = [];
    const built = [];
    for (const [name, spec] of Object.entries(materials)) {
      const options = Object.fromEntries(Object.entries(spec.options).map(([key, value]) => [key, constant(value)]));
      // one uniforms object for all, as in the application
      const uniforms = state.uniforms;
      const material = new THREE.ShaderMaterial({
        vertexShader: spec.vertexShader,
        fragmentShader: spec.fragmentShader,
        uniforms,
        ...options,
      });
      const scene = new THREE.Scene();
      scene.add(drawable(spec.geometry, material));
      renderer.setRenderTarget(spec.target === 'starTarget' ? target : null);
      renderer.setClearColor(0x000000, 0);
      renderer.clear();
      renderer.render(scene, camera);
      renderer.setRenderTarget(null);
      built.push({ name, material });
    }
    for (const { name, material } of built) {
      const program = state.renderer.properties.get(material).currentProgram;
      if (!program) {
        results.push({ name, linked: false, programLog: 'three.js built no program for this material' });
        continue;
      }
      const [vertexShader, fragmentShader] = [program.vertexShader, program.fragmentShader];
      results.push({ name, ...describeProgram(gl, program.program, vertexShader, fragmentShader) });
      state.programs[name] = { vertex: gl.getShaderSource(vertexShader), fragment: gl.getShaderSource(fragmentShader) };
    }
    target.dispose();
    return {
      results,
      reported: reported.slice(),
      programCount: renderer.info.programs.length,
      glError: gl.getError(),
      contextLost: gl.isContextLost(),
    };
  }

  const QUAD_VERTEX = 'void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }';

  /**
   * Runs a fragment shader once per pixel of a width × height target. Each pixel reads its
   * inputs with texelFetch from the float textures uInputA and uInputB; the target is
   * RGBA32F ("float") or RGBA8 ("byte").
   */
  function evaluateFragment({ fragmentShader, width, height, inputA, inputB, output, uniforms }) {
    const { renderer, gl } = state;
    reported.length = 0;
    const input = (data) =>
      dataTexture({
        width,
        height,
        arrayType: 'Float32',
        data: data || new Array(width * height * 4).fill(0),
        properties: {
          format: THREE.RGBAFormat,
          type: THREE.FloatType,
          magFilter: THREE.NearestFilter,
          minFilter: THREE.NearestFilter,
          generateMipmaps: false,
        },
      });
    const textureA = input(inputA);
    const textureB = input(inputB);
    const material = new THREE.ShaderMaterial({
      vertexShader: QUAD_VERTEX,
      fragmentShader,
      uniforms: { ...uniformsWith(uniforms), uInputA: { value: textureA }, uInputB: { value: textureB } },
    });
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    quad.frustumCulled = false;
    const scene = new THREE.Scene();
    scene.add(quad);
    const float = output === 'float';
    const target = new THREE.WebGLRenderTarget(width, height, {
      type: float ? THREE.FloatType : THREE.UnsignedByteType,
      format: THREE.RGBAFormat,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      generateMipmaps: false,
      depthBuffer: false,
      stencilBuffer: false,
    });
    renderer.setRenderTarget(target);
    renderer.render(scene, new THREE.OrthographicCamera());
    const pixels = float ? new Float32Array(width * height * 4) : new Uint8Array(width * height * 4);
    renderer.readRenderTargetPixels(target, 0, 0, width, height, pixels);
    renderer.setRenderTarget(null);
    const glError = gl.getError();
    target.dispose();
    material.dispose();
    textureA.dispose();
    textureB.dispose();
    quad.geometry.dispose();
    return { reported: reported.slice(), glError, pixels: Array.from(pixels) };
  }

  /**
   * Runs the vertex stage of a program compiled by compileScene over `count` vertices and
   * captures the named outputs with transform feedback. The program is linked anew from
   * the exact sources three.js assembled (transform feedback outputs must be named before
   * linking); its uniforms are set from the shared uniforms, with overrides.
   */
  function transformFeedback({ program: name, count, attributes, varyings, uniforms: overrides, matrices }) {
    const { renderer, gl } = state;
    const sources = state.programs[name];
    if (!sources) throw new Error(`no program ${name}: run compileScene first`);
    const shader = (type, source) => {
      const object = gl.createShader(type);
      gl.shaderSource(object, source);
      gl.compileShader(object);
      return object;
    };
    const vertexShader = shader(gl.VERTEX_SHADER, sources.vertex);
    const fragmentShader = shader(gl.FRAGMENT_SHADER, sources.fragment);
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.transformFeedbackVaryings(
      program,
      varyings.map((v) => v.name),
      gl.SEPARATE_ATTRIBS
    );
    gl.linkProgram(program);
    const status = describeProgram(gl, program, vertexShader, fragmentShader);
    if (!status.linked) return { status };
    gl.useProgram(program);

    const values = uniformsWith(overrides);
    const identity4 = new THREE.Matrix4();
    const textureUnits = [];
    const uniformCount = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    const unset = [];
    for (let i = 0; i < uniformCount; i++) {
      const active = gl.getActiveUniform(program, i);
      const location = gl.getUniformLocation(program, active.name);
      const matrix = matrices && matrices[active.name];
      const value = values[active.name] ? values[active.name].value : undefined;
      switch (active.type) {
        case gl.FLOAT_MAT4:
          gl.uniformMatrix4fv(location, false, matrix ? new Float32Array(matrix) : identity4.elements);
          break;
        case gl.FLOAT_MAT3:
          gl.uniformMatrix3fv(location, false, new THREE.Matrix3().elements);
          break;
        case gl.FLOAT:
          if (value === undefined) unset.push(active.name);
          gl.uniform1f(location, value ?? 0);
          break;
        case gl.FLOAT_VEC2:
          if (value === undefined) unset.push(active.name);
          else gl.uniform2f(location, value.x, value.y);
          break;
        case gl.FLOAT_VEC3:
          if (value === undefined) unset.push(active.name);
          else gl.uniform3f(location, value.x, value.y, value.z);
          break;
        case gl.FLOAT_VEC4:
          if (value === undefined) unset.push(active.name);
          else gl.uniform4f(location, value.x, value.y, value.z, value.w);
          break;
        case gl.SAMPLER_2D: {
          if (value === undefined) {
            unset.push(active.name);
            break;
          }
          renderer.initTexture(value);
          const unit = textureUnits.length;
          textureUnits.push(value);
          gl.activeTexture(gl.TEXTURE0 + unit);
          gl.bindTexture(gl.TEXTURE_2D, renderer.properties.get(value).__webglTexture);
          gl.uniform1i(location, unit);
          break;
        }
        case gl.BOOL:
          gl.uniform1i(location, 0);
          break;
        default:
          unset.push(`${active.name} (type ${active.type})`);
      }
    }
    if (unset.length) throw new Error(`uniforms the test does not supply: ${unset.join(', ')}`);

    const vertexArray = gl.createVertexArray();
    gl.bindVertexArray(vertexArray);
    const buffers = [];
    for (const [attribute, spec] of Object.entries(attributes)) {
      const location = gl.getAttribLocation(program, attribute);
      if (location < 0) continue;
      const buffer = gl.createBuffer();
      buffers.push(buffer);
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(spec.data), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location, spec.size, gl.FLOAT, false, 0, 0);
    }
    const outputs = varyings.map((varying) => {
      const buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, count * varying.size * 4, gl.STATIC_READ);
      return buffer;
    });
    // WebGL refuses to draw while a transform feedback buffer is also bound to another target
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    const before = gl.getError();
    if (before !== gl.NO_ERROR) throw new Error(`GL error ${before} before transform feedback`);
    const feedback = gl.createTransformFeedback();
    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, feedback);
    outputs.forEach((buffer, index) => gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, index, buffer));
    gl.enable(gl.RASTERIZER_DISCARD);
    gl.beginTransformFeedback(gl.POINTS);
    gl.drawArrays(gl.POINTS, 0, count);
    gl.endTransformFeedback();
    gl.disable(gl.RASTERIZER_DISCARD);
    outputs.forEach((_, index) => gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, index, null));
    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);

    const captured = {};
    varyings.forEach((varying, index) => {
      const data = new Float32Array(count * varying.size);
      gl.bindBuffer(gl.COPY_READ_BUFFER, outputs[index]);
      gl.getBufferSubData(gl.COPY_READ_BUFFER, 0, data);
      captured[varying.name] = Array.from(data);
    });
    gl.bindBuffer(gl.COPY_READ_BUFFER, null);
    const glError = gl.getError();

    gl.bindVertexArray(null);
    gl.deleteVertexArray(vertexArray);
    buffers.concat(outputs).forEach((buffer) => gl.deleteBuffer(buffer));
    gl.deleteTransformFeedback(feedback);
    gl.deleteProgram(program);
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    // three.js caches GL state; it has to forget what was changed behind its back
    renderer.resetState();
    return { status, glError, captured };
  }

  window.gpuHarness = { init, compileScene, evaluateFragment, transformFeedback };
})();
