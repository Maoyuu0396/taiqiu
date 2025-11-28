/**
 * 基础台球3D场景主程序
 * 这个类负责管理整个3D场景：创建物体、设置相机、处理渲染
 */
class BasicPoolScene {
    constructor() {
        // 获取HTML中的canvas元素，这是我们的画布
        this.canvas = document.getElementById('webgl-canvas');
        
        // 获取WebGL2上下文，这是与GPU通信的接口
        this.gl = this.canvas.getContext('webgl2');
        
        // 检查浏览器是否支持WebGL2
        if (!this.gl) {
            alert('抱歉，你的浏览器不支持WebGL2！请使用Chrome、Firefox或Edge等现代浏览器。');
            return;
        }

        console.log('WebGL2上下文创建成功！');
        
        // 存储我们创建的所有3D物体
        this.objects = {};
        
        // 存储GPU缓冲区数据
        this.buffers = {};
        
        // 着色器程序（后面会解释）
        this.program = null;
        
        // 初始化场景
        this.init();
    }

    /**
     * 初始化整个3D场景
     * 这是我们的启动方法，按顺序执行各个步骤
     */
    init() {
        console.log('开始初始化3D场景...');
        
        // 步骤1: 设置WebGL基础状态
        this.setupWebGL();
        
        // 步骤2: 创建着色器程序（告诉GPU如何绘制）
        this.createShaders();
        
        // 步骤3: 创建3D模型的几何数据
        this.createGeometries();
        
        // 步骤4: 创建场景中的物体
        this.createSceneObjects();
        
        // 步骤5: 开始渲染循环
        console.log('场景初始化完成，开始渲染...');
        this.render();
    }

    /**
     * 设置WebGL的基础渲染状态
     * 就像设置画布和画笔的基本属性
     */
    setupWebGL() {
        const gl = this.gl;
        
        // 设置清除颜色（背景色）- RGBA格式
        gl.clearColor(0.1, 0.1, 0.2, 1.0);  // 深蓝色背景
        
        // 启用深度测试 - 让近的物体遮挡远的物体
        gl.enable(gl.DEPTH_TEST);
        
        // 设置清除深度缓冲区的值
        gl.clearDepth(1.0);
        
        console.log('WebGL基础状态设置完成');
    }

    /**
     * 创建着色器程序
     * 着色器是运行在GPU上的小程序，控制3D渲染
     */
    createShaders() {
        const gl = this.gl;
        
        // 顶点着色器 - 负责处理顶点位置
        const vertexShaderSource = `#version 300 es
            // WebGL着色器语言版本声明
            in vec4 aPosition;  // 输入的顶点位置属性
            
            //  uniform变量：从JavaScript传递过来的不变值
            uniform mat4 uModelViewMatrix;   // 模型视图矩阵
            uniform mat4 uProjectionMatrix;  // 投影矩阵
            
            void main() {
                // 将顶点位置通过模型视图矩阵和投影矩阵变换
                // 这是3D图形中最关键的数学运算！
                gl_Position = uProjectionMatrix * uModelViewMatrix * aPosition;
                
                // gl_Position是内置变量，表示最终在屏幕上的位置
            }
        `;
        
        // 片元着色器 - 负责处理像素颜色
        const fragmentShaderSource = `#version 300 es
            precision highp float;  // 设置浮点数精度
            
            // 定义物体颜色
            uniform vec3 uColor;
            
            out vec4 fragColor;     // 输出的颜色
            
            void main() {
                // 将所有像素设置为统一的颜色
                fragColor = vec4(uColor, 1.0);  // RGB + 透明度
            }
        `;
        
        // 编译顶点着色器
        const vertexShader = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vertexShader, vertexShaderSource);
        gl.compileShader(vertexShader);
        
