// 导入节点材质类，用于创建基于节点的材质
import NodeMaterial from "../../materials/nodes/NodeMaterial.js";
// 导入颜色管理模块，用于处理颜色空间转换
import { ColorManagement } from "../../math/ColorManagement.js";
// 导入TSL（Three.js Shading Language）中的vec4和renderOutput函数
import { vec4, renderOutput } from "../../nodes/TSL.js";
// 导入无色调映射常量
import { NoToneMapping } from "../../constants.js";
// 导入四边形网格类，用于全屏渲染
import QuadMesh from "../../renderers/common/QuadMesh.js";

/**
 * 后处理模块
 * 此模块负责管理应用程序中的后处理设置。
 * 通常创建此类的单个实例，并使用它来定义后处理效果链的输出。
 * ```js
 * const postProcessing = new PostProcessing( renderer );
 *
 * const scenePass = pass( scene, camera );
 *
 * postProcessing.outputNode = scenePass;
 * ```
 *
 * 注意：此模块只能与 `WebGPURenderer` 一起使用。
 */
class PostProcessing {
  /**
   * 构造一个新的后处理管理模块
   *
   * @param {Renderer} renderer - 渲染器的引用
   * @param {Node<vec4>} outputNode - 可选的输出节点
   */
  constructor(renderer, outputNode = vec4(0, 0, 1, 1)) {
    /**
     * 渲染器的引用
     *
     * @type {Renderer}
     */
    this.renderer = renderer; // 存储渲染器实例

    /**
     * 定义后处理最终输出的节点
     * 这通常是效果节点链中的最后一个节点
     *
     * @type {Node<vec4>}
     */
    this.outputNode = outputNode; // 设置输出节点

    /**
     * 是否启用默认输出色调映射和颜色空间转换
     *
     * 默认情况下启用，但当效果必须在色调映射和颜色空间转换之后执行时必须禁用。
     * 典型的例子是FXAA，它需要sRGB输入。
     *
     * 当设置为 `false` 时，应用程序必须使用 `RenderOutputNode` 控制输出转换。
     *
     * ```js
     * const outputPass = renderOutput( scenePass );
     * ```
     *
     * @type {boolean}
     */
    this.outputColorTransform = true; // 启用颜色转换

    /**
     * 当输出节点更改时必须设置为 `true`
     *
     * @type {boolean}
     */
    this.needsUpdate = true; // 标记需要更新

    // 创建节点材质实例
    const material = new NodeMaterial();
    // 设置材质名称
    material.name = "PostProcessing";

    /**
     * 用于渲染效果的全屏四边形
     *
     * @private
     * @type {QuadMesh}
     */
    this._quadMesh = new QuadMesh(material); // 创建四边形网格

    /**
     * 后处理堆栈的上下文
     *
     * @private
     * @type {?Object}
     * @default null
     */
    this._context = null; // 初始化上下文为null
  }

  /**
   * 渲染方法
   * 当使用 `PostProcessing` 应用后处理效果时，
   * 应用程序必须在其动画循环中使用此版本的 `render()`（而不是渲染器的版本）。
   */
  render() {
    // 获取渲染器引用
    const renderer = this.renderer;

    // 更新后处理状态
    this._update();

    // 如果存在后处理前回调，则执行
    if (this._context.onBeforePostProcessing !== null) this._context.onBeforePostProcessing();

    // 保存当前的色调映射设置
    const toneMapping = renderer.toneMapping;
    // 保存当前的输出颜色空间设置
    const outputColorSpace = renderer.outputColorSpace;

    // 临时禁用色调映射
    renderer.toneMapping = NoToneMapping;
    // 设置为工作颜色空间
    renderer.outputColorSpace = ColorManagement.workingColorSpace;

    //

    // 保存当前XR状态
    const currentXR = renderer.xr.enabled;
    // 临时禁用XR
    renderer.xr.enabled = false;

    // 渲染全屏四边形
    this._quadMesh.render(renderer);

    // 恢复XR状态
    renderer.xr.enabled = currentXR;

    //

    // 恢复色调映射设置
    renderer.toneMapping = toneMapping;
    // 恢复输出颜色空间设置
    renderer.outputColorSpace = outputColorSpace;

    // 如果存在后处理后回调，则执行
    if (this._context.onAfterPostProcessing !== null) this._context.onAfterPostProcessing();
  }

