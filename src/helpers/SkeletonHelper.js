// 导入LineSegments类，用于创建线段对象
import { LineSegments } from "../objects/LineSegments.js";
// 导入Matrix4类，用于处理4x4矩阵
import { Matrix4 } from "../math/Matrix4.js";
// 导入LineBasicMaterial类，用于创建基础线材质
import { LineBasicMaterial } from "../materials/LineBasicMaterial.js";
// 导入Color类，用于处理颜色
import { Color } from "../math/Color.js";
// 导入Vector3类，用于处理三维向量
import { Vector3 } from "../math/Vector3.js";
// 导入BufferGeometry类，用于创建缓冲几何体
import { BufferGeometry } from "../core/BufferGeometry.js";
// 导入Float32BufferAttribute类，用于创建32位浮点数缓冲区属性
import { Float32BufferAttribute } from "../core/BufferAttribute.js";

// 创建可重用的向量对象，用于临时计算
const _vector = /*@__PURE__*/ new Vector3();
// 创建可重用的矩阵对象，用于存储骨骼矩阵
const _boneMatrix = /*@__PURE__*/ new Matrix4();
// 创建可重用的矩阵对象，用于存储世界矩阵的逆矩阵
const _matrixWorldInv = /*@__PURE__*/ new Matrix4();

/**
 * 用于辅助可视化骨骼系统的辅助对象
 *
 * 使用示例：
 * ```js
 * const helper = new THREE.SkeletonHelper( skinnedMesh );
 * scene.add( helper );
 * ```
 *
 * @augments LineSegments
 */
