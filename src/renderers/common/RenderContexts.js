// 导入链式映射类，用于高效的多键映射
import ChainMap from "./ChainMap.js";
// 导入渲染上下文类
import RenderContext from "./RenderContext.js";
// 导入场景类
import { Scene } from "../../scenes/Scene.js";
// 导入相机类
import { Camera } from "../../cameras/Camera.js";

// 用于链式映射键的临时数组，避免重复创建数组
const _chainKeys = [];
// 默认场景实例，用于清除操作
const _defaultScene = /*@__PURE__*/ new Scene();
// 默认相机实例，用于清除操作
const _defaultCamera = /*@__PURE__*/ new Camera();

/**
 * 渲染上下文管理器类
 * 此模块管理渲染器的渲染上下文。
 *
 * @private
 */
class RenderContexts {
  /**
   * 构造一个新的渲染上下文管理组件
   */
  constructor() {
    /**
     * 管理渲染上下文的字典
     * 为每个附件状态维护链式映射
     *
     * @type {Object<string,ChainMap>}
     */
    this.chainMaps = {}; // 初始化链式映射字典
  }

  /**
   * 获取指定场景、相机和渲染目标的渲染上下文
   * 如果不存在则创建新的渲染上下文
   *
   * @param {Scene} scene - 场景对象
   * @param {Camera} camera - 用于渲染场景的相机
   * @param {?RenderTarget} [renderTarget=null] - 活动的渲染目标
   * @return {RenderContext} 渲染上下文实例
   */
  get(scene, camera, renderTarget = null) {
    // 设置复合键：场景和相机
    _chainKeys[0] = scene;
    _chainKeys[1] = camera;

    // 声明附件状态变量
    let attachmentState;

    // 根据渲染目标确定附件状态
    if (renderTarget === null) {
      // 默认状态（渲染到屏幕）
      attachmentState = "default";
    } else {
      // 获取渲染目标的纹理格式
      const format = renderTarget.texture.format;
      // 获取纹理数量
      const count = renderTarget.textures.length;

      // 构建附件状态字符串：纹理数量:格式:采样数:深度缓冲:模板缓冲
      attachmentState = `${count}:${format}:${renderTarget.samples}:${renderTarget.depthBuffer}:${renderTarget.stencilBuffer}`;
    }

    // 获取对应附件状态的链式映射
    const chainMap = this._getChainMap(attachmentState);

    // 尝试获取现有的渲染状态
    let renderState = chainMap.get(_chainKeys);

    // 如果渲染状态不存在，则创建新的
    if (renderState === undefined) {
      // 创建新的渲染上下文实例
      renderState = new RenderContext();

      // 将新渲染状态存储到映射中
      chainMap.set(_chainKeys, renderState);
    }

    // 清空临时键数组，准备下次使用
    _chainKeys.length = 0;

    // 如果有渲染目标，设置采样数量（0表示1个采样）
    if (renderTarget !== null) renderState.sampleCount = renderTarget.samples === 0 ? 1 : renderTarget.samples;

    // 返回渲染状态实例
    return renderState;
  }

  /**
   * 获取用于清除操作的渲染上下文
   * 使用默认场景和相机
   *
   * @param {?RenderTarget} [renderTarget=null] - 活动的渲染目标
   * @return {RenderContext} 渲染上下文实例
   */
  getForClear(renderTarget = null) {
    // 使用默认场景和相机获取渲染上下文
    return this.get(_defaultScene, _defaultCamera, renderTarget);
  }

  /**
   * 获取指定附件状态的链式映射
   * 如果不存在则创建新的链式映射
   *
   * @private
   * @param {string} attachmentState - 附件状态字符串
   * @return {ChainMap} 链式映射实例
   */
  _getChainMap(attachmentState) {
    // 返回现有映射或创建新映射（使用逻辑或运算符的短路特性）
    return this.chainMaps[attachmentState] || (this.chainMaps[attachmentState] = new ChainMap());
  }

  /**
   * 释放所有内部资源
   * 清空所有渲染上下文缓存
   */
  dispose() {
    // 重置链式映射字典，释放所有缓存的渲染上下文
    this.chainMaps = {};
  }
}

// 导出RenderContexts类作为默认导出
export default RenderContexts;
