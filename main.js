const canvas = document.getElementById("canvas");
const gl = canvas.getContext("webgl2");

if (!gl) throw new Error("WebGL 2 não é suportado.");

// Tabela de Cores (RGB de 0.0 a 1.0)
const tabelaCores = [
    [0.0, 0.0, 1.0], // 0: Azul (Padrão)
    [1.0, 0.0, 0.0], // 1: Vermelho
    [0.0, 1.0, 0.0], // 2: Verde
    [1.0, 1.0, 0.0], // 3: Amarelo
    [1.0, 0.0, 1.0], // 4: Magenta
    [0.0, 1.0, 1.0], // 5: Ciano
    [1.0, 0.5, 0.0], // 6: Laranja
    [0.5, 0.0, 0.5], // 7: Roxo
    [1.0, 1.0, 1.0], // 8: Branco
    [0.5, 0.5, 0.5]  // 9: Cinza
];

let corAtual = tabelaCores[0];
let modoAtual = 'RETA'; // 'RETA' ou 'TRIANGULO'
let pontosCliques = [];
let verticesWebGL = new Float32Array([0.0, 0.0]); // Inicia em (0,0)

// Configuração de Buffers
const verticesBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, verticesBuffer);
gl.bufferData(gl.ARRAY_BUFFER, verticesWebGL, gl.STATIC_DRAW);

// Shaders GLSL ES 300
const vertexShaderSource = `#version 300 es
in vec2 aPosition;
void main() {
    gl_Position = vec4(aPosition, 0.0, 1.0);
    gl_PointSize = 2.0;
}`;

const fragmentShaderSource = `#version 300 es
precision mediump float;
uniform vec3 uColor;
out vec4 outColor;
void main() {
    outColor = vec4(uColor, 1.0);
}`;

function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return shader;
}

const program = gl.createProgram();
gl.attachShader(program, createShader(gl, gl.VERTEX_SHADER, vertexShaderSource));
gl.attachShader(program, createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource));
gl.linkProgram(program);
gl.useProgram(program);

const positionLocation = gl.getAttribLocation(program, "aPosition");
const colorLocation = gl.getUniformLocation(program, "uColor");

gl.enableVertexAttribArray(positionLocation);
gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

// Converte Pixel do Canvas (0 a 600) para Normalizado WebGL (-1.0 a 1.0)
function pixelParaWebGL(px, py) {
    const x = (px / canvas.width) * 2 - 1;
    const y = -((py / canvas.height) * 2 - 1);
    return [x, y];
}

// Algoritmo Genérico de Bresenham para gerar os pixels da linha
function bresenham(p1, p2) {
    let pixels = [];
    let x0 = p1.x, y0 = p1.y;
    let x1 = p2.x, y1 = p2.y;

    let dx = Math.abs(x1 - x0);
    let dy = Math.abs(y1 - y0);
    let sx = x0 < x1 ? 1 : -1;
    let sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    while (true) {
        let [wx, wy] = pixelParaWebGL(x0, y0);
        pixels.push(wx, wy);

        if (x0 === x1 && y0 === y1) break;
        let e2 = 2 * err;
        if (e2 > -dy) { err -= dy; x0 += sx; }
        if (e2 < dx) { err += dx; y0 += sy; }
    }
    return pixels;
}

function atualizarDesenho() {
    let todosPixels = [];

    if (modoAtual === 'RETA' && pontosCliques.length === 2) {
        todosPixels = bresenham(pontosCliques[0], pontosCliques[1]);
    } else if (modoAtual === 'TRIANGULO' && pontosCliques.length === 3) {
        let l1 = bresenham(pontosCliques[0], pontosCliques[1]);
        let l2 = bresenham(pontosCliques[1], pontosCliques[2]);
        let l3 = bresenham(pontosCliques[2], pontosCliques[0]);
        todosPixels = l1.concat(l2, l3);
    } else {
        // Padrão inicial: ponto/reta em (0,0)
        let [wx, wy] = pixelParaWebGL(300, 300);
        todosPixels = [wx, wy];
    }

    verticesWebGL = new Float32Array(todosPixels);
    gl.bindBuffer(gl.ARRAY_BUFFER, verticesBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, verticesWebGL, gl.STATIC_DRAW);
    drawScene();
}

function drawScene() {
    gl.clearColor(0.1, 0.1, 0.1, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform3fv(colorLocation, corAtual);
    gl.drawArrays(gl.POINTS, 0, verticesWebGL.length / 2);
}

// Eventos de Mouse e Teclado
canvas.addEventListener("mousedown", (e) => {
    const limiteCliques = modoAtual === 'RETA' ? 2 : 3;
    if (pontosCliques.length >= limiteCliques) pontosCliques = [];

    pontosCliques.push({ x: e.offsetX, y: e.offsetY });

    if (pontosCliques.length === limiteCliques) {
        atualizarDesenho();
    }
});

document.addEventListener("keydown", (e) => {
    const key = e.key.toUpperCase();
    if (key >= '0' && key <= '9') {
        corAtual = tabelaCores[parseInt(key)];
        drawScene();
    } else if (key === 'R') {
        modoAtual = 'RETA';
        pontosCliques = [];
        document.getElementById("infoModo").innerHTML = "Modo Atual: <b>RETA (2 cliques)</b> | Teclas: <b>'R'</b>, <b>'T'</b>, <b>'0'-'9'</b>";
        atualizarDesenho();
    } else if (key === 'T') {
        modoAtual = 'TRIANGULO';
        pontosCliques = [];
        document.getElementById("infoModo").innerHTML = "Modo Atual: <b>TRIÂNGULO (3 cliques)</b> | Teclas: <b>'R'</b>, <b>'T'</b>, <b>'0'-'9'</b>";
        atualizarDesenho();
    }
});

drawScene();