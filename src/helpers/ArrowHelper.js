// 导入32位浮点数缓冲属性类，用于存储顶点数据
import { Float32BufferAttribute } from "../core/BufferAttribute.js";
// 导入缓冲几何体类，用于高效存储几何数据
import { BufferGeometry } from "../core/BufferGeometry.js";
// 导入3D对象基类，所有3D对象的基础类
import { Object3D } from "../core/Object3D.js";
// 导入圆锥几何体类，用于创建箭头的头部
import { ConeGeometry } from "../geometries/ConeGeometry.js";
// 导入基础网格材质类，用于定义网格的外观
import { MeshBasicMaterial } from "../materials/MeshBasicMaterial.js";
// 导入基础线材质类，用于定义线条的外观
import { LineBasicMaterial } from "../materials/LineBasicMaterial.js";
// 导入网格对象类，用于创建3D网格
import { Mesh } from "../objects/Mesh.js";
// 导入线条对象类，用于创建线条几何体
import { Line } from "../objects/Line.js";
// 导入三维向量类，用于处理3D空间中的向量运算
import { Vector3 } from "../math/Vector3.js";

// 创建私有轴向量对象，用于内部计算（使用@__PURE__标记进行优化）
const _axis = /*@__PURE__*/ new Vector3();
// 声明线条几何体和圆锥几何体变量，用于共享几何体实例
let _lineGeometry, _coneGeometry;

/**
 * 用于可视化方向的3D箭头对象。
 *
 * ```js
 * const dir = new THREE.Vector3( 1, 2, 0 );
 *
 * //normalize the direction vector (convert to vector of length 1)
 * dir.normalize();
 *
 * const origin = new THREE.Vector3( 0, 0, 0 );
 * const length = 1;
 * const hex = 0xffff00;
 *
 * const arrowHelper = new THREE.ArrowHelper( dir, origin, length, hex );
 * scene.add( arrowHelper );
 * ```
 *
 * @augments Object3D
 */
class ArrowHelper extends Object3D {
  /**
   * 构造一个新的箭头辅助器。
   *
   * @param {Vector3} [dir=(0, 0, 1)] - （标准化的）方向向量。
   * @param {Vector3} [origin=(0, 0, 0)] - 箭头起始点。
   * @param {number} [length=1] - 箭头在世界单位中的长度。
   * @param {(number|Color|string)} [color=0xffff00] - 箭头的颜色。
   * @param {number} [headLength=length*0.2] - 箭头头部的长度。
   * @param {number} [headWidth=headLength*0.2] - 箭头头部的宽度。
   */
  constructor(dir = new Vector3(0, 0, 1), origin = new Vector3(0, 0, 0), length = 1, color = 0xffff00, headLength = length * 0.2, headWidth = headLength * 0.2) {
    // 调用父类构造函数
    super();

    // 设置对象类型标识
    this.type = "ArrowHelper";

    // 如果线条几何体未定义，创建共享的几何体实例
    if (_lineGeometry === undefined) {
      // 创建线条几何体，从原点到Y轴正方向
      _lineGeometry = new BufferGeometry();
      _lineGeometry.setAttribute("position", new Float32BufferAttribute([0, 0, 0, 0, 1, 0], 3));

      // 创建圆锥几何体作为箭头头部，半径0.5，高度1，5个径向段，1个高度段
      _coneGeometry = new ConeGeometry(0.5, 1, 5, 1);
      // 将圆锥向下平移0.5单位，使其底部位于原点
      _coneGeometry.translate(0, -0.5, 0);
    }

    // 设置箭头的位置为起始点
    this.position.copy(origin);

    /**
     * 箭头辅助器的线条部分。
     *
     * @type {Line}
     */
    this.line = new Line(_lineGeometry, new LineBasicMaterial({ color: color, toneMapped: false }));
    // 禁用线条的自动矩阵更新
    this.line.matrixAutoUpdate = false;
    // 将线条添加到箭头辅助器中
    this.add(this.line);

    /**
     * 箭头辅助器的圆锥部分。
     *
     * @type {Mesh}
     */
    this.cone = new Mesh(_coneGeometry, new MeshBasicMaterial({ color: color, toneMapped: false }));
    // 禁用圆锥的自动矩阵更新
    this.cone.matrixAutoUpdate = false;
    // 将圆锥添加到箭头辅助器中
    this.add(this.cone);

    // 设置箭头的方向
    this.setDirection(dir);
    // 设置箭头的长度和头部尺寸
    this.setLength(length, headLength, headWidth);
  }

  /**
   * 设置辅助器的方向。
   *
   * @param {Vector3} dir - 标准化的方向向量。
   */
  setDirection(dir) {
    // 假设dir已经被标准化

    // 如果方向几乎完全向上（Y轴正方向）
    if (dir.y > 0.99999) {
      this.quaternion.set(0, 0, 0, 1);
    } else if (dir.y < -0.99999) {
      // 如果方向几乎完全向下（Y轴负方向）
      this.quaternion.set(1, 0, 0, 0);
    } else {
      // 计算旋转轴，垂直于Y轴和目标方向
      _axis.set(dir.z, 0, -dir.x).normalize();

      // 计算旋转角度（Y轴到目标方向的角度）
      const radians = Math.acos(dir.y);

      // 设置四元数旋转
      this.quaternion.setFromAxisAngle(_axis, radians);
    }
  }

  /**
   * 设置辅助器的长度。
   *
   * @param {number} length - 箭头在世界单位中的长度。
   * @param {number} [headLength=length*0.2] - 箭头头部的长度。
   * @param {number} [headWidth=headLength*0.2] - 箭头头部的宽度。
   */
  setLength(length, headLength = length * 0.2, headWidth = headLength * 0.2) {
    // 设置线条的缩放，Y轴缩放为总长度减去头部长度（最小值0.0001避免除零错误）
    this.line.scale.set(1, Math.max(0.0001, length - headLength), 1); // see #17458
    // 更新线条的变换矩阵
    this.line.updateMatrix();

    // 设置圆锥的缩放，X和Z轴为头部宽度，Y轴为头部长度
    this.cone.scale.set(headWidth, headLength, headWidth);
    // 设置圆锥的Y位置为总长度
    this.cone.position.y = length;
    // 更新圆锥的变换矩阵
    this.cone.updateMatrix();
  }

  /**
   * 设置辅助器的颜色。
   *
   * @param {number|Color|string} color - 要设置的颜色。
   */
  setColor(color) {
    // 设置线条材质的颜色
    this.line.material.color.set(color);
    // 设置圆锥材质的颜色
    this.cone.material.color.set(color);
  }

  /**
   * 复制另一个箭头辅助器的属性到当前实例。
   *
   * @param {ArrowHelper} source - 要复制的源箭头辅助器。
   * @return {ArrowHelper} 返回当前实例以支持链式调用。
   */
  copy(source) {
    // 调用父类的复制方法，不复制子对象
    super.copy(source, false);

    // 复制线条对象
    this.line.copy(source.line);
    // 复制圆锥对象
    this.cone.copy(source.cone);

    // 返回当前实例
    return this;
  }

  /**
   * 释放此实例分配的GPU相关资源。当此实例在应用中不再使用时调用此方法。
   */
  dispose() {
    // 释放线条的几何体资源
    this.line.geometry.dispose();
    // 释放线条的材质资源
    this.line.material.dispose();
    // 释放圆锥的几何体资源
    this.cone.geometry.dispose();
    // 释放圆锥的材质资源
    this.cone.material.dispose();
  }
}

// 导出ArrowHelper类
export { ArrowHelper };
