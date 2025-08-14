// 导入Mesh类，用于创建网格对象
import { Mesh } from "../objects/Mesh.js";
// 导入MeshBasicMaterial类，用于创建基础网格材质
import { MeshBasicMaterial } from "../materials/MeshBasicMaterial.js";
// 导入SphereGeometry类，用于创建球体几何体
import { SphereGeometry } from "../geometries/SphereGeometry.js";

/**
 * 显示一个由球形网格组成的辅助对象，用于可视化点光源实例
 *
 * 使用示例：
 * ```js
 * const pointLight = new THREE.PointLight( 0xff0000, 1, 100 );
 * pointLight.position.set( 10, 10, 10 );
 * scene.add( pointLight );
 *
 * const sphereSize = 1;
 * const pointLightHelper = new THREE.PointLightHelper( pointLight, sphereSize );
 * scene.add( pointLightHelper );
 * ```
 *
 * @augments Mesh
 */
class PointLightHelper extends Mesh {
  /**
   * 构造一个新的点光源辅助器
   *
   * @param {PointLight} light - 要可视化的光源
   * @param {number} [sphereSize=1] - 球体辅助器的大小
   * @param {number|Color|string} [color] - 辅助器的颜色。如果未设置，辅助器将使用光源的颜色
   */
  constructor(light, sphereSize, color) {
    // 创建球体几何体，使用较少的分段数以提高性能
    const geometry = new SphereGeometry(sphereSize, 4, 2);
    // 创建基础网格材质，设置为线框模式，禁用雾效和色调映射
    const material = new MeshBasicMaterial({ wireframe: true, fog: false, toneMapped: false });

    // 调用父类构造函数
    super(geometry, material);

    /**
     * 正在被可视化的光源
     *
     * @type {PointLight}
     */
    this.light = light;

    /**
     * 构造函数中传入的颜色参数
     * 如果未设置，辅助器将使用光源的颜色
     *
     * @type {number|Color|string}
     */
    this.color = color;

    // 设置对象类型标识
    this.type = "PointLightHelper";

    // 使用光源的世界矩阵
    this.matrix = this.light.matrixWorld;
    // 禁用自动更新矩阵
    this.matrixAutoUpdate = false;

    // 初始化更新辅助器状态
    this.update();

    /*
    // TODO: 删除此注释？
    // 以下是用于显示光源距离范围的代码，目前被注释掉了
    const distanceGeometry = new THREE.IcosahedronGeometry( 1, 2 );
    const distanceMaterial = new THREE.MeshBasicMaterial( { color: hexColor, fog: false, wireframe: true, opacity: 0.1, transparent: true } );

    this.lightSphere = new THREE.Mesh( bulbGeometry, bulbMaterial );
    this.lightDistance = new THREE.Mesh( distanceGeometry, distanceMaterial );

    const d = light.distance;

    if ( d === 0.0 ) {
      this.lightDistance.visible = false;
    } else {
      this.lightDistance.scale.set( d, d, d );
    }

    this.add( this.lightDistance );
    */
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

  /**
   * 更新辅助器以匹配被可视化光源的位置
   */
  update() {
    // 更新光源的世界矩阵
    this.light.updateWorldMatrix(true, false);

    // 如果指定了颜色，则使用指定的颜色
    if (this.color !== undefined) {
      // 设置材质颜色为指定颜色
      this.material.color.set(this.color);
    } else {
      // 否则使用光源的颜色
      this.material.color.copy(this.light.color);
    }

    /*
    // 以下是用于处理光源距离范围显示的代码，目前被注释掉了
    const d = this.light.distance;

    if ( d === 0.0 ) {
      this.lightDistance.visible = false;
    } else {
      this.lightDistance.visible = true;
      this.lightDistance.scale.set( d, d, d );
    }
    */
  }
}

// 导出PointLightHelper类
export { PointLightHelper };
