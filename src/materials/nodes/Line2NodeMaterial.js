/**
 * Line2NodeMaterial.js
 *
 * 宽线条节点材质模块
 * 该模块实现了基于节点的宽线条渲染材质，支持像素级精确的线条渲染
 *
 * 主要功能：
 * - 支持宽度大于1像素的线条渲染
 * - 支持虚线模式
 * - 支持世界单位和像素单位两种尺寸模式
 * - 支持抗锯齿渲染
 * - 支持顶点颜色和实例颜色
 *
 * 技术特点：
 * - 使用实例化网格来表示线条
 * - 支持透视投影下的正确线条渲染
 * - 优化的端点处理和连接处理
 *
 * @author Three.js Contributors
 * @since Three.js r150+
 */

// 导入基础节点材质类
import NodeMaterial from "./NodeMaterial.js";

// 导入核心节点功能
import { dashSize, gapSize, varyingProperty } from "../../nodes/core/PropertyNode.js"; // 属性节点：虚线尺寸、间隙尺寸、变量属性
import { attribute } from "../../nodes/core/AttributeNode.js"; // 属性节点：获取几何体属性

// 导入相机相关节点
import { cameraProjectionMatrix } from "../../nodes/accessors/Camera.js"; // 相机投影矩阵

// 导入材质相关节点
import {
  materialColor,
  materialLineScale,
  materialLineDashSize,
  materialLineGapSize,
  materialLineDashOffset,
  materialLineWidth,
  materialOpacity,
} from "../../nodes/accessors/MaterialNode.js"; // 材质属性：颜色、线条缩放、虚线尺寸、间隙尺寸、偏移、宽度、透明度

// 导入模型相关节点
import { modelViewMatrix } from "../../nodes/accessors/ModelNode.js"; // 模型视图矩阵

// 导入位置相关节点
import { positionGeometry } from "../../nodes/accessors/Position.js"; // 几何体位置

// 导入数学函数节点
import { mix, smoothstep } from "../../nodes/math/MathNode.js"; // 数学函数：混合、平滑步进

// 导入TSL基础类型和函数
import { Fn, float, vec2, vec3, vec4, If } from "../../nodes/tsl/TSLBase.js"; // TSL基础：函数、浮点、向量类型、条件语句

// 导入UV和屏幕相关节点
import { uv } from "../../nodes/accessors/UV.js"; // UV坐标
import { viewport } from "../../nodes/display/ScreenNode.js"; // 视口信息
import { viewportSharedTexture } from "../../nodes/display/ViewportSharedTextureNode.js"; // 视口共享纹理

// 导入传统材质类和常量
import { LineDashedMaterial } from "../LineDashedMaterial.js"; // 虚线材质基类
import { NoBlending } from "../../constants.js"; // 无混合模式常量

/**
 * 默认材质属性值
 * 使用LineDashedMaterial作为默认值来源，确保属性一致性
 * @__PURE__ 注释用于告诉打包工具这是纯函数调用，可以安全地进行tree-shaking
 */
const _defaultValues = /*@__PURE__*/ new LineDashedMaterial();

/**
 * 宽线条节点材质类
 * 该节点材质可用于渲染宽度大于1像素的线条，通过将线条表示为实例化网格来实现
 * 支持虚线、世界单位、抗锯齿等高级功能
 *
 * @augments NodeMaterial
 */
class Line2NodeMaterial extends NodeMaterial {
  /**
   * 获取材质类型标识符
   * @returns {string} 材质类型名称
   */
  static get type() {
    return "Line2NodeMaterial";
  }

