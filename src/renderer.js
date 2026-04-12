const canvas = document.getElementById('glcanvas');
const gl = canvas.getContext('webgl');
const btnkoch = document.getElementById('btnkoch');
const btnminkowski = document.getElementById('btnminkowski');
const btnsierpinskitri = document.getElementById('btnsierpinskitri');
const btnsierpinskicar = document.getElementById('btnsierpinskicar');
const btnmandelbrot = document.getElementById('btnmandelbrot');
const btnjulia = document.getElementById('btnjulia');
const paramcontrols = document.getElementById('paramcontrols');
const paraminput = document.getElementById('paraminput');
const paramval = document.getElementById('paramval');

let currentmode = 'mandelbrot';
let paramvalue = 3.0;
let vertexcount = 6;
let drawmode = gl.TRIANGLES;

const vertexshadersource = `
    attribute vec2 a_position;
    uniform float u_scale;
    void main() {
        gl_Position = vec4(a_position * u_scale, 0.0, 1.0);
    }
`;

const fragmentshadersource = `
    precision highp float;
    uniform vec2 u_resolution;
    uniform vec2 u_offset;
    uniform float u_zoom;
    uniform int u_fractaltype;
    uniform vec2 u_juliac;
    
    void main() {
        if (u_fractaltype == 2) {
            gl_FragColor = vec4(0.0, 0.8, 0.6, 1.0);
            return;
        }
        
        vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;
        vec2 c = (u_fractaltype == 0) ? (uv * u_zoom + u_offset) : u_juliac;
        vec2 z = (u_fractaltype == 0) ? vec2(0.0) : (uv * u_zoom + u_offset);
        
        int maxiter = 150;
        int iter = 0;
        
        for(int i = 0; i < 1000; i++) {
            if(i >= maxiter) break;
            float x = (z.x * z.x - z.y * z.y) + c.x;
            float y = (z.y * z.x + z.x * z.y) + c.y;
            z = vec2(x, y);
            if((z.x * z.x + z.y * z.y) > 4.0) break;
            iter++;
        }
        
        if(iter == maxiter) {
            gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
        } else {
            float t = float(iter) / float(maxiter);
            gl_FragColor = vec4(t * 2.0, t * 5.0, t * 9.0, 1.0);
        }
    }
`;

function compileshader(ctx, type, source) {
    const shader = ctx.createShader(type);
    ctx.shaderSource(shader, source);
    ctx.compileShader(shader);
    return shader;
}

const vertexshader = compileshader(gl, gl.VERTEX_SHADER, vertexshadersource);
const fragmentshader = compileshader(gl, gl.FRAGMENT_SHADER, fragmentshadersource);

const program = gl.createProgram();
gl.attachShader(program, vertexshader);
gl.attachShader(program, fragmentshader);
gl.linkProgram(program);

const positionbuffer = gl.createBuffer();

const positionlocation = gl.getAttribLocation(program, "a_position");
const scalelocation = gl.getUniformLocation(program, "u_scale");
const resolutionlocation = gl.getUniformLocation(program, "u_resolution");
const zoomlocation = gl.getUniformLocation(program, "u_zoom");
const offsetlocation = gl.getUniformLocation(program, "u_offset");
const fractaltypelocation = gl.getUniformLocation(program, "u_fractaltype");
const juliaclocation = gl.getUniformLocation(program, "u_juliac");

