#include <GL/glut.h>
#include <cmath>
#include <vector>

struct Point {
    int x, y;
};

enum Modo { MODO_RETA, MODO_TRIANGULO };
Modo modoAtual = MODO_RETA;

std::vector<Point> pontosAtuais;
std::vector<Point> figuraExibida; // Armazena os vértices da figura completa a ser renderizada

// Tabela de Cores ('0' a '9')
float cores[10][3] = {
    {0.0f, 0.0f, 1.0f}, // 0: Azul
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

int corAtual = 0; // Azul como padrão inicial

// Algoritmo Genérico de Bresenham
void desenharRetaBresenham(Point p1, Point p2) {
    int x0 = p1.x, y0 = p1.y;
    int x1 = p2.x, y1 = p2.y;

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

    if (modoAtual == MODO_RETA && figuraExibida.size() == 2) {
        desenharRetaBresenham(figuraExibida[0], figuraExibida[1]);
    } else if (modoAtual == MODO_TRIANGULO && figuraExibida.size() == 3) {
        desenharRetaBresenham(figuraExibida[0], figuraExibida[1]);
        desenharRetaBresenham(figuraExibida[1], figuraExibida[2]);
        desenharRetaBresenham(figuraExibida[2], figuraExibida[0]);
    }

    glFlush();
}

void mouse(int button, int state, int x, int y) {
    if (button == GLUT_LEFT_BUTTON && state == GLUT_DOWN) {
        int windowHeight = glutGet(GLUT_WINDOW_HEIGHT);
        pontosAtuais.push_back({x, windowHeight - y});

        int cliquesNecessarios = (modoAtual == MODO_RETA) ? 2 : 3;

        // Quando atingir a quantidade de pontos necessária, substitui a figura exibida
        if (pontosAtuais.size() == cliquesNecessarios) {
            figuraExibida = pontosAtuais;
            pontosAtuais.clear();
            glutPostRedisplay();
        }
    }
}

void keyboard(unsigned char key, int x, int y) {
    if (key >= '0' && key <= '9') {
        corAtual = key - '0';
        glutPostRedisplay();
    } 
    else if (key == 'r' || key == 'R') {
        modoAtual = MODO_RETA;
        pontosAtuais.clear();
        figuraExibida.clear(); // Apaga a figura anterior ao trocar de modo
        glutPostRedisplay();
    } 
    else if (key == 't' || key == 'T') {
        modoAtual = MODO_TRIANGULO;
        pontosAtuais.clear();
        figuraExibida.clear(); // Apaga a figura anterior ao trocar de modo
        glutPostRedisplay();
    }
}

void init() {
    glClearColor(0.0, 0.0, 0.0, 1.0);
    glMatrixMode(GL_PROJECTION);
    glLoadIdentity();
    gluOrtho2D(0, 800, 0, 600);

    // Inicializa o Exercicio 2 com a reta padrão (0,0) a (0,0)
    figuraExibida = {{0, 0}, {0, 0}};
}

int main(int argc, char** argv) {
    glutInit(&argc, argv);
    glutInitDisplayMode(GLUT_SINGLE | GLUT_RGB);
    glutInitWindowSize(800, 600);
    glutInitWindowPosition(100, 100);
    glutCreateWindow("CG - Exercicio 2: Retas e Triangulos");

    init();

    glutDisplayFunc(display);
    glutMouseFunc(mouse);
    glutKeyboardFunc(keyboard);

    glutMainLoop();
    return 0;
}