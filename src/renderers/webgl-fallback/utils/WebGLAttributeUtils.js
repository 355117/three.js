// 导入整数类型常量，用于判断属性数据类型
import { IntType } from "../../../constants.js";

// 全局ID计数器，用于为属性数据分配唯一标识符
let _id = 0;

/**
 * 双缓冲属性数据管理类
 * 该模块主要用于计算着色器的上下文中使用
 * 由于WebGL 2原生不支持计算着色器，因此通过Transform Feedback来实现
 * DualAttributeData管理相关的双缓冲数据，支持GPU计算的输入输出切换
 *
 * @private
 */
class DualAttributeData {
  /**
   * 构造双缓冲属性数据对象
   *
   * @param {Object} attributeData - 原始属性数据对象
   * @param {WebGLBuffer} dualBuffer - 用于Transform Feedback的第二个缓冲区
   */
  constructor(attributeData, dualBuffer) {
    // 双缓冲区数组：[原始缓冲区, 变换反馈缓冲区]
    this.buffers = [attributeData.bufferGPU, dualBuffer];
    // 数据类型（如gl.FLOAT, gl.INT等）
    this.type = attributeData.type;
    // 缓冲区类型（如gl.ARRAY_BUFFER, gl.ELEMENT_ARRAY_BUFFER等）
    this.bufferType = attributeData.bufferType;
    // 像素缓冲对象引用
    this.pbo = attributeData.pbo;
    // 缓冲区字节长度
    this.byteLength = attributeData.byteLength;
    // 每个元素的字节数
    this.bytesPerElement = attributeData.BYTES_PER_ELEMENT;
    // 数据版本号，用于跟踪数据更新
    this.version = attributeData.version;
    // 是否为整数类型数据
    this.isInteger = attributeData.isInteger;
    // 当前活跃的缓冲区索引（0或1）
    this.activeBufferIndex = 0;
    // 基础ID，用于生成唯一标识符
    this.baseId = attributeData.id;
  }

  /**
   * 获取当前双缓冲数据的唯一标识符
   * 格式为：基础ID|当前缓冲区索引
   *
   * @return {string} 唯一标识符字符串
   */
  get id() {
    return `${this.baseId}|${this.activeBufferIndex}`;
  }

  /**
   * 获取当前活跃的GPU缓冲区
   * 用于当前的渲染或计算操作
   *
   * @return {WebGLBuffer} 当前活跃的WebGL缓冲区对象
   */
  get bufferGPU() {
    return this.buffers[this.activeBufferIndex];
  }

  /**
   * 获取用于Transform Feedback的目标缓冲区
   * 通过位运算(XOR)获取另一个缓冲区的索引
   *
   * @return {WebGLBuffer} Transform Feedback目标缓冲区对象
   */
  get transformBuffer() {
    return this.buffers[this.activeBufferIndex ^ 1];
  }

  /**
   * 切换双缓冲区的活跃状态
   * 通过位运算(XOR)在0和1之间切换索引
   * 用于实现乒乓缓冲（ping-pong buffering）
   */
  switchBuffers() {
    this.activeBufferIndex ^= 1;
  }
}

/**
 * WebGL 2后端着色器属性管理工具模块
 * 负责管理顶点属性、缓冲区的创建、更新和销毁操作
 * 支持常规属性和存储缓冲区属性的处理
 *
 * @private
 */
class WebGLAttributeUtils {
  /**
   * 构造一个新的属性管理工具对象
   *
   * @param {WebGLBackend} backend - WebGL 2后端实例
   */
  constructor(backend) {
    /**
     * WebGL 2后端的引用
     * 用于访问渲染上下文、扩展管理器等后端功能
     *
     * @type {WebGLBackend}
     */
    this.backend = backend;
  }

