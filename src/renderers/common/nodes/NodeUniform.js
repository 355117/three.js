/**
 * NodeUniform.js
 *
 * 节点Uniform类 - 基于节点的Uniform绑定类型
 *
 * 这个模块定义了一系列特殊的Uniform绑定类型，它们的值由节点对象管理。
 * 这些类扩展了基础的Uniform类，提供了与节点系统的集成。
 *
 * 主要特点：
 * 1. 值由节点对象动态管理
 * 2. 支持所有基础数据类型（数字、向量、颜色、矩阵）
 * 3. 提供类型安全的访问接口
 * 4. 与节点系统无缝集成
 *
 * 支持的数据类型：
 * - Number（数字）
 * - Vector2/3/4（二维/三维/四维向量）
 * - Color（颜色）
 * - Matrix2/3/4（二阶/三阶/四阶矩阵）
 */

// 导入基础Uniform类型
import {
  NumberUniform, // 数字Uniform
  Vector2Uniform, // 二维向量Uniform
  Vector3Uniform, // 三维向量Uniform
  Vector4Uniform, // 四维向量Uniform
  ColorUniform, // 颜色Uniform
  Matrix2Uniform, // 二阶矩阵Uniform
  Matrix3Uniform, // 三阶矩阵Uniform
  Matrix4Uniform, // 四阶矩阵Uniform
} from "../Uniform.js";

/**
 * 基于节点的数字Uniform绑定类型
 *
 * 这是NumberUniform的特殊形式，其值由节点对象管理。
 * 节点可以动态计算和更新uniform的值，提供了更灵活的数据绑定机制。
 *
 * @private
 * @augments NumberUniform
 */
class NumberNodeUniform extends NumberUniform {
  /**
   * 构造新的基于节点的数字uniform
   *
   * 创建一个与节点系统集成的数字uniform，其值将由指定的节点uniform管理。
   *
   * @param {import('../../../nodes/core/NodeUniform.js').NodeUniform} nodeUniform - 节点uniform对象
   */
  constructor(nodeUniform) {
    // 调用父类构造函数，传入名称和初始值
    super(nodeUniform.name, nodeUniform.value);

    /**
     * 关联的节点uniform对象
     *
     * 这个对象负责管理uniform的值和类型，提供动态更新机制。
     *
     * @type {import('../../../nodes/core/NodeUniform.js').NodeUniform}
     */
    this.nodeUniform = nodeUniform;
  }

  /**
   * 获取uniform的当前值
   *
   * 重写父类方法，直接从节点uniform获取最新的值。
   * 这确保了值的实时性和一致性。
   *
   * @return {number} 当前的数字值
   */
  getValue() {
    return this.nodeUniform.value;
  }

  /**
   * 获取节点uniform的数据类型
   *
   * 返回节点uniform的数据类型字符串，用于类型检查和验证。
   *
   * @return {string} 数据类型字符串
   */
  getType() {
    return this.nodeUniform.type;
  }
}

/**
 * 基于节点的二维向量Uniform绑定类型
 *
 * 这是Vector2Uniform的特殊形式，其值由节点对象管理。
 *
 * @private
 * @augments Vector2Uniform
 */
class Vector2NodeUniform extends Vector2Uniform {
  /**
   * 构造新的基于节点的二维向量uniform
   *
   * @param {import('../../../nodes/core/NodeUniform.js').NodeUniform} nodeUniform - 节点uniform对象
   */
  constructor(nodeUniform) {
    super(nodeUniform.name, nodeUniform.value);

    /**
     * 关联的节点uniform对象
     *
     * @type {import('../../../nodes/core/NodeUniform.js').NodeUniform}
     */
    this.nodeUniform = nodeUniform;
  }

  /**
   * 获取uniform的当前值
   *
   * @return {import('../../../math/Vector2.js').Vector2} 当前的二维向量值
   */
  getValue() {
    return this.nodeUniform.value;
  }

  /**
   * 获取节点uniform的数据类型
   *
   * @return {string} 数据类型字符串
   */
  getType() {
    return this.nodeUniform.type;
  }
}

/**
 * 基于节点的三维向量Uniform绑定类型
 *
 * 这是Vector3Uniform的特殊形式，其值由节点对象管理。
 *
 * @private
 * @augments Vector3Uniform
 */
class Vector3NodeUniform extends Vector3Uniform {
  /**
   * 构造新的基于节点的三维向量uniform
   *
   * @param {import('../../../nodes/core/NodeUniform.js').NodeUniform} nodeUniform - 节点uniform对象
   */
  constructor(nodeUniform) {
    super(nodeUniform.name, nodeUniform.value);

    /**
     * 关联的节点uniform对象
     *
     * @type {import('../../../nodes/core/NodeUniform.js').NodeUniform}
     */
    this.nodeUniform = nodeUniform;
  }

  /**
   * 获取uniform的当前值
   *
   * @return {import('../../../math/Vector3.js').Vector3} 当前的三维向量值
   */
  getValue() {
    return this.nodeUniform.value;
  }

  /**
   * 获取节点uniform的数据类型
   *
   * @return {string} 数据类型字符串
   */
  getType() {
    return this.nodeUniform.type;
  }
}

