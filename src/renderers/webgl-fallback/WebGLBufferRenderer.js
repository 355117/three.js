/**
 * WebGLBufferRenderer.js
 *
 * WebGL缓冲区渲染器 - 负责执行WebGL绘制调用
 *
 * 这个类封装了WebGL的各种绘制方法，包括：
 * 1. 基础绘制调用 (drawArrays/drawElements)
 * 2. 实例化渲染 (drawArraysInstanced/drawElementsInstanced)
 * 3. 多重绘制调用 (WEBGL_multi_draw扩展)
 * 4. 多重实例化绘制调用
 *
 * 它是WebGL后端渲染管线的核心组件，负责将几何数据转换为GPU绘制命令。
 */
class WebGLBufferRenderer {
  /**
   * 构造WebGL缓冲区渲染器
   *
   * 初始化渲染器的核心属性和引用，包括WebGL上下文、扩展管理器、
   * 渲染信息统计等。这些属性将在后续的绘制调用中使用。
   *
   * @param {WebGLBackend} backend - WebGL后端实例，提供WebGL上下文和工具
   */
  constructor(backend) {
    // WebGL 2.0渲染上下文引用，用于执行所有WebGL API调用
    this.gl = backend.gl;

    // WebGL扩展管理器引用，用于访问WebGL扩展功能
    this.extensions = backend.extensions;

    // 渲染信息统计器引用，用于记录绘制调用和性能数据
    this.info = backend.renderer.info;

    // 当前绘制模式（如gl.TRIANGLES, gl.LINES等），在绘制前设置
    this.mode = null;

    // 索引数量，0表示使用drawArrays，非0表示使用drawElements
    this.index = 0;

    // 索引数据类型（如gl.UNSIGNED_SHORT, gl.UNSIGNED_INT等）
    this.type = null;

    // 当前要渲染的3D对象引用，用于统计信息更新
    this.object = null;
  }

  /**
   * 执行基础绘制调用
   *
   * 根据是否使用索引缓冲区，选择合适的WebGL绘制方法：
   * - 有索引：使用drawElements进行索引绘制，可以重用顶点数据
   * - 无索引：使用drawArrays进行顺序绘制，按顶点顺序渲染
   *
   * 这是最基础的绘制方法，用于渲染单个几何体的单个实例。
   *
   * @param {number} start - 起始位置（索引绘制时为字节偏移，数组绘制时为顶点索引）
   * @param {number} count - 要绘制的元素数量（索引绘制时为索引数，数组绘制时为顶点数）
   */
  render(start, count) {
    // 解构获取所需的属性引用
    const { gl, mode, object, type, info, index } = this;

    if (index !== 0) {
      // 索引绘制：使用索引缓冲区指定顶点连接顺序
      // mode: 图元类型（三角形、线段等）
      // count: 索引数量
      // type: 索引数据类型（UNSIGNED_SHORT或UNSIGNED_INT）
      // start: 索引缓冲区中的字节偏移量
      gl.drawElements(mode, count, type, start);
    } else {
      // 数组绘制：按顶点缓冲区中的顺序绘制
      // mode: 图元类型
      // start: 起始顶点索引
      // count: 顶点数量
      gl.drawArrays(mode, start, count);
    }

    // 更新渲染统计信息：对象、元素数量、绘制调用次数
    info.update(object, count, 1);
  }