  /**
   * 为给定的缓冲区属性创建GPU缓冲区
   * 根据属性数据类型自动推断WebGL数据类型，并创建相应的GPU缓冲区
   *
   * @param {Object} attribute - 缓冲区属性对象
   * @param {GLenum} bufferType - 缓冲区类型标志，指示绑定点目标
   */
  createAttribute(attribute, bufferType) {
    // 获取后端实例和WebGL上下文
    const backend = this.backend;
    const { gl } = backend;

    // 获取属性数组数据
    const array = attribute.array;
    // 获取使用模式，默认为静态绘制
    const usage = attribute.usage || gl.STATIC_DRAW;

    // 处理交错缓冲区属性：如果是交错属性则使用data，否则使用属性本身
    const bufferAttribute = attribute.isInterleavedBufferAttribute ? attribute.data : attribute;
    // 从后端获取缓冲区数据对象
    const bufferData = backend.get(bufferAttribute);

    // 获取已存在的GPU缓冲区
    let bufferGPU = bufferData.bufferGPU;

    // 如果GPU缓冲区尚未创建
    if (bufferGPU === undefined) {
      // 创建新的WebGL缓冲区
      bufferGPU = this._createBuffer(gl, bufferType, array, usage);

      // 保存缓冲区信息到缓冲区数据对象
      bufferData.bufferGPU = bufferGPU;
      bufferData.bufferType = bufferType;
      bufferData.version = bufferAttribute.version;
    }

    // 注释掉的上传回调函数调用
    //attribute.onUploadCallback();

    // 根据数组类型确定WebGL数据类型
    let type;

    // 32位浮点数数组
    if (array instanceof Float32Array) {
      type = gl.FLOAT;
      // 16位浮点数数组（如果支持）
    } else if (typeof Float16Array !== "undefined" && array instanceof Float16Array) {
      type = gl.HALF_FLOAT;
      // 16位无符号整数数组
    } else if (array instanceof Uint16Array) {
      // 检查是否为16位浮点属性
      if (attribute.isFloat16BufferAttribute) {
        type = gl.HALF_FLOAT;
      } else {
        type = gl.UNSIGNED_SHORT;
      }
      // 16位有符号整数数组
    } else if (array instanceof Int16Array) {
      type = gl.SHORT;
      // 32位无符号整数数组
    } else if (array instanceof Uint32Array) {
      type = gl.UNSIGNED_INT;
      // 32位有符号整数数组
    } else if (array instanceof Int32Array) {
      type = gl.INT;
      // 8位有符号整数数组
    } else if (array instanceof Int8Array) {
      type = gl.BYTE;
      // 8位无符号整数数组
    } else if (array instanceof Uint8Array) {
      type = gl.UNSIGNED_BYTE;
      // 8位无符号整数数组（限制范围）
    } else if (array instanceof Uint8ClampedArray) {
      type = gl.UNSIGNED_BYTE;
    } else {
      // 不支持的数据格式，抛出错误
      throw new Error("THREE.WebGLBackend: Unsupported buffer data format: " + array);
    }

    // 创建属性数据对象，包含所有必要的缓冲区信息
    let attributeData = {
      bufferGPU, // GPU缓冲区对象
      bufferType, // 缓冲区类型
      type, // WebGL数据类型
      byteLength: array.byteLength, // 数组字节长度
      bytesPerElement: array.BYTES_PER_ELEMENT, // 每个元素的字节数
      version: attribute.version, // 属性版本号
      pbo: attribute.pbo, // 像素缓冲对象
      // 判断是否为整数类型：INT、UNSIGNED_INT或GPU类型为IntType
      isInteger: type === gl.INT || type === gl.UNSIGNED_INT || attribute.gpuType === IntType,
      id: _id++, // 分配唯一ID
    };

    // 如果是存储缓冲区属性或存储实例化缓冲区属性
    if (attribute.isStorageBufferAttribute || attribute.isStorageInstancedBufferAttribute) {
      // 为Transform Feedback创建第二个缓冲区
      const bufferGPUDual = this._createBuffer(gl, bufferType, array, usage);
      // 创建双缓冲属性数据对象
      attributeData = new DualAttributeData(attributeData, bufferGPUDual);
    }

    // 将属性数据关联到属性对象
    backend.set(attribute, attributeData);
  }

  /**
   * 更新给定缓冲区属性的GPU缓冲区数据
   * 支持全量更新和部分范围更新两种模式
   *
   * @param {Object} attribute - 缓冲区属性对象
   */
  updateAttribute(attribute) {
    // 获取后端实例和WebGL上下文
    const backend = this.backend;
    const { gl } = backend;

    // 获取属性数组数据
    const array = attribute.array;
    // 处理交错缓冲区属性
    const bufferAttribute = attribute.isInterleavedBufferAttribute ? attribute.data : attribute;
    // 获取缓冲区数据对象
    const bufferData = backend.get(bufferAttribute);
    // 获取缓冲区类型
    const bufferType = bufferData.bufferType;
    // 获取更新范围数组
    const updateRanges = attribute.isInterleavedBufferAttribute ? attribute.data.updateRanges : attribute.updateRanges;

    // 绑定GPU缓冲区
    gl.bindBuffer(bufferType, bufferData.bufferGPU);

    // 检查是否有指定的更新范围
    if (updateRanges.length === 0) {
      // 没有使用更新范围，进行全量更新
      gl.bufferSubData(bufferType, 0, array);
    } else {
      // 使用更新范围，只更新指定的数据段
      for (let i = 0, l = updateRanges.length; i < l; i++) {
        const range = updateRanges[i];
        // 更新指定范围的缓冲区数据
        gl.bufferSubData(bufferType, range.start * array.BYTES_PER_ELEMENT, array, range.start, range.count);
      }

      // 清除更新范围，避免重复更新
      bufferAttribute.clearUpdateRanges();
    }

    // 解绑缓冲区
    gl.bindBuffer(bufferType, null);

    // 更新版本号，标记数据已同步
    bufferData.version = bufferAttribute.version;
  }

