// 导入TSL基础的节点对象包装功能
import { nodeObject } from "../tsl/TSLBase.js";

/**
 * 将方向向量打包为颜色值。
 *
 * 该函数将归一化的方向向量（范围[-1, 1]）转换为颜色值（范围[0, 1]）。
 * 这种打包技术常用于将法线、方向或其他向量数据存储在纹理中，
 * 特别是在法线贴图、方向贴图或其他需要在GPU间传递向量数据的场景中。
 *
 * 转换公式：color = (direction + 1.0) * 0.5
 * 这将[-1, 1]范围映射到[0, 1]范围，适合存储在颜色通道中。
 *
 * @tsl
 * @function
 * @param {Node<vec3>} node - 要打包的方向向量，通常是归一化的。
 * @return {Node<vec3>} 打包后的颜色值，范围[0, 1]。
 */
export const directionToColor = (node) => nodeObject(node).mul(0.5).add(0.5);

/**
 * 将颜色值解包为方向向量。
 *
 * 该函数是directionToColor的逆操作，将存储在颜色值中的方向数据
 * 还原为原始的方向向量。常用于从法线贴图、方向贴图或其他
 * 打包纹理中读取向量数据。
 *
 * 转换公式：direction = color * 2.0 - 1.0
 * 这将[0, 1]范围映射回[-1, 1]范围，恢复原始的方向向量。
 *
 * @tsl
 * @function
 * @param {Node<vec3>} node - 要解包的颜色值，范围[0, 1]。
 * @return {Node<vec3>} 解包后的方向向量，范围[-1, 1]。
 */
export const colorToDirection = (node) => nodeObject(node).mul(2.0).sub(1);
