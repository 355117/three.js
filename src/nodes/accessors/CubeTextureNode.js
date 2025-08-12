// 导入纹理节点基类
import TextureNode from "./TextureNode.js";
// 导入反射和折射向量
import { reflectVector, refractVector } from "./ReflectVector.js";
// 导入TSL基础函数
import { nodeObject, nodeProxy, vec3 } from "../tsl/TSLBase.js";

// 导入立方体映射常量和坐标系统
import { CubeReflectionMapping, CubeRefractionMapping, WebGPUCoordinateSystem } from "../../constants.js";
// 导入材质环境旋转
import { materialEnvRotation } from "./MaterialProperties.js";

// 导入立方体纹理类
import { CubeTexture } from "../../textures/CubeTexture.js";

// 创建空的立方体纹理作为默认值
const EmptyTexture = /*@__PURE__*/ new CubeTexture();

/**
 * 这种类型的统一节点表示立方体纹理
 *
 * @augments TextureNode
 */
class CubeTextureNode extends TextureNode {
  // 返回节点类型标识符
  static get type() {
    return "CubeTextureNode";
  }

  /**
   * 构造一个新的立方体纹理节点
   *
   * @param {CubeTexture} value - 立方体纹理
   * @param {?Node<vec3>} [uvNode=null] - UV节点
   * @param {?Node<int>} [levelNode=null] - 级别节点
   * @param {?Node<float>} [biasNode=null] - 偏移节点
   */
  constructor(value, uvNode = null, levelNode = null, biasNode = null) {
    // 调用父类构造函数
    super(value, uvNode, levelNode, biasNode);

    /**
     * 此标志可用于类型测试
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isCubeTextureNode = true;
  }

  /**
   * 重写默认实现，返回固定值 `'cubeTexture'`
   *
   * @param {NodeBuilder} builder - 当前节点构建器
   * @return {string} 输入类型
   */
  getInputType(/*builder*/) {
    return "cubeTexture";
  }

  /**
   * 根据立方体纹理的映射类型返回默认UV坐标
   *
   * @return {Node<vec3>} 默认UV属性
   */
  getDefaultUV() {
    // 获取纹理对象
    const texture = this.value;

    // 根据映射类型返回相应的向量
    if (texture.mapping === CubeReflectionMapping) {
      return reflectVector; // 反射映射
    } else if (texture.mapping === CubeRefractionMapping) {
      return refractVector; // 折射映射
    } else {
      // 不支持的映射类型，输出错误信息
      console.error('THREE.CubeTextureNode: Mapping "%s" not supported.', texture.mapping);

      return vec3(0, 0, 0); // 返回零向量
    }
  }

  /**
   * 重写为空实现，因为立方体纹理忽略 `updateMatrix` 标志
   * UV变换矩阵不应用于立方体纹理
   *
   * @param {boolean} value - 更新切换标志
   */
  setUpdateMatrix(/*updateMatrix*/) {} // 对CubeTextureNode忽略.updateMatrix

  /**
   * 设置UV节点。根据后端以及纹理类型，可能需要修改UV节点以进行正确采样
   *
   * @param {NodeBuilder} builder - 当前节点构建器
   * @param {Node} uvNode - 要设置的UV节点
   * @return {Node} 更新后的UV节点
   */
  setupUV(builder, uvNode) {
    // 获取纹理对象
    const texture = this.value;

    // 根据坐标系统和纹理类型调整UV坐标
    if (builder.renderer.coordinateSystem === WebGPUCoordinateSystem || !texture.isRenderTargetTexture) {
      // 对X轴进行取反处理
      uvNode = vec3(uvNode.x.negate(), uvNode.yz);
    }

    // 应用材质环境旋转
    return materialEnvRotation.mul(uvNode);
  }

  /**
   * 生成UV代码片段
   *
   * @param {NodeBuilder} builder - 当前节点构建器
   * @param {Node} cubeUV - 要生成代码的UV节点
   * @return {string} 生成的代码片段
   */
  generateUV(builder, cubeUV) {
    // 构建vec3类型的UV代码
    return cubeUV.build(builder, "vec3");
  }
}

// 导出CubeTextureNode类作为默认导出
export default CubeTextureNode;

/**
 * 用于创建立方体纹理节点的TSL函数
 *
 * @tsl
 * @function
 * @param {CubeTexture} value - 立方体纹理
 * @param {?Node<vec3>} [uvNode=null] - UV节点
 * @param {?Node<int>} [levelNode=null] - 级别节点
 * @param {?Node<float>} [biasNode=null] - 偏移节点
 * @returns {CubeTextureNode}
 */
export const cubeTextureBase = /*@__PURE__*/ nodeProxy(CubeTextureNode).setParameterLength(1, 4).setName("cubeTexture");

/**
 * 用于创建立方体纹理统一节点的TSL函数
 *
 * @tsl
 * @function
 * @param {?CubeTexture|CubeTextureNode} [value=EmptyTexture] - 立方体纹理
 * @param {?Node<vec3>} [uvNode=null] - UV节点
 * @param {?Node<int>} [levelNode=null] - 级别节点
 * @param {?Node<float>} [biasNode=null] - 偏移节点
 * @returns {CubeTextureNode}
 */
export const cubeTexture = (value = EmptyTexture, uvNode = null, levelNode = null, biasNode = null) => {
  let textureNode;

  // 如果传入的值已经是立方体纹理节点
  if (value && value.isCubeTextureNode === true) {
    // 克隆现有节点
    textureNode = nodeObject(value.clone());
    // 确保引用设置为原始节点
    textureNode.referenceNode = value.getSelf();

    // 如果提供了新的参数，则更新相应的节点
    if (uvNode !== null) textureNode.uvNode = nodeObject(uvNode);
    if (levelNode !== null) textureNode.levelNode = nodeObject(levelNode);
    if (biasNode !== null) textureNode.biasNode = nodeObject(biasNode);
  } else {
    // 创建新的立方体纹理节点
    textureNode = cubeTextureBase(value, uvNode, levelNode, biasNode);
  }

  return textureNode;
};

/**
 * 用于创建统一立方体纹理节点的TSL函数
 *
 * @tsl
 * @function
 * @param {?CubeTexture} [value=EmptyTexture] - 立方体纹理
 * @returns {CubeTextureNode}
 */
export const uniformCubeTexture = (value = EmptyTexture) => cubeTextureBase(value);
