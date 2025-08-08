/**
 * 导入颜色管理模块
 */
import { ColorManagement } from "../../math/ColorManagement.js";

/**
 * Uniform 变量工具函数
 *
 * 提供用于处理着色器 uniform 变量的实用工具函数，包括：
 * - 克隆 uniform 变量
 * - 合并多个 uniform 对象
 * - 处理 uniform 组
 * - 获取颜色空间信息
 */

/**
 * 克隆 uniform 变量对象
 *
 * 深度克隆一个 uniform 对象，正确处理各种 Three.js 对象类型。
 * 对于复杂对象（如颜色、矩阵、向量、纹理等），会调用其 clone() 方法；
 * 对于数组，会创建浅拷贝；对于基本类型，直接复制值。
 *
 * @param {Object} src - 源 uniform 对象
 * @returns {Object} 克隆后的 uniform 对象
 */
export function cloneUniforms(src) {
  const dst = {};

  // 遍历源对象的每个 uniform 变量
  for (const u in src) {
    dst[u] = {};

    // 遍历每个 uniform 变量的属性
    for (const p in src[u]) {
      const property = src[u][p];

      // 检查是否为 Three.js 的复杂对象类型
      if (
        property &&
        (property.isColor ||
          property.isMatrix3 ||
          property.isMatrix4 ||
          property.isVector2 ||
          property.isVector3 ||
          property.isVector4 ||
          property.isTexture ||
          property.isQuaternion)
      ) {
        // 渲染目标纹理不能被克隆
        if (property.isRenderTargetTexture) {
          console.warn("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms().");
          dst[u][p] = null;
        } else {
          // 调用对象的 clone() 方法进行深度克隆
          dst[u][p] = property.clone();
        }
      } else if (Array.isArray(property)) {
        // 对于数组，创建浅拷贝
        dst[u][p] = property.slice();
      } else {
        // 对于基本类型，直接复制值
        dst[u][p] = property;
      }
    }
  }

  return dst;
}

/**
 * 合并多个 uniform 对象
 *
 * 将多个 uniform 对象合并为一个新的对象。后面的对象会覆盖前面对象中的同名属性。
 * 所有输入的 uniform 对象都会被克隆，确保不会修改原始对象。
 *
 * @param {Array<Object>} uniforms - 要合并的 uniform 对象数组
 * @returns {Object} 合并后的 uniform 对象
 */
export function mergeUniforms(uniforms) {
  const merged = {};

  // 遍历所有要合并的 uniform 对象
  for (let u = 0; u < uniforms.length; u++) {
    // 克隆当前 uniform 对象，避免修改原始对象
    const tmp = cloneUniforms(uniforms[u]);

    // 将克隆的属性复制到合并结果中
    for (const p in tmp) {
      merged[p] = tmp[p];
    }
  }

  return merged;
}

/**
 * 克隆 uniform 组数组
 *
 * 克隆一个包含多个 uniform 组的数组，每个组都会被单独克隆。
 * 主要用于处理 WebGL 2.0 的 uniform 缓冲对象 (UBO)。
 *
 * @param {Array} src - 源 uniform 组数组
 * @returns {Array} 克隆后的 uniform 组数组
 */
export function cloneUniformsGroups(src) {
  const dst = [];

  // 遍历并克隆每个 uniform 组
  for (let u = 0; u < src.length; u++) {
    dst.push(src[u].clone());
  }

  return dst;
}

/**
 * 获取无光照材质的颜色空间
 *
 * 根据当前渲染目标和渲染器设置，确定无光照材质应该使用的颜色空间。
 * 这对于正确的颜色管理和色彩一致性非常重要。
 *
 * @param {WebGLRenderer} renderer - WebGL 渲染器实例
 * @returns {string} 应该使用的颜色空间
 */
export function getUnlitUniformColorSpace(renderer) {
  const currentRenderTarget = renderer.getRenderTarget();

  // 如果没有设置渲染目标，使用渲染器的输出颜色空间
  if (currentRenderTarget === null) {
    // 参考：https://github.com/mrdoob/three.js/pull/23937#issuecomment-1111067398
    return renderer.outputColorSpace;
  }

  // 如果是 XR 渲染目标，使用其纹理的颜色空间
  // 参考：https://github.com/mrdoob/three.js/issues/27868
  if (currentRenderTarget.isXRRenderTarget === true) {
    return currentRenderTarget.texture.colorSpace;
  }

  // 其他情况使用工作颜色空间
  return ColorManagement.workingColorSpace;
}

/**
 * 遗留兼容性对象
 *
 * 为了向后兼容，提供旧版本的 API 接口。
 * 新代码应该直接使用具名导出的函数。
 */
const UniformsUtils = { clone: cloneUniforms, merge: mergeUniforms };

/**
 * 导出 uniform 工具函数和兼容性对象
 */
export { UniformsUtils };
