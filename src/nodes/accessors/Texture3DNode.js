// 导入纹理节点基类
import TextureNode from "./TextureNode.js";
// 导入TSL基础函数和类型
import { nodeProxy, vec3, Fn, If, int } from "../tsl/TSLBase.js";
// 导入纹理尺寸函数
import { textureSize } from "./TextureSizeNode.js";

/**
 * 法线计算函数 - 计算3D纹理在给定UV坐标处的法线向量
 * 使用有限差分方法计算梯度，在边界处返回固定的法线方向
 */
const normal = Fn(({ texture, uv }) => {
  // 用于边界检测的小值
  const epsilon = 0.0001;

  // 返回的法线向量
  const ret = vec3().toVar();

  // 检查是否在立方体的各个面上，如果是则返回对应的法线
  If(uv.x.lessThan(epsilon), () => {
    // 左面：法线指向+X方向
    ret.assign(vec3(1, 0, 0));
  })
    .ElseIf(uv.y.lessThan(epsilon), () => {
      // 底面：法线指向+Y方向
      ret.assign(vec3(0, 1, 0));
    })
    .ElseIf(uv.z.lessThan(epsilon), () => {
      // 前面：法线指向+Z方向
      ret.assign(vec3(0, 0, 1));
    })
    .ElseIf(uv.x.greaterThan(1 - epsilon), () => {
      // 右面：法线指向-X方向
      ret.assign(vec3(-1, 0, 0));
    })
    .ElseIf(uv.y.greaterThan(1 - epsilon), () => {
      // 顶面：法线指向-Y方向
      ret.assign(vec3(0, -1, 0));
    })
    .ElseIf(uv.z.greaterThan(1 - epsilon), () => {
      // 后面：法线指向-Z方向
      ret.assign(vec3(0, 0, -1));
    })
    .Else(() => {
      // 内部点：使用有限差分计算梯度
      const step = 0.01;

      // 计算X、Y、Z方向的梯度
      const x = texture.sample(uv.add(vec3(-step, 0.0, 0.0))).r.sub(texture.sample(uv.add(vec3(step, 0.0, 0.0))).r);
      const y = texture.sample(uv.add(vec3(0.0, -step, 0.0))).r.sub(texture.sample(uv.add(vec3(0.0, step, 0.0))).r);
      const z = texture.sample(uv.add(vec3(0.0, 0.0, -step))).r.sub(texture.sample(uv.add(vec3(0.0, 0.0, step))).r);

      // 组合梯度向量
      ret.assign(vec3(x, y, z));
    });

  // 归一化并返回法线向量
  return ret.normalize();
});

/**
 * 3D纹理节点 - 表示3D纹理的统一变量节点类型
 *
 * @augments TextureNode
 */
class Texture3DNode extends TextureNode {
  // 返回节点类型标识符
  static get type() {
    return "Texture3DNode";
  }

  /**
   * 构造一个新的3D纹理节点
   *
   * @param {Data3DTexture} value - 3D纹理
   * @param {?Node<vec2|vec3>} [uvNode=null] - UV节点
   * @param {?Node<int>} [levelNode=null] - 级别节点
   */
  constructor(value, uvNode = null, levelNode = null) {
    // 调用父类构造函数
    super(value, uvNode, levelNode);

    /**
     * 此标志可用于类型测试
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isTexture3DNode = true;
  }

  /**
   * 重写默认实现以返回固定值 `'texture3D'`
   *
   * @param {NodeBuilder} builder - 当前节点构建器
   * @return {string} 输入类型
   */
  getInputType(/*builder*/) {
    return "texture3D";
  }

  /**
   * 返回默认UV节点，在3D纹理上下文中是三维UV节点
   *
   * @return {Node<vec3>} 默认UV节点
   */
  getDefaultUV() {
    return vec3(0.5, 0.5, 0.5);
  }

  /**
   * 重写为空实现，因为3D纹理忽略 `updateMatrix` 标志
   * UV变换矩阵不应用于3D纹理
   *
   * @param {boolean} value - 更新切换标志
   */
  setUpdateMatrix(/*value*/) {} // 忽略3D纹理节点的.updateMatrix

  /**
   * 重写默认实现以返回未修改的UV节点
   *
   * @param {NodeBuilder} builder - 当前节点构建器
   * @param {Node} uvNode - 要设置的UV节点
   * @return {Node} 未修改的UV节点
   */
  setupUV(builder, uvNode) {
    // 获取纹理对象
    const texture = this.value;

    // 如果需要翻转Y轴且纹理是渲染目标或帧缓冲纹理
    if (builder.isFlipY() && (texture.isRenderTargetTexture === true || texture.isFramebufferTexture === true)) {
      if (this.sampler) {
        // 如果有采样器，直接翻转Y轴
        uvNode = uvNode.flipY();
      } else {
        // 否则手动计算翻转后的Y坐标
        uvNode = uvNode.setY(int(textureSize(this, this.levelNode).y).sub(uvNode.y).sub(1));
      }
    }

    return uvNode;
  }

  /**
   * 生成UV代码片段
   *
   * @param {NodeBuilder} builder - 当前节点构建器
   * @param {Node} uvNode - 要生成代码的UV节点
   * @return {string} 生成的代码片段
   */
  generateUV(builder, uvNode) {
    // 构建为vec3类型
    return uvNode.build(builder, "vec3");
  }

  /**
   * 计算3D纹理在给定UV坐标处的法线向量
   *
   * @param {Node<vec3>} uvNode - UV节点
   * @return {Node<vec3>} 法线向量
   */
  normal(uvNode) {
    // 调用法线计算函数
    return normal({ texture: this, uv: uvNode });
  }
}

// 导出Texture3DNode类作为默认导出
export default Texture3DNode;

/**
 * TSL函数 - 用于创建3D纹理节点
 *
 * @tsl
 * @function
 * @param {Data3DTexture} value - 3D纹理
 * @param {?Node<vec2|vec3>} [uvNode=null] - UV节点
 * @param {?Node<int>} [levelNode=null] - 级别节点
 * @returns {Texture3DNode}
 */
export const texture3D = /*@__PURE__*/ nodeProxy(Texture3DNode).setParameterLength(1, 3);