  /**
   * 执行实例化绘制调用
   *
   * 实例化渲染允许用一次绘制调用渲染同一几何体的多个实例，
   * 每个实例可以有不同的变换矩阵、颜色等属性。这大大提高了
   * 渲染大量相似对象（如草地、树木、粒子）的性能。
   *
   * 实例化渲染通过顶点属性的除数(divisor)机制实现：
   * - 除数为0：每个顶点使用一次属性值（普通顶点属性）
   * - 除数为1：每个实例使用一次属性值（实例属性）
   * - 除数为N：每N个实例使用一次属性值
   *
   * @param {number} start - 起始位置（索引绘制时为字节偏移，数组绘制时为顶点索引）
   * @param {number} count - 每个实例要绘制的元素数量
   * @param {number} primcount - 要绘制的实例数量
   */
  renderInstances(start, count, primcount) {
    // 解构获取所需的属性引用
    const { gl, mode, type, index, object, info } = this;

    // 如果实例数量为0，直接返回，避免无效的绘制调用
    if (primcount === 0) return;

    if (index !== 0) {
      // 实例化索引绘制：绘制多个使用索引缓冲区的几何体实例
      // mode: 图元类型
      // count: 每个实例的索引数量
      // type: 索引数据类型
      // start: 索引缓冲区中的字节偏移量
      // primcount: 实例数量
      gl.drawElementsInstanced(mode, count, type, start, primcount);
    } else {
      // 实例化数组绘制：绘制多个按顶点顺序的几何体实例
      // mode: 图元类型
      // start: 起始顶点索引
      // count: 每个实例的顶点数量
      // primcount: 实例数量
      gl.drawArraysInstanced(mode, start, count, primcount);
    }

    // 更新渲染统计信息：对象、每个实例的元素数量、实例数量
    info.update(object, count, primcount);
  }

  /**
   * 执行多重绘制调用
   *
   * 多重绘制允许在一次API调用中执行多个绘制命令，这对于批量渲染
   * 大量小几何体非常有效，可以显著减少CPU到GPU的调用开销。
   *
   * 这个功能需要WEBGL_multi_draw扩展支持。如果扩展不可用，
   * 会回退到多次调用普通的render方法。
   *
   * 典型应用场景：
   * - 批量网格渲染（BatchedMesh）
   * - 粒子系统中的多个粒子组
   * - 场景中的多个小对象批量渲染
   *
   * @param {Array<number>} starts - 每个绘制调用的起始位置数组
   * @param {Array<number>} counts - 每个绘制调用的元素数量数组
   * @param {number} drawCount - 绘制调用的总数量
   */
  renderMultiDraw(starts, counts, drawCount) {
    // 解构获取所需的属性引用
    const { extensions, mode, object, info } = this;

    // 如果绘制数量为0，直接返回
    if (drawCount === 0) return;

    // 尝试获取WEBGL_multi_draw扩展
    const extension = extensions.get("WEBGL_multi_draw");

    if (extension === null) {
      // 扩展不可用时的回退方案：逐个执行绘制调用
      for (let i = 0; i < drawCount; i++) {
        this.render(starts[i], counts[i]);
      }
    } else {
      // 使用扩展进行批量绘制
      if (this.index !== 0) {
        // 多重索引绘制：一次调用绘制多个使用索引的几何体
        // mode: 图元类型
        // counts: 每个绘制调用的索引数量数组
        // 0: counts数组的偏移量（从数组开始处读取）
        // this.type: 索引数据类型
        // starts: 每个绘制调用在索引缓冲区中的字节偏移数组
        // 0: starts数组的偏移量
        // drawCount: 绘制调用数量
        extension.multiDrawElementsWEBGL(mode, counts, 0, this.type, starts, 0, drawCount);
      } else {
        // 多重数组绘制：一次调用绘制多个按顶点顺序的几何体
        // mode: 图元类型
        // starts: 每个绘制调用的起始顶点索引数组
        // 0: starts数组的偏移量
        // counts: 每个绘制调用的顶点数量数组
        // 0: counts数组的偏移量
        // drawCount: 绘制调用数量
        extension.multiDrawArraysWEBGL(mode, starts, 0, counts, 0, drawCount);
      }

      // 计算总的元素数量用于统计
      let elementCount = 0;
      for (let i = 0; i < drawCount; i++) {
        elementCount += counts[i];
      }

      // 更新渲染统计信息：对象、总元素数量、绘制调用次数（1次批量调用）
      info.update(object, elementCount, 1);
    }
  }

