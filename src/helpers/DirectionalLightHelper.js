// 导入三维向量类，用于处理3D空间中的向量运算
import { Vector3 } from "../math/Vector3.js";
// 导入3D对象基类，所有3D对象的基础类
import { Object3D } from "../core/Object3D.js";
// 导入线条对象类，用于创建线条几何体
import { Line } from "../objects/Line.js";
// 导入32位浮点数缓冲属性类，用于存储顶点数据
import { Float32BufferAttribute } from "../core/BufferAttribute.js";
// 导入缓冲几何体类，用于高效存储几何数据
import { BufferGeometry } from "../core/BufferGeometry.js";
// 导入基础线材质类，用于定义线条的外观
import { LineBasicMaterial } from "../materials/LineBasicMaterial.js";

// 创建三个私有向量对象，用于内部计算（使用@__PURE__标记进行优化）
const _v1 = /*@__PURE__*/ new Vector3();
const _v2 = /*@__PURE__*/ new Vector3();
const _v3 = /*@__PURE__*/ new Vector3();

/**
 * 用于辅助可视化平行光（DirectionalLight）在场景中效果的辅助对象。
 * 它由一个平面和一条线组成，表示光源的位置和方向。
 *
 * ```js
 * const light = new THREE.DirectionalLight( 0xFFFFFF );
 * scene.add( light );
 *
 * const helper = new THREE.DirectionalLightHelper( light, 5 );
 * scene.add( helper );
 * ```
 *
 * @augments Object3D
 */
class DirectionalLightHelper extends Object3D {
  /**
   * 构造一个新的平行光辅助器。
   *
   * @param {DirectionalLight} light - 要可视化的平行光。
   * @param {number} [size=1] - 平面的尺寸。
   * @param {number|Color|string} [color] - 辅助器的颜色。如果未设置，辅助器将使用光源的颜色。
   */
  constructor(light, size, color) {
    // 调用父类构造函数
    super();

    /**
     * 被可视化的平行光对象。
     *
     * @type {DirectionalLight}
     */
    this.light = light;

    // 使用光源的世界矩阵
    this.matrix = light.matrixWorld;
    // 禁用自动矩阵更新
    this.matrixAutoUpdate = false;

    /**
     * 构造函数中传入的颜色参数。
     * 如果未设置，辅助器将使用光源的颜色。
     *
     * @type {number|Color|string}
     */
    this.color = color;

    // 设置对象类型标识
    this.type = "DirectionalLightHelper";

    // 如果尺寸未定义，设置默认值为1
    if (size === undefined) size = 1;

    // 创建平面几何体，表示光源的位置
    let geometry = new BufferGeometry();
    // 设置正方形平面的顶点位置（5个顶点形成闭合的正方形）
    geometry.setAttribute("position", new Float32BufferAttribute([-size, size, 0, size, size, 0, size, -size, 0, -size, -size, 0, -size, size, 0], 3));

    // 创建线材质，禁用雾效和色调映射
    const material = new LineBasicMaterial({ fog: false, toneMapped: false });

    /**
     * 包含显示平行光位置的线条对象。
     *
     * @type {Line}
     */
    this.lightPlane = new Line(geometry, material);
    // 将光源平面添加到辅助器中
    this.add(this.lightPlane);

    // 创建目标线的几何体
    geometry = new BufferGeometry();
    // 设置从原点到Z轴正方向的线段顶点
    geometry.setAttribute("position", new Float32BufferAttribute([0, 0, 0, 0, 0, 1], 3));

    /**
     * 表示平行光目标方向的线条对象。
     *
     * @type {Line}
     */
    this.targetLine = new Line(geometry, material);
    // 将目标线添加到辅助器中
    this.add(this.targetLine);

    // 初始化更新辅助器状态
    this.update();
  }

  /**
   * 释放此实例分配的GPU相关资源。当此实例在应用中不再使用时调用此方法。
   */
  dispose() {
    // 释放光源平面的几何体资源
    this.lightPlane.geometry.dispose();
    // 释放光源平面的材质资源
    this.lightPlane.material.dispose();
    // 释放目标线的几何体资源
    this.targetLine.geometry.dispose();
    // 释放目标线的材质资源
    this.targetLine.material.dispose();
  }

  /**
   * 更新辅助器以匹配被可视化光源的位置和方向。
   */
  update() {
    // 更新光源的世界矩阵
    this.light.updateWorldMatrix(true, false);
    // 更新光源目标的世界矩阵
    this.light.target.updateWorldMatrix(true, false);

    // 从光源的世界矩阵中获取位置
    _v1.setFromMatrixPosition(this.light.matrixWorld);
    // 从光源目标的世界矩阵中获取位置
    _v2.setFromMatrixPosition(this.light.target.matrixWorld);
    // 计算从光源到目标的方向向量
    _v3.subVectors(_v2, _v1);

    // 让光源平面朝向目标位置
    this.lightPlane.lookAt(_v2);

    // 设置辅助器的颜色
    if (this.color !== undefined) {
      // 如果指定了颜色，使用指定的颜色
      this.lightPlane.material.color.set(this.color);
      this.targetLine.material.color.set(this.color);
    } else {
      // 否则使用光源的颜色
      this.lightPlane.material.color.copy(this.light.color);
      this.targetLine.material.color.copy(this.light.color);
    }

    // 让目标线朝向目标位置
    this.targetLine.lookAt(_v2);
    // 设置目标线的长度为光源到目标的距离
    this.targetLine.scale.z = _v3.length();
  }
}

// 导出DirectionalLightHelper类
export { DirectionalLightHelper };
