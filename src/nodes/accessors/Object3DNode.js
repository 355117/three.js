// 导入节点基类
import Node from "../core/Node.js";
// 导入节点更新类型常量
import { NodeUpdateType } from "../core/constants.js";
// 导入统一变量节点
import UniformNode from "../core/UniformNode.js";
// 导入节点代理函数
import { nodeProxy } from "../tsl/TSLBase.js";
// 导入三维向量类
import { Vector3 } from "../../math/Vector3.js";
// 导入球体类
import { Sphere } from "../../math/Sphere.js";

// 临时球体对象，用于半径计算
const _sphere = /*@__PURE__*/ new Sphere();

/**
 * 3D对象节点 - 可用于访问3D对象的变换相关度量
 * 根据选定的作用域，不同的度量在着色器中表示为统一变量
 * 支持以下作用域：
 *
 * - `POSITION`: 对象在世界空间中的位置
 * - `VIEW_POSITION`: 对象在视图/相机空间中的位置
 * - `DIRECTION`: 对象在世界空间中的方向
 * - `SCALE`: 对象在世界空间中的缩放
 * - `WORLD_MATRIX`: 对象在世界空间中的矩阵
 *
 * @augments Node
 */
class Object3DNode extends Node {
  // 返回节点类型标识符
  static get type() {
    return "Object3DNode";
  }

  /**
   * 构造一个新的3D对象节点
   *
   * @param {('position'|'viewPosition'|'direction'|'scale'|'worldMatrix')} scope - 根据作用域，节点表示不同类型的变换
   * @param {?Object3D} [object3d=null] - 3D对象
   */
  constructor(scope, object3d = null) {
    // 调用父类构造函数
    super();

    /**
     * 节点根据作用域报告不同类型的变换
     *
     * @type {('position'|'viewPosition'|'direction'|'scale'|'worldMatrix')}
     */
    this.scope = scope;

    /**
     * 3D对象
     *
     * @type {?Object3D}
     * @default null
     */
    this.object3d = object3d;

    /**
     * 重写更新类型，因为此类型的节点按对象更新
     *
     * @type {string}
     * @default 'object'
     */
    this.updateType = NodeUpdateType.OBJECT;

    /**
     * 将节点的值保存为统一变量
     *
     * @type {UniformNode}
     */
    this.uniformNode = new UniformNode(null);
  }

  /**
   * 重写方法，因为节点类型从作用域推断
   *
   * @return {string} 节点类型
   */
  getNodeType() {
    // 获取作用域
    const scope = this.scope;

    // 根据作用域返回相应的节点类型
    if (scope === Object3DNode.WORLD_MATRIX) {
      return "mat4";
    } else if (scope === Object3DNode.POSITION || scope === Object3DNode.VIEW_POSITION || scope === Object3DNode.DIRECTION || scope === Object3DNode.SCALE) {
      return "vec3";
    } else if (scope === Object3DNode.RADIUS) {
      return "float";
    }
  }

  /**
   * 根据作用域更新统一变量值
   *
   * @param {NodeFrame} frame - 当前节点帧
   */
  update(frame) {
    // 获取3D对象、统一变量节点和作用域
    const object = this.object3d;
    const uniformNode = this.uniformNode;
    const scope = this.scope;

    // 根据作用域更新相应的值
    if (scope === Object3DNode.WORLD_MATRIX) {
      // 世界矩阵：直接使用对象的世界矩阵
      uniformNode.value = object.matrixWorld;
    } else if (scope === Object3DNode.POSITION) {
      // 位置：从世界矩阵中提取位置
      uniformNode.value = uniformNode.value || new Vector3();

      uniformNode.value.setFromMatrixPosition(object.matrixWorld);
    } else if (scope === Object3DNode.SCALE) {
      // 缩放：从世界矩阵中提取缩放
      uniformNode.value = uniformNode.value || new Vector3();

      uniformNode.value.setFromMatrixScale(object.matrixWorld);
    } else if (scope === Object3DNode.DIRECTION) {
      // 方向：获取对象的世界方向
      uniformNode.value = uniformNode.value || new Vector3();

      object.getWorldDirection(uniformNode.value);
    } else if (scope === Object3DNode.VIEW_POSITION) {
      // 视图位置：将世界位置转换到相机空间
      const camera = frame.camera;

      uniformNode.value = uniformNode.value || new Vector3();
      uniformNode.value.setFromMatrixPosition(object.matrixWorld);

      // 应用相机的逆世界矩阵
      uniformNode.value.applyMatrix4(camera.matrixWorldInverse);
    } else if (scope === Object3DNode.RADIUS) {
      // 半径：计算对象的包围球半径
      const geometry = frame.object.geometry;

      // 如果没有包围球，先计算它
      if (geometry.boundingSphere === null) geometry.computeBoundingSphere();

      // 复制包围球并应用对象的世界矩阵
      _sphere.copy(geometry.boundingSphere).applyMatrix4(object.matrixWorld);

      // 设置半径值
      uniformNode.value = _sphere.radius;
    }
  }

