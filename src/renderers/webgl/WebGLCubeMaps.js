// 导入纹理映射常量和立方体渲染目标
import { CubeReflectionMapping, CubeRefractionMapping, EquirectangularReflectionMapping, EquirectangularRefractionMapping } from "../../constants.js";
import { WebGLCubeRenderTarget } from "../WebGLCubeRenderTarget.js";

/**
 * WebGL 立方体贴图管理器
 * 负责将等距柱状投影纹理转换为立方体贴图，并管理其生命周期
 *
 * @param {WebGLRenderer} renderer - WebGL 渲染器实例
 * @returns {Object} 包含 get 和 dispose 方法的对象
 */
function WebGLCubeMaps(renderer) {
  // 使用 WeakMap 存储纹理到立方体贴图的映射关系
  // WeakMap 允许垃圾回收器自动清理不再使用的纹理
  let cubemaps = new WeakMap();

  /**
   * 映射纹理的映射类型
   * 将等距柱状投影映射转换为对应的立方体映射类型
   *
   * @param {Texture} texture - 要处理的纹理对象
   * @param {number} mapping - 原始映射类型
   * @returns {Texture} 更新映射类型后的纹理对象
   */
  function mapTextureMapping(texture, mapping) {
    if (mapping === EquirectangularReflectionMapping) {
      // 将等距柱状反射映射转换为立方体反射映射
      texture.mapping = CubeReflectionMapping;
    } else if (mapping === EquirectangularRefractionMapping) {
      // 将等距柱状折射映射转换为立方体折射映射
      texture.mapping = CubeRefractionMapping;
    }

    return texture;
  }

  /**
   * 获取立方体贴图纹理
   * 如果输入的是等距柱状投影纹理，则转换为立方体贴图；否则直接返回原纹理
   *
   * @param {Texture} texture - 输入的纹理对象
   * @returns {Texture|null} 立方体贴图纹理或原纹理，如果图像未准备好则返回 null
   */
  function get(texture) {
    // 检查是否为有效的纹理对象
    if (texture && texture.isTexture) {
      const mapping = texture.mapping;

      // 检查是否为等距柱状投影映射类型
      if (mapping === EquirectangularReflectionMapping || mapping === EquirectangularRefractionMapping) {
        // 检查是否已经缓存了对应的立方体贴图
        if (cubemaps.has(texture)) {
          const cubemap = cubemaps.get(texture).texture;
          return mapTextureMapping(cubemap, texture.mapping);
        } else {
          // 尚未缓存，需要创建新的立方体贴图
          const image = texture.image;

          // 确保图像已加载且有效
          if (image && image.height > 0) {
            // 创建立方体渲染目标，尺寸基于图像高度
            const renderTarget = new WebGLCubeRenderTarget(image.height);
            // 从等距柱状投影纹理生成立方体贴图
            renderTarget.fromEquirectangularTexture(renderer, texture);
            // 缓存生成的立方体贴图
            cubemaps.set(texture, renderTarget);

            // 监听纹理销毁事件，用于清理资源
            texture.addEventListener("dispose", onTextureDispose);

            return mapTextureMapping(renderTarget.texture, texture.mapping);
          } else {
            // 图像尚未准备好，下一帧再尝试转换
            return null;
          }
        }
      }
    }

    // 不是等距柱状投影纹理，直接返回原纹理
    return texture;
  }

  /**
   * 纹理销毁事件处理器
   * 当原始纹理被销毁时，清理对应的立方体贴图资源
   *
   * @param {Event} event - 销毁事件对象
   */
  function onTextureDispose(event) {
    const texture = event.target;

    // 移除事件监听器，避免内存泄漏
    texture.removeEventListener("dispose", onTextureDispose);

    // 获取对应的立方体贴图
    const cubemap = cubemaps.get(texture);

    if (cubemap !== undefined) {
      // 从缓存中删除映射关系
      cubemaps.delete(texture);
      // 销毁立方体渲染目标，释放 GPU 资源
      cubemap.dispose();
    }
  }

  /**
   * 销毁立方体贴图管理器
   * 清理所有缓存的立方体贴图，释放内存
   */
  function dispose() {
    // 重新创建 WeakMap，清除所有缓存的映射关系
    cubemaps = new WeakMap();
  }

  // 返回公共接口
  return {
    get: get, // 获取立方体贴图的方法
    dispose: dispose, // 销毁管理器的方法
  };
}

// 导出立方体贴图管理器
export { WebGLCubeMaps };
