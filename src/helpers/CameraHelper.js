// 导入相机基类，用于处理相机相关操作
import { Camera } from "../cameras/Camera.js";
// 导入三维向量类，用于处理3D空间中的向量运算
import { Vector3 } from "../math/Vector3.js";
// 导入线段对象类，用于创建由多个线段组成的几何体
import { LineSegments } from "../objects/LineSegments.js";
// 导入颜色类，用于处理颜色相关操作
import { Color } from "../math/Color.js";
// 导入基础线材质类，用于定义线条的外观
import { LineBasicMaterial } from "../materials/LineBasicMaterial.js";
// 导入缓冲几何体类，用于高效存储几何数据
import { BufferGeometry } from "../core/BufferGeometry.js";
// 导入32位浮点数缓冲属性类，用于存储顶点数据
import { Float32BufferAttribute } from "../core/BufferAttribute.js";
// 导入坐标系常量，用于处理不同的坐标系
import { WebGLCoordinateSystem, WebGPUCoordinateSystem } from "../constants.js";

// 创建私有向量对象，用于内部计算（使用@__PURE__标记进行优化）
const _vector = /*@__PURE__*/ new Vector3();
// 创建私有相机对象，用于内部计算
const _camera = /*@__PURE__*/ new Camera();

/**
 * 这有助于可视化相机视锥体中包含的内容。
 * 它使用线段来可视化相机的视锥体。
 *
 * 基于lightgl.js阴影贴图示例中的视锥体可视化。
 *
 * CameraHelper必须是场景的子对象。
 *
 * ```js
 * const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
 * const helper = new THREE.CameraHelper( camera );
 * scene.add( helper );
 * ```
 *
 * @augments LineSegments
 */
