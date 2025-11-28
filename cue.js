// cue.js
export class Cue {
  constructor(gl, program) {
    this.gl = gl;
    this.program = program;
    this.position = [-2.0, 0.3, 0];  // 初始位置

    const vertices = [
      -0.05, 0.02, -2.0,   0.05, 0.02, -2.0,   0.05, 0.02, 0.1,
      -0.05, 0.02, 0.1,   -0.05, -0.02, -2.0,   0.05, -0.02, -2.0,
      0.05, -0.02, 0.1,   -0.05, -0.02, 0.1
    ];
    const indices = [0,1,2, 0,2,3, 4,5,6, 4,6,7, 0,4,7, 0,7,3, 1,5,6, 1,6,2];
    const normals = [];
    for (let i = 0; i < vertices.length; i += 3) normals.push(0,1,0);

    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);

    // 顶点、索引、法线同上方式创建（略，复制上面逻辑即可）
    // ... 直接用上面 sphere 的 setup 方法类似
    // 这里简化：直接用 cube 顶点数据
    this.setupCueGeometry(vertices, normals, indices);
  }

  setupCueGeometry(vertices, normals, indices) {
    const gl = this.gl;
    // 同上，创建 buffer，省略重复代码...
    // 实际使用时复制 sphere 的 buffer 创建部分即可
  }

  draw(viewProjMatrix) {
    // 同 sphere 的 draw，略
  }
}