function updatebuffer(data) {
    gl.bindBuffer(gl.ARRAY_BUFFER, positionbuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
    vertexcount = data.length / 2;
}

function setquad() {
    updatebuffer([
        -1.0, -1.0,  1.0, -1.0, -1.0,  1.0,
        -1.0,  1.0,  1.0, -1.0,  1.0,  1.0
    ]);
    drawmode = gl.TRIANGLES;
}

function kochline(p1, p2, depth) {
    if (depth === 0) return [p1, p2];
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const pa = { x: p1.x + dx / 3, y: p1.y + dy / 3 };
    const pc = { x: p1.x + 2 * dx / 3, y: p1.y + 2 * dy / 3 };
    const angle = Math.PI / 3;
    const pb = {
        x: pa.x + (pc.x - pa.x) * Math.cos(angle) - (pc.y - pa.y) * Math.sin(angle),
        y: pa.y + (pc.x - pa.x) * Math.sin(angle) + (pc.y - pa.y) * Math.cos(angle)
    };
    const r1 = kochline(p1, pa, depth - 1);
    const r2 = kochline(pa, pb, depth - 1);
    const r3 = kochline(pb, pc, depth - 1);
    const r4 = kochline(pc, p2, depth - 1);
    r1.pop(); r2.pop(); r3.pop();
    return [...r1, ...r2, ...r3, ...r4];
}

function generatekoch(depth) {
    const p1 = { x: -0.6, y: -0.4 };
    const p2 = { x: 0.6, y: -0.4 };
    const p3 = { x: 0.0, y: -0.4 + 1.2 * Math.sin(Math.PI / 3) };
    const s1 = kochline(p1, p3, depth);
    s1.pop();
    const s2 = kochline(p3, p2, depth);
    s2.pop();
    const s3 = kochline(p2, p1, depth);
    const pts = [...s1, ...s2, ...s3];
    const arr = [];
    for (let i = 0; i < pts.length - 1; i++) {
        arr.push(pts[i].x, pts[i].y, pts[i+1].x, pts[i+1].y);
    }
    updatebuffer(arr);
    drawmode = gl.LINES;
}

function minkowskiline(p1, p2, depth) {
    if (depth === 0) return [p1, p2];
    const dx = (p2.x - p1.x) / 4;
    const dy = (p2.y - p1.y) / 4;
    const n1 = { x: p1.x + dx, y: p1.y + dy };
    const n2 = { x: n1.x - dy, y: n1.y + dx };
    const n3 = { x: n2.x + dx, y: n2.y + dy };
    const n4 = { x: n3.x + dy, y: n3.y - dx };
    const n5 = { x: n4.x + dy, y: n4.y - dx };
    const n6 = { x: n5.x + dx, y: n5.y + dy };
    const n7 = { x: n6.x - dy, y: n6.y + dx };
    
    const r1 = minkowskiline(p1, n1, depth - 1);
    const r2 = minkowskiline(n1, n2, depth - 1);
    const r3 = minkowskiline(n2, n3, depth - 1);
    const r4 = minkowskiline(n3, n4, depth - 1);
    const r5 = minkowskiline(n4, n5, depth - 1);
    const r6 = minkowskiline(n5, n6, depth - 1);
    const r7 = minkowskiline(n6, n7, depth - 1);
    const r8 = minkowskiline(n7, p2, depth - 1);
    
    r1.pop(); r2.pop(); r3.pop(); r4.pop(); r5.pop(); r6.pop(); r7.pop();
    return [...r1, ...r2, ...r3, ...r4, ...r5, ...r6, ...r7, ...r8];
}

function generateminkowski(depth) {
    const p1 = { x: -0.5, y: -0.5 };
    const p2 = { x: 0.5, y: -0.5 };
    const p3 = { x: 0.5, y: 0.5 };
    const p4 = { x: -0.5, y: 0.5 };
    const s1 = minkowskiline(p1, p2, depth); s1.pop();
    const s2 = minkowskiline(p2, p3, depth); s2.pop();
    const s3 = minkowskiline(p3, p4, depth); s3.pop();
    const s4 = minkowskiline(p4, p1, depth);
    const pts = [...s1, ...s2, ...s3, ...s4];
    const arr = [];
    for (let i = 0; i < pts.length - 1; i++) {
        arr.push(pts[i].x, pts[i].y, pts[i+1].x, pts[i+1].y);
    }
    updatebuffer(arr);
    drawmode = gl.LINES;
}

function sierpinskitri(p1, p2, p3, depth, arr) {
    if (depth === 0) {
        arr.push(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);
        return;
    }
    const m12 = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
    const m23 = { x: (p2.x + p3.x) / 2, y: (p2.y + p3.y) / 2 };
    const m31 = { x: (p3.x + p1.x) / 2, y: (p3.y + p1.y) / 2 };
    sierpinskitri(p1, m12, m31, depth - 1, arr);
    sierpinskitri(m12, p2, m23, depth - 1, arr);
    sierpinskitri(m31, m23, p3, depth - 1, arr);
}

function generatesierpinskitri(depth) {
    const arr = [];
    const p1 = { x: -0.8, y: -0.6 };
    const p2 = { x: 0.8, y: -0.6 };
    const p3 = { x: 0.0, y: -0.6 + 1.6 * Math.sin(Math.PI / 3) };
    sierpinskitri(p1, p2, p3, depth, arr);
    updatebuffer(arr);
    drawmode = gl.TRIANGLES;
}

function sierpinskicar(x, y, w, h, depth, arr) {
    if (depth === 0) {
        arr.push(
            x, y, x + w, y, x, y + h,
            x, y + h, x + w, y, x + w, y + h
        );
        return;
    }
    const nw = w / 3;
    const nh = h / 3;
    for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
            if (i === 1 && j === 1) continue;
            sierpinskicar(x + i * nw, y + j * nh, nw, nh, depth - 1, arr);
        }
    }
}

