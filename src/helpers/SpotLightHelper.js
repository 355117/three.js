// 导入Vector3类，用于处理三维向量
import { Vector3 } from "../math/Vector3.js";
// 导入Object3D类，作为3D对象的基类
import { Object3D } from "../core/Object3D.js";
// 导入LineSegments类，用于创建线段对象
import { LineSegments } from "../objects/LineSegments.js";
// 导入LineBasicMaterial类，用于创建基础线材质
import { LineBasicMaterial } from "../materials/LineBasicMaterial.js";
// 导入Float32BufferAttribute类，用于创建32位浮点数缓冲区属性
import { Float32BufferAttribute } from "../core/BufferAttribute.js";
// 导入BufferGeometry类，用于创建缓冲几何体
import { BufferGeometry } from "../core/BufferGeometry.js";

// 创建可重用的向量对象，用于临时计算
const _vector = /*@__PURE__*/ new Vector3();

/**
 * 显示一个锥形辅助对象，用于可视化聚光灯
 *
 * 使用示例：
 * ```js
 * const spotLight = new THREE.SpotLight( 0xffffff );
 * spotLight.position.set( 10, 10, 10 );
 * scene.add( spotLight );
 *
 * const spotLightHelper = new THREE.SpotLightHelper( spotLight );
 * scene.add( spotLightHelper );
 * ```
 *
 * @augments Object3D
 */
class SpotLightHelper extends Object3D {
  /**
   * 构造一个新的聚光灯辅助器
   *
   * @param {SpotLight} light - 要可视化的光源
   * @param {number|Color|string} [color] - 辅助器的颜色。如果未设置，辅助器将使用光源的颜色
   */
  constructor(light, color) {
    // 调用父类构造函数
    super();

    /**
     * 正在被可视化的光源
     *
     * @type {SpotLight}
     */
    this.light = light;

    // 禁用自动更新矩阵
    this.matrixAutoUpdate = false;

    /**
     * 构造函数中传入的颜色参数
     * 如果未设置，辅助器将使用光源的颜色
     *
     * @type {number|Color|string}
     */
    this.color = color;

    // 设置对象类型标识
    this.type = "SpotLightHelper";

    // 创建缓冲几何体
    const geometry = new BufferGeometry();

    // 定义锥形的基本线条位置（从锥顶到锥底边缘的线条）
    const positions = [
      0,
      0,
      0,
      0,
      0,
      1, // 中心到前方
      0,
      0,
      0,
      1,
      0,
      1, // 中心到右方
      0,
      0,
      0,
      -1,
      0,
      1, // 中心到左方
      0,
      0,
      0,
      0,
      1,
      1, // 中心到上方
      0,
      0,
      0,
      0,
      -1,
      1, // 中心到下方
    ];

    // 生成锥底圆形边缘的线条
    for (let i = 0, j = 1, l = 32; i < l; i++, j++) {
      // 计算当前点和下一点的角度
      const p1 = (i / l) * Math.PI * 2;
      const p2 = (j / l) * Math.PI * 2;

      // 添加圆形边缘的线段
      positions.push(
        Math.cos(p1),
        Math.sin(p1),
        1, // 当前点
        Math.cos(p2),
        Math.sin(p2),
        1 // 下一点
      );
    }

    // 设置几何体的位置属性
    geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));

    // 创建线材质，禁用雾效和色调映射
    const material = new LineBasicMaterial({ fog: false, toneMapped: false });

    // 创建锥形线段对象并添加到辅助器中
    this.cone = new LineSegments(geometry, material);
    this.add(this.cone);

    // 初始化更新辅助器状态
    this.update();
  }

  /**
   * 释放此实例分配的GPU相关资源。当应用程序中不再使用此实例时，
   * 应调用此方法以避免内存泄漏。
   */
  dispose() {
    // 释放锥形几何体资源
    this.cone.geometry.dispose();
    // 释放锥形材质资源
    this.cone.material.dispose();
  }

  /**
   * 更新辅助器以匹配被可视化光源的位置和方向
   */
  update() {
    // 更新光源的世界矩阵
    this.light.updateWorldMatrix(true, false);
    // 更新光源目标的世界矩阵
    this.light.target.updateWorldMatrix(true, false);

    // 根据父对象和光源目标变换更新本地矩阵
    if (this.parent) {
      // 如果有父对象，更新父对象的世界矩阵
      this.parent.updateWorldMatrix(true);

      // 计算相对于父对象的本地矩阵
      this.matrix.copy(this.parent.matrixWorld).invert().multiply(this.light.matrixWorld);
    } else {
      // 如果没有父对象，直接使用光源的世界矩阵
      this.matrix.copy(this.light.matrixWorld);
    }

    // 设置世界矩阵为光源的世界矩阵
    this.matrixWorld.copy(this.light.matrixWorld);

    // 计算锥形的长度（如果光源有距离限制则使用距离，否则使用默认值1000）
    const coneLength = this.light.distance ? this.light.distance : 1000;
    // 根据光源角度计算锥形的宽度
    const coneWidth = coneLength * Math.tan(this.light.angle);

    // 设置锥形的缩放
    this.cone.scale.set(coneWidth, coneWidth, coneLength);

    // 获取光源目标的世界位置
    _vector.setFromMatrixPosition(this.light.target.matrixWorld);

    // 让锥形朝向光源目标
    this.cone.lookAt(_vector);

    // 设置锥形的颜色
    if (this.color !== undefined) {
      // 如果指定了颜色，则使用指定的颜色
      this.cone.material.color.set(this.color);
    } else {
      // 否则使用光源的颜色
      this.cone.material.color.copy(this.light.color);
    }
  }
}

// 导出SpotLightHelper类
export { SpotLightHelper };
