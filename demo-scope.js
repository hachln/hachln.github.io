(function () {
    const canvas = document.getElementById('demo-scope');
    if (!canvas) return;

    const gl = canvas.getContext('webgl', { alpha: false, antialias: true, powerPreference: 'low-power' });
    if (!gl) return;

    const vs = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;
    const fs = `
        #extension GL_OES_standard_derivatives : enable
        precision mediump float;
        uniform vec2 u_res;
        uniform float u_time;
        uniform vec2 u_ptr;

        // Multi-harmonic FM waveform (inspired by analog scope & BirdSynth)
        float wave1(float x, float t, vec2 ptr) {
            float freq = 5.0 + ptr.x * 4.0;
            float amp  = 0.24 + abs(ptr.y) * 0.14;
            float mod  = sin(x * 2.2 - t * 2.5) * (0.4 + ptr.y * 0.3);
            return sin(x * freq + t * 4.0 + mod) * amp
                 + sin(x * (freq * 2.0) - t * 6.0) * (amp * 0.25);
        }

        float wave2(float x, float t, vec2 ptr) {
            float freq = 3.5 + ptr.x * 2.5;
            return cos(x * freq - t * 2.8) * 0.16;
        }

        void main() {
            vec2 uv = (gl_FragCoord.xy - 0.5 * u_res.xy) / u_res.y;
            float aspect = u_res.x / u_res.y;

            // 1. Oscilloscope Graticule Grid (#2d353b base + #404a50 grid)
            vec2 gridUV = uv * 5.0;
            vec2 grid = abs(fract(gridUV - 0.5) - 0.5) / fwidth(gridUV);
            float minorLine = 1.0 - min(min(grid.x, grid.y), 1.0);

            // Center crosshairs slightly brighter
            vec2 axis = abs(uv) / fwidth(uv);
            float centerLine = 1.0 - min(min(axis.x, axis.y), 1.0);

            vec3 bgCol   = vec3(0.176, 0.208, 0.231); // #2d353b
            vec3 gridCol = vec3(0.251, 0.290, 0.314); // #404a50
            vec3 col = mix(bgCol, gridCol, minorLine * 0.35 + centerLine * 0.45);

            // 2. Channel 1 Trace (Everforest Green #a7c080 with phosphor bloom)
            float y1 = wave1(uv.x, u_time, u_ptr);
            float d1 = abs(uv.y - y1);
            float core1 = smoothstep(0.014, 0.002, d1);
            float glow1 = exp(-d1 * 28.0) * 0.45;
            vec3 efGreen = vec3(0.655, 0.753, 0.502);

            // 3. Channel 2 Trace (Everforest Blue #7fbbb3)
            float y2 = wave2(uv.x, u_time, u_ptr);
            float d2 = abs(uv.y - y2);
            float core2 = smoothstep(0.011, 0.002, d2);
            float glow2 = exp(-d2 * 32.0) * 0.30;
            vec3 efBlue = vec3(0.498, 0.733, 0.702);

            // Fade edges smoothly toward left/right borders
            float edgeFade = smoothstep(aspect * 0.5, aspect * 0.38, abs(uv.x));

            col += efGreen * (core1 + glow1) * edgeFade;
            col += efBlue  * (core2 + glow2) * edgeFade;

            // Subtle CRT scanline texture
            col *= 0.90 + 0.10 * sin(gl_FragCoord.y * 1.6);

            gl_FragColor = vec4(col, 1.0);
        }
    `;

    gl.getExtension('OES_standard_derivatives');

    function compile(type, src) {
        const s = gl.createShader(type);
        gl.shaderSource(s, src);
        gl.compileShader(s);
        return s;
    }

    const prog = gl.createProgram();
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, vs));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const pos = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, 'u_res');
    const uTime = gl.getUniformLocation(prog, 'u_time');
    const uPtr = gl.getUniformLocation(prog, 'u_ptr');

    let targetX = 0, targetY = 0, curX = 0, curY = 0;
    const updatePtr = (clientX, clientY) => {
        const r = canvas.getBoundingClientRect();
        targetX = ((clientX - r.left) / r.width) * 2 - 1;
        targetY = ((clientY - r.top) / r.height) * 2 - 1;
    };

    canvas.addEventListener('mousemove', e => updatePtr(e.clientX, e.clientY));
    canvas.addEventListener('mouseleave', () => { targetX = 0; targetY = 0; });
    canvas.addEventListener('touchmove', e => {
        if (e.touches[0]) updatePtr(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });
    canvas.addEventListener('touchend', () => { targetX = 0; targetY = 0; });

    const resize = () => {
        const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
        canvas.width = Math.floor(canvas.clientWidth * dpr);
        canvas.height = Math.floor(canvas.clientHeight * dpr);
        gl.viewport(0, 0, canvas.width, canvas.height);
    };
    new ResizeObserver(resize).observe(canvas);
    resize();

    let visible = true, animId;
    const start = performance.now();

    function render(now) {
        if (!visible) return;
        curX += (targetX - curX) * 0.08;
        curY += (targetY - curY) * 0.08;

        gl.uniform2f(uRes, canvas.width, canvas.height);
        gl.uniform1f(uTime, (now - start) * 0.001);
        gl.uniform2f(uPtr, curX, curY);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        animId = requestAnimationFrame(render);
    }

    new IntersectionObserver(entries => {
        visible = entries[0].isIntersecting;
        if (visible) animId = requestAnimationFrame(render);
        else cancelAnimationFrame(animId);
    }).observe(canvas);
})();