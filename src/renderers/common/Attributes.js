/**
 * Attributes.js
 *
 * 属性管理器 - 管理几何体属性
 *
 * 这个渲染器模块负责管理几何体属性，包括顶点属性、索引属性、
 * 存储属性等。它处理属性的创建、更新、删除和版本管理。
 */

// 导入依赖模块
import DataMap from "./DataMap.js"; // 数据映射基类
import { AttributeType } from "./Constants.js"; // 属性类型常量

import { DynamicDrawUsage } from "../../constants.js"; // 动态绘制使用标志

/**
 * 属性管理类
 *
 * 这个渲染器模块管理几何体属性。它负责跟踪属性的状态、
 * 处理属性的生命周期，并与后端协调属性的GPU资源管理。
 *
 * @private
 * @augments DataMap
 */
class Attributes extends DataMap {
  /**
   * 构造新的属性管理组件
   *
   * 初始化属性管理器，设置后端引用。属性管理器将使用
   * 后端来创建、更新和销毁GPU上的属性资源。
   *
   * @param {import('./Backend.js').default} backend - 渲染器的后端实现
   */
  constructor(backend) {
    // 调用父类构造函数
    super();

    /**
     * 渲染器后端
     *
     * 对渲染器后端的引用，用于执行特定于后端的属性操作，
     * 如创建GPU缓冲区、更新数据等。
     *
     * @type {import('./Backend.js').default}
     */
    this.backend = backend;
  }

  /**
   * 删除给定属性的数据
   *
   * 从内部数据映射中删除属性数据，并通知后端销毁
   * 对应的GPU资源。这确保内存得到正确释放。
   *
   * @param {import('../../core/BufferAttribute.js').BufferAttribute} attribute - 要删除的属性
   * @return {Object|null} 被删除的属性数据
   */
  delete(attribute) {
    // 调用父类的删除方法
    const attributeData = super.delete(attribute);

    // 如果成功删除了数据，通知后端销毁GPU资源
    if (attributeData !== null) {
      this.backend.destroyAttribute(attribute);
    }

    return attributeData;
  }

  /**
   * 更新给定的属性
   *
   * 这个方法为新属性创建属性缓冲区，为现有属性更新数据。
   * 它处理不同类型的属性（顶点、索引、存储等）并管理版本控制。
   *
   * @param {import('../../core/BufferAttribute.js').BufferAttribute} attribute - 要更新的属性
   * @param {number} type - 属性类型（来自AttributeType枚举）
   */
  update(attribute, type) {
    // 获取属性的数据存储
    const data = this.get(attribute);

    // 如果是新属性（没有版本信息），创建GPU资源
    if (data.version === undefined) {
      if (type === AttributeType.VERTEX) {
        // 创建顶点属性
        this.backend.createAttribute(attribute);
      } else if (type === AttributeType.INDEX) {
        // 创建索引属性
        this.backend.createIndexAttribute(attribute);
      } else if (type === AttributeType.STORAGE) {
        // 创建存储属性
        this.backend.createStorageAttribute(attribute);
      } else if (type === AttributeType.INDIRECT) {
        // 创建间接存储属性
        this.backend.createIndirectStorageAttribute(attribute);
      }

      // 记录当前版本
      data.version = this._getBufferAttribute(attribute).version;
    } else {
      // 对于现有属性，检查是否需要更新
      const bufferAttribute = this._getBufferAttribute(attribute);

      // 如果版本过期或使用动态绘制，更新属性
      if (data.version < bufferAttribute.version || bufferAttribute.usage === DynamicDrawUsage) {
        // 更新GPU上的属性数据
        this.backend.updateAttribute(attribute);

        // 更新版本记录
        data.version = bufferAttribute.version;
      }
    }
  }

  /**
   * 正确处理交错缓冲区属性的工具方法
   *
   * 为了正确处理交错缓冲区属性，返回它们的`InterleavedBuffer`。
   * 交错缓冲区将多个属性的数据交错存储在同一个缓冲区中。
   *
   * @param {import('../../core/BufferAttribute.js').BufferAttribute} attribute - 属性对象
   * @return {import('../../core/BufferAttribute.js').BufferAttribute|import('../../core/InterleavedBuffer.js').InterleavedBuffer} 缓冲区属性或交错缓冲区
   */
  _getBufferAttribute(attribute) {
    // 如果是交错缓冲区属性，返回其数据缓冲区
    if (attribute.isInterleavedBufferAttribute) attribute = attribute.data;

    return attribute;
  }
}

export default Attributes;
