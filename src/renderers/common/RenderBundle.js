/**
 * 渲染包类
 * 此模块用于在渲染器内部表示渲染包，以便进一步处理。
 *
 * @private
 */
class RenderBundle {
  /**
   * 构造一个新的渲染包
   *
   * @param {BundleGroup} bundleGroup - 包组对象
   * @param {Camera} camera - 用于渲染包组的相机
   */
  constructor(bundleGroup, camera) {
    /**
     * 包组对象引用
     * 包含要渲染的对象集合
     *
     * @type {BundleGroup}
     */
    this.bundleGroup = bundleGroup; // 存储包组引用

    /**
     * 相机对象引用
     * 用于渲染此包组的相机
     *
     * @type {Camera}
     */
    this.camera = camera; // 存储相机引用
  }
}

// 导出RenderBundle类作为默认导出
export default RenderBundle;
