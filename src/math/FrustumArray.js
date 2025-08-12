// 导入WebGL坐标系统常量
import { WebGLCoordinateSystem } from "../constants.js";
// 导入视锥体类，用于单个摄像机的视锥体检测
import { Frustum } from "./Frustum.js";
// 导入4x4矩阵类，用于投影和视图矩阵计算
import { Matrix4 } from "./Matrix4.js";

// 临时投影屏幕矩阵，用于计算投影视图矩阵
const _projScreenMatrix = /*@__PURE__*/ new Matrix4();
// 临时视锥体，用于每个摄像机的相交检测
const _frustum = /*@__PURE__*/ new Frustum();

/**
 * FrustumArray用于确定对象在摄像机数组中的至少一个摄像机中是否可见。
 * 这对于多视图渲染器特别有用。
 * FrustumArray is used to determine if an object is visible in at least one camera
 * from an array of cameras. This is particularly useful for multi-view renderers.
 *
 * 多视图渲染器常用于VR、立体渲染、多屏显示等场景，
 * 需要同时处理多个摄像机的视锥体剔除。
 */
class FrustumArray {
  /**
   * 构造一个新的视锥体数组
   * Constructs a new frustum array.
   *
   */
  constructor() {
    /**
     * 要使用的坐标系统
     * The coordinate system to use.
     *
     * @type {WebGLCoordinateSystem|WebGPUCoordinateSystem}
     * @default WebGLCoordinateSystem
     */
    this.coordinateSystem = WebGLCoordinateSystem;
  }

  /**
   * 如果3D对象的包围球与摄像机数组中的任何视锥体相交，则返回true
   * Returns `true` if the 3D object's bounding sphere is intersecting any frustum
   * from the camera array.
   *
   * @param {Object3D} object - 要测试的3D对象 The 3D object to test.
   * @param {Object} cameraArray - 包含摄像机数组的对象，具有cameras属性 An object with a cameras property containing an array of cameras.
   * @return {boolean} 3D对象在任何摄像机中是否可见 Whether the 3D object is visible in any camera.
   */
  intersectsObject(object, cameraArray) {
    // 检查摄像机数组是否有效
    if (!cameraArray.isArrayCamera || cameraArray.cameras.length === 0) {
      return false;
    }

    // 遍历所有摄像机
    for (let i = 0; i < cameraArray.cameras.length; i++) {
      const camera = cameraArray.cameras[i];

      // 计算投影视图矩阵：投影矩阵 × 视图矩阵的逆矩阵
      _projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);

      // 从投影视图矩阵设置视锥体
      _frustum.setFromProjectionMatrix(_projScreenMatrix, camera.coordinateSystem, camera.reversedDepth);

      // 检查对象是否与当前摄像机的视锥体相交
      if (_frustum.intersectsObject(object)) {
        return true; // 对象在至少一个摄像机中可见
      }
    }

