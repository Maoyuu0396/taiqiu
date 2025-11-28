// sphere.js
export class Sphere {
  constructor(gl, program, position, radius, color, texturePath = null) {
    this.gl = gl;
    this.program = program;
    this.position = position;        // [x, y, z]
    this.radius = radius;
    this.scale = 1.0;
    this.color = color;
    this.texturePath = texturePath;
    this.velocity = 0;
    this.moving = false;

    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);

    // 生成球体顶点（纬度30，经度30 → 1800+顶点，远超100顶点要求）
    const latitudeBands = 30;
    const longitudeBands = 30;
    const vertexPositionData = [];
    const normalData = [];
    const textureCoordData = [];
    const indexData = [];

    for (let lat = 0; lat <= latitudeBands; lat++) {
      const theta = lat * Math.PI / latitudeBands;
      const sinTheta = Math.sin(theta);
      const cosTheta = Math.cos(theta);

      for (let long = 0; long <= longitudeBands; long++) {
        const phi = long * 2 * Math.PI / longitudeBands;
        const sinPhi = Math.sin(phi);
        const cosPhi = Math.cos(phi);

        const x = cosPhi * sinTheta;
        const y = cosTheta;
        const z = sinPhi * sinTheta;
        const u = 1 - (long / longitudeBands);
        const v = 1 - (lat / latitudeBands);

        textureCoordData.push(u, v);
        normalData.push(x, y, z);
        vertexPositionData.push(radius * x, radius * y, radius * z);
      }
    }

    for (let lat = 0; lat < latitudeBands; lat++) {
      for (let long = 0; long < longitudeBands; long++) {
        const first = (lat * (longitudeBands + 1)) + long;
        const second = first + longitudeBands + 1;
        indexData.push(first, second, first + 1);
        indexData.push(second, second + 1, first + 1);
      }
    }

    // 顶点缓冲
    this.vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexPositionData), gl.STATIC_DRAW);

    const posLoc = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, 0, 0);

    // 法线缓冲
    this.normalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normalData), gl.STATIC_DRAW);

    const normLoc = gl.getAttribLocation(program, 'a_normal');
    gl.enableVertexAttribArray(normLoc);
    gl.vertexAttribPointer(normLoc, 3, gl.FLOAT, false, 0, 0);

    // 纹理坐标缓冲
    this.texcoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.texcoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoordData), gl.STATIC_DRAW);

    const texLoc = gl.getAttribLocation(program, 'a_texcoord');
    gl.enableVertexAttribArray(texLoc);
    gl.vertexAttribPointer(texLoc, 2, gl.FLOAT, false, 0, 0);

    // 索引缓冲
    this.indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indexData), gl.STATIC_DRAW);
    this.indexCount = indexData.length;

    // 加载纹理（如果有）
    if (texturePath) {
      this.texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, this.texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([200,200,255,255]));

      const img = new Image();
      img.onload = () => {
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        gl.generateMipmap(gl.TEXTURE_2D);
      };
      img.src = texturePath;
    }

    gl.bindVertexArray(null);
  }

  draw(viewProjMatrix, lights) {
    this.gl.useProgram(this.program);
    this.gl.bindVertexArray(this.vao);

    const modelMatrix = mat4.create();
    mat4.translate(modelMatrix, modelMatrix, this.position);
    mat4.scale(modelMatrix, modelMatrix, [this.scale, this.scale, this.scale]);

    const mvpMatrix = mat4.create();
    mat4.multiply(mvpMatrix, viewProjMatrix, modelMatrix);

    const modelViewMatrix = mat4.create();
    mat4.multiply(modelViewMatrix, viewProjMatrix, modelMatrix);
    const normalMatrix = mat3.create();
    mat3.normalFromMat4(normalMatrix, modelMatrix);

    this.gl.uniformMatrix4fv(this.gl.getUniformLocation(this.program, 'u_mvpMatrix'), false, mvpMatrix);
    this.gl.uniformMatrix4fv(this.gl.getUniformLocation(this.program, 'u_modelMatrix'), false, modelMatrix);
    this.gl.uniformMatrix3fv(this.gl.getUniformLocation(this.program, 'u_normalMatrix'), false, normalMatrix);
    this.gl.uniform3fv(this.gl.getUniformLocation(this.program, 'u_cameraPos'), camera.eye);

    // 传递光源
    lights.forEach((light, i) => {
      if (light.type === 'directional') {
        this.gl.uniform3fv(this.gl.getUniformLocation(this.program, `u_lights[${i}].direction`), light.dir);
        this.gl.uniform3fv(this.gl.getUniformLocation(this.program, `u_lights[${i}].color`), light.color);
        this.gl.uniform1i(this.gl.getUniformLocation(this.program, `u_lights[${i}].type`), 1);
      } else if (light.type === 'point' || light.type === 'spot') {
        this.gl.uniform3fv(this.gl.getUniformLocation(this.program, `u_lights[${i}].position`), light.pos);
        this.gl.uniform3fv(this.gl.getUniformLocation(this.program, `u_lights[${i}].color`), light.color);
        this.gl.uniform1i(this.gl.getUniformLocation(this.program, `u_lights[${i}].type`), light.type === 'spot' ? 3 : 2);
        if (light.type === 'spot') {
          this.gl.uniform3fv(this.gl.getUniformLocation(this.program, `u_lights[${i}].direction`), light.dir);
          this.gl.uniform1f(this.gl.getUniformLocation(this.program, `u_lights[${i}].cutoff`), Math.cos(light.cutoff));
        }
      }
    });

    if (this.texture) {
      this.gl.activeTexture(gl.TEXTURE0);
      this.gl.bindTexture(gl.TEXTURE_2D, this.texture);
      this.gl.uniform1i(this.gl.getUniformLocation(this.program, 'u_texture'), 0);
      this.gl.uniform1f(this.gl.getUniformLocation(this.program, 'u_hasTexture'), 1.0);
    } else {
      this.gl.uniform4fv(this.gl.getUniformLocation(this.program, 'u_color'), this.color);
      this.gl.uniform1f(this.gl.getUniformLocation(this.program, 'u_hasTexture'), 0.0);
    }

    this.gl.drawElements(gl.TRIANGLES, this.indexCount, gl.UNSIGNED_SHORT, 0);
    this.gl.bindVertexArray(null);
  }
}