class SkeletonHelper extends LineSegments {
  /**
   * 构造一个新的骨骼辅助器
   *
   * @param {Object3D} object - 通常是SkinnedMesh的实例。但是，如果任何3D对象
   * 表示骨骼层次结构，也可以使用（参见Bone）
   */
  constructor(object) {
    // 获取对象的骨骼列表
    const bones = getBoneList(object);

    // 创建缓冲几何体
    const geometry = new BufferGeometry();

    // 初始化顶点数组和颜色数组
    const vertices = [];
    const colors = [];

    // 遍历所有骨骼，为每个有父骨骼的骨骼创建连接线
    for (let i = 0; i < bones.length; i++) {
      const bone = bones[i];

      // 只有当骨骼有父骨骼且父骨骼也是骨骼时，才创建连接线
      if (bone.parent && bone.parent.isBone) {
        // 添加线段的两个端点（初始位置为原点）
        vertices.push(0, 0, 0);
        vertices.push(0, 0, 0);
        // 添加对应的颜色（初始为黑色）
        colors.push(0, 0, 0);
        colors.push(0, 0, 0);
      }
    }

    // 设置几何体的位置和颜色属性
    geometry.setAttribute("position", new Float32BufferAttribute(vertices, 3));
    geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));

    // 创建线材质，启用顶点颜色，禁用深度测试和深度写入，启用透明度
    const material = new LineBasicMaterial({ vertexColors: true, depthTest: false, depthWrite: false, toneMapped: false, transparent: true });

    // 调用父类构造函数
    super(geometry, material);

    /**
     * 此标志可用于类型测试
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isSkeletonHelper = true;

    // 设置对象类型标识
    this.type = "SkeletonHelper";

    /**
     * 正在被可视化的对象
     *
     * @type {Object3D}
     */
    this.root = object;

    /**
     * 辅助器可视化的骨骼列表
     *
     * @type {Array<Bone>}
     */
    this.bones = bones;

    // 使用对象的世界矩阵
    this.matrix = object.matrixWorld;
    // 禁用自动更新矩阵
    this.matrixAutoUpdate = false;

    // 设置颜色
    // 创建蓝色，用于骨骼连接线的第一种颜色
    const color1 = new Color(0x0000ff);
    // 创建绿色，用于骨骼连接线的第二种颜色
    const color2 = new Color(0x00ff00);

    // 设置骨骼辅助器的颜色
    this.setColors(color1, color2);
  }

  /**
   * 更新世界矩阵，同时更新骨骼连接线的位置
   *
   * @param {boolean} force - 是否强制更新
   */
  updateMatrixWorld(force) {
    // 获取骨骼列表
    const bones = this.bones;

    // 获取几何体和位置属性
    const geometry = this.geometry;
    const position = geometry.getAttribute("position");

    // 计算根对象世界矩阵的逆矩阵，用于将骨骼位置转换到本地空间
    _matrixWorldInv.copy(this.root.matrixWorld).invert();

    // 遍历所有骨骼，更新连接线的位置
    for (let i = 0, j = 0; i < bones.length; i++) {
      const bone = bones[i];

      // 只处理有父骨骼的骨骼
      if (bone.parent && bone.parent.isBone) {
        // 计算当前骨骼在本地空间中的位置
        _boneMatrix.multiplyMatrices(_matrixWorldInv, bone.matrixWorld);
        _vector.setFromMatrixPosition(_boneMatrix);
        // 设置线段的第一个端点（当前骨骼位置）
        position.setXYZ(j, _vector.x, _vector.y, _vector.z);

        // 计算父骨骼在本地空间中的位置
        _boneMatrix.multiplyMatrices(_matrixWorldInv, bone.parent.matrixWorld);
        _vector.setFromMatrixPosition(_boneMatrix);
        // 设置线段的第二个端点（父骨骼位置）
        position.setXYZ(j + 1, _vector.x, _vector.y, _vector.z);

        // 移动到下一条线段的索引
        j += 2;
      }
    }

    // 标记位置属性需要更新
    geometry.getAttribute("position").needsUpdate = true;

    // 调用父类的updateMatrixWorld方法
    super.updateMatrixWorld(force);
  }

  /**
   * 定义辅助器的颜色
   *
   * @param {Color} color1 - 每个骨骼的第一条线的颜色
   * @param {Color} color2 - 每个骨骼的第二条线的颜色
   * @return {SkeletonHelper} 返回此辅助器的引用
   */
  setColors(color1, color2) {
    // 获取几何体和颜色属性
    const geometry = this.geometry;
    const colorAttribute = geometry.getAttribute("color");

    // 遍历所有颜色属性，每两个为一组（一条线段的两个端点）
    for (let i = 0; i < colorAttribute.count; i += 2) {
      // 设置第一个端点的颜色
      colorAttribute.setXYZ(i, color1.r, color1.g, color1.b);
      // 设置第二个端点的颜色
      colorAttribute.setXYZ(i + 1, color2.r, color2.g, color2.b);
    }

    // 标记颜色属性需要更新
    colorAttribute.needsUpdate = true;

    // 返回this以支持链式调用
    return this;
  }

  /**
   * 释放此实例分配的GPU相关资源。当应用程序中不再使用此实例时，
   * 应调用此方法以避免内存泄漏。
   */
  dispose() {
    // 释放几何体资源
    this.geometry.dispose();
    // 释放材质资源
    this.material.dispose();
  }
}

/**
 * 递归获取对象及其子对象中的所有骨骼
 *
 * @param {Object3D} object - 要搜索骨骼的3D对象
 * @returns {Array<Bone>} 包含所有找到的骨骼的数组
 */
function getBoneList(object) {
  // 初始化骨骼列表
  const boneList = [];

  // 如果当前对象是骨骼，则添加到列表中
  if (object.isBone === true) {
    boneList.push(object);
  }

  // 递归搜索所有子对象
  for (let i = 0; i < object.children.length; i++) {
    // 使用展开运算符将子对象的骨骼添加到列表中
    boneList.push(...getBoneList(object.children[i]));
  }

  // 返回完整的骨骼列表
  return boneList;
}

// 导出SkeletonHelper类
export { SkeletonHelper };