    return false; // 在任何摄像机中都不可见
  }

  /**
   * 如果给定精灵与摄像机数组中的任何视锥体相交，则返回true
   * Returns `true` if the given sprite is intersecting any frustum
   * from the camera array.
   *
   * @param {Sprite} sprite - 要测试的精灵 The sprite to test.
   * @param {Object} cameraArray - 包含摄像机数组的对象，具有cameras属性 An object with a cameras property containing an array of cameras.
   * @return {boolean} 精灵在任何摄像机中是否可见 Whether the sprite is visible in any camera.
   */
  intersectsSprite(sprite, cameraArray) {
    // 检查摄像机数组是否有效
    if (!cameraArray || !cameraArray.cameras || cameraArray.cameras.length === 0) {
      return false;
    }

    // 遍历所有摄像机
    for (let i = 0; i < cameraArray.cameras.length; i++) {
      const camera = cameraArray.cameras[i];

      // 计算投影视图矩阵
      _projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);

      // 从投影视图矩阵设置视锥体
      _frustum.setFromProjectionMatrix(_projScreenMatrix, camera.coordinateSystem, camera.reversedDepth);

      // 检查精灵是否与当前摄像机的视锥体相交
      if (_frustum.intersectsSprite(sprite)) {
        return true; // 精灵在至少一个摄像机中可见
      }
    }

    return false; // 在任何摄像机中都不可见
  }

  /**
   * 如果给定包围球与摄像机数组中的任何视锥体相交，则返回true
   * Returns `true` if the given bounding sphere is intersecting any frustum
   * from the camera array.
   *
   * @param {Sphere} sphere - 要测试的包围球 The bounding sphere to test.
   * @param {Object} cameraArray - 包含摄像机数组的对象，具有cameras属性 An object with a cameras property containing an array of cameras.
   * @return {boolean} 包围球在任何摄像机中是否可见 Whether the sphere is visible in any camera.
   */
  intersectsSphere(sphere, cameraArray) {
    // 检查摄像机数组是否有效
    if (!cameraArray || !cameraArray.cameras || cameraArray.cameras.length === 0) {
      return false;
    }

    // 遍历所有摄像机
    for (let i = 0; i < cameraArray.cameras.length; i++) {
      const camera = cameraArray.cameras[i];

      // 计算投影视图矩阵
      _projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);

      // 从投影视图矩阵设置视锥体
      _frustum.setFromProjectionMatrix(_projScreenMatrix, camera.coordinateSystem, camera.reversedDepth);

      // 检查包围球是否与当前摄像机的视锥体相交
      if (_frustum.intersectsSphere(sphere)) {
        return true; // 包围球在至少一个摄像机中可见
      }
    }

    return false; // 在任何摄像机中都不可见
  }

  /**
   * 如果给定包围盒与摄像机数组中的任何视锥体相交，则返回true
   * Returns `true` if the given bounding box is intersecting any frustum
   * from the camera array.
   *
   * @param {Box3} box - 要测试的包围盒 The bounding box to test.
   * @param {Object} cameraArray - 包含摄像机数组的对象，具有cameras属性 An object with a cameras property containing an array of cameras.
   * @return {boolean} 包围盒在任何摄像机中是否可见 Whether the box is visible in any camera.
   */
  intersectsBox(box, cameraArray) {
    // 检查摄像机数组是否有效
    if (!cameraArray || !cameraArray.cameras || cameraArray.cameras.length === 0) {
      return false;
    }

    // 遍历所有摄像机
    for (let i = 0; i < cameraArray.cameras.length; i++) {
      const camera = cameraArray.cameras[i];

      // 计算投影视图矩阵
      _projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);

      // 从投影视图矩阵设置视锥体
      _frustum.setFromProjectionMatrix(_projScreenMatrix, camera.coordinateSystem, camera.reversedDepth);

      // 检查包围盒是否与当前摄像机的视锥体相交
      if (_frustum.intersectsBox(box)) {
        return true; // 包围盒在至少一个摄像机中可见
      }
    }

    return false; // 在任何摄像机中都不可见
  }

  /**
   * 如果给定点位于摄像机数组中的任何视锥体内，则返回true
   * Returns `true` if the given point lies within any frustum
   * from the camera array.
   *
   * @param {Vector3} point - 要测试的点 The point to test.
   * @param {Object} cameraArray - 包含摄像机数组的对象，具有cameras属性 An object with a cameras property containing an array of cameras.
   * @return {boolean} 点在任何摄像机中是否可见 Whether the point is visible in any camera.
   */
  containsPoint(point, cameraArray) {
    // 检查摄像机数组是否有效
    if (!cameraArray || !cameraArray.cameras || cameraArray.cameras.length === 0) {
      return false;
    }

    // 遍历所有摄像机
    for (let i = 0; i < cameraArray.cameras.length; i++) {
      const camera = cameraArray.cameras[i];

      // 计算投影视图矩阵
      _projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);

      // 从投影视图矩阵设置视锥体
      _frustum.setFromProjectionMatrix(_projScreenMatrix, camera.coordinateSystem, camera.reversedDepth);

      // 检查点是否位于当前摄像机的视锥体内
      if (_frustum.containsPoint(point)) {
        return true; // 点在至少一个摄像机中可见
      }
    }

    return false; // 在任何摄像机中都不可见
  }

  /**
   * 返回一个复制了此实例值的新视锥体数组
   * Returns a new frustum array with copied values from this instance.
   *
   * @return {FrustumArray} 此实例的克隆 A clone of this instance.
   */
  clone() {
    // 创建新的FrustumArray实例
    // 注意：FrustumArray是无状态的，所以克隆只需要创建新实例
    return new FrustumArray();
  }
}

// 导出FrustumArray类
export { FrustumArray };
