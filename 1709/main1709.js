const canvas = document.getElementById("canvas");
const gl = canvas.getContext("webgl2");

if (!gl) {
    throw new Error("WebGL 2 não funcionou aqui.");
}

// Shader de vértice básico (recebe a matriz de exibição e a do objeto)
const vertexShaderSource = `#version 300 es
in vec2 aPosition;

uniform mat3 u_viewTransform;
uniform mat3 u_modelTransform;

void main() {
    vec3 position = u_viewTransform * u_modelTransform * vec3(aPosition, 1.0);
    gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

// Shader de fragmento simples pra pintar com a cor uniform
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

function createProgram(gl, vertexShaderSource, fragmentShaderSource) {
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(program));
    }
    return program;
}

const program = createProgram(gl, vertexShaderSource, fragmentShaderSource);

// Classe pra facilitar o envio dos buffers e uniforms
class Renderer {
    constructor(gl, program) {
        this.gl = gl;
        this.program = program;

        this.positionLocation = gl.getAttribLocation(program, "aPosition");
        this.colorLocation = gl.getUniformLocation(program, "uColor");
        this.viewTransformLocation = gl.getUniformLocation(program, "u_viewTransform");
        this.modelTransformLocation = gl.getUniformLocation(program, "u_modelTransform");

        this.viewTransform = m3.identity();
        this.verticesBuffer = gl.createBuffer();
    }

    defineViewTransform(viewTransform) {
        this.viewTransform = viewTransform;
    }

    draw(object) {
        const gl = this.gl;

        gl.bindBuffer(gl.ARRAY_BUFFER, this.verticesBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, object.vertices, gl.STATIC_DRAW);

        gl.enableVertexAttribArray(this.positionLocation);
        gl.vertexAttribPointer(this.positionLocation, 2, gl.FLOAT, false, 0, 0);

        gl.uniform3fv(this.colorLocation, object.color);
        gl.uniformMatrix3fv(this.modelTransformLocation, false, object.modelTransform);
        gl.uniformMatrix3fv(this.viewTransformLocation, false, this.viewTransform);

        gl.drawArrays(gl.TRIANGLES, 0, object.vertices.length / 2);
    }
}

// Monta 2 triângulos pra formar um retângulo simples
function rectangleVertices(x, y, width, height) {
    return [
        x, y,
        x + width, y + height,
        x, y + height,

        x, y,
        x + width, y,
        x + width, y + height
    ];
}

function robotBodyVertices() {
    return new Float32Array(rectangleVertices(-0.15, -0.2, 0.3, 0.4));
}

function robotHeadVertices() {
    return new Float32Array(rectangleVertices(-0.1, 0.0, 0.2, 0.2));
}

// Origem no topo pra girar direto pelo ombro
function robotArmVertices() {
    return new Float32Array(rectangleVertices(-0.03, -0.25, 0.06, 0.25));
}

// Origem no topo pra girar no quadril
function robotLegVertices() {
    return new Float32Array(rectangleVertices(-0.04, -0.3, 0.08, 0.3));
}

function groundVertices() {
    return new Float32Array(rectangleVertices(-2.0, -0.8, 4.0, 0.3));
}

// Classe base pra guardar geometria e cor de cada parte
class SceneObject {
    constructor(vertices, color) {
        this.vertices = vertices;
        this.color = color;
        this.modelTransform = m3.identity();
    }

    updateModelTransform(modelTransform) {
        this.modelTransform = modelTransform;
    }
}

class Ground extends SceneObject {
    constructor() {
        super(groundVertices(), new Float32Array([0.2, 0.2, 0.2]));
    }
    draw(renderer) {
        renderer.draw(this);
    }
}

class RobotBody extends SceneObject {
    constructor(color) { super(robotBodyVertices(), color); }
}

class RobotHead extends SceneObject {
    constructor(color) { super(robotHeadVertices(), color); }
}

class RobotArm extends SceneObject {
    constructor(color) { super(robotArmVertices(), color); }
}

class RobotLeg extends SceneObject {
    constructor(color) { super(robotLegVertices(), color); }
}

// Robô articulado montado por partes
class Robot {
    constructor(tx, ty, color, speed) {
        this.tx = tx;
        this.ty = ty;
        this.speed = speed;
        this.walkCycle = 0.0;

        // Perna/braço com tom um pouco mais escuro pra dar contraste
        const limbColor = new Float32Array([color[0] * 0.7, color[1] * 0.7, color[2] * 0.7]);
        const headColor = new Float32Array([color[0] * 0.9, color[1] * 0.9, color[2] * 0.9]);

        this.body = new RobotBody(color);
        this.head = new RobotHead(headColor);
        this.leftArm = new RobotArm(limbColor);
        this.rightArm = new RobotArm(limbColor);
        this.leftLeg = new RobotLeg(limbColor);
        this.rightLeg = new RobotLeg(limbColor);
    }

    move() {
        // Vai e volta na tela
        this.tx += this.speed;
        if (this.tx > 1.6 || this.tx < -1.6) {
            this.speed = -this.speed;
        }

        // Variável do tempo pra sincronizar o balanço
        this.walkCycle += Math.abs(this.speed) * 15.0;

        // Seno pros membros balançarem em sentidos opostos
        const armAngle = Math.sin(this.walkCycle) * 0.6;
        const legAngle = Math.sin(this.walkCycle + Math.PI) * 0.5;
        const headAngle = Math.sin(this.walkCycle * 2) * 0.08;

        const robotTransform = m3.translation(this.tx, this.ty);

        // Atualiza a posição do corpo no mundo
        this.body.updateModelTransform(robotTransform);

        // Multiplica a matriz global do robô com a transformação local de cada membro
        const headLocal = m3.multiply(m3.translation(0.0, 0.2), m3.rotation(headAngle));
        this.head.updateModelTransform(m3.multiply(robotTransform, headLocal));

        const leftArmLocal = m3.multiply(m3.translation(-0.18, 0.15), m3.rotation(armAngle));
        this.leftArm.updateModelTransform(m3.multiply(robotTransform, leftArmLocal));

        const rightArmLocal = m3.multiply(m3.translation(0.18, 0.15), m3.rotation(-armAngle));
        this.rightArm.updateModelTransform(m3.multiply(robotTransform, rightArmLocal));

        const leftLegLocal = m3.multiply(m3.translation(-0.08, -0.2), m3.rotation(legAngle));
        this.leftLeg.updateModelTransform(m3.multiply(robotTransform, leftLegLocal));

        const rightLegLocal = m3.multiply(m3.translation(0.08, -0.2), m3.rotation(-legAngle));
        this.rightLeg.updateModelTransform(m3.multiply(robotTransform, rightLegLocal));
    }

    draw(renderer) {
        // Ordem do render: pernas no fundo, corpo no meio, braços/cabeça na frente
        renderer.draw(this.leftLeg);
        renderer.draw(this.rightLeg);
        renderer.draw(this.body);
        renderer.draw(this.head);
        renderer.draw(this.leftArm);
        renderer.draw(this.rightArm);
    }
}

// Loop e gerenciamento da cena
class Scene {
    constructor(gl, program) {
        this.renderer = new Renderer(gl, program);
        
        // Window clipping de -2 a 2 no X e -1 a 1 no Y
        this.viewTransform = m3.setClippingWindow(-2.0, -1.0, 2.0, 1.0);
        this.renderer.defineViewTransform(this.viewTransform);

        this.ground = new Ground();

        // 3 robôs com posições, velocidades e cores diferentes
        this.robots = [
            new Robot(0.0, -0.2, new Float32Array([0.9, 0.2, 0.2]), 0.005),
            new Robot(-1.0, 0.2, new Float32Array([0.2, 0.6, 0.9]), 0.003),
            new Robot(0.8, 0.0, new Float32Array([0.2, 0.8, 0.3]), -0.004)
        ];
    }

    update() {
        for (const robot of this.robots) {
            robot.move();
        }
    }

    draw() {
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(program);

        this.ground.draw(this.renderer);

        for (const robot of this.robots) {
            robot.draw(this.renderer);
        }
    }

    execute() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.execute());
    }

    init() {
        requestAnimationFrame(() => this.execute());
    }
}

// Config inicial do canvas
gl.clearColor(0.1, 0.1, 0.15, 1.0);
gl.viewport(0, 0, canvas.width, canvas.height);

const scene = new Scene(gl, program);
scene.init();