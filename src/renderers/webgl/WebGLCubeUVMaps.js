// 导入纹理映射常量和 PMREM 生成器
import { CubeReflectionMapping, CubeRefractionMapping, EquirectangularReflectionMapping, EquirectangularRefractionMapping } from "../../constants.js";
import { PMREMGenerator } from "../../extras/PMREMGenerator.js";

/**
 * WebGL CubeUV 贴图管理器
 *
 * 负责将立方体贴图和等距柱状投影纹理转换为 CubeUV 格式。
 * CubeUV 是一种将立方体贴图展开到单个纹理中的格式，
 * 可以提供更好的性能和内存使用效率，特别是在移动设备上。
 *
 * PMREM (Pre-filtered Mipmapped Radiance Environment Map) 技术
 * 用于预过滤环境贴图，支持基于物理的渲染 (PBR)。
 *
 * @param {WebGLRenderer} renderer - WebGL 渲染器实例
 * @returns {Object} 包含 get 和 dispose 方法的对象
 */
function WebGLCubeUVMaps(renderer) {
  // 使用 WeakMap 存储纹理到 CubeUV 贴图的映射关系
  // WeakMap 允许垃圾回收器自动清理不再使用的纹理
  let cubeUVmaps = new WeakMap();

  // PMREM 生成器实例，延迟初始化以节省内存
  let pmremGenerator = null;

  /**
   * 获取 CubeUV 格式的纹理
   *
   * 将立方体贴图或等距柱状投影纹理转换为 CubeUV 格式。
   * 如果输入的纹理不需要转换，则直接返回原纹理。
   *
   * @param {Texture} texture - 输入的纹理对象
   * @returns {Texture|null} CubeUV 格式的纹理或原纹理，如果图像未准备好则返回 null
   */
  function get(texture) {
    // 检查是否为有效的纹理对象
    if (texture && texture.isTexture) {
      const mapping = texture.mapping;

      // 判断纹理映射类型
      const isEquirectMap = mapping === EquirectangularReflectionMapping || mapping === EquirectangularRefractionMapping;
      const isCubeMap = mapping === CubeReflectionMapping || mapping === CubeRefractionMapping;

      // 等距柱状投影/立方体贴图到 CubeUV 的转换
      if (isEquirectMap || isCubeMap) {
        // 检查是否已经缓存了对应的 CubeUV 贴图
        let renderTarget = cubeUVmaps.get(texture);

        // 获取当前缓存的 PMREM 版本号
        const currentPMREMVersion = renderTarget !== undefined ? renderTarget.texture.pmremVersion : 0;

        // 如果是渲染目标纹理且版本号不匹配，需要重新生成
        if (texture.isRenderTargetTexture && texture.pmremVersion !== currentPMREMVersion) {
          // 延迟初始化 PMREM 生成器
          if (pmremGenerator === null) pmremGenerator = new PMREMGenerator(renderer);

          // 根据纹理类型选择相应的转换方法
          renderTarget = isEquirectMap ? pmremGenerator.fromEquirectangular(texture, renderTarget) : pmremGenerator.fromCubemap(texture, renderTarget);
          // 更新版本号
          renderTarget.texture.pmremVersion = texture.pmremVersion;

          // 缓存生成的 CubeUV 贴图
          cubeUVmaps.set(texture, renderTarget);

          return renderTarget.texture;
        } else {
          // 检查是否已有缓存
          if (renderTarget !== undefined) {
            return renderTarget.texture;
          } else {
            // 尚未缓存，需要创建新的 CubeUV 贴图
            const image = texture.image;

            // 确保图像已加载且有效
            if ((isEquirectMap && image && image.height > 0) || (isCubeMap && image && isCubeTextureComplete(image))) {
              // 延迟初始化 PMREM 生成器
              if (pmremGenerator === null) pmremGenerator = new PMREMGenerator(renderer);

              // 根据纹理类型选择相应的转换方法
              renderTarget = isEquirectMap ? pmremGenerator.fromEquirectangular(texture) : pmremGenerator.fromCubemap(texture);
              // 设置版本号
              renderTarget.texture.pmremVersion = texture.pmremVersion;

              // 缓存生成的 CubeUV 贴图
              cubeUVmaps.set(texture, renderTarget);

              // 监听纹理销毁事件，用于清理资源
              texture.addEventListener("dispose", onTextureDispose);

              return renderTarget.texture;
            } else {
              // 图像尚未准备好，下一帧再尝试转换
              return null;
            }
          }
        }
      }
    }

    // 不需要转换的纹理，直接返回原纹理
    return texture;
  }

  /**
   * 检查立方体纹理是否完整
   *
   * 立方体纹理包含6个面的图像，此函数检查所有6个面是否都已加载。
   * 只有当所有面都可用时，立方体纹理才能被正确处理。
   *
   * @param {Array} image - 立方体纹理的图像数组，包含6个面
   * @returns {boolean} 如果所有6个面都已加载则返回 true，否则返回 false
   */
  function isCubeTextureComplete(image) {
    let count = 0;
    const length = 6; // 立方体的6个面：+X, -X, +Y, -Y, +Z, -Z

    // 遍历检查每个面是否已定义
    for (let i = 0; i < length; i++) {
      if (image[i] !== undefined) count++;
    }

    // 只有当所有6个面都存在时才认为是完整的
    return count === length;
  }

  /**
   * 纹理销毁事件处理器
   *
   * 当原始纹理被销毁时，清理对应的 CubeUV 贴图资源。
   * 这是内存管理的重要部分，防止 GPU 内存泄漏。
   *
   * @param {Event} event - 销毁事件对象
   */
  function onTextureDispose(event) {
    const texture = event.target;

    // 移除事件监听器，避免内存泄漏
    texture.removeEventListener("dispose", onTextureDispose);

    // 获取对应的 CubeUV 贴图
    const cubemapUV = cubeUVmaps.get(texture);

    if (cubemapUV !== undefined) {
      // 从缓存中删除映射关系
      cubeUVmaps.delete(texture);
      // 销毁 CubeUV 渲染目标，释放 GPU 资源
      cubemapUV.dispose();
    }
  }

  /**
   * 销毁 CubeUV 贴图管理器
   *
   * 清理所有缓存的 CubeUV 贴图和 PMREM 生成器，释放内存和 GPU 资源。
   * 通常在渲染器销毁时调用。
   */
  function dispose() {
    // 重新创建 WeakMap，清除所有缓存的映射关系
    cubeUVmaps = new WeakMap();

    // 销毁 PMREM 生成器及其相关资源
    if (pmremGenerator !== null) {
      pmremGenerator.dispose();
      pmremGenerator = null;
    }
  }

  // 返回公共接口
  return {
    get: get, // 获取 CubeUV 贴图的方法
    dispose: dispose, // 销毁管理器的方法
  };
}

// 导出 WebGL CubeUV 贴图管理器
export { WebGLCubeUVMaps };
