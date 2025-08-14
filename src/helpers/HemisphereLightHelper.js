// 导入Vector3类，用于处理三维向量
import { Vector3 } from "../math/Vector3.js";
// 导入Color类，用于处理颜色
import { Color } from "../math/Color.js";
// 导入Object3D类，作为3D对象的基类
import { Object3D } from "../core/Object3D.js";
// 导入Mesh类，用于创建网格对象
import { Mesh } from "../objects/Mesh.js";
// 导入MeshBasicMaterial类，用于创建基础网格材质
import { MeshBasicMaterial } from "../materials/MeshBasicMaterial.js";
// 导入OctahedronGeometry类，用于创建八面体几何体
import { OctahedronGeometry } from "../geometries/OctahedronGeometry.js";
// 导入BufferAttribute类，用于创建缓冲区属性
import { BufferAttribute } from "../core/BufferAttribute.js";

// 创建可重用的向量对象，用于临时计算
const _vector = /*@__PURE__*/ new Vector3();
// 创建可重用的颜色对象，用于存储第一种颜色
const _color1 = /*@__PURE__*/ new Color();
// 创建可重用的颜色对象，用于存储第二种颜色
const _color2 = /*@__PURE__*/ new Color();

/**
 * 为给定的半球光源创建一个由球形网格组成的可视化辅助器。
 *
 * 使用示例：
 * ```js
 * const light = new THREE.HemisphereLight( 0xffffbb, 0x080820, 1 );
 * const helper = new THREE.HemisphereLightHelper( light, 5 );
 * scene.add( helper );
 * ```
 *
 * @augments Object3D
 */
class HemisphereLightHelper extends Object3D {
  /**
   * 构造一个新的半球光辅助器
   *
   * @param {HemisphereLight} light - 要可视化的光源
   * @param {number} [size=1] - 用于可视化光源的网格大小
   * @param {number|Color|string} [color] - 辅助器的颜色。如果未设置，辅助器将使用光源的颜色
   */
  constructor(light, size, color) {
    // 调用父类构造函数
    super();

    /**
     * 正在被可视化的光源
     *
     * @type {HemisphereLight}
     */
    this.light = light;

    // 使用光源的世界矩阵
    this.matrix = light.matrixWorld;
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
    this.type = "HemisphereLightHelper";

    // 创建八面体几何体，用指定大小
    const geometry = new OctahedronGeometry(size);
    // 绕Y轴旋转90度，调整八面体的方向
    geometry.rotateY(Math.PI * 0.5);

    // 创建基础网格材质，设置为线框模式，禁用雾效和色调映射
    this.material = new MeshBasicMaterial({ wireframe: true, fog: false, toneMapped: false });
    // 如果没有指定颜色，则启用顶点颜色
    if (this.color === undefined) this.material.vertexColors = true;

    // 获取几何体的位置属性
    const position = geometry.getAttribute("position");
    // 创建颜色数组，每个顶点需要3个颜色分量(RGB)
    const colors = new Float32Array(position.count * 3);

    // 为几何体设置颜色属性
    geometry.setAttribute("color", new BufferAttribute(colors, 3));

    // 创建网格对象并添加到辅助器中
    this.add(new Mesh(geometry, this.material));

    // 更新辅助器状态
    this.update();
  }

  /**
   * 释放此实例分配的GPU相关资源。当应用程序中不再使用此实例时，
   * 应调用此方法以避免内存泄漏。
   */
  dispose() {
    // 释放第一个子对象（网格）的几何体资源
    this.children[0].geometry.dispose();
    // 释放第一个子对象（网格）的材质资源
    this.children[0].material.dispose();
  }

  /**
   * 更新辅助器以匹配被可视化光源的位置和方向
   */
  update() {
    // 获取网格对象（第一个子对象）
    const mesh = this.children[0];

    // 如果指定了颜色，则使用指定的颜色
    if (this.color !== undefined) {
      // 设置材质颜色为指定颜色
      this.material.color.set(this.color);
    } else {
      // 否则使用光源的颜色
      // 获取网格几何体的颜色属性
      const colors = mesh.geometry.getAttribute("color");

      // 复制光源的天空颜色
      _color1.copy(this.light.color);
      // 复制光源的地面颜色
      _color2.copy(this.light.groundColor);

      // 遍历所有顶点，为每个顶点设置颜色
      for (let i = 0, l = colors.count; i < l; i++) {
        // 上半部分使用天空颜色，下半部分使用地面颜色
        const color = i < l / 2 ? _color1 : _color2;

        // 设置顶点的RGB颜色值
        colors.setXYZ(i, color.r, color.g, color.b);
      }

      // 标记颜色属性需要更新
      colors.needsUpdate = true;
    }

    // 更新光源的世界矩阵
    this.light.updateWorldMatrix(true, false);

    // 让网格朝向光源的反方向（因为半球光是从上方照射的）
    mesh.lookAt(_vector.setFromMatrixPosition(this.light.matrixWorld).negate());
  }
}

// 导出HemisphereLightHelper类
export { HemisphereLightHelper };
