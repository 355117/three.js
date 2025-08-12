// 导入二维向量类，用于UV坐标和屏幕位置计算
import { Vector2 } from "../math/Vector2.js";
// 导入三维向量类，用于3D位置和方向计算
import { Vector3 } from "../math/Vector3.js";
// 导入4x4矩阵类，用于变换计算
import { Matrix4 } from "../math/Matrix4.js";
// 导入三角形类，用于射线检测
import { Triangle } from "../math/Triangle.js";
// 导入3D对象基类
import { Object3D } from "../core/Object3D.js";
// 导入缓冲几何体类
import { BufferGeometry } from "../core/BufferGeometry.js";
// 导入交错缓冲区类，用于高效的顶点数据存储
import { InterleavedBuffer } from "../core/InterleavedBuffer.js";
// 导入交错缓冲区属性类
import { InterleavedBufferAttribute } from "../core/InterleavedBufferAttribute.js";
// 导入精灵材质类，作为默认材质
import { SpriteMaterial } from "../materials/SpriteMaterial.js";

// 精灵的共享几何体（延迟初始化）
let _geometry;

// 用于射线检测的交点向量
const _intersectPoint = /*@__PURE__*/ new Vector3();
// 用于存储世界空间缩放的向量
const _worldScale = /*@__PURE__*/ new Vector3();
// 用于存储模型视图位置的向量
const _mvPosition = /*@__PURE__*/ new Vector3();

// 用于对齐计算的2D位置向量
const _alignedPosition = /*@__PURE__*/ new Vector2();
// 用于旋转计算的2D位置向量
const _rotatedPosition = /*@__PURE__*/ new Vector2();
// 用于视图世界矩阵计算的4x4矩阵
const _viewWorldMatrix = /*@__PURE__*/ new Matrix4();

// 用于射线检测的三角形顶点
const _vA = /*@__PURE__*/ new Vector3();
const _vB = /*@__PURE__*/ new Vector3();
const _vC = /*@__PURE__*/ new Vector3();

// 用于射线检测的UV坐标
const _uvA = /*@__PURE__*/ new Vector2();
const _uvB = /*@__PURE__*/ new Vector2();
const _uvC = /*@__PURE__*/ new Vector2();

/**
 * 精灵是一个始终面向摄像机的平面，通常应用半透明纹理
 *
 * 精灵不会投射阴影，将castShadow设置为true不会有任何效果。
 * 常用于粒子效果、UI元素、广告牌等需要始终面向摄像机的对象。
 *
 * 使用示例：
 * ```js
 * const map = new THREE.TextureLoader().load( 'sprite.png' );
 * const material = new THREE.SpriteMaterial( { map: map } );
 *
 * const sprite = new THREE.Sprite( material );
 * scene.add( sprite );
 * ```
 *
 * @augments Object3D
 */
class Sprite extends Object3D {
  /**
   * 构造一个新的精灵对象
   *
   * @param {SpriteMaterial} [material] - 精灵的材质，定义外观和渲染属性
   */
  constructor(material = new SpriteMaterial()) {
    // 调用父类构造函数
    super();

    /**
     * 用于类型检测的标志
     * 可以通过此属性判断对象是否为精灵
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isSprite = true;

    /**
     * 对象类型标识
     * 用于序列化和调试时识别对象类型
     *
     * @type {string}
     */
    this.type = "Sprite";

    // 如果共享几何体尚未初始化，创建精灵的标准几何体
    if (_geometry === undefined) {
      _geometry = new BufferGeometry();

      // 创建精灵的顶点数据：4个顶点，每个顶点包含位置(x,y,z)和UV坐标(u,v)
      // 顶点顺序：左下、右下、右上、左上
      // 格式：[x, y, z, u, v, x, y, z, u, v, ...]
      const float32Array = new Float32Array([-0.5, -0.5, 0, 0, 0, 0.5, -0.5, 0, 1, 0, 0.5, 0.5, 0, 1, 1, -0.5, 0.5, 0, 0, 1]);

      // 创建交错缓冲区，每个顶点5个浮点数（3个位置 + 2个UV）
      const interleavedBuffer = new InterleavedBuffer(float32Array, 5);

      // 设置索引数组，定义两个三角形组成的四边形
      _geometry.setIndex([0, 1, 2, 0, 2, 3]);
      // 设置位置属性：从交错缓冲区中提取位置数据（3个分量，从偏移0开始）
      _geometry.setAttribute("position", new InterleavedBufferAttribute(interleavedBuffer, 3, 0, false));
      // 设置UV属性：从交错缓冲区中提取UV数据（2个分量，从偏移3开始）
      _geometry.setAttribute("uv", new InterleavedBufferAttribute(interleavedBuffer, 2, 3, false));
    }

    /**
     * 精灵的几何体
     * 所有精灵共享同一个几何体实例以提高性能
     *
     * @type {BufferGeometry}
     */
    this.geometry = _geometry;

    /**
     * 精灵的材质
     * 定义精灵的外观、纹理、透明度等属性
     *
     * @type {SpriteMaterial}
     */
    this.material = material;

    /**
     * 精灵的锚点，也是精灵旋转的中心点
     * 值(0.5, 0.5)对应精灵的中点，值(0, 0)对应精灵的左下角
     *
     * @type {Vector2}
     * @default (0.5,0.5)
     */
    this.center = new Vector2(0.5, 0.5);

    /**
     * 此精灵的实例数量
     * 仅可与WebGPU渲染器一起使用，用于实例化渲染
     *
     * @type {number}
     * @default 1
     */
    this.count = 1;
  }

