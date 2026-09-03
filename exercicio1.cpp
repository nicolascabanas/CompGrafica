#include <GL/glut.h>
#include <cmath>
#include <vector>

struct Point {
    int x, y;
};

// Coordenadas da reta atual (Inicia em (0,0) a (0,0))
Point p1 = {0, 0};
Point p2 = {0, 0};

// Ponto temporário para armazenar o primeiro clique
Point pontoTemporario = {0, 0};
int cliquesAtuais = 0;

// Tabela de Cores ('0' a '9')
float cores[10][3] = {
    {0.0f, 0.0f, 1.0f}, // 0: Azul (Padrão inicial)
    {1.0f, 0.0f, 0.0f}, // 1: Vermelho
    {0.0f, 1.0f, 0.0f}, // 2: Verde
    {1.0f, 1.0f, 0.0f}, // 3: Amarelo
    {1.0f, 0.0f, 1.0f}, // 4: Magenta
    {0.0f, 1.0f, 1.0f}, // 5: Ciano
    {1.0f, 0.5f, 0.0f}, // 6: Laranja
    {0.5f, 0.0f, 0.5f}, // 7: Roxo
    {1.0f, 1.0f, 1.0f}, // 8: Branco
    {0.5f, 0.5f, 0.5f}  // 9: Cinza
};

int corAtual = 0; // Índice 0 = Azul

// Algoritmo Genérico de Bresenham
void desenharRetaBresenham(Point pt1, Point pt2) {
    int x0 = pt1.x, y0 = pt1.y;
    int x1 = pt2.x, y1 = pt2.y;

    int dx = std::abs(x1 - x0);
    int dy = std::abs(y1 - y0);
    int sx = (x0 < x1) ? 1 : -1;
    int sy = (y0 < y1) ? 1 : -1;
    int err = dx - dy;

    glBegin(GL_POINTS);
    while (true) {
        glVertex2i(x0, y0);
        if (x0 == x1 && y0 == y1) break;
        int e2 = 2 * err;
        if (e2 > -dy) {
            err -= dy;
            x0 += sx;
        }
        if (e2 < dx) {
            err += dx;
            x0 += sy;
        }
    }
    glEnd();
}

void display() {
    glClear(GL_COLOR_BUFFER_BIT);
    glColor3fv(cores[corAtual]);

    // Desenha a reta atual usando Bresenham
    desenharRetaBresenham(p1, p2);

    glFlush();
}

void mouse(int button, int state, int x, int y) {
    if (button == GLUT_LEFT_BUTTON && state == GLUT_DOWN) {
        int windowHeight = glutGet(GLUT_WINDOW_HEIGHT);
        int posY = windowHeight - y; // Inverte Y para adequar ao OpenGL

        if (cliquesAtuais == 0) {
            pontoTemporario = {x, posY};
            cliquesAtuais = 1;
        } else if (cliquesAtuais == 1) {
            p1 = pontoTemporario;
            p2 = {x, posY};
            cliquesAtuais = 0; // Reseta o contador para os próximos 2 cliques
            glutPostRedisplay();
        }
    }
}

void keyboard(unsigned char key, int x, int y) {
    if (key >= '0' && key <= '9') {
        corAtual = key - '0';
        glutPostRedisplay();
    }
}

void init() {
    glClearColor(0.0, 0.0, 0.0, 1.0);
    glMatrixMode(GL_PROJECTION);
    glLoadIdentity();
    gluOrtho2D(0, 800, 0, 600);
}

int main(int argc, char** argv) {
    glutInit(&argc, argv);
    glutInitDisplayMode(GLUT_SINGLE | GLUT_RGB);
    glutInitWindowSize(800, 600);
    glutInitWindowPosition(100, 100);
    glutCreateWindow("CG - Exercicio 1: Desenhador de Retas");

    init();

    glutDisplayFunc(display);
    glutMouseFunc(mouse);
    glutKeyboardFunc(keyboard);

    glutMainLoop();
    return 0;
}