function generatesierpinskicar(depth) {
    const arr = [];
    sierpinskicar(-0.8, -0.8, 1.6, 1.6, depth, arr);
    updatebuffer(arr);
    drawmode = gl.TRIANGLES;
}

function drawscene() {
    gl.useProgram(program);
    gl.enableVertexAttribArray(positionlocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionbuffer);
    gl.vertexAttribPointer(positionlocation, 2, gl.FLOAT, false, 0, 0);

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.1, 0.1, 0.1, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.uniform2f(resolutionlocation, canvas.width, canvas.height);
    
    if (currentmode === 'mandelbrot') {
        gl.uniform1i(fractaltypelocation, 0);
        gl.uniform1f(zoomlocation, paramvalue);
        gl.uniform2f(offsetlocation, -0.5, 0.0);
        gl.uniform1f(scalelocation, 1.0);
    } else if (currentmode === 'julia') {
        gl.uniform1i(fractaltypelocation, 1);
        gl.uniform1f(zoomlocation, 3.0);
        gl.uniform2f(offsetlocation, 0.0, 0.0);
        gl.uniform1f(scalelocation, 1.0);
        const ang = paramvalue;
        gl.uniform2f(juliaclocation, 0.7885 * Math.cos(ang), 0.7885 * Math.sin(ang));
    } else {
        gl.uniform1i(fractaltypelocation, 2);
        gl.uniform1f(scalelocation, 0.9);
    }

    gl.drawArrays(drawmode, 0, vertexcount);
}

function switchmode(mode, min, max, step, val, lbl) {
    currentmode = mode;
    paramcontrols.style.display = 'block';
    paraminput.min = min;
    paraminput.max = max;
    paraminput.step = step;
    paraminput.value = val;
    paramvalue = val;
    paramval.innerText = val;
    document.querySelector('label').childNodes[0].nodeValue = lbl + ": ";
    updatemode();
}

function updatemode() {
    if (currentmode === 'mandelbrot' || currentmode === 'julia') {
        setquad();
    } else if (currentmode === 'koch') {
        generatekoch(parseInt(paramvalue));
    } else if (currentmode === 'minkowski') {
        generateminkowski(parseInt(paramvalue));
    } else if (currentmode === 'sierpinskitri') {
        generatesierpinskitri(parseInt(paramvalue));
    } else if (currentmode === 'sierpinskicar') {
        generatesierpinskicar(parseInt(paramvalue));
    }
    drawscene();
}

btnmandelbrot.addEventListener('click', () => switchmode('mandelbrot', 0.1, 5.0, 0.1, 3.0, 'Zoom'));
btnjulia.addEventListener('click', () => switchmode('julia', 0.0, 6.28, 0.1, 0.0, 'C Angle'));
btnkoch.addEventListener('click', () => switchmode('koch', 0, 6, 1, 3, 'Recursion Depth'));
btnminkowski.addEventListener('click', () => switchmode('minkowski', 0, 4, 1, 2, 'Recursion Depth'));
btnsierpinskitri.addEventListener('click', () => switchmode('sierpinskitri', 0, 7, 1, 4, 'Recursion Depth'));
btnsierpinskicar.addEventListener('click', () => switchmode('sierpinskicar', 0, 5, 1, 3, 'Recursion Depth'));

paraminput.addEventListener('input', (e) => {
    paramvalue = parseFloat(e.target.value);
    paramval.innerText = paramvalue;
    updatemode();
});

switchmode('mandelbrot', 0.1, 5.0, 0.1, 3.0, 'Zoom');