  /**
   * 获取当前后处理堆栈的上下文
   *
   * @readonly
   * @type {?Object}
   */
  get context() {
    // 返回私有上下文对象
    return this._context;
  }

  /**
   * 释放内部资源
   */
  dispose() {
    // 释放四边形网格的材质资源
    this._quadMesh.material.dispose();
  }

  /**
   * 更新模块状态
   *
   * @private
   */
  _update() {
    // 检查是否需要更新
    if (this.needsUpdate === true) {
      // 获取渲染器引用
      const renderer = this.renderer;

      // 获取当前色调映射设置
      const toneMapping = renderer.toneMapping;
      // 获取当前输出颜色空间设置
      const outputColorSpace = renderer.outputColorSpace;

      // 创建后处理上下文对象
      const context = {
        postProcessing: this, // 后处理实例引用
        onBeforePostProcessing: null, // 后处理前回调
        onAfterPostProcessing: null, // 后处理后回调
      };

      // 获取输出节点
      let outputNode = this.outputNode;

      // 如果启用了输出颜色转换
      if (this.outputColorTransform === true) {
        // 为输出节点设置上下文
        outputNode = outputNode.context(context);

        // 应用渲染输出处理（包括色调映射和颜色空间转换）
        outputNode = renderOutput(outputNode, toneMapping, outputColorSpace);
      } else {
        // 如果禁用了输出颜色转换，将设置添加到上下文中
        context.toneMapping = toneMapping;
        context.outputColorSpace = outputColorSpace;

        // 为输出节点设置上下文
        outputNode = outputNode.context(context);
      }

      // 保存上下文
      this._context = context;

      // 设置四边形网格材质的片段节点
      this._quadMesh.material.fragmentNode = outputNode;
      // 标记材质需要更新
      this._quadMesh.material.needsUpdate = true;

      // 重置更新标志
      this.needsUpdate = false;
    }
  }

  /**
   * 异步渲染方法
   * 当使用 `PostProcessing` 应用后处理效果时，
   * 应用程序必须在其动画循环中使用此版本的 `renderAsync()`（而不是渲染器的版本）。
   *
   * @async
   * @return {Promise} 当渲染完成时解析的Promise
   */
  async renderAsync() {
    // 更新后处理状态
    this._update();

    // 如果存在后处理前回调，则执行
    if (this._context.onBeforePostProcessing !== null) this._context.onBeforePostProcessing();

    // 获取渲染器引用
    const renderer = this.renderer;

    // 保存当前的色调映射设置
    const toneMapping = renderer.toneMapping;
    // 保存当前的输出颜色空间设置
    const outputColorSpace = renderer.outputColorSpace;

    // 临时禁用色调映射
    renderer.toneMapping = NoToneMapping;
    // 设置为工作颜色空间
    renderer.outputColorSpace = ColorManagement.workingColorSpace;

    //

    // 保存当前XR状态
    const currentXR = renderer.xr.enabled;
    // 临时禁用XR
    renderer.xr.enabled = false;

    // 异步渲染全屏四边形
    await this._quadMesh.renderAsync(renderer);

    // 恢复XR状态
    renderer.xr.enabled = currentXR;

    //

    // 恢复色调映射设置
    renderer.toneMapping = toneMapping;
    // 恢复输出颜色空间设置
    renderer.outputColorSpace = outputColorSpace;

    // 如果存在后处理后回调，则执行
    if (this._context.onAfterPostProcessing !== null) this._context.onAfterPostProcessing();
  }
}

// 导出PostProcessing类作为默认导出
export default PostProcessing;