  /**
   * 构造一个新的宽线条节点材质
   * 初始化所有必要的属性和默认值
   *
   * @param {Object} [parameters={}] - 配置参数对象
   */
  constructor(parameters = {}) {
    // 调用父类构造函数
    super();

    /**
     * 类型标识符，用于类型检测
     * 可以通过此属性判断对象是否为Line2NodeMaterial实例
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isLine2NodeMaterial = true;

    // 设置默认属性值，继承自LineDashedMaterial
    this.setDefaultValues(_defaultValues);

    /**
     * 是否使用顶点颜色
     * 当启用时，线条将使用几何体中的顶点颜色信息
     *
     * @type {boolean}
     * @default false
     */
    this.useColor = parameters.vertexColors;

    /**
     * 虚线偏移量
     * 控制虚线模式下的起始偏移位置
     *
     * @type {number}
     * @default 0
     */
    this.dashOffset = 0;

    /**
     * 线条颜色节点
     * 自定义的颜色节点，如果设置则覆盖默认颜色计算
     *
     * @type {?Node<vec3>}
     * @default null
     */
    this.lineColorNode = null;

    /**
     * 偏移节点
     * 自定义的偏移计算节点，用于虚线模式下的偏移控制
     *
     * @type {?Node<float>}
     * @default null
     */
    this.offsetNode = null;

    /**
     * 虚线缩放节点
     * 自定义的虚线缩放计算节点，控制虚线的整体缩放
     *
     * @type {?Node<float>}
     * @default null
     */
    this.dashScaleNode = null;

    /**
     * 虚线尺寸节点
     * 自定义的虚线尺寸计算节点，控制虚线段的长度
     *
     * @type {?Node<float>}
     * @default null
     */
    this.dashSizeNode = null;

    /**
     * 间隙尺寸节点
     * 自定义的间隙尺寸计算节点，控制虚线间隙的长度
     *
     * @type {?Node<float>}
     * @default null
     */
    this.gapSizeNode = null;

    /**
     * 混合模式设置
     * 设置为NoBlending（无混合），因为目前还不支持透明度
     * 这确保了线条的正确渲染，避免透明度相关的问题
     *
     * @type {number}
     * @default 0
     */
    this.blending = NoBlending;

    // 内部标志：是否使用虚线模式
    this._useDash = parameters.dashed;
    // 内部标志：是否使用Alpha到覆盖率转换（抗锯齿）
    this._useAlphaToCoverage = true;
    // 内部标志：是否使用世界单位（而非像素单位）
    this._useWorldUnits = false;

    // 应用传入的参数，覆盖默认值
    this.setValues(parameters);
  }

