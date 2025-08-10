// 导入缓冲几何体类，用于创建几何体
import { BufferGeometry } from "../../core/BufferGeometry.js";
// 导入Float32缓冲属性类，用于存储顶点数据
import { Float32BufferAttribute } from "../../core/BufferAttribute.js";
// 导入网格类，用于创建可渲染的3D对象
import { Mesh } from "../../objects/Mesh.js";
// 导入正交相机类，用于全屏渲染
import { OrthographicCamera } from "../../cameras/OrthographicCamera.js";

// 创建全屏正交相机，视锥体范围为(-1, 1, 1, -1, 0, 1)
const _camera = /*@__PURE__*/ new OrthographicCamera(-1, 1, 1, -1, 0, 1);

/**
 * 四边形几何体类
 * 这个特殊几何体的目的是用单个三角形填充整个视口。
 *
 * 参考: {@link https://github.com/mrdoob/three.js/pull/21358}
 *
 * @private
 * @augments BufferGeometry
 */
class QuadGeometry extends BufferGeometry {
  /**
   * 构造一个新的四边形几何体
   *
   * @param {boolean} [flipY=false] - 是否沿垂直轴翻转UV坐标
   */
  constructor(flipY = false) {
    // 调用父类构造函数
    super();

    // 根据flipY参数设置UV坐标，决定是否垂直翻转
    const uv = flipY === false ? [0, -1, 0, 1, 2, 1] : [0, 2, 0, 0, 2, 0];

    // 设置位置属性：三个顶点构成一个覆盖整个屏幕的大三角形
    this.setAttribute("position", new Float32BufferAttribute([-1, 3, 0, -1, -1, 0, 3, -1, 0], 3));
    // 设置UV坐标属性
    this.setAttribute("uv", new Float32BufferAttribute(uv, 2));
  }
}

// 创建共享的四边形几何体实例
const _geometry = /*@__PURE__*/ new QuadGeometry();

/**
 * 四边形网格类
 * 这个模块是一个辅助工具，用于需要渲染全屏效果的通道，
 * 这在后处理上下文中非常常见。
 *
 * 预期用法是通过重新分配 `material` 引用来重用单个四边形网格
 * 来渲染后续的通道。
 *
 * 注意：此模块只能与 `WebGPURenderer` 一起使用。
 *
 * @augments Mesh
 */
class QuadMesh extends Mesh {
  /**
   * 构造一个新的四边形网格
   *
   * @param {?Material} [material=null] - 用于渲染四边形网格的材质
   */
  constructor(material = null) {
    // 调用父类构造函数，使用共享几何体和传入的材质
    super(_geometry, material);

    /**
     * 用于渲染四边形网格的相机
     *
     * @type {OrthographicCamera}
     * @readonly
     */
    this.camera = _camera; // 使用共享的正交相机

    /**
     * 类型标识符，用于类型检测
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isQuadMesh = true; // 设置类型标识
  }

  /**
   * 异步渲染方法
   * `render()` 的异步版本
   *
   * @async
   * @param {Renderer} renderer - 渲染器实例
   * @return {Promise} 当渲染完成时解析的Promise
   */
  async renderAsync(renderer) {
    // 调用渲染器的异步渲染方法
    return renderer.renderAsync(this, _camera);
  }

  /**
   * 渲染四边形网格
   *
   * @param {Renderer} renderer - 渲染器实例
   */
  render(renderer) {
    // 调用渲染器的渲染方法
    renderer.render(this, _camera);
  }
}

// 导出QuadMesh类作为默认导出
export default QuadMesh;
