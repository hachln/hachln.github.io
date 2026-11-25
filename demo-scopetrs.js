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

        mat2 rot(float a) {
            float s = sin(a), c = cos(a);
            return mat2(c, -s, s, c);
        }

        // Signed Distance Field for a 3D Torus
        float sdTorus(vec3 p, vec2 t) {
            vec2 q = vec2(length(p.xz) - t.x, p.y);
            return length(q) - t.y;
        }

        float map(vec3 p) {
            p.xz *= rot(u_time * 0.7 + u_ptr.x * 3.14);
            p.xy *= rot(u_time * 0.4 + u_ptr.y * 2.0);
            return sdTorus(p, vec2(0.62, 0.22));
        }

        void main() {
            vec2 uv = (gl_FragCoord.xy - 0.5 * u_res.xy) / u_res.y;

            // Subtle oscilloscope grid background (#2d353b & #404a50)
            vec2 grid = abs(fract(uv * 6.0 - 0.5) - 0.5) / fwidth(uv * 6.0);
            float line = 1.0 - min(min(grid.x, grid.y), 1.0);
            vec3 col = mix(vec3(0.176, 0.208, 0.231), vec3(0.251, 0.290, 0.314), line * 0.35);

            // Raymarch + Edge Glow (Demoscene SDF contour)
            vec3 ro = vec3(0.0, 0.0, 2.1);
            vec3 rd = normalize(vec3(uv, -1.2));
            float t = 0.0;
            float minD = 999.0;

            for (int i = 0; i < 36; i++) {
                vec3 p = ro + rd * t;
                float d = map(p);
                minD = min(minD, abs(d));
                if (d < 0.002 || t > 4.0) break;
                t += d;
            }

            // Everforest Green (#a7c080) & Aqua (#83c092) wireframe rim
            float rim = smoothstep(0.035, 0.0, minD);
            float scan = 0.85 + 0.15 * sin(gl_FragCoord.y * 1.5);
            vec3 wireCol = mix(vec3(0.655, 0.753, 0.502), vec3(0.498, 0.733, 0.702), uv.x + 0.5);

            col = mix(col, wireCol, rim * 0.9) * scan;
            gl_FragColor = vec4(col, 1.0);
        }
    `;

    // Enable standard derivatives for crisp grid lines on WebGL 1
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
    canvas.addEventListener('touchmove', e => {
        if (e.touches[0]) updatePtr(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });

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

    // Only animate when visible on screen
    new IntersectionObserver(entries => {
        visible = entries[0].isIntersecting;
        if (visible) animId = requestAnimationFrame(render);
        else cancelAnimationFrame(animId);
    }).observe(canvas);
})();