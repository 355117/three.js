/**
 * WebGL索引缓冲区渲染器
 * 负责处理基于索引缓冲区的WebGL渲染操作，包括普通渲染、实例化渲染和多重绘制
 * 与WebGLBufferRenderer不同，此渲染器使用索引数组来指定顶点的绘制顺序，可以重用顶点数据
 *
 * @param {WebGLRenderingContext} gl - WebGL渲染上下文
 * @param {WebGLExtensions} extensions - WebGL扩展管理器
 * @param {WebGLInfo} info - WebGL信息统计器
 */
function WebGLIndexedBufferRenderer(gl, extensions, info) {
  // 当前渲染模式（如GL_TRIANGLES, GL_LINES等）
  let mode;

  /**
   * 设置渲染模式
   * @param {number} value - WebGL渲染模式常量（如gl.TRIANGLES, gl.LINES等）
   */
  function setMode(value) {
    mode = value;
  }

  // 索引数据类型和每个元素的字节数
  let type, bytesPerElement;

  /**
   * 设置索引缓冲区信息
   * @param {Object} value - 索引缓冲区对象
   * @param {number} value.type - 索引数据类型（如gl.UNSIGNED_SHORT, gl.UNSIGNED_INT）
   * @param {number} value.bytesPerElement - 每个索引元素的字节数（2或4）
   */
  function setIndex(value) {
    type = value.type;
    bytesPerElement = value.bytesPerElement;
  }

  /**
   * 执行基于索引的渲染
   * 使用索引缓冲区指定顶点的绘制顺序，允许重用顶点数据
   * @param {number} start - 起始索引位置
   * @param {number} count - 要渲染的索引数量
   */
  function render(start, count) {
    // 使用WebGL的drawElements方法进行索引渲染
    // start * bytesPerElement 计算字节偏移量
    gl.drawElements(mode, count, type, start * bytesPerElement);

    // 更新渲染统计信息：索引数量、渲染模式、绘制调用次数
    info.update(count, mode, 1);
  }

  /**
   * 执行基于索引的实例化渲染
   * 使用相同的索引缓冲区数据渲染多个实例，提高渲染性能
   * @param {number} start - 起始索引位置
   * @param {number} count - 每个实例的索引数量
   * @param {number} primcount - 要渲染的实例数量
   */
  function renderInstances(start, count, primcount) {
    // 如果实例数量为0，直接返回
    if (primcount === 0) return;

    // 使用WebGL的实例化索引绘制方法
    gl.drawElementsInstanced(mode, count, type, start * bytesPerElement, primcount);

    // 更新渲染统计信息：每个实例的索引数量、渲染模式、实例数量
    info.update(count, mode, primcount);
  }

  /**
   * 执行多重索引绘制渲染
   * 使用WEBGL_multi_draw扩展在单次调用中执行多个基于索引的绘制操作
   * @param {Int32Array|Array} starts - 每个绘制操作的起始索引位置数组（字节偏移）
   * @param {Int32Array|Array} counts - 每个绘制操作的索引数量数组
   * @param {number} drawCount - 绘制操作的数量
   */
  function renderMultiDraw(starts, counts, drawCount) {
    // 如果绘制数量为0，直接返回
    if (drawCount === 0) return;

    // 获取WEBGL_multi_draw扩展
    const extension = extensions.get("WEBGL_multi_draw");
    // 执行多重索引元素绘制
    extension.multiDrawElementsWEBGL(mode, counts, 0, type, starts, 0, drawCount);

    // 计算总的索引数量用于统计
    let elementCount = 0;
    for (let i = 0; i < drawCount; i++) {
      elementCount += counts[i];
    }

    // 更新渲染统计信息
    info.update(elementCount, mode, 1);
  }

  /**
   * 执行多重索引实例化绘制渲染
   * 结合多重绘制和实例化渲染的优势，在单次调用中渲染多个不同的索引实例化对象
   * @param {Int32Array|Array} starts - 每个绘制操作的起始索引位置数组（字节偏移）
   * @param {Int32Array|Array} counts - 每个绘制操作的索引数量数组
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
        // 注意：starts[i]是字节偏移，需要除以bytesPerElement转换为索引偏移
        renderInstances(starts[i] / bytesPerElement, counts[i], primcount[i]);
      }
    } else {
      // 使用扩展执行多重索引实例化绘制
      extension.multiDrawElementsInstancedWEBGL(mode, counts, 0, type, starts, 0, primcount, 0, drawCount);

      // 计算总的元素数量（索引数 × 实例数）
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
   * 设置索引缓冲区信息的公共方法
   * @type {function(Object): void}
   */
  this.setIndex = setIndex;

  /**
   * 基于索引的渲染公共方法
   * @type {function(number, number): void}
   */
  this.render = render;

  /**
   * 基于索引的实例化渲染公共方法
   * @type {function(number, number, number): void}
   */
  this.renderInstances = renderInstances;

  /**
   * 多重索引绘制的公共方法
   * @type {function(Int32Array|Array, Int32Array|Array, number): void}
   */
  this.renderMultiDraw = renderMultiDraw;

  /**
   * 多重索引实例化绘制的公共方法
   * @type {function(Int32Array|Array, Int32Array|Array, number, Int32Array|Array): void}
   */
  this.renderMultiDrawInstances = renderMultiDrawInstances;
}

export { WebGLIndexedBufferRenderer };