  /**
   * 生成统一变量节点的代码片段
   * 统一变量节点的节点类型也取决于选定的作用域
   *
   * @param {NodeBuilder} builder - 当前节点构建器
   * @return {string} 生成的代码片段
   */
  generate(builder) {
    // 获取作用域
    const scope = this.scope;

    // 根据作用域设置统一变量节点的类型
    if (scope === Object3DNode.WORLD_MATRIX) {
      this.uniformNode.nodeType = "mat4";
    } else if (scope === Object3DNode.POSITION || scope === Object3DNode.VIEW_POSITION || scope === Object3DNode.DIRECTION || scope === Object3DNode.SCALE) {
      this.uniformNode.nodeType = "vec3";
    } else if (scope === Object3DNode.RADIUS) {
      this.uniformNode.nodeType = "float";
    }

    // 构建并返回统一变量节点的代码
    return this.uniformNode.build(builder);
  }

  // 序列化方法：保存作用域信息
  serialize(data) {
    super.serialize(data);

    data.scope = this.scope;
  }

  // 反序列化方法：恢复作用域信息
  deserialize(data) {
    super.deserialize(data);

    this.scope = data.scope;
  }
}

// Object3DNode静态常量定义 - 定义各种作用域标识符
Object3DNode.WORLD_MATRIX = "worldMatrix"; // 世界矩阵
Object3DNode.POSITION = "position"; // 位置
Object3DNode.SCALE = "scale"; // 缩放
Object3DNode.VIEW_POSITION = "viewPosition"; // 视图位置
Object3DNode.DIRECTION = "direction"; // 方向
Object3DNode.RADIUS = "radius"; // 半径

// 导出Object3DNode类作为默认导出
export default Object3DNode;

/**
 * TSL函数 - 创建表示对象在世界空间中方向的3D对象节点
 *
 * @tsl
 * @function
 * @param {?Object3D} [object3d] - 3D对象
 * @returns {Object3DNode<vec3>}
 */
export const objectDirection = /*@__PURE__*/ nodeProxy(Object3DNode, Object3DNode.DIRECTION).setParameterLength(1);

/**
 * TSL函数 - 创建表示对象世界矩阵的3D对象节点
 *
 * @tsl
 * @function
 * @param {?Object3D} [object3d] - 3D对象
 * @returns {Object3DNode<mat4>}
 */
export const objectWorldMatrix = /*@__PURE__*/ nodeProxy(Object3DNode, Object3DNode.WORLD_MATRIX).setParameterLength(1);

/**
 * TSL函数 - 创建表示对象在世界空间中位置的3D对象节点
 *
 * @tsl
 * @function
 * @param {?Object3D} [object3d] - 3D对象
 * @returns {Object3DNode<vec3>}
 */
export const objectPosition = /*@__PURE__*/ nodeProxy(Object3DNode, Object3DNode.POSITION).setParameterLength(1);

/**
 * TSL函数 - 创建表示对象在世界空间中缩放的3D对象节点
 *
 * @tsl
 * @function
 * @param {?Object3D} [object3d] - 3D对象
 * @returns {Object3DNode<vec3>}
 */
export const objectScale = /*@__PURE__*/ nodeProxy(Object3DNode, Object3DNode.SCALE).setParameterLength(1);

/**
 * TSL函数 - 创建表示对象在视图/相机空间中位置的3D对象节点
 *
 * @tsl
 * @function
 * @param {?Object3D} [object3d] - 3D对象
 * @returns {Object3DNode<vec3>}
 */
export const objectViewPosition = /*@__PURE__*/ nodeProxy(Object3DNode, Object3DNode.VIEW_POSITION).setParameterLength(1);

/**
 * TSL函数 - 创建表示对象半径的3D对象节点
 *
 * @tsl
 * @function
 * @param {?Object3D} [object3d] - 3D对象
 * @returns {Object3DNode<float>}
 */
export const objectRadius = /*@__PURE__*/ nodeProxy(Object3DNode, Object3DNode.RADIUS).setParameterLength(1);