  /**
   * 设置材质的顶点和片段着色器阶段
   * 这是材质的核心方法，定义了线条的渲染逻辑
   *
   * @param {NodeBuilder} builder - 当前的节点构建器
   */
  setup(builder) {
    // 从构建器中获取渲染器引用
    const { renderer } = builder;

    // 获取各种渲染模式标志
    const useAlphaToCoverage = this._useAlphaToCoverage; // 是否使用Alpha到覆盖率转换
    const useColor = this.useColor; // 是否使用顶点颜色
    const useDash = this._useDash; // 是否使用虚线模式
    const useWorldUnits = this._useWorldUnits; // 是否使用世界单位

    /**
     * 线段裁剪函数
     * 用于处理透视投影中线段与近平面的交点计算
     * 当线段的一端在相机后面时，需要将其裁剪到近平面上
     */
    const trimSegment = Fn(({ start, end }) => {
      // 从投影矩阵中提取近平面相关参数
      const a = cameraProjectionMatrix.element(2).element(2); // 投影矩阵第3行第3列元素
      const b = cameraProjectionMatrix.element(3).element(2); // 投影矩阵第4行第3列元素

      // 估算近平面距离
      const nearEstimate = b.mul(-0.5).div(a);

      // 计算线段与近平面的交点参数
      const alpha = nearEstimate.sub(start.z).div(end.z.sub(start.z));

      // 返回裁剪后的端点位置
      return vec4(mix(start.xyz, end.xyz, alpha), end.w);
    }).setLayout({
      name: "trimSegment", // 函数名称
      type: "vec4", // 返回类型
      inputs: [
        { name: "start", type: "vec4" }, // 起始点
        { name: "end", type: "vec4" }, // 结束点
      ],
    });

    /**
     * 顶点着色器节点函数
     * 负责计算线条的顶点位置，处理实例化渲染的复杂逻辑
     */
    this.vertexNode = Fn(() => {
      // 获取实例化属性：线段的起始点和结束点
      const instanceStart = attribute("instanceStart"); // 线段起始点（世界坐标）
      const instanceEnd = attribute("instanceEnd"); // 线段结束点（世界坐标）

      // === 相机空间变换 ===
      // 将世界坐标的线段端点转换到相机空间
      const start = vec4(modelViewMatrix.mul(vec4(instanceStart, 1.0))).toVar("start");
      const end = vec4(modelViewMatrix.mul(vec4(instanceEnd, 1.0))).toVar("end");

      // === 虚线模式处理 ===
      if (useDash) {
        // 获取虚线缩放节点，优先使用自定义节点，否则使用材质默认值
        const dashScaleNode = this.dashScaleNode ? float(this.dashScaleNode) : materialLineScale;
        // 获取偏移节点，优先使用自定义节点，否则使用材质默认值
        const offsetNode = this.offsetNode ? float(this.offsetNode) : materialLineDashOffset;

        // 获取实例化距离属性，用于虚线计算
        const instanceDistanceStart = attribute("instanceDistanceStart"); // 起始点距离
        const instanceDistanceEnd = attribute("instanceDistanceEnd"); // 结束点距离

        // 根据顶点位置选择对应的距离值
        // positionGeometry.y < 0.5 表示当前顶点靠近线段起始点
        let lineDistance = positionGeometry.y.lessThan(0.5).select(dashScaleNode.mul(instanceDistanceStart), dashScaleNode.mul(instanceDistanceEnd));
        // 添加偏移量
        lineDistance = lineDistance.add(offsetNode);

        // 将线距离作为varying变量传递给片段着色器
        varyingProperty("float", "lineDistance").assign(lineDistance);
      }

      // === 世界单位模式处理 ===
      if (useWorldUnits) {
        // 将相机空间的起始点和结束点作为varying变量传递
        varyingProperty("vec3", "worldStart").assign(start.xyz);
        varyingProperty("vec3", "worldEnd").assign(end.xyz);
      }

      // === 视口宽高比计算 ===
      const aspect = viewport.z.div(viewport.w); // 视口宽高比

      // === 透视投影特殊情况处理 ===
      // 处理线段端点在相机平面内或相机后面的特殊情况
      // GPU固件在投影到NDC空间时有处理这种情况的方法
      // 但我们需要在着色器中进行NDC空间计算，所以必须直接处理这个问题
      // 也许有更优雅的解决方案 -- WestLangley

      // 检查是否为透视投影（投影矩阵第3行第4列为-1.0）
      const perspective = cameraProjectionMatrix.element(2).element(3).equal(-1.0);

      // 如果是透视投影，处理线段裁剪
      If(perspective, () => {
        // 情况1：起始点在相机后面，结束点在相机前面
        If(start.z.lessThan(0.0).and(end.z.greaterThan(0.0)), () => {
          // 裁剪结束点到近平面
          end.assign(trimSegment({ start: start, end: end }));
        }).ElseIf(end.z.lessThan(0.0).and(start.z.greaterThanEqual(0.0)), () => {
          // 情况2：结束点在相机后面，起始点在相机前面或平面上
          // 裁剪起始点到近平面
          start.assign(trimSegment({ start: end, end: start }));
        });
      });

      // === 裁剪空间变换 ===
      const clipStart = cameraProjectionMatrix.mul(start); // 起始点裁剪空间坐标
      const clipEnd = cameraProjectionMatrix.mul(end); // 结束点裁剪空间坐标

      // === NDC空间变换 ===
      const ndcStart = clipStart.xyz.div(clipStart.w); // 起始点NDC坐标
      const ndcEnd = clipEnd.xyz.div(clipEnd.w); // 结束点NDC坐标

      // === 方向向量计算 ===
      const dir = ndcEnd.xy.sub(ndcStart.xy).toVar(); // 线段在屏幕空间的方向向量

      // 考虑裁剪空间的宽高比
      dir.x.assign(dir.x.mul(aspect)); // 调整X方向以补偿宽高比
      dir.assign(dir.normalize()); // 归一化方向向量

      // 初始化最终的裁剪空间坐标
      const clip = vec4().toVar();

      // === 世界单位模式处理 ===
      if (useWorldUnits) {
        // 获取垂直于视图向量的偏移方向

        // 计算线段在世界空间的方向向量
        const worldDir = end.xyz.sub(start.xyz).normalize();
        // 计算线段中点到相机的方向向量
        const tmpFwd = mix(start.xyz, end.xyz, 0.5).normalize();
        // 计算垂直于线段方向的上向量（用于线条宽度）
        const worldUp = worldDir.cross(tmpFwd).normalize();
        // 计算垂直于线段和上向量的前向量（用于端点扩展）
        const worldFwd = worldDir.cross(worldUp);

        // 创建世界位置varying变量
        const worldPos = varyingProperty("vec4", "worldPos");

        // 根据顶点位置选择起始点或结束点
        worldPos.assign(positionGeometry.y.lessThan(0.5).select(start, end));

        // === 高度偏移（线条宽度） ===
        const hw = materialLineWidth.mul(0.5); // 半宽度
        // 根据顶点的X坐标决定偏移方向（正负）
        worldPos.addAssign(vec4(positionGeometry.x.lessThan(0.0).select(worldUp.mul(hw), worldUp.mul(hw).negate()), 0));

        // 如果不是虚线模式，则不扩展线条，因为不会渲染端点
        if (!useDash) {
          // === 端点扩展 ===
          // 沿线条方向扩展，为端点留出空间
          worldPos.addAssign(vec4(positionGeometry.y.lessThan(0.5).select(worldDir.mul(hw).negate(), worldDir.mul(hw)), 0));

          // 添加宽度到包围盒
          worldPos.addAssign(vec4(worldFwd.mul(hw), 0));

          // === 端点处理 ===
          // 对于端点顶点（y > 1.0 或 y < 0.0），减去前向偏移
          If(positionGeometry.y.greaterThan(1.0).or(positionGeometry.y.lessThan(0.0)), () => {
            worldPos.subAssign(vec4(worldFwd.mul(2.0).mul(hw), 0));
          });
        }

        // === 投影世界位置 ===
        clip.assign(cameraProjectionMatrix.mul(worldPos));

        // === 深度调整 ===
        // 调整投影点的深度，使线段能够整齐地重叠
        const clipPose = vec3().toVar();

        // 根据顶点位置选择对应的NDC坐标
        clipPose.assign(positionGeometry.y.lessThan(0.5).select(ndcStart, ndcEnd));
        // 设置正确的深度值
        clip.z.assign(clipPose.z.mul(clip.w));
      } else {
        // === 像素单位模式处理 ===

        // 计算垂直于线条方向的偏移向量（旋转90度）
        const offset = vec2(dir.y, dir.x.negate()).toVar("offset");

        // === 撤销宽高比调整 ===
        // 恢复方向向量和偏移向量的原始比例
        dir.x.assign(dir.x.div(aspect));
        offset.x.assign(offset.x.div(aspect));

        // === 符号翻转 ===
        // 根据顶点的X坐标决定偏移方向（左侧或右侧）
        offset.assign(positionGeometry.x.lessThan(0.0).select(offset.negate(), offset));

        // === 端点处理 ===
        // 为端点添加额外的偏移，创建圆形端点效果
        If(positionGeometry.y.lessThan(0.0), () => {
          // 起始端点：向后偏移
          offset.assign(offset.sub(dir));
        }).ElseIf(positionGeometry.y.greaterThan(1.0), () => {
          // 结束端点：向前偏移
          offset.assign(offset.add(dir));
        });

        // === 线宽调整 ===
        // 根据材质线宽缩放偏移量
        offset.assign(offset.mul(materialLineWidth));

        // === 裁剪空间到屏幕空间转换调整 ===
        // 也许分辨率应该基于视口...
        offset.assign(offset.div(viewport.w));

        // === 选择端点 ===
        // 根据顶点位置选择起始点或结束点的裁剪空间坐标
        clip.assign(positionGeometry.y.lessThan(0.5).select(clipStart, clipEnd));

        // === 转换回裁剪空间 ===
        // 将屏幕空间偏移转换回裁剪空间
        offset.assign(offset.mul(clip.w));

        // 应用偏移到最终的裁剪空间坐标
        clip.assign(clip.add(vec4(offset, 0, 0)));
      }

      // 返回最终的裁剪空间坐标
      return clip;
    })();

    /**
     * 计算两条线段之间最近点的函数
     * 使用3D几何算法找到两条线段上距离最近的点的参数
     *
     * @param {Object} params - 参数对象
     * @param {vec3} params.p1 - 第一条线段的起点
     * @param {vec3} params.p2 - 第一条线段的终点
     * @param {vec3} params.p3 - 第二条线段的起点
     * @param {vec3} params.p4 - 第二条线段的终点
     * @returns {vec2} 返回两个参数值(mua, mub)，表示最近点在各自线段上的位置
     */
    const closestLineToLine = Fn(({ p1, p2, p3, p4 }) => {
      // 计算各种向量差
      const p13 = p1.sub(p3); // 从第二条线起点到第一条线起点的向量
      const p43 = p4.sub(p3); // 第二条线的方向向量

      const p21 = p2.sub(p1); // 第一条线的方向向量

      // 计算各种点积
      const d1343 = p13.dot(p43); // p13 · p43
      const d4321 = p43.dot(p21); // p43 · p21
      const d1321 = p13.dot(p21); // p13 · p21
      const d4343 = p43.dot(p43); // p43 · p43 (第二条线长度的平方)
      const d2121 = p21.dot(p21); // p21 · p21 (第一条线长度的平方)

      // 计算最近点参数的分母和分子
      const denom = d2121.mul(d4343).sub(d4321.mul(d4321)); // 分母
      const numer = d1343.mul(d4321).sub(d1321.mul(d4343)); // 分子

      // 计算第一条线上最近点的参数（0-1之间）
      const mua = numer.div(denom).clamp();
      // 计算第二条线上最近点的参数（0-1之间）
      const mub = d1343.add(d4321.mul(mua)).div(d4343).clamp();

      return vec2(mua, mub);
    });

    /**
     * 片段着色器节点函数
     * 负责计算线条的最终颜色和透明度
     */
    this.colorNode = Fn(() => {
      // 获取UV坐标
      const vUv = uv();

      // === 虚线模式处理 ===
      if (useDash) {
        // 获取虚线和间隙尺寸节点
        const dashSizeNode = this.dashSizeNode ? float(this.dashSizeNode) : materialLineDashSize;
        const gapSizeNode = this.gapSizeNode ? float(this.gapSizeNode) : materialLineGapSize;

        // 设置全局虚线参数
        dashSize.assign(dashSizeNode);
        gapSize.assign(gapSizeNode);

        // 获取从顶点着色器传递的线距离
        const vLineDistance = varyingProperty("float", "lineDistance");

        // 丢弃端点像素（UV.y超出[-1,1]范围）
        vUv.y.lessThan(-1.0).or(vUv.y.greaterThan(1.0)).discard();
        // 丢弃间隙部分的像素（TODO - 需要修复）
        vLineDistance.mod(dashSize.add(gapSize)).greaterThan(dashSize).discard();
      }

      // 初始化透明度值
      const alpha = float(1).toVar("alpha");

      // === 世界单位模式的抗锯齿处理 ===
      if (useWorldUnits) {
        // 获取从顶点着色器传递的世界空间坐标
        const worldStart = varyingProperty("vec3", "worldStart");
        const worldEnd = varyingProperty("vec3", "worldEnd");

        // 寻找视线射线和线段之间的最近点
        const rayEnd = varyingProperty("vec4", "worldPos").xyz.normalize().mul(1e5); // 视线射线终点（远距离）
        const lineDir = worldEnd.sub(worldStart); // 线段方向向量
        // 计算视线射线（从原点到rayEnd）和线段（从worldStart到worldEnd）的最近点参数
        const params = closestLineToLine({ p1: worldStart, p2: worldEnd, p3: vec3(0.0, 0.0, 0.0), p4: rayEnd });

        // 计算线段上的最近点
        const p1 = worldStart.add(lineDir.mul(params.x));
        // 计算视线射线上的最近点
        const p2 = rayEnd.mul(params.y);
        // 计算两点之间的距离向量
        const delta = p1.sub(p2);
        const len = delta.length(); // 距离长度
        const norm = len.div(materialLineWidth); // 归一化距离（相对于线宽）

        // 非虚线模式下的抗锯齿处理
        if (!useDash) {
          if (useAlphaToCoverage && renderer.samples > 1) {
            // 使用Alpha到覆盖率转换的抗锯齿
            const dnorm = norm.fwidth(); // 计算梯度
            // 使用平滑步进函数创建软边缘
            alpha.assign(smoothstep(dnorm.negate().add(0.5), dnorm.add(0.5), norm).oneMinus());
          } else {
            // 简单的硬边缘裁剪
            norm.greaterThan(0.5).discard();
          }
        }
      } else {
        // === 像素单位模式的圆形端点处理 ===

        if (useAlphaToCoverage && renderer.samples > 1) {
          // 使用Alpha到覆盖率转换的圆形端点
          const a = vUv.x; // UV的X坐标
          const b = vUv.y.greaterThan(0.0).select(vUv.y.sub(1.0), vUv.y.add(1.0)); // 调整后的Y坐标

          // 计算到端点中心的距离平方
          const len2 = a.mul(a).add(b.mul(b));

          const dlen = float(len2.fwidth()).toVar("dlen"); // 计算梯度

          // 只在端点区域（|UV.y| > 1.0）应用圆形裁剪
          If(vUv.y.abs().greaterThan(1.0), () => {
            // 使用平滑步进创建圆形边缘
            alpha.assign(smoothstep(dlen.oneMinus(), dlen.add(1), len2).oneMinus());
          });
        } else {
          // 简单的圆形端点裁剪
          If(vUv.y.abs().greaterThan(1.0), () => {
            const a = vUv.x;
            const b = vUv.y.greaterThan(0.0).select(vUv.y.sub(1.0), vUv.y.add(1.0));
            const len2 = a.mul(a).add(b.mul(b));

            // 硬边缘圆形裁剪
            len2.greaterThan(1.0).discard();
          });
        }
      }

      // === 线条颜色计算 ===
      let lineColorNode;

      // 检查是否有自定义的线条颜色节点
      if (this.lineColorNode) {
        // 使用自定义颜色节点
        lineColorNode = this.lineColorNode;
      } else {
        // 使用默认颜色计算逻辑
        if (useColor) {
          // 启用顶点颜色模式
          // 获取实例化颜色属性
          const instanceColorStart = attribute("instanceColorStart"); // 起始点颜色
          const instanceColorEnd = attribute("instanceColorEnd"); // 结束点颜色

          // 根据顶点位置选择对应的颜色
          const instanceColor = positionGeometry.y.lessThan(0.5).select(instanceColorStart, instanceColorEnd);

          // 将实例颜色与材质颜色相乘
          lineColorNode = instanceColor.mul(materialColor);
        } else {
          // 不使用顶点颜色，直接使用材质颜色
          lineColorNode = materialColor;
        }
      }

      // 返回最终的颜色和透明度
      return vec4(lineColorNode, alpha);
    })();

    // === 透明度处理 ===
    if (this.transparent) {
      // 获取透明度节点，优先使用自定义节点，否则使用材质默认值
      const opacityNode = this.opacityNode ? float(this.opacityNode) : materialOpacity;

      // 设置输出节点，实现透明度混合
      // 使用视口共享纹理进行背景混合
      this.outputNode = vec4(this.colorNode.rgb.mul(opacityNode).add(viewportSharedTexture().rgb.mul(opacityNode.oneMinus())), this.colorNode.a);
    }

    // 调用父类的setup方法完成设置
    super.setup(builder);
  }

