// table.js
export class Table {
  constructor(gl, program) {
    this.gl = gl;
    this.program = program;
    this.lights = [];

    // 简单做法：一个大平面 + 木质边框 + 6个圆柱袋
    this.createTableGeometry();
  }

  createTableGeometry() {
    const gl = this.gl;
    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);

    // 桌面（绿色绒布）
    const vertices = [
      -3.5, 0.1,  2.5,   3.5, 0.1,  2.5,   3.5, 0.1, -2.5,  -3.5, 0.1, -2.5,
    ];
    const normals = [0,1,0, 0,1,0, 0,1,0, 0,1,0];
    const texcoords = [0,0, 1,0, 1,1, 0,1];
    const indices = [0,1,2, 0,2,3];

    this.setupBuffer(vertices, normals, texcoords, indices);
    gl.bindVertexArray(null);
  }

  setupBuffer(vertices, normals, texcoords, indices) {
    const gl = this.gl;

    // 顶点
    const vbuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vbuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    const posLoc = gl.getAttribLocation(this.program, 'a_position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);

    // 法线
    const nbuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, nbuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
    const normLoc = gl.getAttribLocation(this.program, 'a_normal');
    gl.enableVertexAttribArray(normLoc);
    gl.vertexAttribPointer(normLoc, 3, gl.FLOAT, false, 0, 0);

    // 纹理坐标
    const tbuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tbuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texcoords), gl.STATIC_DRAW);
    const texLoc = gl.getAttribLocation(this.program, 'a_texcoord');
    gl.enableVertexAttribArray(texLoc);
    gl.vertexAttribPointer(texLoc, 2, gl.FLOAT, false, 0, 0);

    // 索引
    const ibuf = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibuf);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
    this.indexCount = indices.length;

    // 纹理
    this.texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([40,120,40,255]));
    const img = new Image();
    img.onload = () => {
      gl.bindTexture(gl.TEXTURE_2D, this.texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.generateMipmap(gl.TEXTURE_2D);
    };
    img.src = 'textures/felt.jpg';
  }

  draw(viewProjMatrix) {
    this.gl.useProgram(this.program);
    this.gl.bindVertexArray(this.vao);

    const modelMatrix = mat4.create();
    const mvpMatrix = mat4.create();
    mat4.multiply(mvpMatrix, viewProjMatrix, modelMatrix);

    const normalMatrix = mat3.create();
    mat3.normalFromMat4(normalMatrix, modelMatrix);

    this.gl.uniformMatrix4fv(this.gl.getUniformLocation(this.program, 'u_mvpMatrix'), false, mvpMatrix);
    this.gl.uniformMatrix4fv(this.gl.getUniformLocation(this.program, 'u_modelMatrix'), false, modelMatrix);
    this.gl.uniformMatrix3fv(this.gl.getUniformLocation(this.program, 'u_normalMatrix'), false, normalMatrix);

    this.gl.activeTexture(gl.TEXTURE0);
    this.gl.bindTexture(gl.TEXTURE_2D, this.texture);
    this.gl.uniform1i(this.gl.getUniformLocation(this.program, 'u_texture'), 0);
    this.gl.uniform1f(this.gl.getUniformLocation(this.program, 'u_hasTexture'), 1.0);

    this.gl.drawElements(gl.TRIANGLES, this.indexCount, gl.UNSIGNED_SHORT, 0);
    this.gl.bindVertexArray(null);
  }
}
