(function () {
    const canvas = document.getElementById('bg-shader');
    if (!canvas) return;

    // Enable alpha: true so fog_forest_1.webp shows right through
    const gl = canvas.getContext('webgl', { alpha: true, antialias: false, powerPreference: 'low-power' });
    if (!gl) return;

    const vsSource = `
        attribute vec2 a_pos;
        void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
    `;

    // Subtle Drifting Forest Mist Shader
    const fsSource = `
        precision mediump float;
        uniform vec2 u_res;
        uniform float u_time;

        float hash(vec2 p) {
            return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
        }

        float noise(vec2 p) {
            vec2 i = floor(p);
            vec2 f = fract(p);
            vec2 u = f * f * (3.0 - 2.0 * f);
            return mix(
                mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
                mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
                u.y
            );
        }

        float fbm(vec2 p) {
            float v = 0.0;
            float a = 0.5;
            for (int i = 0; i < 4; i++) {
                v += a * noise(p);
                p = p * 2.02 + vec2(1.7, 9.2);
                a *= 0.5;
            }
            return v;
        }

        void main() {
            vec2 uv = gl_FragCoord.xy / u_res.xy;
            float aspect = u_res.x / u_res.y;
            vec2 p = vec2(uv.x * aspect, uv.y);

            // Two horizontal wind layers drifting across the forest
            float mist1 = fbm(p * vec2(1.8, 3.0) + vec2(u_time * 0.27, 0.0));
            float mist2 = fbm(p * vec2(3.2, 5.0) - vec2(u_time * 0.17, u_time * 0.015));
            float fog = smoothstep(0.22, 0.72, mist1 * 0.65 + mist2 * 0.35);

            // Fade mist toward the very top so sky/treetops stay sharp
            float verticalMask = smoothstep(0.98, 0.10, uv.y);
            float alpha = fog * verticalMask * 0.75;

            // Everforest sage/cream mist tint
            vec3 mistColor = mix(vec3(0.655, 0.753, 0.502), vec3(0.827, 0.776, 0.667), mist2);

            gl_FragColor = vec4(mistColor * alpha, alpha);
        }
    `;

    function compile(type, src) {
        const s = gl.createShader(type);
        gl.shaderSource(s, src);
        gl.compileShader(s);
        return s;
    }

    const prog = gl.createProgram();
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, vsSource));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fsSource));
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

    const posLoc = gl.getAttribLocation(prog, 'a_pos');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    const resLoc = gl.getUniformLocation(prog, 'u_res');
    const timeLoc = gl.getUniformLocation(prog, 'u_time');

    function resize() {
        const scale = 0.5;
        canvas.width = Math.floor(window.innerWidth * scale);
        canvas.height = Math.floor(window.innerHeight * scale);
        gl.viewport(0, 0, canvas.width, canvas.height);
    }
    window.addEventListener('resize', resize);
    resize();

    let animId;
    const start = performance.now();

    function render(now) {
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.uniform2f(resLoc, canvas.width, canvas.height);
        gl.uniform1f(timeLoc, (now - start) * 0.001);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        animId = requestAnimationFrame(render);
    }

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reducedMotion) {
        animId = requestAnimationFrame(render);
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) cancelAnimationFrame(animId);
            else animId = requestAnimationFrame(render);
        });
    } else {
        render(start);
    }
})();