  /**
   * 销毁给定缓冲区属性的GPU缓冲区
   * 释放GPU内存并清理相关的数据引用
   *
   * @param {Object} attribute - 缓冲区属性对象
   */
  destroyAttribute(attribute) {
    // 获取后端实例和WebGL上下文
    const backend = this.backend;
    const { gl } = backend;

    // 如果是交错缓冲区属性，删除其数据对象
    if (attribute.isInterleavedBufferAttribute) {
      backend.delete(attribute.data);
    }

    // 获取属性数据对象
    const attributeData = backend.get(attribute);

    // 删除GPU缓冲区，释放显存
    gl.deleteBuffer(attributeData.bufferGPU);

    // 从后端删除属性引用
    backend.delete(attribute);
  }

  /**
   * 异步执行回读操作，将存储缓冲区属性的数据从GPU传输到CPU
   * 该方法主要用于计算着色器的结果回读
   *
   * @async
   * @param {Object} attribute - 存储缓冲区属性对象
   * @return {Promise<ArrayBuffer>} 返回包含缓冲区数据的Promise，数据准备好时解析
   */
  async getArrayBufferAsync(attribute) {
    // 获取后端实例和WebGL上下文
    const backend = this.backend;
    const { gl } = backend;

    // 处理交错缓冲区属性
    const bufferAttribute = attribute.isInterleavedBufferAttribute ? attribute.data : attribute;
    // 获取GPU缓冲区对象
    const { bufferGPU } = backend.get(bufferAttribute);

    // 获取数组数据和字节长度
    const array = attribute.array;
    const byteLength = array.byteLength;

    // 将源缓冲区绑定为复制读取缓冲区
    gl.bindBuffer(gl.COPY_READ_BUFFER, bufferGPU);

    // 创建临时写入缓冲区用于数据传输
    const writeBuffer = gl.createBuffer();

    // 绑定写入缓冲区并分配内存
    gl.bindBuffer(gl.COPY_WRITE_BUFFER, writeBuffer);
    gl.bufferData(gl.COPY_WRITE_BUFFER, byteLength, gl.STREAM_READ);

    // 从读取缓冲区复制数据到写入缓冲区
    gl.copyBufferSubData(gl.COPY_READ_BUFFER, gl.COPY_WRITE_BUFFER, 0, 0, byteLength);

    // 等待GPU操作完成
    await backend.utils._clientWaitAsync();

    // 创建目标缓冲区，类型与原数组相同
    const dstBuffer = new attribute.array.constructor(array.length);

    // 确保写入缓冲区已绑定，准备读取数据
    gl.bindBuffer(gl.COPY_WRITE_BUFFER, writeBuffer);

    // 从GPU缓冲区读取数据到CPU内存
    gl.getBufferSubData(gl.COPY_WRITE_BUFFER, 0, dstBuffer);

    // 删除临时缓冲区，释放GPU内存
    gl.deleteBuffer(writeBuffer);

    // 解绑所有缓冲区
    gl.bindBuffer(gl.COPY_READ_BUFFER, null);
    gl.bindBuffer(gl.COPY_WRITE_BUFFER, null);

    // 返回ArrayBuffer数据
    return dstBuffer.buffer;
  }

  /**
   * 使用给定数据创建WebGL缓冲区的私有方法
   * 封装了缓冲区创建的标准流程
   *
   * @private
   * @param {WebGL2RenderingContext} gl - WebGL渲染上下文
   * @param {GLenum} bufferType - 缓冲区类型标志，指示绑定点目标
   * @param {TypedArray} array - 缓冲区属性的数组数据
   * @param {GLenum} usage - 使用模式（如STATIC_DRAW、DYNAMIC_DRAW等）
   * @return {WebGLBuffer} 创建的WebGL缓冲区对象
   */
  _createBuffer(gl, bufferType, array, usage) {
    // 创建新的WebGL缓冲区对象
    const bufferGPU = gl.createBuffer();

    // 绑定缓冲区到指定的绑定点
    gl.bindBuffer(bufferType, bufferGPU);
    // 将数组数据上传到GPU缓冲区
    gl.bufferData(bufferType, array, usage);
    // 解绑缓冲区，恢复默认状态
    gl.bindBuffer(bufferType, null);

    // 返回创建的缓冲区对象
    return bufferGPU;
  }
}

export default WebGLAttributeUtils;