  /**
   * 执行多重实例化绘制调用
   *
   * 这是最高级的绘制方法，结合了多重绘制和实例化渲染的优势：
   * - 多重绘制：一次API调用执行多个绘制命令
   * - 实例化渲染：每个绘制命令可以渲染多个实例
   *
   * 这种方法特别适用于复杂的批量渲染场景，如：
   * - 大型场景中的植被渲染（多种植物，每种有多个实例）
   * - 粒子系统的多个发射器（每个发射器有多个粒子）
   * - 建筑群渲染（多种建筑类型，每种有多个实例）
   *
   * 需要WEBGL_multi_draw扩展支持，否则回退到多次实例化绘制调用。
   *
   * @param {Array<number>} starts - 每个绘制调用的起始位置数组
   * @param {Array<number>} counts - 每个绘制调用的元素数量数组
   * @param {number} drawCount - 绘制调用的总数量
   * @param {Array<number>} primcount - 每个绘制调用的实例数量数组
   */
  renderMultiDrawInstances(starts, counts, drawCount, primcount) {
    // 解构获取所需的属性引用
    const { extensions, mode, object, info } = this;

    // 如果绘制数量为0，直接返回
    if (drawCount === 0) return;

    // 尝试获取WEBGL_multi_draw扩展
    const extension = extensions.get("WEBGL_multi_draw");

    if (extension === null) {
      // 扩展不可用时的回退方案：逐个执行实例化绘制调用
      for (let i = 0; i < drawCount; i++) {
        this.renderInstances(starts[i], counts[i], primcount[i]);
      }
    } else {
      // 使用扩展进行批量实例化绘制
      if (this.index !== 0) {
        // 多重实例化索引绘制：一次调用绘制多个几何体的多个实例
        // mode: 图元类型
        // counts: 每个绘制调用的索引数量数组
        // 0: counts数组的偏移量
        // this.type: 索引数据类型
        // starts: 每个绘制调用在索引缓冲区中的字节偏移数组
        // 0: starts数组的偏移量
        // primcount: 每个绘制调用的实例数量数组
        // 0: primcount数组的偏移量
        // drawCount: 绘制调用数量
        extension.multiDrawElementsInstancedWEBGL(mode, counts, 0, this.type, starts, 0, primcount, 0, drawCount);
      } else {
        // 多重实例化数组绘制：一次调用绘制多个按顶点顺序的几何体的多个实例
        // mode: 图元类型
        // starts: 每个绘制调用的起始顶点索引数组
        // 0: starts数组的偏移量
        // counts: 每个绘制调用的顶点数量数组
        // 0: counts数组的偏移量
        // primcount: 每个绘制调用的实例数量数组
        // 0: primcount数组的偏移量
        // drawCount: 绘制调用数量
        extension.multiDrawArraysInstancedWEBGL(mode, starts, 0, counts, 0, primcount, 0, drawCount);
      }

      // 计算总的元素数量：每个绘制调用的元素数量乘以其实例数量
      let elementCount = 0;
      for (let i = 0; i < drawCount; i++) {
        elementCount += counts[i] * primcount[i];
      }

      // 更新渲染统计信息：对象、总元素数量、绘制调用次数（1次批量调用）
      info.update(object, elementCount, 1);
    }
  }

  /**
   * 性能优化建议：
   *
   * 1. 绘制调用优化：
   *    - 优先使用多重绘制（renderMultiDraw）减少API调用开销
   *    - 对于大量相似对象，使用实例化渲染（renderInstances）
   *    - 批量处理小几何体，避免过多的单独绘制调用
   *
   * 2. 数据组织优化：
   *    - 将相同材质的对象组织在一起，减少状态切换
   *    - 使用索引缓冲区重用顶点数据
   *    - 合理设计实例属性，平衡内存使用和渲染效率
   *
   * 3. 扩展支持检测：
   *    - 在使用多重绘制前检查WEBGL_multi_draw扩展支持
   *    - 为不支持扩展的设备提供回退方案
   *    - 根据设备能力选择最优的渲染策略
   */
}

// 导出WebGL缓冲区渲染器类
export { WebGLBufferRenderer };
