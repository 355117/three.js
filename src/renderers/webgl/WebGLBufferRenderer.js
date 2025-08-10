/**
 * WebGL缓冲区渲染器
 * 负责处理基于顶点数组的WebGL渲染操作，包括普通渲染、实例化渲染和多重绘制
 *
 * @param {WebGLRenderingContext} gl - WebGL渲染上下文
 * @param {WebGLExtensions} extensions - WebGL扩展管理器
 * @param {WebGLInfo} info - WebGL信息统计器
 */
function WebGLBufferRenderer(gl, extensions, info) {
  // 当前渲染模式（如GL_TRIANGLES, GL_LINES等）
  let mode;

  /**
   * 设置渲染模式
   * @param {number} value - WebGL渲染模式常量（如gl.TRIANGLES, gl.LINES等）
   */
  function setMode(value) {
    mode = value;
  }

  /**
   * 执行基本的顶点数组渲染
   * @param {number} start - 起始顶点索引
   * @param {number} count - 要渲染的顶点数量
   */
  function render(start, count) {
    // 使用WebGL的drawArrays方法渲染顶点数组
    gl.drawArrays(mode, start, count);

    // 更新渲染统计信息：顶点数量、渲染模式、绘制调用次数
    info.update(count, mode, 1);
  }

  /**
   * 执行实例化渲染
   * 允许使用相同的几何体数据渲染多个实例，提高性能
   * @param {number} start - 起始顶点索引
   * @param {number} count - 每个实例的顶点数量
   * @param {number} primcount - 要渲染的实例数量
   */
  function renderInstances(start, count, primcount) {
    // 如果实例数量为0，直接返回
    if (primcount === 0) return;

    // 使用WebGL的实例化绘制方法
    gl.drawArraysInstanced(mode, start, count, primcount);

    // 更新渲染统计信息：每个实例的顶点数量、渲染模式、实例数量
    info.update(count, mode, primcount);
  }

  /**
   * 执行多重绘制渲染
   * 使用WEBGL_multi_draw扩展在单次调用中执行多个绘制操作，减少CPU-GPU通信开销
   * @param {Int32Array|Array} starts - 每个绘制操作的起始顶点索引数组
   * @param {Int32Array|Array} counts - 每个绘制操作的顶点数量数组
   * @param {number} drawCount - 绘制操作的数量
   */
  function renderMultiDraw(starts, counts, drawCount) {
    // 如果绘制数量为0，直接返回
    if (drawCount === 0) return;

    // 获取WEBGL_multi_draw扩展
    const extension = extensions.get("WEBGL_multi_draw");
    // 执行多重数组绘制
    extension.multiDrawArraysWEBGL(mode, starts, 0, counts, 0, drawCount);

    // 计算总的元素数量用于统计
    let elementCount = 0;
    for (let i = 0; i < drawCount; i++) {
      elementCount += counts[i];
    }

    // 更新渲染统计信息
    info.update(elementCount, mode, 1);
  }

  /**
   * 执行多重实例化绘制渲染
   * 结合多重绘制和实例化渲染的优势，在单次调用中渲染多个不同的实例化对象
   * @param {Int32Array|Array} starts - 每个绘制操作的起始顶点索引数组
   * @param {Int32Array|Array} counts - 每个绘制操作的顶点数量数组
   * @param {number} drawCount - 绘制操作的数量
   * @param {Int32Array|Array} primcount - 每个绘制操作的实例数量数组
   */
  function renderMultiDrawInstances(starts, counts, drawCount, primcount) {
    // 如果绘制数量为0，直接返回
    if (drawCount === 0) return;

    // 获取WEBGL_multi_draw扩展
    const extension = extensions.get("WEBGL_multi_draw");

    // 如果扩展不可用，回退到逐个调用实例化渲染
    if (extension === null) {
      for (let i = 0; i < starts.length; i++) {
        renderInstances(starts[i], counts[i], primcount[i]);
      }
    } else {
      // 使用扩展执行多重实例化数组绘制
      extension.multiDrawArraysInstancedWEBGL(mode, starts, 0, counts, 0, primcount, 0, drawCount);

      // 计算总的元素数量（顶点数 × 实例数）
      let elementCount = 0;
      for (let i = 0; i < drawCount; i++) {
        elementCount += counts[i] * primcount[i];
      }

      // 更新渲染统计信息
      info.update(elementCount, mode, 1);
    }
  }

  // 公共API方法绑定
  // 将内部函数暴露为对象的方法

  /**
   * 设置渲染模式的公共方法
   * @type {function(number): void}
   */
  this.setMode = setMode;

  /**
   * 基本渲染的公共方法
   * @type {function(number, number): void}
   */
  this.render = render;

  /**
   * 实例化渲染的公共方法
   * @type {function(number, number, number): void}
   */
  this.renderInstances = renderInstances;

  /**
   * 多重绘制的公共方法
   * @type {function(Int32Array|Array, Int32Array|Array, number): void}
   */
  this.renderMultiDraw = renderMultiDraw;

  /**
   * 多重实例化绘制的公共方法
   * @type {function(Int32Array|Array, Int32Array|Array, number, Int32Array|Array): void}
   */
  this.renderMultiDrawInstances = renderMultiDrawInstances;
}

export { WebGLBufferRenderer };
