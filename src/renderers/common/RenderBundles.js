// 导入链式映射类，用于高效的多键映射
import ChainMap from "./ChainMap.js";
// 导入渲染包类
import RenderBundle from "./RenderBundle.js";

// 用于链式映射键的临时数组，避免重复创建数组
const _chainKeys = [];

/**
 * 渲染包管理器类
 * 此渲染器模块管理渲染包。
 *
 * @private
 */
class RenderBundles {
  /**
   * 构造一个新的渲染包管理组件
   */
  constructor() {
    /**
     * 用于维护渲染包的链式映射
     * 以包组和相机作为复合键来存储渲染包
     *
     * @type {ChainMap}
     */
    this.bundles = new ChainMap(); // 初始化链式映射
  }

  /**
   * 获取指定包组和相机的渲染包
   * 如果不存在则创建新的渲染包
   *
   * @param {BundleGroup} bundleGroup - 包组对象
   * @param {Camera} camera - 用于渲染包组的相机
   * @return {RenderBundle} 渲染包实例
   */
  get(bundleGroup, camera) {
    // 获取包映射引用
    const bundles = this.bundles;

    // 设置复合键：包组和相机
    _chainKeys[0] = bundleGroup;
    _chainKeys[1] = camera;

    // 尝试获取现有的渲染包
    let bundle = bundles.get(_chainKeys);

    // 如果渲染包不存在，则创建新的
    if (bundle === undefined) {
      // 创建新的渲染包实例
      bundle = new RenderBundle(bundleGroup, camera);
      // 将新渲染包存储到映射中
      bundles.set(_chainKeys, bundle);
    }

    // 清空临时键数组，准备下次使用
    _chainKeys.length = 0;

    // 返回渲染包实例
    return bundle;
  }

  /**
   * 释放所有内部资源
   * 清空所有渲染包缓存
   */
  dispose() {
    // 重新创建链式映射，释放所有缓存的渲染包
    this.bundles = new ChainMap();
  }
}

// 导出RenderBundles类作为默认导出
export default RenderBundles;