  /**
   * 计算射线与此精灵的交点
   * 精灵射线检测需要摄像机信息，因为精灵始终面向摄像机
   *
   * @param {Raycaster} raycaster - 射线投射器
   * @param {Array<Object>} intersects - 存储交点信息的目标数组
   */
  raycast(raycaster, intersects) {
    // 检查射线投射器是否设置了摄像机
    if (raycaster.camera === null) {
      console.error('THREE.Sprite: "Raycaster.camera" needs to be set in order to raycast against sprites.');
    }

    // 从世界矩阵中提取缩放信息
    _worldScale.setFromMatrixScale(this.matrixWorld);

    // 复制摄像机的世界矩阵
    _viewWorldMatrix.copy(raycaster.camera.matrixWorld);
    // 计算模型视图矩阵
    this.modelViewMatrix.multiplyMatrices(raycaster.camera.matrixWorldInverse, this.matrixWorld);

    // 从模型视图矩阵中获取位置
    _mvPosition.setFromMatrixPosition(this.modelViewMatrix);

    // 如果是透视摄像机且材质不启用尺寸衰减，根据距离调整缩放
    if (raycaster.camera.isPerspectiveCamera && this.material.sizeAttenuation === false) {
      _worldScale.multiplyScalar(-_mvPosition.z);
    }

    // 获取材质的旋转角度
    const rotation = this.material.rotation;
    let sin, cos;

    // 如果有旋转，预计算正弦和余弦值
    if (rotation !== 0) {
      cos = Math.cos(rotation);
      sin = Math.sin(rotation);
    }

    // 获取精灵的中心点
    const center = this.center;

    // 变换精灵四边形的三个顶点（第一个三角形）
    transformVertex(_vA.set(-0.5, -0.5, 0), _mvPosition, center, _worldScale, sin, cos); // 左下
    transformVertex(_vB.set(0.5, -0.5, 0), _mvPosition, center, _worldScale, sin, cos); // 右下
    transformVertex(_vC.set(0.5, 0.5, 0), _mvPosition, center, _worldScale, sin, cos); // 右上

    // 设置对应的UV坐标
    _uvA.set(0, 0); // 左下UV
    _uvB.set(1, 0); // 右下UV
    _uvC.set(1, 1); // 右上UV

    // 检查第一个三角形的交点
    let intersect = raycaster.ray.intersectTriangle(_vA, _vB, _vC, false, _intersectPoint);

    if (intersect === null) {
      // 如果第一个三角形没有交点，检查第二个三角形
      transformVertex(_vB.set(-0.5, 0.5, 0), _mvPosition, center, _worldScale, sin, cos); // 左上
      _uvB.set(0, 1); // 左上UV

      // 检查第二个三角形：左下、右上、左上
      intersect = raycaster.ray.intersectTriangle(_vA, _vC, _vB, false, _intersectPoint);
      if (intersect === null) {
        // 两个三角形都没有交点，返回
        return;
      }
    }

    // 计算射线起点到交点的距离
    const distance = raycaster.ray.origin.distanceTo(_intersectPoint);

    // 检查距离是否在有效范围内
    if (distance < raycaster.near || distance > raycaster.far) return;

    // 添加交点信息到结果数组
    intersects.push({
      distance: distance, // 距离
      point: _intersectPoint.clone(), // 交点位置
      uv: Triangle.getInterpolation(_intersectPoint, _vA, _vB, _vC, _uvA, _uvB, _uvC, new Vector2()), // 插值UV坐标
      face: null, // 面信息（精灵没有面）
      object: this, // 相交的对象
    });
  }

  /**
   * 复制另一个精灵对象的属性
   * 包括中心点、材质等所有相关属性
   *
   * @param {Sprite} source - 要复制的源精灵对象
   * @param {boolean} recursive - 是否递归复制子对象
   * @return {Sprite} 返回当前精灵对象，支持链式调用
   */
  copy(source, recursive) {
    // 调用父类的copy方法
    super.copy(source, recursive);

    // 复制中心点
    if (source.center !== undefined) this.center.copy(source.center);

    // 复制材质引用
    this.material = source.material;

    return this;
  }
}

/**
 * 变换精灵顶点位置
 * 将精灵的本地顶点坐标变换到世界空间，考虑中心点、缩放和旋转
 *
 * @param {Vector3} vertexPosition - 要变换的顶点位置
 * @param {Vector3} mvPosition - 模型视图位置
 * @param {Vector2} center - 精灵的中心点
 * @param {Vector3} scale - 缩放因子
 * @param {number} sin - 旋转角度的正弦值
 * @param {number} cos - 旋转角度的余弦值
 */
function transformVertex(vertexPosition, mvPosition, center, scale, sin, cos) {
  // 计算在摄像机空间中的位置：相对于中心点的偏移，然后应用缩放
  _alignedPosition.subVectors(vertexPosition, center).addScalar(0.5).multiply(scale);

  // 检查是否有旋转
  if (sin !== undefined) {
    // 应用2D旋转变换
    _rotatedPosition.x = cos * _alignedPosition.x - sin * _alignedPosition.y;
    _rotatedPosition.y = sin * _alignedPosition.x + cos * _alignedPosition.y;
  } else {
    // 没有旋转，直接复制位置
    _rotatedPosition.copy(_alignedPosition);
  }

  // 将顶点位置设置为模型视图位置
  vertexPosition.copy(mvPosition);
  // 添加旋转后的偏移
  vertexPosition.x += _rotatedPosition.x;
  vertexPosition.y += _rotatedPosition.y;

  // 变换到世界空间
  vertexPosition.applyMatrix4(_viewWorldMatrix);
}

// 导出精灵类
export { Sprite };
