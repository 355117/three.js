// 导入WebGL坐标系统常量
import { WebGLCoordinateSystem } from "../constants.js";
// 导入4x4矩阵类
import { Matrix4 } from "../math/Matrix4.js";
// 导入3D对象基类
import { Object3D } from "../core/Object3D.js";

/**
 * 相机的抽象基类。构建新相机时应始终继承此类。
 *
 * 相机类定义了3D场景中的观察点，包含了视图变换和投影变换的基本功能。
 * 所有具体的相机类型（如透视相机、正交相机等）都继承自此基类。
 *
 * @abstract
 * @augments Object3D
 */
class Camera extends Object3D {
  /**
   * 构造一个新的相机
   */
  constructor() {
    // 调用父类Object3D的构造函数
    super();

    /**
     * 此标志可用于类型测试，标识这是一个相机实例
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isCamera = true;

    // 设置对象类型为'Camera'
    this.type = "Camera";

    /**
     * 相机世界矩阵的逆矩阵
     * 用于将世界坐标转换为相机坐标（视图变换）
     *
     * @type {Matrix4}
     */
    this.matrixWorldInverse = new Matrix4();

    /**
     * 相机的投影矩阵
     * 用于将3D坐标投影到2D屏幕坐标
     *
     * @type {Matrix4}
     */
    this.projectionMatrix = new Matrix4();

    /**
     * 相机投影矩阵的逆矩阵
     * 用于将屏幕坐标反向投影到3D空间
     *
     * @type {Matrix4}
     */
    this.projectionMatrixInverse = new Matrix4();

    /**
     * 相机使用的坐标系统
     * 可以是WebGL坐标系统或WebGPU坐标系统
     *
     * @type {(WebGLCoordinateSystem|WebGPUCoordinateSystem)}
     */
    this.coordinateSystem = WebGLCoordinateSystem;

    // 私有属性：是否使用反向深度缓冲区
    this._reversedDepth = false;
  }

  /**
   * 指示相机是否使用反向深度缓冲区的标志
   * 反向深度缓冲区可以提高深度精度，特别是在远距离渲染时
   *
   * @type {boolean}
   * @default false
   */
  get reversedDepth() {
    // 返回私有属性_reversedDepth的值
    return this._reversedDepth;
  }

  /**
   * 从源相机复制属性到当前相机
   *
   * @param {Camera} source - 源相机对象
   * @param {boolean} recursive - 是否递归复制子对象
   * @return {Camera} 返回当前相机实例，支持链式调用
   */
  copy(source, recursive) {
    // 调用父类的copy方法
    super.copy(source, recursive);

    // 复制世界矩阵的逆矩阵
    this.matrixWorldInverse.copy(source.matrixWorldInverse);

    // 复制投影矩阵
    this.projectionMatrix.copy(source.projectionMatrix);
    // 复制投影矩阵的逆矩阵
    this.projectionMatrixInverse.copy(source.projectionMatrixInverse);

    // 复制坐标系统
    this.coordinateSystem = source.coordinateSystem;

    // 返回当前实例以支持链式调用
    return this;
  }

  /**
   * 返回表示3D对象在世界空间中的观察方向的向量
   *
   * 此方法被重写，因为相机与其他3D对象相比具有不同的前向向量。
   * 相机默认沿其局部负z轴方向观察。
   *
   * @param {Vector3} target - 存储结果的目标向量
   * @return {Vector3} 3D对象在世界空间中的方向
   */
  getWorldDirection(target) {
    // 调用父类方法获取方向向量，然后取反（因为相机看向负z轴）
    return super.getWorldDirection(target).negate();
  }

  /**
   * 更新相机的世界矩阵
   * 同时更新世界矩阵的逆矩阵，用于视图变换
   *
   * @param {boolean} force - 是否强制更新
   */
  updateMatrixWorld(force) {
    // 调用父类方法更新世界矩阵
    super.updateMatrixWorld(force);

    // 更新世界矩阵的逆矩阵（视图矩阵）
    this.matrixWorldInverse.copy(this.matrixWorld).invert();
  }

  /**
   * 更新世界矩阵，包括父对象和子对象
   * 同时更新世界矩阵的逆矩阵
   *
   * @param {boolean} updateParents - 是否更新父对象
   * @param {boolean} updateChildren - 是否更新子对象
   */
  updateWorldMatrix(updateParents, updateChildren) {
    // 调用父类方法更新世界矩阵
    super.updateWorldMatrix(updateParents, updateChildren);

    // 更新世界矩阵的逆矩阵（视图矩阵）
    this.matrixWorldInverse.copy(this.matrixWorld).invert();
  }

  /**
   * 克隆当前相机实例
   * 创建一个新的相机实例并复制当前相机的所有属性
   *
   * @return {Camera} 克隆的相机实例
   */
  clone() {
    // 创建新实例并复制当前实例的属性
    return new this.constructor().copy(this);
  }
}

// 导出Camera类
export { Camera };
