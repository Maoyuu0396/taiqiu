/**
 * 4x4矩阵数学库
 * 用于处理3D图形中的变换：移动、旋转、缩放、投影
 */
class Matrix4 {
    /**
     * 创建单位矩阵（什么都不做的矩阵）
     * 就像数学中的数字1，任何矩阵乘以单位矩阵都不变
     */
    static create() {
        return new Float32Array([
            1, 0, 0, 0,  // 第一列
            0, 1, 0, 0,  // 第二列  
            0, 0, 1, 0,  // 第三列
            0, 0, 0, 1   // 第四列
        ]);
    }

    /**
     * 创建透视投影矩阵
     * 模拟人眼看到的近大远小效果
     * @param {*} out 输出矩阵
     * @param {*} fovy 垂直视野角度（弧度）
     * @param {*} aspect 宽高比
     * @param {*} near 近平面距离
     * @param {*} far 远平面距离
     */
    static perspective(out, fovy, aspect, near, far) {
        const f = 1.0 / Math.tan(fovy / 2);  // 计算焦距
        const rangeInv = 1 / (near - far);   // 深度范围倒数
        
        out[0] = f / aspect;  // 设置X轴缩放
        out[1] = 0;
        out[2] = 0;
        out[3] = 0;
        
        out[4] = 0;
        out[5] = f;           // 设置Y轴缩放
        out[6] = 0;
        out[7] = 0;
        
        out[8] = 0;
        out[9] = 0;
        out[10] = (far + near) * rangeInv;   // 设置Z轴深度
        out[11] = -1;                        // 设置为透视投影
        
        out[12] = 0;
        out[13] = 0;
        out[14] = (2 * far * near) * rangeInv; // 深度偏移
        out[15] = 0;
        return out;
    }

    /**
     * 平移变换矩阵
     * 让物体在3D空间中移动
     * @param {*} out 输出矩阵
     * @param {*} a 输入矩阵
     * @param {*} v 移动距离 [x, y, z]
     */
    static translate(out, a, v) {
        const x = v[0], y = v[1], z = v[2];
        
        // 复制原矩阵的值
        out[0] = a[0]; out[1] = a[1]; out[2] = a[2]; out[3] = a[3];
        out[4] = a[4]; out[5] = a[5]; out[6] = a[6]; out[7] = a[7];
        out[8] = a[8]; out[9] = a[9]; out[10] = a[10]; out[11] = a[11];
        
        // 计算新的位置（矩阵乘法）
        out[12] = a[0] * x + a[4] * y + a[8] * z + a[12];
        out[13] = a[1] * x + a[5] * y + a[9] * z + a[13];
        out[14] = a[2] * x + a[6] * y + a[10] * z + a[14];
        out[15] = a[3] * x + a[7] * y + a[11] * z + a[15];
        return out;
    }

    /**
     * 绕Y轴旋转矩阵
     * 让物体绕垂直轴旋转
     * @param {*} out 输出矩阵
     * @param {*} a 输入矩阵  
     * @param {*} rad 旋转角度（弧度）
     */
    static rotateY(out, a, rad) {
        const s = Math.sin(rad);  // 正弦值
        const c = Math.cos(rad);  // 余弦值
        
        // 复制矩阵中不受旋转影响的部分
        const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
        const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
        const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
        
        // 计算旋转后的X轴和Z轴
        out[0] = a00 * c - a20 * s;  // 新X轴的X分量
        out[1] = a01 * c - a21 * s;  // 新X轴的Y分量
        out[2] = a02 * c - a22 * s;  // 新X轴的Z分量
        out[3] = a03 * c - a23 * s;
        
        out[4] = a10;  // Y轴不变
        out[5] = a11;
        out[6] = a12;
        out[7] = a13;
        
        out[8] = a00 * s + a20 * c;  // 新Z轴的X分量
        out[9] = a01 * s + a21 * c;  // 新Z轴的Y分量
        out[10] = a02 * s + a22 * c; // 新Z轴的Z分量
        out[11] = a03 * s + a23 * c;
        
        // 位置不变
        out[12] = a[12];
        out[13] = a[13];
        out[14] = a[14];
        out[15] = a[15];
        return out;
    }

    /**
     * 矩阵乘法
     * 组合多个变换：比如先旋转再移动
     * @param {*} out 输出矩阵
     * @param {*} a 第一个矩阵
     * @param {*} b 第二个矩阵
     */
    static multiply(out, a, b) {
        // 提取矩阵a的所有分量
        const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
        const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
        const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
        const a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];

        // 提取矩阵b的所有分量
        const b00 = b[0], b01 = b[1], b02 = b[2], b03 = b[3];
        const b10 = b[4], b11 = b[5], b12 = b[6], b13 = b[7];
        const b20 = b[8], b21 = b[9], b22 = b[10], b23 = b[11];
        const b30 = b[12], b31 = b[13], b32 = b[14], b33 = b[15];
        
        // 计算矩阵乘法的每个分量
        // 这是线性代数的标准矩阵乘法公式
        out[0] = b00 * a00 + b01 * a10 + b02 * a20 + b03 * a30;
        out[1] = b00 * a01 + b01 * a11 + b02 * a21 + b03 * a31;
        out[2] = b00 * a02 + b01 * a12 + b02 * a22 + b03 * a32;
        out[3] = b00 * a03 + b01 * a13 + b02 * a23 + b03 * a33;
        
        out[4] = b10 * a00 + b11 * a10 + b12 * a20 + b13 * a30;
        out[5] = b10 * a01 + b11 * a11 + b12 * a21 + b13 * a31;
        out[6] = b10 * a02 + b11 * a12 + b12 * a22 + b13 * a32;
        out[7] = b10 * a03 + b11 * a13 + b12 * a23 + b13 * a33;
        
        out[8] = b20 * a00 + b21 * a10 + b22 * a20 + b23 * a30;
        out[9] = b20 * a01 + b21 * a11 + b22 * a21 + b23 * a31;
        out[10] = b20 * a02 + b21 * a12 + b22 * a22 + b23 * a32;
        out[11] = b20 * a03 + b21 * a13 + b22 * a23 + b23 * a33;
        
        out[12] = b30 * a00 + b31 * a10 + b32 * a20 + b33 * a30;
        out[13] = b30 * a01 + b31 * a11 + b32 * a21 + b33 * a31;
        out[14] = b30 * a02 + b31 * a12 + b32 * a22 + b33 * a32;
        out[15] = b30 * a03 + b31 * a13 + b32 * a23 + b33 * a33;
        return out;
    }
}
