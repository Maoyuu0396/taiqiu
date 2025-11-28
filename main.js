import { Sphere } from "./sphere.js";
import { Table } from "./table.js";
import { Cue } from "./cue.js";

let gl, program, pocketProgram;
let camera = {
  eye: [0, 8, 0],
  center: [0, 0, 0],
  up: [0, 0, 1],
  mode: 'fixed' // fixed, follow, final
};

let animationTime = 0;
let state = 'ready'; // ready → aiming → hit → rolling → pocket → end
let whiteBall, blackBall, cue, table;

const vsSource = await fetch('shaders/vertex.glsl').then(r => r.text());
const fsSource = await fetch('shaders/fragment.glsl').then(r => r.text());
const pocketFs = await fetch('shaders/pocket-light.frag').then(r => r.text());

function initGL() {
  const canvas = document.createElement('canvas');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  document.body.appendChild(canvas);
  gl = canvas.getContext('webgl2');
  if (!gl) alert("WebGL2 not supported");

  window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
  });

  // 普通着色器
  program = createProgram(vsSource, fsSource);
  // 入袋氛围灯带特效着色器
  pocketProgram = createProgram(vsSource, pocketFs);
  
  gl.enable(gl.DEPTH_TEST);
  return canvas;
}

function createProgram(vs, fs) {
  const prog = gl.createProgram();
  const vshader = gl.createShader(gl.VERTEX_SHADER);
  const fshader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(vshader, vs);
  gl.shaderSource(fshader, fs);
  gl.compileShader(vshader);
  gl.compileShader(fshader);
  gl.attachShader(prog, vshader);
  gl.attachShader(prog, fshader);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.log(gl.getShaderInfoLog(vshader));
    console.log(gl.getShaderInfoLog(fshader));
    console.log(gl.getProgramInfoLog(prog));
  }
  return prog;
}

async function main() {
  initGL();

  table = new Table(gl, program);
  whiteBall = new Sphere(gl, program, [0, 0.2, 0], 0.2, [1,1,1,1], 'textures/whiteball.jpg');
  blackBall = new Sphere(gl, program, [-2, 0.2, 0], 0.2, [0.1,0.1,0.1,1], 'textures/blackball.jpg');
  cue = new Cue(gl, program);

  // 顶灯 + 跟随聚光灯 + 四个底袋氛围灯
  table.lights = [
    { type: 'directional', dir: [0,-1,0], color: [0.8,0.8,0.9] },     // 顶灯
    { type: 'spot', pos: [0,3,0], dir: [0,-1,0], color: [1.2,1.2,1.0], cutoff: 0.6 }, // 跟随聚光
    { type: 'point', pos: [-3.5,0.5,2.5], color: [0,0,0] },   // 四个角灯，入袋时点亮
    { type: 'point', pos: [-3.5,0.5,-2.5], color: [0,0,0] },
    { type: 'point', pos: [3.5,0.5,2.5], color: [0,0,0] },
    { type: 'point', pos: [3.5,0.5,-2.5], color: [0,0,0] }
  ];

  document.addEventListener('keydown', e => {
    if (e.code === 'Space') {
      if (state === 'ready' || state === 'end') {
        state = 'aiming';
        animationTime = 0;
      }
    }
  });

  requestAnimationFrame(render);
}

let lastTime = 0;
function render(time) {
  time *= 0.001;
  const dt = time - (lastTime || time);
  lastTime = time;
  animationTime += dt;

  gl.clearColor(0.05, 0.1, 0.05, 1);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  const proj = mat4.create();
  mat4.perspective(proj, Math.PI/4, gl.canvas.width/gl.canvas.height, 0.1, 100);

  const view = mat4.create();
  if (camera.mode === 'follow') {
    // 场景二：镜头跟随白球
    const followDist = 4;
    const eyeX = whiteBall.pos[0] + followDist * Math.sin(whiteBall.pos[0]*0.2);
    const eyeZ = whiteBall.pos[2] - followDist;
    mat4.lookAt(view, [eyeX, 5, eyeZ], whiteBall.pos, [0,1,0]);
  } else if (camera.mode === 'final') {
    mat4.lookAt(view, [0,8,0], [0,0,0], [0,0,1]);
  } else {
    mat4.lookAt(view, camera.eye, camera.center, camera.up);
  }

  // ===================== 动画状态机 =====================
  if (state === 'aiming' && animationTime > 1.0) {
    state = 'hit';
    animationTime = 0;
  }
  if (state === 'hit' && animationTime > 0.3) {
    state = 'rolling';
    animationTime = 0;
    camera.mode = 'follow';
  }
  if (state === 'rolling') {
    // 白球前进
    whiteBall.pos[0] += dt * 3.0;
    // 碰撞检测（简化）
    if (whiteBall.pos[0] > blackBall.pos[0] - 0.4 && !blackBall.moving) {
      blackBall.velocity = 4.0;
      blackBall.moving = true;
    }
    if (blackBall.moving) {
      blackBall.pos[0] += dt * blackBall.velocity;
      blackBall.velocity *= 0.98;
      if (blackBall.pos[0] > 2.8) {
        state = 'pocket';
        animationTime = 0;
        camera.mode = 'final';
        // 点亮四个底袋氛围灯
        for (let i = 2; i <= 5; i++) {
          table.lights[i].color = [0.3, 0.8, 1.0];
        }
      }
    }
    if (whiteBall.pos[0] > 3.5) state = 'end';
  }

  // 球杆动画（场景一）
  const cuePull = state === 'aiming' ? Math.sin(animationTime * 3) * 0.8 : 0;
  cue.position[0] = whiteBall.pos[0] - 2.5 + cuePull;

  // 入袋缩放动画
  if (state === 'pocket') {
    const t = animationTime * 4;
    blackBall.scale = Math.max(0, 1 - t);
    if (t > 1.2) state = 'end';
  }

  // 更新聚光灯跟随白球
  table.lights[1].pos = [whiteBall.pos[0], 3, whiteBall.pos[2]];

  // 渲染
  gl.useProgram(program);
  const viewProj = mat4.create();
  mat4.multiply(viewProj, proj, view);

  table.draw(viewProj);
  whiteBall.draw(viewProj);
  blackBall.draw(viewProj);
  cue.draw(viewProj);

  // 黑球入袋时用特效shader（氛围灯带闪烁）
  if (state === 'pocket') {
    gl.useProgram(pocketProgram);
    table.draw(viewProj); // 重新绘制桌子，带rim light
  }

  requestAnimationFrame(render);
}

main();
