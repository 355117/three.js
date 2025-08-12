/**
 * TriplanarTextures.js - 三平面纹理映射工具
 *
 * 该文件实现了三平面纹理映射技术，用于在复杂几何体上
 * 无缝地应用纹理，避免UV展开的复杂性。
 */

// 导入数学运算节点
import { add } from "../math/OperatorNode.js";
// 导入法向量访问器
import { normalLocal } from "../accessors/Normal.js";
// 导入位置访问器
import { positionLocal } from "../accessors/Position.js";
// 导入纹理访问器
import { texture } from "../accessors/TextureNode.js";
// 导入TSL基础工具
import { float, vec3, Fn } from "../tsl/TSLBase.js";

/**
 * TSL 函数：创建三平面纹理节点
 *
 * 用于三平面纹理映射，这是一种程序化纹理映射技术，
 * 可以在不需要UV坐标的情况下将纹理投影到几何体上。
 * 特别适用于地形、岩石等复杂表面。
 *
 * 使用示例：
 * ```js
 * material.colorNode = triplanarTexture( texture( diffuseMap ) );
 * ```
 *
 * @tsl
 * @function
 * @param {Node} textureXNode - 第一个纹理节点（X轴投影）
 * @param {?Node} [textureYNode=null] - 第二个纹理节点（Y轴投影）。未设置时使用textureXNode
 * @param {?Node} [textureZNode=null] - 第三个纹理节点（Z轴投影）。未设置时使用textureXNode
 * @param {?Node<float>} [scaleNode=float(1)] - 缩放节点，控制纹理的平铺密度
 * @param {?Node<vec3>} [positionNode=positionLocal] - 本地空间中的顶点位置
 * @param {?Node<vec3>} [normalNode=normalLocal] - 本地空间中的法向量
 * @returns {Node<vec4>} 混合后的纹理颜色
 */
export const triplanarTextures = /*@__PURE__*/ Fn(
  ([textureXNode, textureYNode = null, textureZNode = null, scaleNode = float(1), positionNode = positionLocal, normalNode = normalLocal]) => {
    // 参考实现: https://github.com/keijiro/StandardTriplanar

    // 计算三平面映射的混合因子
    // 基于法向量的绝对值来确定每个平面的权重
    let bf = normalNode.abs().normalize();
    bf = bf.div(bf.dot(vec3(1.0)));

    // 三平面映射的UV坐标
    // 每个平面使用不同的坐标分量
    const tx = positionNode.yz.mul(scaleNode); // YZ平面（X轴投影）
    const ty = positionNode.zx.mul(scaleNode); // ZX平面（Y轴投影）
    const tz = positionNode.xy.mul(scaleNode); // XY平面（Z轴投影）

    // 获取纹理资源
    const textureX = textureXNode.value;
    const textureY = textureYNode !== null ? textureYNode.value : textureX;
    const textureZ = textureZNode !== null ? textureZNode.value : textureX;

    // 对每个平面进行纹理采样并应用混合权重
    const cx = texture(textureX, tx).mul(bf.x); // X轴投影的贡献
    const cy = texture(textureY, ty).mul(bf.y); // Y轴投影的贡献
    const cz = texture(textureZ, tz).mul(bf.z); // Z轴投影的贡献

    // 混合三个平面的结果
    return add(cx, cy, cz);
  }
);

/**
 * TSL 函数：创建三平面纹理节点（别名函数）
 *
 * 这是 triplanarTextures 函数的别名，提供更简洁的命名。
 * 功能完全相同，用于三平面纹理映射。
 *
 * @tsl
 * @function
 * @param {Node} textureXNode - 第一个纹理节点（X轴投影）
 * @param {?Node} [textureYNode=null] - 第二个纹理节点（Y轴投影）。未设置时使用textureXNode
 * @param {?Node} [textureZNode=null] - 第三个纹理节点（Z轴投影）。未设置时使用textureXNode
 * @param {?Node<float>} [scaleNode=float(1)] - 缩放节点，控制纹理的平铺密度
 * @param {?Node<vec3>} [positionNode=positionLocal] - 本地空间中的顶点位置
 * @param {?Node<vec3>} [normalNode=normalLocal] - 本地空间中的法向量
 * @returns {Node<vec4>} 混合后的纹理颜色
 */
export const triplanarTexture = (...params) => triplanarTextures(...params);
