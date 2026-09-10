const canvas = document.getElementById("canvas");
const gl = canvas.getContext("webgl2");

if (!gl) {
    throw new Error("WebGL 2 não é suportado.");
}

// Elementos do Placar
const pontosEsqEl = document.getElementById("pontos-esq");
const pontosDirEl = document.getElementById("pontos-dir");
let pontosEsq = 0;
let pontosDir = 0;

function verticesBarra() {
    return new Float32Array([
        -0.05,  0.2,
        -0.05, -0.2,
         0.05,  0.2,
         0.05,  0.2,
        -0.05, -0.2,
         0.05, -0.2
    ]);
}

function verticesBola() {
    let vertices = [];
    let numSegments = 30;
    let radius = 0.05;

    for (let i = 0; i < numSegments; i++) {
        let theta1 = (i / numSegments) * 2 * Math.PI;
        let theta2 = ((i + 1) / numSegments) * 2 * Math.PI;

        vertices.push(0, 0);
        vertices.push(radius * Math.cos(theta1), radius * Math.sin(theta1));
        vertices.push(radius * Math.cos(theta2), radius * Math.sin(theta2));
    }

    return new Float32Array(vertices);
}

let verticesBarraDireita = verticesBarra();
let corBarraDireita = new Float32Array([0.0, 0.0, 1.0]);

let verticesBarraEsquerda = verticesBarra();
let corBarraEsquerda = new Float32Array([0.0, 1.0, 0.0]);

let verticesBolaCentro = verticesBola();
let corBolaCentro = new Float32Array([1.0, 0.0, 0.0]);

let MbarraEsquerda = m3.translation(-0.9, 0.0);
let MbarraDireita = m3.translation(0.9, 0.0);
let MbolaCentro = m3.identity();

const verticesBuffer = gl.createBuffer();

const vertexShaderSource = `#version 300 es
in vec2 aPosition;
uniform mat3 u_transform;
out vec3 vColor;
void main() {
    vec3 position = u_transform * vec3(aPosition, 1.0);
    gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const fragmentShaderSource = `#version 300 es
precision mediump float;
uniform vec3 uColor;
out vec4 outColor;
void main() {
    outColor = vec4(uColor, 1.0);
}
`;

function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const error = gl.getShaderInfoLog(shader);
        gl.deleteShader(shader);
        throw new Error(error);
    }
    return shader;
}

const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

const program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);

if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program));
}

const positionLocation = gl.getAttribLocation(program, "aPosition");
const colorLocation = gl.getUniformLocation(program, "uColor");
const transformLocation = gl.getUniformLocation(program, "u_transform");

gl.clearColor(0.1, 0.1, 0.1, 1.0);

const keys = {};
window.addEventListener("keydown", (e) => { keys[e.key] = true; });
window.addEventListener("keyup", (e) => { keys[e.key] = false; });

let tyBE = 0.0;
let tyBD = 0.0;
let txBola = 0.0;
let tyBola = 0.0;

const velBarra = 1.2;
let vxBola = 0.8;
let vyBola = 0.6;
let tempoAnterior = 0;

function atualizaAnimacao(deltaTime) {
    if (keys['w'] || keys['W']) tyBE += velBarra * deltaTime;
    if (keys['s'] || keys['S']) tyBE -= velBarra * deltaTime;
    tyBE = Math.max(-0.8, Math.min(0.8, tyBE));

    if (keys['ArrowUp']) tyBD += velBarra * deltaTime;
    if (keys['ArrowDown']) tyBD -= velBarra * deltaTime;
    tyBD = Math.max(-0.8, Math.min(0.8, tyBD));

    txBola += vxBola * deltaTime;
    tyBola += vyBola * deltaTime;

    const raioBola = 0.05;
    const meiaAlturaBarra = 0.2;

    // Colisão Borda Superior / Inferior
    if (tyBola + raioBola >= 1.0 || tyBola - raioBola <= -1.0) {
        vyBola = -vyBola;
    }

    // Colisão Barra Esquerda
    if (txBola - raioBola <= -0.85 && txBola - raioBola >= -0.95) {
        if (tyBola >= tyBE - meiaAlturaBarra && tyBola <= tyBE + meiaAlturaBarra) {
            vxBola = Math.abs(vxBola);
        }
    }

    // Colisão Barra Direita
    if (txBola + raioBola >= 0.85 && txBola + raioBola <= 0.95) {
        if (tyBola >= tyBD - meiaAlturaBarra && tyBola <= tyBD + meiaAlturaBarra) {
            vxBola = -Math.abs(vxBola);
        }
    }

    // Contagem de Pontos
    if (txBola > 1.1) {
        pontosEsq++;
        pontosEsqEl.textContent = pontosEsq;
        txBola = 0.0;
        tyBola = 0.0;
        vxBola = -vxBola;
    } else if (txBola < -1.1) {
        pontosDir++;
        pontosDirEl.textContent = pontosDir;
        txBola = 0.0;
        tyBola = 0.0;
        vxBola = -vxBola;
    }

    MbarraEsquerda = m3.translation(-0.9, tyBE);
    MbarraDireita = m3.translation(0.9, tyBD);
    MbolaCentro = m3.translation(txBola, tyBola);
}

const numComponents = 2;

function drawScene(now) {
    now *= 0.001;
    const deltaTime = Math.min(now - tempoAnterior, 0.1);
    tempoAnterior = now;

    atualizaAnimacao(deltaTime);

    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(program);

    drawBarraEsquerda();
    drawBarraDireita();
    drawBolaCentro();

    requestAnimationFrame(drawScene);
}

function drawBarraEsquerda() {
    gl.bindBuffer(gl.ARRAY_BUFFER, verticesBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, verticesBarraEsquerda, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    gl.uniform3fv(colorLocation, corBarraEsquerda);
    gl.uniformMatrix3fv(transformLocation, false, MbarraEsquerda);
    gl.drawArrays(gl.TRIANGLES, 0, verticesBarraEsquerda.length / numComponents);
}

function drawBarraDireita() {
    gl.bindBuffer(gl.ARRAY_BUFFER, verticesBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, verticesBarraDireita, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    gl.uniform3fv(colorLocation, corBarraDireita);
    gl.uniformMatrix3fv(transformLocation, false, MbarraDireita);
    gl.drawArrays(gl.TRIANGLES, 0, verticesBarraDireita.length / numComponents);
}

function drawBolaCentro() {
    gl.bindBuffer(gl.ARRAY_BUFFER, verticesBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, verticesBolaCentro, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    gl.uniform3fv(colorLocation, corBolaCentro);
    gl.uniformMatrix3fv(transformLocation, false, MbolaCentro);
    gl.drawArrays(gl.TRIANGLES, 0, verticesBolaCentro.length / numComponents);
}

requestAnimationFrame(drawScene);