/**
 * 基于节点的四维向量Uniform绑定类型
 * @private
 * @augments Vector4Uniform
 */
class Vector4NodeUniform extends Vector4Uniform {
  /**
   * 构造新的基于节点的四维向量uniform
   * @param {import('../../../nodes/core/NodeUniform.js').NodeUniform} nodeUniform - 节点uniform对象
   */
  constructor(nodeUniform) {
    super(nodeUniform.name, nodeUniform.value);

    /**
     * 关联的节点uniform对象
     * @type {import('../../../nodes/core/NodeUniform.js').NodeUniform}
     */
    this.nodeUniform = nodeUniform;
  }

  /**
   * 获取uniform的当前值
   * @return {import('../../../math/Vector4.js').Vector4} 当前的四维向量值
   */
  getValue() {
    return this.nodeUniform.value;
  }

  /**
   * 获取节点uniform的数据类型
   * @return {string} 数据类型字符串
   */
  getType() {
    return this.nodeUniform.type;
  }
}

/**
 * 基于节点的颜色Uniform绑定类型
 * @private
 * @augments ColorUniform
 */
class ColorNodeUniform extends ColorUniform {
  /**
   * 构造新的基于节点的颜色uniform
   * @param {import('../../../nodes/core/NodeUniform.js').NodeUniform} nodeUniform - 节点uniform对象
   */
  constructor(nodeUniform) {
    super(nodeUniform.name, nodeUniform.value);

    /**
     * 关联的节点uniform对象
     * @type {import('../../../nodes/core/NodeUniform.js').NodeUniform}
     */
    this.nodeUniform = nodeUniform;
  }

  /**
   * Overwritten to return the value of the node uniform.
   *
   * @return {Color} The value.
   */
  getValue() {
    return this.nodeUniform.value;
  }

  /**
   * Returns the node uniform data type.
   *
   * @return {string} The data type.
   */
  getType() {
    return this.nodeUniform.type;
  }
}

/**
 * 基于节点的二阶矩阵Uniform绑定类型
 * @private
 * @augments Matrix2Uniform
 */
class Matrix2NodeUniform extends Matrix2Uniform {
  /**
   * 构造新的基于节点的二阶矩阵uniform
   * @param {import('../../../nodes/core/NodeUniform.js').NodeUniform} nodeUniform - 节点uniform对象
   */
  constructor(nodeUniform) {
    super(nodeUniform.name, nodeUniform.value);

    /**
     * 关联的节点uniform对象
     * @type {import('../../../nodes/core/NodeUniform.js').NodeUniform}
     */
    this.nodeUniform = nodeUniform;
  }

  /**
   * Overwritten to return the value of the node uniform.
   *
   * @return {Matrix2} The value.
   */
  getValue() {
    return this.nodeUniform.value;
  }

  /**
   * Returns the node uniform data type.
   *
   * @return {string} The data type.
   */
  getType() {
    return this.nodeUniform.type;
  }
}

/**
 * 基于节点的三阶矩阵Uniform绑定类型
 * @private
 * @augments Matrix3Uniform
 */
class Matrix3NodeUniform extends Matrix3Uniform {
  /**
   * 构造新的基于节点的三阶矩阵uniform
   * @param {import('../../../nodes/core/NodeUniform.js').NodeUniform} nodeUniform - 节点uniform对象
   */
  constructor(nodeUniform) {
    super(nodeUniform.name, nodeUniform.value);

    /**
     * 关联的节点uniform对象
     * @type {import('../../../nodes/core/NodeUniform.js').NodeUniform}
     */
    this.nodeUniform = nodeUniform;
  }

  /**
   * Overwritten to return the value of the node uniform.
   *
   * @return {Matrix3} The value.
   */
  getValue() {
    return this.nodeUniform.value;
  }

  /**
   * Returns the node uniform data type.
   *
   * @return {string} The data type.
   */
  getType() {
    return this.nodeUniform.type;
  }
}

/**
 * 基于节点的四阶矩阵Uniform绑定类型
 * @private
 * @augments Matrix4Uniform
 */
class Matrix4NodeUniform extends Matrix4Uniform {
  /**
   * 构造新的基于节点的四阶矩阵uniform
   * @param {import('../../../nodes/core/NodeUniform.js').NodeUniform} nodeUniform - 节点uniform对象
   */
  constructor(nodeUniform) {
    super(nodeUniform.name, nodeUniform.value);

    /**
     * 关联的节点uniform对象
     * @type {import('../../../nodes/core/NodeUniform.js').NodeUniform}
     */
    this.nodeUniform = nodeUniform;
  }

  /**
   * Overwritten to return the value of the node uniform.
   *
   * @return {Matrix4} The value.
   */
  getValue() {
    return this.nodeUniform.value;
  }

  /**
   * Returns the node uniform data type.
   *
   * @return {string} The data type.
   */
  getType() {
    return this.nodeUniform.type;
  }
}

export { NumberNodeUniform, Vector2NodeUniform, Vector3NodeUniform, Vector4NodeUniform, ColorNodeUniform, Matrix2NodeUniform, Matrix3NodeUniform, Matrix4NodeUniform };