        // 检查编译是否成功
        if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
            console.error('顶点着色器编译错误:', gl.getShaderInfoLog(vertexShader));
            return;
        }
        
        // 编译片元着色器
        const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fragmentShader, fragmentShaderSource);
        gl.compileShader(fragmentShader);
        
        if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
            console.error('片元着色器编译错误:', gl.getShaderInfoLog(fragmentShader));
            return;
        }
        
        // 创建着色器程序并连接
        this.program = gl.createProgram();
        gl.attachShader(this.program, vertexShader);
        gl.attachShader(this.program, fragmentShader);
        gl.linkProgram(this.program);
        
        if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
            console.error('着色器程序链接错误:', gl.getProgramInfoLog(this.program));
            return;
        }
        
        // 使用这个着色器程序
        gl.useProgram(this.program);
        
        // 获取attribute和uniform的位置（就像获取函数的参数名）
        this.attribLocations = {
            position: gl.getAttribLocation(this.program, 'aPosition')
        };
        
        this.uniformLocations = {
            modelViewMatrix: gl.getUniformLocation(this.program, 'uModelViewMatrix'),
            projectionMatrix: gl.getUniformLocation(this.program, 'uProjectionMatrix'),
            color: gl.getUniformLocation(this.program, 'uColor')
        };
        
        console.log('着色器程序创建成功');
    }

    /**
     * 创建3D几何体数据
     * 这里我们创建球体和立方体的顶点数据
     */
    createGeometries() {
        console.log('创建几何体数据...');
        
        // 创建球体几何数据
        this.buffers.sphere = this.createSphereBuffer(16, 16);
        
        // 创建立方体几何数据（用于台球桌）
        this.buffers.cube = this.createCubeBuffer();
        
        console.log('几何体数据创建完成');
    }

    /**
     * 创建球体顶点缓冲区
     * @param {number} latBands 纬度细分（从上到下的分段数）
     * @param {number} longBands 经度细分（环绕的分段数）
     */
    createSphereBuffer(latBands, longBands) {
        const gl = this.gl;
        const vertices = [];  // 存储顶点位置数据
        const indices = [];   // 存储三角形索引数据
        
        console.log(`生成球体: ${latBands} x ${longBands} 分辨率`);
        
        // 生成球体顶点
        for (let lat = 0; lat <= latBands; lat++) {
            // 计算纬度角度：从0到π（从上到下）
            const theta = lat * Math.PI / latBands;
            const sinTheta = Math.sin(theta);
            const cosTheta = Math.cos(theta);
            
            for (let lon = 0; lon <= longBands; lon++) {
                // 计算经度角度：从0到2π（环绕一圈）
                const phi = lon * 2 * Math.PI / longBands;
                const sinPhi = Math.sin(phi);
                const cosPhi = Math.cos(phi);
                
                // 计算球面上的点坐标
                const x = cosPhi * sinTheta;
                const y = cosTheta;
                const z = sinPhi * sinTheta;
                
                // 将顶点坐标添加到数组（乘以0.5让球体半径为0.5）
                vertices.push(x * 0.5, y * 0.5, z * 0.5);
            }
        }
        
        // 生成三角形索引
        for (let lat = 0; lat < latBands; lat++) {
            for (let lon = 0; lon < longBands; lon++) {
                // 计算当前网格的四个顶点索引
                const first = (lat * (longBands + 1)) + lon;
                const second = first + longBands + 1;
                
                // 创建两个三角形组成一个四边形
                indices.push(first, second, first + 1);     // 第一个三角形
                indices.push(second, second + 1, first + 1); // 第二个三角形
            }
        }
        
        // 创建GPU缓冲区
        return this.createGPUBuffer(new Float32Array(vertices), new Uint16Array(indices));
    }

    /**
     * 创建立方体顶点缓冲区
     */
    createCubeBuffer() {
        const gl = this.gl;
        
        // 立方体的8个顶点坐标（每个面由2个三角形组成）
        const vertices = new Float32Array([
            // 前面4个顶点
            -0.5, -0.5,  0.5,  // 左下前
             0.5, -0.5,  0.5,  // 右下前
             0.5,  0.5,  0.5,  // 右上前
            -0.5,  0.5,  0.5,  // 左上前
            
            // 后面4个顶点
            -0.5, -0.5, -0.5,
            -0.5,  0.5, -0.5,
             0.5,  0.5, -0.5,
             0.5, -0.5, -0.5,
            
            // 上面4个顶点
            -0.5,  0.5, -0.5,
            -0.5,  0.5,  0.5,
             0.5,  0.5,  0.5,
             0.5,  0.5, -0.5,
            
            // 下面4个顶点
            -0.5, -0.5, -0.5,
             0.5, -0.5, -0.5,
             0.5, -0.5,  0.5,
            -0.5, -0.5,  0.5,
            
            // 右面4个顶点
             0.5, -0.5, -0.5,
             0.5,  0.5, -0.5,
             0.5,  0.5,  0.5,
             0.5, -0.5,  0.5,
            
            // 左面4个顶点
            -0.5, -0.5, -0.5,
            -0.5, -0.5,  0.5,
            -0.5,  0.5,  0.5,
            -0.5,  0.5, -0.5
        ]);

        // 三角形索引（每个面2个三角形，共12个三角形）
        const indices = new Uint16Array([
            // 前面
            0, 1, 2,  0, 2, 3,
            // 后面
            4, 5, 6,  4, 6, 7,
            // 上面
            8, 9, 10, 8, 10, 11,
            // 下面
            12, 13, 14, 12, 14, 15,
            // 右面
            16, 17, 18, 16, 18, 19,
            // 左面
            20, 21, 22, 20, 22, 23
        ]);

        return this.createGPUBuffer(vertices, indices);
    }

    /**
     * 创建GPU缓冲区对象
     * 将JavaScript数组数据上传到GPU内存
     */
    createGPUBuffer(vertices, indices) {
        const gl = this.gl;
        
        // 创建顶点数组对象（VAO）- 管理所有缓冲区状态
        const vao = gl.createVertexArray();
        gl.bindVertexArray(vao);
        
        // 创建顶点缓冲区
        const vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
        
        // 告诉GPU如何解析顶点数据
        gl.enableVertexAttribArray(this.attribLocations.position);
        gl.vertexAttribPointer(
            this.attribLocations.position,
            3,              // 每个顶点有3个分量 (x, y, z)
            gl.FLOAT,       // 数据类型是32位浮点数
            false,          // 不归一化
            0,              // 步长（紧密排列）
            0               // 偏移量
        );
        
        // 创建索引缓冲区
        const indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
        
        // 解绑VAO
        gl.bindVertexArray(null);
        
        return {
            vao: vao,
            vertexCount: indices.length  // 需要绘制的顶点数量
        };
    }

    /**
     * 创建场景中的物体
     * 定义每个物体的位置、大小、颜色等属性
     */
    createSceneObjects() {
        console.log('创建场景物体...');
        
        // 1. 台球桌 - 一个绿色的扁平立方体
        this.objects.table = {
            type: 'cube',           // 使用立方体几何体
            position: [0, 0, -0.2], // 位置 (x, y, z)
            scale: [3, 1.5, 0.1],   // 缩放 (宽, 长, 高)
            color: [0.1, 0.5, 0.1]  // 颜色 (红, 绿, 蓝)
        };
        
        // 2. 白球
        this.objects.whiteBall = {
            type: 'sphere',
            position: [-1, 0, 0.3],  // 在桌子左侧
            scale: [0.15, 0.15, 0.15],
            color: [1, 1, 1]         // 白色
        };
        
        // 3. 黑球
        this.objects.blackBall = {
            type: 'sphere',
            position: [1, 0, 0.3],   // 在桌子右侧
            scale: [0.15, 0.15, 0.15],
            color: [0.1, 0.1, 0.1]   // 黑色
        };
        
        // 4. 红球
        this.objects.redBall = {
            type: 'sphere',
            position: [0.5, 0.3, 0.3],  // 在桌子右上方
            scale: [0.15, 0.15, 0.15],
            color: [1, 0, 0]           // 红色
        };
        
        // 5. 蓝球
        this.objects.blueBall = {
            type: 'sphere',
            position: [0.5, -0.3, 0.3], // 在桌子右下方
            scale: [0.15, 0.15, 0.15],
            color: [0, 0, 1]           // 蓝色
        };
        
        console.log('场景物体创建完成:', Object.keys(this.objects));
    }

    /**
     * 主渲染循环
     * 每一帧都调用这个函数来更新和绘制场景
     */
    render() {
        const gl = this.gl;
        
        // 清除颜色缓冲区和深度缓冲区
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        
        // 设置投影矩阵（相机镜头属性）
        const projectionMatrix = Matrix4.create();
        Matrix4.perspective(projectionMatrix, 
            Math.PI/4,                      // 视野角度 45度
            this.canvas.width/this.canvas.height, // 宽高比
            0.1,                            // 近平面
            100.0                           // 远平面
        );
        
        // 设置视图矩阵（相机位置和方向）
        const viewMatrix = Matrix4.create();
        // 将相机向后移动5个单位，向上移动2个单位，并稍微向下看
        Matrix4.translate(viewMatrix, viewMatrix, [0, -2, -5]);
        
        // 依次渲染每个物体
        this.renderObject(this.objects.table, viewMatrix, projectionMatrix);
        this.renderObject(this.objects.whiteBall, viewMatrix, projectionMatrix);
        this.renderObject(this.objects.blackBall, viewMatrix, projectionMatrix);
        this.renderObject(this.objects.redBall, viewMatrix, projectionMatrix);
        this.renderObject(this.objects.blueBall, viewMatrix, projectionMatrix);
        
        // 请求下一帧继续渲染（60fps动画）
        requestAnimationFrame(() => this.render());
    }

    /**
     * 渲染单个物体
     * @param {Object} obj 物体数据
     * @param {Array} viewMatrix 视图矩阵
     * @param {Array} projectionMatrix 投影矩阵
     */
    renderObject(obj, viewMatrix, projectionMatrix) {
        const gl = this.gl;
        
        // 创建模型矩阵（物体的位置、旋转、缩放）
        let modelMatrix = Matrix4.create();
        
        // 应用平移变换（移动物体）
        Matrix4.translate(modelMatrix, modelMatrix, obj.position);
        
        // 应用缩放变换（改变物体大小）
        const scaleMatrix = Matrix4.create();
        scaleMatrix[0] = obj.scale[0];   // X轴缩放
        scaleMatrix[5] = obj.scale[1];   // Y轴缩放  
        scaleMatrix[10] = obj.scale[2];  // Z轴缩放
        Matrix4.multiply(modelMatrix, modelMatrix, scaleMatrix);
        
        // 计算模型视图矩阵（模型矩阵 × 视图矩阵）
        const modelViewMatrix = Matrix4.create();
        Matrix4.multiply(modelViewMatrix, viewMatrix, modelMatrix);
        
        // 将矩阵数据传递给着色器
        gl.uniformMatrix4fv(this.uniformLocations.modelViewMatrix, false, modelViewMatrix);
        gl.uniformMatrix4fv(this.uniformLocations.projectionMatrix, false, projectionMatrix);
        
        // 设置物体颜色
        gl.uniform3f(this.uniformLocations.color, ...obj.color);
        
        // 选择对应的几何体缓冲区
        const buffer = this.buffers[obj.type];
        
        // 绑定VAO并绘制
        gl.bindVertexArray(buffer.vao);
        gl.drawElements(gl.TRIANGLES, buffer.vertexCount, gl.UNSIGNED_SHORT, 0);
        
        // 解绑VAO
        gl.bindVertexArray(null);
    }
}

// 当页面加载完成后启动我们的3D场景
window.addEventListener('load', () => {
    console.log('页面加载完成，启动3D场景...');
    new BasicPoolScene();
});
