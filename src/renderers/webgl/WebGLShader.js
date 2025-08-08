/**
 * WebGL 着色器创建函数
 *
 * 创建、编译并返回一个 WebGL 着色器对象。
 * 这是一个底层函数，用于创建顶点着色器或片段着色器。
 *
 * @param {WebGLRenderingContext} gl - WebGL 渲染上下文
 * @param {number} type - 着色器类型（gl.VERTEX_SHADER 或 gl.FRAGMENT_SHADER）
 * @param {string} string - 着色器源代码字符串
 * @returns {WebGLShader} 编译后的 WebGL 着色器对象
 */
function WebGLShader(gl, type, string) {
  // 创建着色器对象
  const shader = gl.createShader(type);

  // 设置着色器源代码
  gl.shaderSource(shader, string);
  // 编译着色器
  gl.compileShader(shader);

  return shader;
}

export { WebGLShader };
