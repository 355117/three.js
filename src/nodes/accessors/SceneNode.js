// 导入UV映射常量
import { UVMapping } from "../../constants.js";
// 导入欧拉角类
import { Euler } from "../../math/Euler.js";
// 导入4x4矩阵类
import { Matrix4 } from "../../math/Matrix4.js";
// 导入节点基类
import Node from "../core/Node.js";
// 导入渲染组
import { renderGroup } from "../core/UniformGroupNode.js";
// 导入不可变节点和统一变量函数
import { nodeImmutable, uniform } from "../tsl/TSLBase.js";
// 导入引用函数
import { reference } from "./ReferenceNode.js";

// 临时欧拉角对象，用于旋转计算
const _e1 = /*@__PURE__*/ new Euler();
// 临时4x4矩阵对象，用于旋转矩阵计算
const _m1 = /*@__PURE__*/ new Matrix4();

/**
 * 场景节点 - 允许访问场景属性集合的模块。以下预定义的TSL对象可供更方便地使用：
 *
 * - `backgroundBlurriness`: 表示场景背景模糊度的节点
 * - `backgroundIntensity`: 表示场景背景强度的节点
 * - `backgroundRotation`: 表示场景背景旋转的节点
 *
 * @augments Node
 */
class SceneNode extends Node {
  // 返回节点类型标识符
  static get type() {
    return "SceneNode";
  }

  /**
   * 构造一个新的场景节点
   *
   * @param {('backgroundBlurriness'|'backgroundIntensity'|'backgroundRotation')} scope - 作用域定义访问的场景属性类型
   * @param {?Scene} [scene=null] - 对场景的引用
   */
  constructor(scope = SceneNode.BACKGROUND_BLURRINESS, scene = null) {
    // 调用父类构造函数
    super();

    /**
     * 作用域定义访问的场景属性类型
     *
     * @type {('backgroundBlurriness'|'backgroundIntensity'|'backgroundRotation')}
     */
    this.scope = scope;

    /**
     * 对将要访问的场景的引用
     *
     * @type {?Scene}
     * @default null
     */
    this.scene = scene;
  }

  /**
   * 根据作用域，该方法返回表示相应场景属性的不同类型节点
   *
   * @param {NodeBuilder} builder - 当前节点构建器
   * @return {Node} 输出节点
   */
  setup(builder) {
    // 获取作用域和场景引用
    const scope = this.scope;
    const scene = this.scene !== null ? this.scene : builder.scene;

    let output;

    // 根据作用域创建相应的节点
    if (scope === SceneNode.BACKGROUND_BLURRINESS) {
      // 背景模糊度：创建对场景背景模糊度属性的引用
      output = reference("backgroundBlurriness", "float", scene);
    } else if (scope === SceneNode.BACKGROUND_INTENSITY) {
      // 背景强度：创建对场景背景强度属性的引用
      output = reference("backgroundIntensity", "float", scene);
    } else if (scope === SceneNode.BACKGROUND_ROTATION) {
      // 背景旋转：创建动态更新的旋转矩阵统一变量
      output = uniform("mat4")
        .setName("backgroundRotation")
        .setGroup(renderGroup)
        .onRenderUpdate(() => {
          // 获取场景背景
          const background = scene.background;

          // 如果背景是纹理且不是UV映射，应用旋转
          if (background !== null && background.isTexture && background.mapping !== UVMapping) {
            // 复制场景背景旋转
            _e1.copy(scene.backgroundRotation);

            // 适应左手坐标系
            _e1.x *= -1;
            _e1.y *= -1;
            _e1.z *= -1;

            // 从欧拉角创建旋转矩阵
            _m1.makeRotationFromEuler(_e1);
          } else {
            // 否则使用单位矩阵
            _m1.identity();
          }

          return _m1;
        });
    } else {
      // 未知作用域，输出错误
      console.error("THREE.SceneNode: Unknown scope:", scope);
    }

    return output;
  }
}

// SceneNode静态常量定义 - 定义各种作用域标识符
SceneNode.BACKGROUND_BLURRINESS = "backgroundBlurriness"; // 背景模糊度
SceneNode.BACKGROUND_INTENSITY = "backgroundIntensity"; // 背景强度
SceneNode.BACKGROUND_ROTATION = "backgroundRotation"; // 背景旋转

// 导出SceneNode类作为默认导出
export default SceneNode;

/**
 * TSL对象 - 表示场景的背景模糊度
 *
 * @tsl
 * @type {SceneNode}
 */
export const backgroundBlurriness = /*@__PURE__*/ nodeImmutable(SceneNode, SceneNode.BACKGROUND_BLURRINESS);

/**
 * TSL对象 - 表示场景的背景强度
 *
 * @tsl
 * @type {SceneNode}
 */
export const backgroundIntensity = /*@__PURE__*/ nodeImmutable(SceneNode, SceneNode.BACKGROUND_INTENSITY);

/**
 * TSL对象 - 表示场景的背景旋转
 *
 * @tsl
 * @type {SceneNode}
 */
export const backgroundRotation = /*@__PURE__*/ nodeImmutable(SceneNode, SceneNode.BACKGROUND_ROTATION);