class CameraHelper extends LineSegments {
  /**
   * 构造一个新的相机辅助器。
   *
   * @param {Camera} camera - 要可视化的相机。
   */
  constructor(camera) {
    // 创建缓冲几何体对象
    const geometry = new BufferGeometry();
    // 创建线材质，使用顶点颜色，禁用色调映射
    const material = new LineBasicMaterial({ color: 0xffffff, vertexColors: true, toneMapped: false });

    // 存储顶点坐标的数组
    const vertices = [];
    // 存储顶点颜色的数组
    const colors = [];

    // 点映射对象，存储每个点的索引
    const pointMap = {};

    // 近平面的四条边
    addLine("n1", "n2"); // 近平面左上到右上
    addLine("n2", "n4"); // 近平面右上到右下
    addLine("n4", "n3"); // 近平面右下到左下
    addLine("n3", "n1"); // 近平面左下到左上

    // 远平面的四条边
    addLine("f1", "f2"); // 远平面左上到右上
    addLine("f2", "f4"); // 远平面右上到右下
    addLine("f4", "f3"); // 远平面右下到左下
    addLine("f3", "f1"); // 远平面左下到左上

    // 连接近平面和远平面的四条边
    addLine("n1", "f1"); // 左上角连线
    addLine("n2", "f2"); // 右上角连线
    addLine("n3", "f3"); // 左下角连线
    addLine("n4", "f4"); // 右下角连线

    // 从相机位置到近平面四个角的锥形线
    addLine("p", "n1"); // 相机到近平面左上
    addLine("p", "n2"); // 相机到近平面右上
    addLine("p", "n3"); // 相机到近平面左下
    addLine("p", "n4"); // 相机到近平面右下

    // 相机上方向指示器（三角形）
    addLine("u1", "u2"); // 上方向三角形边1
    addLine("u2", "u3"); // 上方向三角形边2
    addLine("u3", "u1"); // 上方向三角形边3

    // 目标线
    addLine("c", "t"); // 中心到目标
    addLine("p", "c"); // 相机位置到中心

    // 近平面十字线
    addLine("cn1", "cn2"); // 近平面水平十字线
    addLine("cn3", "cn4"); // 近平面垂直十字线

    // 远平面十字线
    addLine("cf1", "cf2"); // 远平面水平十字线
    addLine("cf3", "cf4"); // 远平面垂直十字线

    // 添加线段的内部函数
    function addLine(a, b) {
      addPoint(a);
      addPoint(b);
    }

    // 添加点的内部函数
    function addPoint(id) {
      // 添加初始坐标（稍后会更新）
      vertices.push(0, 0, 0);
      // 添加初始颜色（稍后会更新）
      colors.push(0, 0, 0);

      // 如果点映射中没有此ID，创建数组
      if (pointMap[id] === undefined) {
        pointMap[id] = [];
      }

      // 记录此点在顶点数组中的索引
      pointMap[id].push(vertices.length / 3 - 1);
    }

    // 设置几何体的位置属性
    geometry.setAttribute("position", new Float32BufferAttribute(vertices, 3));
    // 设置几何体的颜色属性
    geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));

    // 调用父类构造函数
    super(geometry, material);

    // 设置对象类型标识
    this.type = "CameraHelper";

    /**
     * 被可视化的相机对象。
     *
     * @type {Camera}
     */
    this.camera = camera;
    // 如果相机有更新投影矩阵方法，调用它
    if (this.camera.updateProjectionMatrix) this.camera.updateProjectionMatrix();

    // 使用相机的世界矩阵
    this.matrix = camera.matrixWorld;
    // 禁用自动矩阵更新
    this.matrixAutoUpdate = false;

    /**
     * 包含用于可视化相机的点的映射。
     *
     * @type {Object<string,Array<number>>}
     */
    this.pointMap = pointMap;

    // 初始化更新辅助器
    this.update();

    // 定义各部分的颜色
    const colorFrustum = new Color(0xffaa00); // 视锥体颜色（橙色）
    const colorCone = new Color(0xff0000); // 锥形线颜色（红色）
    const colorUp = new Color(0x00aaff); // 上方向颜色（蓝色）
    const colorTarget = new Color(0xffffff); // 目标线颜色（白色）
    const colorCross = new Color(0x333333); // 十字线颜色（深灰色）

    // 设置各部分的颜色
    this.setColors(colorFrustum, colorCone, colorUp, colorTarget, colorCross);
  }

  /**
   * 定义辅助器的颜色。
   *
   * @param {Color} frustum - 视锥体线条颜色。
   * @param {Color} cone - 锥形线条颜色。
   * @param {Color} up - 上方向线条颜色。
   * @param {Color} target - 目标线条颜色。
   * @param {Color} cross - 十字线条颜色。
   * @return {CameraHelper} 返回此辅助器的引用。
   */
  setColors(frustum, cone, up, target, cross) {
    // 获取几何体引用
    const geometry = this.geometry;

    // 获取颜色属性
    const colorAttribute = geometry.getAttribute("color");

    // 设置近平面的颜色

    colorAttribute.setXYZ(0, frustum.r, frustum.g, frustum.b);
    colorAttribute.setXYZ(1, frustum.r, frustum.g, frustum.b); // n1, n2
    colorAttribute.setXYZ(2, frustum.r, frustum.g, frustum.b);
    colorAttribute.setXYZ(3, frustum.r, frustum.g, frustum.b); // n2, n4
    colorAttribute.setXYZ(4, frustum.r, frustum.g, frustum.b);
    colorAttribute.setXYZ(5, frustum.r, frustum.g, frustum.b); // n4, n3
    colorAttribute.setXYZ(6, frustum.r, frustum.g, frustum.b);
    colorAttribute.setXYZ(7, frustum.r, frustum.g, frustum.b); // n3, n1

    // 设置远平面的颜色

    colorAttribute.setXYZ(8, frustum.r, frustum.g, frustum.b);
    colorAttribute.setXYZ(9, frustum.r, frustum.g, frustum.b); // f1, f2
    colorAttribute.setXYZ(10, frustum.r, frustum.g, frustum.b);
    colorAttribute.setXYZ(11, frustum.r, frustum.g, frustum.b); // f2, f4
    colorAttribute.setXYZ(12, frustum.r, frustum.g, frustum.b);
    colorAttribute.setXYZ(13, frustum.r, frustum.g, frustum.b); // f4, f3
    colorAttribute.setXYZ(14, frustum.r, frustum.g, frustum.b);
    colorAttribute.setXYZ(15, frustum.r, frustum.g, frustum.b); // f3, f1

    // 设置侧边连接线的颜色

    colorAttribute.setXYZ(16, frustum.r, frustum.g, frustum.b);
    colorAttribute.setXYZ(17, frustum.r, frustum.g, frustum.b); // n1, f1
    colorAttribute.setXYZ(18, frustum.r, frustum.g, frustum.b);
    colorAttribute.setXYZ(19, frustum.r, frustum.g, frustum.b); // n2, f2
    colorAttribute.setXYZ(20, frustum.r, frustum.g, frustum.b);
    colorAttribute.setXYZ(21, frustum.r, frustum.g, frustum.b); // n3, f3
    colorAttribute.setXYZ(22, frustum.r, frustum.g, frustum.b);
    colorAttribute.setXYZ(23, frustum.r, frustum.g, frustum.b); // n4, f4

    // 设置锥形线的颜色

    colorAttribute.setXYZ(24, cone.r, cone.g, cone.b);
    colorAttribute.setXYZ(25, cone.r, cone.g, cone.b); // p, n1
    colorAttribute.setXYZ(26, cone.r, cone.g, cone.b);
    colorAttribute.setXYZ(27, cone.r, cone.g, cone.b); // p, n2
    colorAttribute.setXYZ(28, cone.r, cone.g, cone.b);
    colorAttribute.setXYZ(29, cone.r, cone.g, cone.b); // p, n3
    colorAttribute.setXYZ(30, cone.r, cone.g, cone.b);
    colorAttribute.setXYZ(31, cone.r, cone.g, cone.b); // p, n4

    // 设置上方向指示器的颜色

    colorAttribute.setXYZ(32, up.r, up.g, up.b);
    colorAttribute.setXYZ(33, up.r, up.g, up.b); // u1, u2
    colorAttribute.setXYZ(34, up.r, up.g, up.b);
    colorAttribute.setXYZ(35, up.r, up.g, up.b); // u2, u3
    colorAttribute.setXYZ(36, up.r, up.g, up.b);
    colorAttribute.setXYZ(37, up.r, up.g, up.b); // u3, u1

    // 设置目标线的颜色

    colorAttribute.setXYZ(38, target.r, target.g, target.b);
    colorAttribute.setXYZ(39, target.r, target.g, target.b); // c, t
    colorAttribute.setXYZ(40, cross.r, cross.g, cross.b);
    colorAttribute.setXYZ(41, cross.r, cross.g, cross.b); // p, c

    // 设置十字线的颜色

    colorAttribute.setXYZ(42, cross.r, cross.g, cross.b);
    colorAttribute.setXYZ(43, cross.r, cross.g, cross.b); // cn1, cn2
    colorAttribute.setXYZ(44, cross.r, cross.g, cross.b);
    colorAttribute.setXYZ(45, cross.r, cross.g, cross.b); // cn3, cn4

    colorAttribute.setXYZ(46, cross.r, cross.g, cross.b);
    colorAttribute.setXYZ(47, cross.r, cross.g, cross.b); // cf1, cf2
    colorAttribute.setXYZ(48, cross.r, cross.g, cross.b);
    colorAttribute.setXYZ(49, cross.r, cross.g, cross.b); // cf3, cf4

    // 标记颜色属性需要更新到GPU
    colorAttribute.needsUpdate = true;

    // 返回自身以支持链式调用
    return this;
  }

  /**
   * 基于相机的投影矩阵更新辅助器。
   */
  update() {
    // 获取几何体和点映射的引用
    const geometry = this.geometry;
    const pointMap = this.pointMap;

    // 设置标准化的宽度和高度
    const w = 1,
      h = 1;

    // 声明近平面和远平面的Z值变量
    let nearZ, farZ;

    // 我们只需要相机投影矩阵的逆矩阵
    // 世界矩阵必须是单位矩阵

    _camera.projectionMatrixInverse.copy(this.camera.projectionMatrixInverse);

    // 根据坐标系调整Z值

    if (this.camera.reversedDepth === true) {
      // 反向深度：近平面为1，远平面为0
      nearZ = 1;
      farZ = 0;
    } else {
      if (this.camera.coordinateSystem === WebGLCoordinateSystem) {
        // WebGL坐标系：近平面为-1，远平面为1
        nearZ = -1;
        farZ = 1;
      } else if (this.camera.coordinateSystem === WebGPUCoordinateSystem) {
        // WebGPU坐标系：近平面为0，远平面为1
        nearZ = 0;
        farZ = 1;
      } else {
        // 无效的坐标系
        throw new Error("THREE.CameraHelper.update(): Invalid coordinate system: " + this.camera.coordinateSystem);
      }
    }

    // 设置中心点和目标点
    setPoint("c", pointMap, geometry, _camera, 0, 0, nearZ); // 中心点
    setPoint("t", pointMap, geometry, _camera, 0, 0, farZ); // 目标点

    // 设置近平面的四个角点

    setPoint("n1", pointMap, geometry, _camera, -w, -h, nearZ); // 近平面左上
    setPoint("n2", pointMap, geometry, _camera, w, -h, nearZ); // 近平面右上
    setPoint("n3", pointMap, geometry, _camera, -w, h, nearZ); // 近平面左下
    setPoint("n4", pointMap, geometry, _camera, w, h, nearZ); // 近平面右下

    // 设置远平面的四个角点

    setPoint("f1", pointMap, geometry, _camera, -w, -h, farZ); // 远平面左上
    setPoint("f2", pointMap, geometry, _camera, w, -h, farZ); // 远平面右上
    setPoint("f3", pointMap, geometry, _camera, -w, h, farZ); // 远平面左下
    setPoint("f4", pointMap, geometry, _camera, w, h, farZ); // 远平面右下

    // 设置上方向指示器的三个点

    setPoint("u1", pointMap, geometry, _camera, w * 0.7, h * 1.1, nearZ); // 上方向右点
    setPoint("u2", pointMap, geometry, _camera, -w * 0.7, h * 1.1, nearZ); // 上方向左点
    setPoint("u3", pointMap, geometry, _camera, 0, h * 2, nearZ); // 上方向顶点

    // 设置十字线的点

    setPoint("cf1", pointMap, geometry, _camera, -w, 0, farZ); // 远平面水平十字线左点
    setPoint("cf2", pointMap, geometry, _camera, w, 0, farZ); // 远平面水平十字线右点
    setPoint("cf3", pointMap, geometry, _camera, 0, -h, farZ); // 远平面垂直十字线上点
    setPoint("cf4", pointMap, geometry, _camera, 0, h, farZ); // 远平面垂直十字线下点

    setPoint("cn1", pointMap, geometry, _camera, -w, 0, nearZ); // 近平面水平十字线左点
    setPoint("cn2", pointMap, geometry, _camera, w, 0, nearZ); // 近平面水平十字线右点
    setPoint("cn3", pointMap, geometry, _camera, 0, -h, nearZ); // 近平面垂直十字线上点
    setPoint("cn4", pointMap, geometry, _camera, 0, h, nearZ); // 近平面垂直十字线下点

    // 标记位置属性需要更新到GPU
    geometry.getAttribute("position").needsUpdate = true;
  }

  /**
   * 释放此实例分配的GPU相关资源。当此实例在应用中不再使用时调用此方法。
   */
  dispose() {
    // 释放几何体资源
    this.geometry.dispose();
    // 释放材质资源
    this.material.dispose();
  }
}

/**
 * 设置指定点的位置坐标的辅助函数。
 *
 * @param {string} point - 点的标识符。
 * @param {Object} pointMap - 点映射对象。
 * @param {BufferGeometry} geometry - 几何体对象。
 * @param {Camera} camera - 相机对象。
 * @param {number} x - X坐标。
 * @param {number} y - Y坐标。
 * @param {number} z - Z坐标。
 */
function setPoint(point, pointMap, geometry, camera, x, y, z) {
  // 设置向量坐标并通过相机反投影到世界坐标
  _vector.set(x, y, z).unproject(camera);

  // 获取该点对应的所有顶点索引
  const points = pointMap[point];

  // 如果点存在
  if (points !== undefined) {
    // 获取位置属性
    const position = geometry.getAttribute("position");

    // 遍历所有相关的顶点索引，设置它们的位置
    for (let i = 0, l = points.length; i < l; i++) {
      position.setXYZ(points[i], _vector.x, _vector.y, _vector.z);
    }
  }
}

// 导出CameraHelper类
export { CameraHelper };
