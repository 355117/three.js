// 导入光源阴影基类
import { LightShadow } from "./LightShadow.js";
// 导入透视相机类
import { PerspectiveCamera } from "../cameras/PerspectiveCamera.js";
// 导入矩阵类
import { Matrix4 } from "../math/Matrix4.js";
// 导入二维向量类
import { Vector2 } from "../math/Vector2.js";
// 导入三维向量类
import { Vector3 } from "../math/Vector3.js";
// 导入四维向量类
import { Vector4 } from "../math/Vector4.js";

// 投影屏幕矩阵（纯函数，用于内部计算）
const _projScreenMatrix = /*@__PURE__*/ new Matrix4();
// 光源在世界坐标系中的位置（纯函数，用于内部计算）
const _lightPositionWorld = /*@__PURE__*/ new Vector3();
// 相机观察目标位置（纯函数，用于内部计算）
const _lookTarget = /*@__PURE__*/ new Vector3();

/**
 * 表示点光源的阴影配置
 * 点光源阴影使用立方体贴图来生成全方向阴影
 *
 * @augments LightShadow
 */
class PointLightShadow extends LightShadow {
  /**
   * 构造一个新的点光源阴影对象
   * 使用透视相机来模拟点光源的全方向投射特性
   */
  constructor() {
    // 调用父类构造函数，传入透视相机参数
    // 参数：视野角度(90°), 宽高比(1), 近裁剪面(0.5), 远裁剪面(500)
    super(new PerspectiveCamera(90, 1, 0.5, 500));

    /**
     * 用于类型检测的标志位
     * 可以通过此属性判断对象是否为点光源阴影
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isPointLightShadow = true;

    // 设置帧扩展为4x2（立方体贴图布局）
    this._frameExtents = new Vector2(4, 2);

    // 设置视口数量为6（立方体的6个面）
    this._viewportCount = 6;

    // 定义6个视口，将立方体贴图映射到2D纹理上
    // 布局方向如下：
    //
    //  xzXZ
    //   y Y
    //
    // X - 正X方向
    // x - 负X方向
    // Y - 正Y方向
    // y - 负Y方向
    // Z - 正Z方向
    // z - 负Z方向
    this._viewports = [
      // 正X方向
      new Vector4(2, 1, 1, 1),
      // 负X方向
      new Vector4(0, 1, 1, 1),
      // 正Z方向
      new Vector4(3, 1, 1, 1),
      // 负Z方向
      new Vector4(1, 1, 1, 1),
      // 正Y方向
      new Vector4(3, 0, 1, 1),
      // 负Y方向
      new Vector4(1, 0, 1, 1),
    ];

    // 定义立方体6个面的方向向量
    this._cubeDirections = [new Vector3(1, 0, 0), new Vector3(-1, 0, 0), new Vector3(0, 0, 1), new Vector3(0, 0, -1), new Vector3(0, 1, 0), new Vector3(0, -1, 0)];

    // 定义立方体6个面的向上向量
    this._cubeUps = [new Vector3(0, 1, 0), new Vector3(0, 1, 0), new Vector3(0, 1, 0), new Vector3(0, 1, 0), new Vector3(0, 0, 1), new Vector3(0, 0, -1)];
  }

  /**
   * 更新相机和阴影的矩阵，由渲染器内部调用
   *
   * @param {Light} light - 要渲染阴影的光源
   * @param {number} [viewportIndex=0] - 视口索引（立方体面索引）
   */
  updateMatrices(light, viewportIndex = 0) {
    // 获取阴影相机引用
    const camera = this.camera;
    // 获取阴影矩阵引用
    const shadowMatrix = this.matrix;

    // 获取远裁剪面距离：光源距离或相机远裁剪面
    const far = light.distance || camera.far;

    // 如果远裁剪面距离发生变化，则更新相机
    if (far !== camera.far) {
      // 设置相机远裁剪面
      camera.far = far;
      // 更新投影矩阵
      camera.updateProjectionMatrix();
    }

    // 从光源的世界矩阵中提取位置
    _lightPositionWorld.setFromMatrixPosition(light.matrixWorld);
    // 设置相机位置为光源位置
    camera.position.copy(_lightPositionWorld);

    // 计算相机观察目标：相机位置 + 当前立方体面的方向向量
    _lookTarget.copy(camera.position);
    _lookTarget.add(this._cubeDirections[viewportIndex]);
    // 设置相机的向上向量
    camera.up.copy(this._cubeUps[viewportIndex]);
    // 让相机观察目标位置
    camera.lookAt(_lookTarget);
    // 更新相机的世界矩阵
    camera.updateMatrixWorld();

    // 创建平移矩阵，将光源位置作为原点
    shadowMatrix.makeTranslation(-_lightPositionWorld.x, -_lightPositionWorld.y, -_lightPositionWorld.z);

    // 计算投影屏幕矩阵：投影矩阵 × 相机世界逆矩阵
    _projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    // 从投影矩阵设置视锥体
    this._frustum.setFromProjectionMatrix(_projScreenMatrix, camera.coordinateSystem, camera.reversedDepth);
  }
}

// 导出点光源阴影类
export { PointLightShadow };
