import TempNode from "../core/TempNode.js"; // 导入TempNode基类
import { uv } from "../accessors/UV.js"; // 导入UV访问器
import { normalView } from "../accessors/Normal.js"; // 导入法线视图访问器
import { positionView } from "../accessors/Position.js"; // 导入位置视图访问器
import { faceDirection } from "./FrontFacingNode.js"; // 导入面方向
import { Fn, nodeProxy, float, vec2 } from "../tsl/TSLBase.js"; // 导入TSL核心函数

// GPU上无参数化表面的凹凸映射，作者：Morten S. Mikkelsen
// https://mmikk.github.io/papers3d/mm_sfgrad_bump.pdf

const dHdxy_fwd = Fn(({ textureNode, bumpScale }) => {
  // 定义前向差分高度导数函数

  // 用于保持相同的TextureNode实例
  const sampleTexture = (callback) => textureNode.cache().context({ getUV: (texNode) => callback(texNode.uvNode || uv()), forceUVContext: true }); // 创建纹理采样函数

  const Hll = float(sampleTexture((uvNode) => uvNode)); // 获取当前位置的高度值

  return vec2(
    // 返回高度在x和y方向的导数
    float(sampleTexture((uvNode) => uvNode.add(uvNode.dFdx()))).sub(Hll), // 计算x方向的高度差
    float(sampleTexture((uvNode) => uvNode.add(uvNode.dFdy()))).sub(Hll) // 计算y方向的高度差
  ).mul(bumpScale); // 乘以凹凸缩放因子
});

// 使用前向差分评估高度相对于屏幕空间的导数（列表2）

const perturbNormalArb = Fn((inputs) => {
  // 定义任意法线扰动函数

  const { surf_pos, surf_norm, dHdxy } = inputs; // 解构输入参数：表面位置、表面法线、高度导数

  // 归一化是为了确保凹凸贴图看起来相同，无论纹理的缩放如何
  const vSigmaX = surf_pos.dFdx().normalize(); // 计算并归一化x方向的表面切线
  const vSigmaY = surf_pos.dFdy().normalize(); // 计算并归一化y方向的表面切线
  const vN = surf_norm; // 表面法线（已归一化）

  const R1 = vSigmaY.cross(vN); // 计算第一个参考向量
  const R2 = vN.cross(vSigmaX); // 计算第二个参考向量

  const fDet = vSigmaX.dot(R1).mul(faceDirection); // 计算行列式，考虑面方向

  const vGrad = fDet.sign().mul(dHdxy.x.mul(R1).add(dHdxy.y.mul(R2))); // 计算梯度向量

  return fDet.abs().mul(surf_norm).sub(vGrad).normalize(); // 返回扰动后的法线
});

/**
 * 此类可用于将凹凸贴图应用于材质。
 *
 * ```js
 * material.normalNode = bumpMap( texture( bumpTex ) );
 * ```
 *
 * @augments TempNode
 */
class BumpMapNode extends TempNode {
  // 定义BumpMapNode类，继承自TempNode
  static get type() {
    // 静态getter方法，返回节点类型
    return "BumpMapNode"; // 返回节点类型字符串
  }

  /**
   * 构造一个新的凹凸贴图节点。
   *
   * @param {Node<float>} textureNode - 表示凹凸贴图数据。
   * @param {?Node<float>} [scaleNode=null] - 控制凹凸效果的强度。
   */
  constructor(textureNode, scaleNode = null) {
    // 构造函数，接受纹理节点和可选的缩放节点
    super("vec3"); // 调用父类构造函数，类型为vec3

    /**
     * 表示凹凸贴图数据。
     *
     * @type {Node<float>}
     */
    this.textureNode = textureNode; // 存储纹理节点

    /**
     * 控制凹凸效果的强度。
     *
     * @type {?Node<float>}
     * @default null
     */
    this.scaleNode = scaleNode; // 存储缩放节点
  }

  setup() {
    // 设置方法
    const bumpScale = this.scaleNode !== null ? this.scaleNode : 1; // 获取凹凸缩放值，默认为1
    const dHdxy = dHdxy_fwd({ textureNode: this.textureNode, bumpScale }); // 计算高度导数

    return perturbNormalArb({
      // 返回扰动后的法线
      surf_pos: positionView, // 表面位置
      surf_norm: normalView, // 表面法线
      dHdxy, // 高度导数
    });
  }
}

export default BumpMapNode; // 导出BumpMapNode类作为默认导出

/**
 * 用于创建凹凸贴图节点的TSL函数。
 *
 * @tsl
 * @function
 * @param {Node<float>} textureNode - 表示凹凸贴图数据。
 * @param {?Node<float>} [scaleNode=null] - 控制凹凸效果的强度。
 * @returns {BumpMapNode}
 */
export const bumpMap = /*@__PURE__*/ nodeProxy(BumpMapNode).setParameterLength(1, 2); // 导出bumpMap函数，用于创建凹凸贴图节点
