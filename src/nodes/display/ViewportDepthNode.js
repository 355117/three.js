// 从核心节点模块导入Node基类
import Node from "../core/Node.js";
// 从TSL基础模块导入浮点数、对数、对数2、节点不可变和节点代理函数
import { float, log, log2, nodeImmutable, nodeProxy } from "../tsl/TSLBase.js";
// 从相机访问器模块导入相机近平面和远平面
import { cameraNear, cameraFar } from "../accessors/Camera.js";
// 从位置访问器模块导入视图空间位置
import { positionView } from "../accessors/Position.js";
// 从视口深度纹理节点模块导入视口深度纹理
import { viewportDepthTexture } from "./ViewportDepthTextureNode.js";

/**
 * 此节点在片段着色器的深度逻辑上下文中提供一系列功能。
 * 根据{@link ViewportDepthNode#scope}，它可以用于定义当前片段的深度值
 * 或用于深度评估目的。
 *
 * @augments Node
 */
class ViewportDepthNode extends Node {
  // 静态方法：返回节点类型标识符
  static get type() {
    return "ViewportDepthNode"; // 返回节点类型名称
  }

  /**
   * 构造一个新的视口深度节点。
   *
   * @param {('depth'|'depthBase'|'linearDepth')} scope - 节点的作用域
   * @param {?Node} [valueNode=null] - 值节点
   */
  constructor(scope, valueNode = null) {
    super("float"); // 调用父类构造函数，指定输出类型为float

    /**
     * 节点根据选择的作用域表现不同。
     *
     * - `ViewportDepthNode.DEPTH_BASE`: 允许为当前片段的深度定义一个值。
     * - `ViewportDepthNode.DEPTH`: 表示当前片段的深度值（忽略`valueNode`）。
     * - `ViewportDepthNode.LINEAR_DEPTH`: 表示当前片段的线性（正交）深度值。
     * 如果设置了`valueNode`，该作用域可用于将透视深度数据转换为线性数据。
     *
     * @type {('depth'|'depthBase'|'linearDepth')}
     */
    this.scope = scope; // 存储作用域

    /**
     * 可用于定义自定义深度值。
     * 在`ViewportDepthNode.DEPTH`作用域中忽略此属性。
     *
     * @type {?Node}
     * @default null
     */
    this.valueNode = valueNode; // 存储值节点

    /**
     * 此标志可用于类型测试。
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isViewportDepthNode = true; // 设置视口深度节点标识
  }

  // 生成着色器代码
  generate(builder) {
    const { scope } = this; // 获取作用域

    // 如果是深度基础作用域，返回片段深度
    if (scope === ViewportDepthNode.DEPTH_BASE) {
      return builder.getFragDepth(); // 获取片段深度
    }

    return super.generate(builder); // 调用父类的generate方法
  }

  // 设置节点的着色器逻辑
  setup({ camera }) {
    const { scope } = this; // 获取作用域
    const value = this.valueNode; // 获取值节点

    let node = null; // 输出节点变量

    // 根据作用域处理不同的深度逻辑
    if (scope === ViewportDepthNode.DEPTH_BASE) {
      // 深度基础作用域：设置自定义深度值
      if (value !== null) {
        node = depthBase().assign(value); // 分配深度值
      }
    } else if (scope === ViewportDepthNode.DEPTH) {
      // 深度作用域：计算当前片段的深度值
      if (camera.isPerspectiveCamera) {
        // 透视相机：将视图Z转换为透视深度
        node = viewZToPerspectiveDepth(positionView.z, cameraNear, cameraFar);
      } else {
        // 正交相机：将视图Z转换为正交深度
        node = viewZToOrthographicDepth(positionView.z, cameraNear, cameraFar);
      }
    } else if (scope === ViewportDepthNode.LINEAR_DEPTH) {
      // 线性深度作用域：计算线性深度值
      if (value !== null) {
        // 如果有值节点，进行深度转换
        if (camera.isPerspectiveCamera) {
          // 透视相机：先将透视深度转换为视图Z，再转换为正交深度
          const viewZ = perspectiveDepthToViewZ(value, cameraNear, cameraFar);

          node = viewZToOrthographicDepth(viewZ, cameraNear, cameraFar);
        } else {
          // 正交相机：直接使用值节点
          node = value;
        }
      } else {
        // 没有值节点：直接将视图Z转换为正交深度
        node = viewZToOrthographicDepth(positionView.z, cameraNear, cameraFar);
      }
    }

    return node; // 返回处理后的节点
  }
} // ViewportDepthNode类结束

// 视口深度节点作用域常量定义
ViewportDepthNode.DEPTH_BASE = "depthBase"; // 深度基础作用域常量
ViewportDepthNode.DEPTH = "depth"; // 深度作用域常量
ViewportDepthNode.LINEAR_DEPTH = "linearDepth"; // 线性深度作用域常量

// 导出ViewportDepthNode类作为默认导出
export default ViewportDepthNode;

// 注意：viewZ是相机空间中的z坐标，对于相机前方的点是负值

/**
 * TSL函数，用于将viewZ值转换为正交深度值。
 *
 * @tsl
 * @function
 * @param {Node<float>} viewZ - viewZ节点
 * @param {Node<float>} near - 相机的近平面值
 * @param {Node<float>} far - 相机的远平面值
 * @returns {Node<float>} 正交深度值
 */
export const viewZToOrthographicDepth = (viewZ, near, far) => viewZ.add(near).div(near.sub(far));

/**
 * TSL函数，用于将正交深度值转换为viewZ值。
 *
 * @tsl
 * @function
 * @param {Node<float>} depth - 正交深度值
 * @param {Node<float>} near - 相机的近平面值
 * @param {Node<float>} far - 相机的远平面值
 * @returns {Node<float>} viewZ值
 */
export const orthographicDepthToViewZ = (depth, near, far) => near.sub(far).mul(depth).sub(near);

/**
 * TSL函数，用于将viewZ值转换为透视深度值。
 *
 * 注意: {link https://twitter.com/gonnavis/status/1377183786949959682}.
 *
 * @tsl
 * @function
 * @param {Node<float>} viewZ - viewZ节点
 * @param {Node<float>} near - 相机的近平面值
 * @param {Node<float>} far - 相机的远平面值
 * @returns {Node<float>} 透视深度值
 */
export const viewZToPerspectiveDepth = (viewZ, near, far) => near.add(viewZ).mul(far).div(far.sub(near).mul(viewZ));

/**
 * TSL函数，用于将透视深度值转换为viewZ值。
 *
 * @tsl
 * @function
 * @param {Node<float>} depth - 透视深度值
 * @param {Node<float>} near - 相机的近平面值
 * @param {Node<float>} far - 相机的远平面值
 * @returns {Node<float>} viewZ值
 */
export const perspectiveDepthToViewZ = (depth, near, far) => near.mul(far).div(far.sub(near).mul(depth).sub(far));

/**
 * TSL函数，用于将viewZ值转换为对数深度值。
 *
 * @tsl
 * @function
 * @param {Node<float>} viewZ - viewZ节点
 * @param {Node<float>} near - 相机的近平面值
 * @param {Node<float>} far - 相机的远平面值
 * @returns {Node<float>} 对数深度值
 */
export const viewZToLogarithmicDepth = (viewZ, near, far) => {
  // 注意：viewZ必须是负值——详见此注释块末尾的解释。
  // 这里使用的最终对数深度公式改编自Thatcher Ulrich在一篇文章中描述的公式
  // (参见 http://tulrich.com/geekstuff/log_depth_buffer.txt)，
  // 这是对Outerra文章中描述的早期公式的改进
  // (https://outerra.blogspot.com/2009/08/logarithmic-z-buffer.html)。
  // Ulrich的公式如下：
  //     z = K * log( w / cameraNear ) / log( cameraFar / cameraNear )
  //     其中 K = 2^k - 1，k是深度缓冲区的位数。
  // Outerra变体忽略了相机近平面（假设为0），而是
  // 选择了一个"C常数"来调整相机附近物体的分辨率。
  // Outerra声明： "Notice that the 'C' variant doesn’t use a near plane distance, it has it
  // set at 0" (quote from https://outerra.blogspot.com/2012/11/maximizing-depth-buffer-range-and.html).
  // Ulrich的变体在整个近-远范围内具有恒定相对精度的优势。
  // 这里曾经讨论过是否应该使用Outerra的"C常数"或Ulrich的"近平面"变体，
  // 最终选择了Ulrich的"近平面"版本。
  // Outerra最终对其原始"C常数"变体进行了另一项改进，
  // 但它仍然不包含相机近平面（对于此版本，
  // 参见 https://outerra.blogspot.com/2013/07/logarithmic-depth-buffer-optimizations.html）。
  // 这里我们对Ulrich的公式进行了4项更改：
  // 1. 限制相机近平面，这样我们就不会除以0。
  // 2. 使用log2而不是log来避免额外的乘法（着色器使用log2实现log）。
  // 3. 假设K为1（K = 深度缓冲区中的最大值；参见上面Ulrich的公式）。
  // 4. 为了与函数"viewZToOrthographicDepth"和"viewZToPerspectiveDepth"保持一致，
  //    我们在这里修改公式以使用'viewZ'而不是'w'。其他函数期望负的viewZ，
  //    所以我们在这里也这样做，因此有'viewZ.negate()'调用。
  // 有关此深度曲线的可视化表示，请参见 https://www.desmos.com/calculator/uyqk0vex1u
  near = near.max(1e-6).toVar(); // 限制近平面最小值，避免除零错误
  const numerator = log2(viewZ.negate().div(near)); // 计算分子：log2(-viewZ / near)
  const denominator = log2(far.div(near)); // 计算分母：log2(far / near)
  return numerator.div(denominator); // 返回对数深度值
};

/**
 * TSL函数，用于将对数深度值转换为viewZ值。
 *
 * @tsl
 * @function
 * @param {Node<float>} depth - 对数深度值
 * @param {Node<float>} near - 相机的近平面值
 * @param {Node<float>} far - 相机的远平面值
 * @returns {Node<float>} viewZ值
 */
export const logarithmicDepthToViewZ = (depth, near, far) => {
  // 注意：我们在这里对返回值添加'negate()'调用，以与
  // 函数"orthographicDepthToViewZ"和"perspectiveDepthToViewZ"保持一致（它们返回
  // 负的viewZ）。
  const exponent = depth.mul(log(far.div(near))); // 计算指数：depth * log(far / near)
  return float(Math.E).pow(exponent).mul(near).negate(); // 返回负的viewZ值：-(e^指数 * near)
};

/**
 * TSL函数，用于定义当前片段深度的值。
 *
 * @tsl
 * @function
 * @param {Node<float>} value - 要设置的深度值
 * @returns {ViewportDepthNode<float>} 视口深度节点
 */
const depthBase = /*@__PURE__*/ nodeProxy(ViewportDepthNode, ViewportDepthNode.DEPTH_BASE); // 创建深度基础节点代理

/**
 * TSL对象，表示当前片段的深度值。
 *
 * @tsl
 * @type {ViewportDepthNode}
 */
export const depth = /*@__PURE__*/ nodeImmutable(ViewportDepthNode, ViewportDepthNode.DEPTH); // 导出不可变的深度节点

/**
 * TSL函数，用于将透视深度值转换为线性深度。
 *
 * @tsl
 * @function
 * @param {?Node<float>} [value=null] - 透视深度值。如果提供`null`，则使用当前片段的深度。
 * @returns {ViewportDepthNode<float>} 视口深度节点
 */
export const linearDepth = /*@__PURE__*/ nodeProxy(ViewportDepthNode, ViewportDepthNode.LINEAR_DEPTH).setParameterLength(0, 1); // 导出线性深度节点代理，设置参数长度

/**
 * TSL对象，表示当前片段的线性（正交）深度值
 *
 * @tsl
 * @type {ViewportDepthNode}
 */
export const viewportLinearDepth = /*@__PURE__*/ linearDepth(viewportDepthTexture()); // 导出视口线性深度，使用视口深度纹理

depth.assign = (value) => depthBase(value); // 为深度对象分配赋值方法
