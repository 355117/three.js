/**
 * 导入三维矩阵类，用于法线变换
 */
import { Matrix3 } from "../../math/Matrix3.js";
/**
 * 导入平面类，用于裁剪平面计算
 */
import { Plane } from "../../math/Plane.js";

/**
 * WebGL 裁剪管理器
 * 负责管理 WebGL 渲染器中的裁剪平面功能
 * 裁剪平面用于在渲染时裁剪掉不需要显示的几何体部分
 *
 * @param {WebGLProperties} properties - WebGL 属性管理器
 */
function WebGLClipping(properties) {
  const scope = this;

  /**
   * 全局裁剪状态数组，存储全局裁剪平面的数据
   */
  let globalState = null,
    /**
     * 全局裁剪平面的数量
     */
    numGlobalPlanes = 0,
    /**
     * 是否启用局部裁剪
     */
    localClippingEnabled = false,
    /**
     * 是否正在渲染阴影
     */
    renderingShadows = false;

  /**
   * 临时平面对象，用于裁剪平面的变换计算
   */
  const plane = new Plane(),
    /**
     * 视图法线矩阵，用于将裁剪平面变换到视图空间
     */
    viewNormalMatrix = new Matrix3(),
    /**
     * 裁剪平面的 uniform 数据
     * value: 裁剪平面数据数组
     * needsUpdate: 是否需要更新到 GPU
     */
    uniform = { value: null, needsUpdate: false };

  /**
   * 公开的 uniform 对象，供着色器使用
   */
  this.uniform = uniform;
  /**
   * 当前激活的裁剪平面数量
   */
  this.numPlanes = 0;
  /**
   * 裁剪平面交集的数量
   */
  this.numIntersection = 0;

  /**
   * 初始化裁剪系统
   * 确定是否需要启用裁剪功能
   *
   * @param {Array} planes - 全局裁剪平面数组
   * @param {boolean} enableLocalClipping - 是否启用局部裁剪
   * @returns {boolean} 返回是否启用了裁剪功能
   */
  this.init = function (planes, enableLocalClipping) {
    // 判断是否需要启用裁剪功能
    const enabled =
      planes.length !== 0 || // 有全局裁剪平面
      enableLocalClipping || // 启用局部裁剪
      // 前一帧的启用状态 - 裁剪代码需要再运行一帧来重置状态
      // enable state of previous frame - the clipping code has to
      // run another frame in order to reset the state:
      numGlobalPlanes !== 0 || // 前一帧有全局裁剪平面
      localClippingEnabled; // 前一帧启用了局部裁剪

    // 更新局部裁剪启用状态
    localClippingEnabled = enableLocalClipping;

    // 更新全局裁剪平面数量
    numGlobalPlanes = planes.length;

    return enabled;
  };

  /**
   * 开始阴影渲染
   * 在阴影渲染阶段，通常不使用裁剪平面
   */
  this.beginShadows = function () {
    renderingShadows = true;
    projectPlanes(null); // 清空裁剪平面
  };

  /**
   * 结束阴影渲染
   * 恢复正常的裁剪状态
   */
  this.endShadows = function () {
    renderingShadows = false;
  };

  /**
   * 设置全局裁剪状态
   * 将全局裁剪平面变换到视图空间并存储
   *
   * @param {Array} planes - 全局裁剪平面数组
   * @param {Camera} camera - 当前相机
   */
  this.setGlobalState = function (planes, camera) {
    globalState = projectPlanes(planes, camera, 0);
  };

  /**
   * 设置材质的裁剪状态
   * 根据材质的裁剪平面设置和当前渲染状态，配置裁剪参数
   *
   * @param {Material} material - 当前材质
   * @param {Camera} camera - 当前相机
   * @param {boolean} useCache - 是否使用缓存
   */
  this.setState = function (material, camera, useCache) {
    // 获取材质的裁剪相关属性
    const planes = material.clippingPlanes, // 裁剪平面数组
      clipIntersection = material.clipIntersection, // 是否使用裁剪交集
      clipShadows = material.clipShadows; // 是否在阴影中裁剪

    // 获取材质的属性缓存
    const materialProperties = properties.get(material);

    // 判断是否不需要局部裁剪
    if (!localClippingEnabled || planes === null || planes.length === 0 || (renderingShadows && !clipShadows)) {
      // 没有局部裁剪
      // there's no local clipping

      if (renderingShadows) {
        // 阴影渲染时没有全局裁剪
        // there's no global clipping

        projectPlanes(null);
      } else {
        // 重置为全局裁剪状态
        resetGlobalState();
      }
    } else {
      // 需要处理局部裁剪
      // 计算全局裁剪平面数量（阴影渲染时为0）
      const nGlobal = renderingShadows ? 0 : numGlobalPlanes,
        lGlobal = nGlobal * 4; // 每个平面需要4个浮点数

      // 获取或创建裁剪状态数组
      let dstArray = materialProperties.clippingState || null;

      uniform.value = dstArray; // 确保状态唯一性

      // 投影局部裁剪平面到视图空间
      dstArray = projectPlanes(planes, camera, lGlobal, useCache);

      // 将全局裁剪平面数据复制到数组前部
      for (let i = 0; i !== lGlobal; ++i) {
        dstArray[i] = globalState[i];
      }

      // 缓存裁剪状态
      materialProperties.clippingState = dstArray;
      // 设置交集数量
      this.numIntersection = clipIntersection ? this.numPlanes : 0;
      // 更新总平面数量
      this.numPlanes += nGlobal;
    }
  };

  /**
   * 重置为全局裁剪状态
   * 将裁剪系统恢复到只使用全局裁剪平面的状态
   */
  function resetGlobalState() {
    // 如果当前状态与全局状态不同，更新为全局状态
    if (uniform.value !== globalState) {
      uniform.value = globalState;
      uniform.needsUpdate = numGlobalPlanes > 0; // 有全局平面时需要更新
    }

    // 重置裁剪平面数量为全局平面数量
    scope.numPlanes = numGlobalPlanes;
    // 重置交集数量为0
    scope.numIntersection = 0;
  }

  /**
   * 将裁剪平面投影到视图空间
   * 将世界空间的裁剪平面变换到相机视图空间，并存储到数组中
   *
   * @param {Array|null} planes - 裁剪平面数组，null 表示清空
   * @param {Camera} camera - 当前相机
   * @param {number} dstOffset - 目标数组的偏移量
   * @param {boolean} skipTransform - 是否跳过变换（使用缓存）
   * @returns {Float32Array|null} 返回包含裁剪平面数据的数组
   */
  function projectPlanes(planes, camera, dstOffset, skipTransform) {
    // 获取裁剪平面数量
    const nPlanes = planes !== null ? planes.length : 0;
    let dstArray = null;

    if (nPlanes !== 0) {
      // 获取当前的数据数组
      dstArray = uniform.value;

      // 如果不跳过变换或数组为空，需要重新计算
      if (skipTransform !== true || dstArray === null) {
        // 计算所需的数组大小（每个平面4个浮点数：法线xyz + 距离）
        const flatSize = dstOffset + nPlanes * 4,
          viewMatrix = camera.matrixWorldInverse; // 相机的逆世界矩阵

        // 计算视图法线矩阵，用于变换平面法线
        viewNormalMatrix.getNormalMatrix(viewMatrix);

        // 如果数组不存在或大小不够，创建新数组
        if (dstArray === null || dstArray.length < flatSize) {
          dstArray = new Float32Array(flatSize);
        }

        // 遍历每个裁剪平面，将其变换到视图空间
        for (let i = 0, i4 = dstOffset; i !== nPlanes; ++i, i4 += 4) {
          // 复制平面并应用视图变换
          plane.copy(planes[i]).applyMatrix4(viewMatrix, viewNormalMatrix);

          // 将平面法线存储到数组中
          plane.normal.toArray(dstArray, i4);
          // 将平面距离存储到数组的第4个分量
          dstArray[i4 + 3] = plane.constant;
        }
      }

      // 更新 uniform 数据
      uniform.value = dstArray;
      uniform.needsUpdate = true;
    }

    // 更新裁剪平面数量
    scope.numPlanes = nPlanes;
    scope.numIntersection = 0;

    return dstArray;
  }
}

/**
 * 导出 WebGL 裁剪管理器
 */
export { WebGLClipping };
