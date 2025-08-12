import TempNode from "../core/TempNode.js"; // 导入TempNode基类

import { normalView, transformNormalToView } from "../accessors/Normal.js"; // 导入法线相关访问器
import { TBNViewMatrix } from "../accessors/AccessorsUtils.js"; // 导入TBN视图矩阵
import { nodeProxy, vec3 } from "../tsl/TSLBase.js"; // 导入TSL核心函数

import { TangentSpaceNormalMap, ObjectSpaceNormalMap } from "../../constants.js"; // 导入法线贴图类型常量
import { directionToFaceDirection } from "./FrontFacingNode.js"; // 导入方向到面方向的转换函数

/**
 * 此类可用于将法线贴图应用于材质。
 *
 * ```js
 * material.normalNode = normalMap( texture( normalTex ) );
 * ```
 *
 * @augments TempNode
 */
class NormalMapNode extends TempNode {
  // 定义NormalMapNode类，继承自TempNode

  static get type() {
    // 静态getter方法，返回节点类型

    return "NormalMapNode"; // 返回节点类型字符串
  }

  /**
   * 构造一个新的法线贴图节点。
   *
   * @param {Node<vec3>} node - 表示法线贴图数据。
   * @param {?Node<vec2>} [scaleNode=null] - 控制效果的强度。
   */
  constructor(node, scaleNode = null) {
    // 构造函数，接受节点和可选的缩放节点

    super("vec3"); // 调用父类构造函数，类型为vec3

    /**
     * 表示法线贴图数据。
     *
     * @type {Node<vec3>}
     */
    this.node = node; // 存储法线贴图节点

    /**
     * 控制效果的强度。
     *
     * @type {?Node<vec2>}
     * @default null
     */
    this.scaleNode = scaleNode; // 存储缩放节点

    /**
     * 法线贴图类型。
     *
     * @type {(TangentSpaceNormalMap|ObjectSpaceNormalMap)}
     * @default TangentSpaceNormalMap
     */
    this.normalMapType = TangentSpaceNormalMap; // 设置默认法线贴图类型为切线空间
  }

  setup({ material }) {
    // 设置方法，接受材质参数

    const { normalMapType, scaleNode } = this; // 解构获取法线贴图类型和缩放节点

    let normalMap = this.node.mul(2.0).sub(1.0); // 将法线贴图从[0,1]范围转换为[-1,1]范围

    if (scaleNode !== null) {
      // 如果有缩放节点

      let scale = scaleNode; // 获取缩放值

      if (material.flatShading === true) {
        // 如果材质使用平面着色

        scale = directionToFaceDirection(scale); // 根据面方向调整缩放
      }

      normalMap = vec3(normalMap.xy.mul(scale), normalMap.z); // 应用缩放到法线贴图的xy分量
    }

    let output = null; // 初始化输出

    if (normalMapType === ObjectSpaceNormalMap) {
      // 如果是对象空间法线贴图

      output = transformNormalToView(normalMap); // 将对象空间法线转换为视图空间
    } else if (normalMapType === TangentSpaceNormalMap) {
      // 如果是切线空间法线贴图

      output = TBNViewMatrix.mul(normalMap).normalize(); // 使用TBN矩阵转换切线空间法线并归一化
    } else {
      // 如果是不支持的法线贴图类型

      console.error(`THREE.NodeMaterial: Unsupported normal map type: ${normalMapType}`); // 输出错误信息

      output = normalView; // 回退到默认法线视图
    }

    return output; // 返回处理后的法线
  }
}

export default NormalMapNode; // 导出NormalMapNode类作为默认导出

/**
 * 用于创建法线贴图节点的TSL函数。
 *
 * @tsl
 * @function
 * @param {Node<vec3>} node - 表示法线贴图数据。
 * @param {?Node<vec2>} [scaleNode=null] - 控制效果的强度。
 * @returns {NormalMapNode}
 */
export const normalMap = /*@__PURE__*/ nodeProxy(NormalMapNode).setParameterLength(1, 2); // 导出normalMap函数，用于创建法线贴图节点