  /**
   * 线条是否应该以世界单位计算尺寸
   * 当设置为false时，单位为像素
   * 世界单位模式下线条宽度不受相机距离影响，保持恒定的世界空间尺寸
   * 像素单位模式下线条宽度在屏幕上保持恒定的像素尺寸
   *
   * @type {boolean}
   * @default false
   */
  get worldUnits() {
    return this._useWorldUnits;
  }

  set worldUnits(value) {
    // 只有当值发生变化时才更新
    if (this._useWorldUnits !== value) {
      this._useWorldUnits = value;
      this.needsUpdate = true; // 标记材质需要重新编译
    }
  }

  /**
   * 线条是否应该为虚线模式
   * 启用虚线模式后，线条将根据dashSize和gapSize属性显示为虚线
   * 虚线模式需要几何体包含instanceDistanceStart和instanceDistanceEnd属性
   *
   * @type {boolean}
   * @default false
   */
  get dashed() {
    return this._useDash;
  }

  set dashed(value) {
    // 只有当值发生变化时才更新
    if (this._useDash !== value) {
      this._useDash = value;
      this.needsUpdate = true; // 标记材质需要重新编译
    }
  }

  /**
   * 是否应该使用Alpha到覆盖率转换
   * 启用后在多重采样渲染时提供更好的抗锯齿效果
   * 只在渲染器的samples > 1时生效
   * 提供比传统alpha混合更好的线条边缘质量
   *
   * @type {boolean}
   * @default true
   */
  get alphaToCoverage() {
    return this._useAlphaToCoverage;
  }

  set alphaToCoverage(value) {
    // 只有当值发生变化时才更新
    if (this._useAlphaToCoverage !== value) {
      this._useAlphaToCoverage = value;
      this.needsUpdate = true; // 标记材质需要重新编译
    }
  }
}

// 导出Line2NodeMaterial类作为默认导出
// 该类是Three.js中用于渲染宽线条的高级节点材质
// 支持像素级精确渲染、虚线、抗锯齿等高级功能
export default Line2NodeMaterial;
