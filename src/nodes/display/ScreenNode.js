// 从核心节点模块导入Node基类
import Node from "../core/Node.js";
// 从核心常量模块导入节点更新类型枚举
import { NodeUpdateType } from "../core/constants.js";
// 从统一变量节点模块导入uniform函数
import { uniform } from "../core/UniformNode.js";
// 从TSL基础模块导入函数、节点不可变和vec2函数
import { Fn, nodeImmutable, vec2 } from "../tsl/TSLBase.js";

// 从数学模块导入二维向量类
import { Vector2 } from "../../math/Vector2.js";
// 从数学模块导入四维向量类
import { Vector4 } from "../../math/Vector4.js";

// 屏幕尺寸向量和视口向量的全局变量
let screenSizeVec, viewportVec;

/**
 * 此节点提供屏幕相关指标的集合。
 * 根据{@link ScreenNode#scope}，节点可以表示分辨率或视口数据，
 * 以及片段或UV坐标。
 *
 * @augments Node
 */
class ScreenNode extends Node {
  // 静态方法：返回节点类型标识符
  static get type() {
    return "ScreenNode"; // 返回节点类型名称
  }

  /**
   * 构造一个新的屏幕节点。
   *
   * @param {('coordinate'|'viewport'|'size'|'uv')} scope - 节点的作用域
   */
  constructor(scope) {
    super(); // 调用父类构造函数

    /**
     * 节点根据选择的作用域表示不同的指标。
     *
     * - `ScreenNode.COORDINATE`: 根据WebGPU标准的当前片段的窗口相对坐标。
     * - `ScreenNode.VIEWPORT`: 定义为四维向量的当前视口。
     * - `ScreenNode.SIZE`: 当前绑定帧缓冲区的尺寸。
     * - `ScreenNode.UV`: 标准化坐标。
     *
     * @type {('coordinate'|'viewport'|'size'|'uv')}
     */
    this.scope = scope; // 存储作用域

    /**
     * 此标志可用于类型测试。
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isViewportNode = true; // 设置视口节点标识
  }

  /**
   * 此方法被重写，因为节点类型取决于选择的作用域。
   *
   * @return {('vec2'|'vec4')} 节点类型
   */
  getNodeType() {
    // 如果是视口作用域返回vec4，否则返回vec2
    if (this.scope === ScreenNode.VIEWPORT) return "vec4";
    else return "vec2";
  }

  /**
   * 此方法被重写，因为节点的更新类型取决于选择的作用域。
   *
   * @return {NodeUpdateType} 更新类型
   */
  getUpdateType() {
    let updateType = NodeUpdateType.NONE; // 默认不更新

    // 如果是尺寸或视口作用域，需要在渲染时更新
    if (this.scope === ScreenNode.SIZE || this.scope === ScreenNode.VIEWPORT) {
      updateType = NodeUpdateType.RENDER; // 设置为渲染时更新
    }

    this.updateType = updateType; // 存储更新类型

    return updateType; // 返回更新类型
  }

  /**
   * `ScreenNode`实现{@link Node#update}以从当前渲染器检索视口和尺寸信息。
   *
   * @param {NodeFrame} frame - 对当前节点帧的引用
   */
  update({ renderer }) {
    const renderTarget = renderer.getRenderTarget(); // 获取当前渲染目标

    // 如果是视口作用域
    if (this.scope === ScreenNode.VIEWPORT) {
      // 如果有渲染目标，使用渲染目标的视口
      if (renderTarget !== null) {
        viewportVec.copy(renderTarget.viewport); // 复制渲染目标的视口
      } else {
        renderer.getViewport(viewportVec); // 获取渲染器的视口

        viewportVec.multiplyScalar(renderer.getPixelRatio()); // 乘以像素比率
      }
    } else {
      // 如果是尺寸作用域
      if (renderTarget !== null) {
        // 如果有渲染目标，使用渲染目标的尺寸
        screenSizeVec.width = renderTarget.width; // 设置宽度
        screenSizeVec.height = renderTarget.height; // 设置高度
      } else {
        renderer.getDrawingBufferSize(screenSizeVec); // 获取绘制缓冲区尺寸
      }
    }
  }

  // 设置节点的着色器逻辑
  setup(/*builder*/) {
    const scope = this.scope; // 获取作用域

    let output = null; // 输出节点变量

    // 根据作用域创建相应的输出节点
    if (scope === ScreenNode.SIZE) {
      // 尺寸作用域：创建或使用屏幕尺寸向量的统一变量
      output = uniform(screenSizeVec || (screenSizeVec = new Vector2()));
    } else if (scope === ScreenNode.VIEWPORT) {
      // 视口作用域：创建或使用视口向量的统一变量
      output = uniform(viewportVec || (viewportVec = new Vector4()));
    } else {
      // UV作用域：计算标准化坐标（屏幕坐标除以屏幕尺寸）
      output = vec2(screenCoordinate.div(screenSize));
    }

    return output; // 返回输出节点
  }

  // 生成着色器代码
  generate(builder) {
    // 如果是坐标作用域，需要特殊处理
    if (this.scope === ScreenNode.COORDINATE) {
      let coord = builder.getFragCoord(); // 获取片段坐标

      // 如果需要翻转Y轴
      if (builder.isFlipY()) {
        // 遵循WebGPU标准

        // 获取屏幕尺寸节点的构建结果
        const size = builder.getNodeProperties(screenSize).outputNode.build(builder);

        // 翻转Y坐标：新Y = 屏幕高度 - 原Y
        coord = `${builder.getType("vec2")}( ${coord}.x, ${size}.y - ${coord}.y )`;
      }

      return coord; // 返回处理后的坐标
    }

    return super.generate(builder); // 调用父类的generate方法
  }
} // ScreenNode类结束

// 屏幕节点作用域常量定义
ScreenNode.COORDINATE = "coordinate"; // 坐标作用域常量
ScreenNode.VIEWPORT = "viewport"; // 视口作用域常量
ScreenNode.SIZE = "size"; // 尺寸作用域常量
ScreenNode.UV = "uv"; // UV作用域常量

// 导出ScreenNode类作为默认导出
export default ScreenNode;

// 屏幕相关导出

/**
 * TSL对象，表示标准化屏幕坐标，范围在`[0, 1]`内的无单位值。
 *
 * @tsl
 * @type {ScreenNode<vec2>}
 */
export const screenUV = /*@__PURE__*/ nodeImmutable(ScreenNode, ScreenNode.UV);

/**
 * TSL对象，表示以物理像素单位的屏幕分辨率。
 *
 * @tsl
 * @type {ScreenNode<vec2>}
 */
export const screenSize = /*@__PURE__*/ nodeImmutable(ScreenNode, ScreenNode.SIZE);

/**
 * TSL对象，表示以物理像素单位的屏幕上当前`x`/`y`像素位置。
 *
 * @tsl
 * @type {ScreenNode<vec2>}
 */
export const screenCoordinate = /*@__PURE__*/ nodeImmutable(ScreenNode, ScreenNode.COORDINATE);

// 视口相关导出

/**
 * TSL对象，表示以物理像素单位的视口矩形，包含`x`、`y`、`width`和`height`。
 *
 * @tsl
 * @type {ScreenNode<vec4>}
 */
export const viewport = /*@__PURE__*/ nodeImmutable(ScreenNode, ScreenNode.VIEWPORT);

/**
 * TSL对象，表示以物理像素单位的视口分辨率。
 *
 * @tsl
 * @type {ScreenNode<vec2>}
 */
export const viewportSize = viewport.zw; // 视口的宽度和高度（z和w分量）

/**
 * TSL对象，表示以物理像素单位的视口上当前`x`/`y`像素位置。
 *
 * @tsl
 * @type {ScreenNode<vec2>}
 */
export const viewportCoordinate = /*@__PURE__*/ screenCoordinate.sub(viewport.xy); // 屏幕坐标减去视口偏移

/**
 * TSL对象，表示标准化视口坐标，范围在`[0, 1]`内的无单位值。
 *
 * @tsl
 * @type {ScreenNode<vec2>}
 */
export const viewportUV = /*@__PURE__*/ viewportCoordinate.div(viewportSize); // 视口坐标除以视口尺寸

// 已弃用的导出

/**
 * @deprecated 自r169版本起已弃用。请使用{@link screenSize}代替。
 */
export const viewportResolution = /*@__PURE__*/ Fn(() => {
  // @deprecated, r169 已弃用，r169版本

  // 输出弃用警告信息
  console.warn('THREE.TSL: "viewportResolution" is deprecated. Use "screenSize" instead.');

  return screenSize; // 返回屏幕尺寸
}, "vec2").once()(); // 创建一次性执行的vec2类型函数
