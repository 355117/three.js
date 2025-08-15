// 导入坐标系统常量
import { WebGLCoordinateSystem, WebGPUCoordinateSystem } from "../constants.js";
// 导入3D对象基类
import { Object3D } from "../core/Object3D.js";
// 导入透视相机类
import { PerspectiveCamera } from "./PerspectiveCamera.js";

// 立方体相机的视野角度（负90度不是错误）
const fov = -90; // negative fov is not an error
// 立方体相机的宽高比（正方形）
const aspect = 1;

/**
 * 一种特殊类型的相机，定位在3D空间中将其周围环境渲染到立方体渲染目标中。
 * 然后可以将渲染目标用作环境贴图，在场景中渲染实时反射。
 *
 * 立方体相机通过6个透视相机分别渲染立方体的6个面，生成完整的环境贴图。
 * 这对于实现实时反射、环境光照等效果非常有用。
 *
 * 使用示例：
 * ```js
 * // 创建立方体渲染目标
 * const cubeRenderTarget = new THREE.WebGLCubeRenderTarget( 256, { generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter } );
 *
 * // 创建立方体相机
 * const cubeCamera = new THREE.CubeCamera( 1, 100000, cubeRenderTarget );
 * scene.add( cubeCamera );
 *
 * // 创建汽车
 * const chromeMaterial = new THREE.MeshLambertMaterial( { color: 0xffffff, envMap: cubeRenderTarget.texture } );
 * const car = new THREE.Mesh( carGeometry, chromeMaterial );
 * scene.add( car );
 *
 * // 更新立方体渲染目标
 * car.visible = false;
 * cubeCamera.position.copy( car.position );
 * cubeCamera.update( renderer, scene );
 *
 * // 渲染场景
 * car.visible = true;
 * renderer.render( scene, camera );
 * ```
 *
 * @augments Object3D
 */
class CubeCamera extends Object3D {
  /**
   * 构造一个新的立方体相机
   *
   * @param {number} near - 相机的近平面距离
   * @param {number} far - 相机的远平面距离
   * @param {WebGLCubeRenderTarget} renderTarget - 立方体渲染目标
   */
  constructor(near, far, renderTarget) {
    // 调用父类Object3D的构造函数
    super();

    // 设置对象类型为'CubeCamera'
    this.type = "CubeCamera";

    /**
     * 对立方体渲染目标的引用
     * 用于存储渲染结果的立方体纹理
     *
     * @type {WebGLCubeRenderTarget}
     */
    this.renderTarget = renderTarget;

    /**
     * 当前活动的坐标系统
     * 可以是WebGL坐标系统或WebGPU坐标系统
     *
     * @type {?(WebGLCoordinateSystem|WebGPUCoordinateSystem)}
     * @default null
     */
    this.coordinateSystem = null;

    /**
     * 当前活动的mipmap级别
     * 用于控制渲染到哪个mipmap层级
     *
     * @type {number}
     * @default 0
     */
    this.activeMipmapLevel = 0;

    // 创建正X方向的透视相机（右面）
    const cameraPX = new PerspectiveCamera(fov, aspect, near, far);
    // 设置相机的渲染层级与立方体相机一致
    cameraPX.layers = this.layers;
    // 将相机添加为立方体相机的子对象
    this.add(cameraPX);

    // 创建负X方向的透视相机（左面）
    const cameraNX = new PerspectiveCamera(fov, aspect, near, far);
    // 设置相机的渲染层级与立方体相机一致
    cameraNX.layers = this.layers;
    // 将相机添加为立方体相机的子对象
    this.add(cameraNX);

    // 创建正Y方向的透视相机（上面）
    const cameraPY = new PerspectiveCamera(fov, aspect, near, far);
    // 设置相机的渲染层级与立方体相机一致
    cameraPY.layers = this.layers;
    // 将相机添加为立方体相机的子对象
    this.add(cameraPY);

    // 创建负Y方向的透视相机（下面）
    const cameraNY = new PerspectiveCamera(fov, aspect, near, far);
    // 设置相机的渲染层级与立方体相机一致
    cameraNY.layers = this.layers;
    // 将相机添加为立方体相机的子对象
    this.add(cameraNY);

    // 创建正Z方向的透视相机（前面）
    const cameraPZ = new PerspectiveCamera(fov, aspect, near, far);
    // 设置相机的渲染层级与立方体相机一致
    cameraPZ.layers = this.layers;
    // 将相机添加为立方体相机的子对象
    this.add(cameraPZ);

    // 创建负Z方向的透视相机（后面）
    const cameraNZ = new PerspectiveCamera(fov, aspect, near, far);
    // 设置相机的渲染层级与立方体相机一致
    cameraNZ.layers = this.layers;
    // 将相机添加为立方体相机的子对象
    this.add(cameraNZ);
  }

  /**
   * 当立方体相机的坐标系统发生变化时必须调用此方法
   * 用于重新配置6个子相机的朝向和上方向
   */
  updateCoordinateSystem() {
    // 获取当前的坐标系统
    const coordinateSystem = this.coordinateSystem;

    // 获取所有子相机的副本
    const cameras = this.children.concat();

    // 解构赋值获取6个方向的相机
    const [cameraPX, cameraNX, cameraPY, cameraNY, cameraPZ, cameraNZ] = cameras;

    // 先移除所有相机，准备重新配置
    for (const camera of cameras) this.remove(camera);

    // 根据坐标系统配置相机朝向
    if (coordinateSystem === WebGLCoordinateSystem) {
      // WebGL坐标系统配置
      // 正X方向相机（右面）
      cameraPX.up.set(0, 1, 0);
      cameraPX.lookAt(1, 0, 0);

      // 负X方向相机（左面）
      cameraNX.up.set(0, 1, 0);
      cameraNX.lookAt(-1, 0, 0);

      // 正Y方向相机（上面）
      cameraPY.up.set(0, 0, -1);
      cameraPY.lookAt(0, 1, 0);

      // 负Y方向相机（下面）
      cameraNY.up.set(0, 0, 1);
      cameraNY.lookAt(0, -1, 0);

      // 正Z方向相机（前面）
      cameraPZ.up.set(0, 1, 0);
      cameraPZ.lookAt(0, 0, 1);

      // 负Z方向相机（后面）
      cameraNZ.up.set(0, 1, 0);
      cameraNZ.lookAt(0, 0, -1);
    } else if (coordinateSystem === WebGPUCoordinateSystem) {
      // WebGPU坐标系统配置
      // 正X方向相机（右面）
      cameraPX.up.set(0, -1, 0);
      cameraPX.lookAt(-1, 0, 0);

      // 负X方向相机（左面）
      cameraNX.up.set(0, -1, 0);
      cameraNX.lookAt(1, 0, 0);

      // 正Y方向相机（上面）
      cameraPY.up.set(0, 0, 1);
      cameraPY.lookAt(0, 1, 0);

      // 负Y方向相机（下面）
      cameraNY.up.set(0, 0, -1);
      cameraNY.lookAt(0, -1, 0);

      // 正Z方向相机（前面）
      cameraPZ.up.set(0, -1, 0);
      cameraPZ.lookAt(0, 0, 1);

      // 负Z方向相机（后面）
      cameraNZ.up.set(0, -1, 0);
      cameraNZ.lookAt(0, 0, -1);
    } else {
      // 抛出错误：无效的坐标系统
      throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: " + coordinateSystem);
    }

    // 重新添加所有相机并更新其世界矩阵
    for (const camera of cameras) {
      // 将相机重新添加为子对象
      this.add(camera);

      // 更新相机的世界矩阵
      camera.updateMatrixWorld();
    }
  }

  /**
   * 调用此方法将使用给定的渲染器将给定场景渲染到相机的立方体渲染目标中
   *
   * @param {(Renderer|WebGLRenderer)} renderer - 渲染器
   * @param {Scene} scene - 要渲染的场景
   */
  update(renderer, scene) {
    // 如果没有父对象，更新世界矩阵
    if (this.parent === null) this.updateMatrixWorld();

    // 解构获取渲染目标和活动mipmap级别
    const { renderTarget, activeMipmapLevel } = this;

    // 如果坐标系统不匹配，更新坐标系统
    if (this.coordinateSystem !== renderer.coordinateSystem) {
      this.coordinateSystem = renderer.coordinateSystem;

      this.updateCoordinateSystem();
    }

    // 获取6个方向的相机
    const [cameraPX, cameraNX, cameraPY, cameraNY, cameraPZ, cameraNZ] = this.children;

    // 保存当前渲染器状态
    const currentRenderTarget = renderer.getRenderTarget();
    const currentActiveCubeFace = renderer.getActiveCubeFace();
    const currentActiveMipmapLevel = renderer.getActiveMipmapLevel();

    // 保存当前XR状态
    const currentXrEnabled = renderer.xr.enabled;

    // 禁用XR渲染
    renderer.xr.enabled = false;

    // 保存mipmap生成设置
    const generateMipmaps = renderTarget.texture.generateMipmaps;

    // 暂时禁用mipmap生成
    renderTarget.texture.generateMipmaps = false;

    // 渲染立方体的6个面
    // 面0：正X方向（右面）
    renderer.setRenderTarget(renderTarget, 0, activeMipmapLevel);
    renderer.render(scene, cameraPX);

    // 面1：负X方向（左面）
    renderer.setRenderTarget(renderTarget, 1, activeMipmapLevel);
    renderer.render(scene, cameraNX);

    // 面2：正Y方向（上面）
    renderer.setRenderTarget(renderTarget, 2, activeMipmapLevel);
    renderer.render(scene, cameraPY);

    // 面3：负Y方向（下面）
    renderer.setRenderTarget(renderTarget, 3, activeMipmapLevel);
    renderer.render(scene, cameraNY);

    // 面4：正Z方向（前面）
    renderer.setRenderTarget(renderTarget, 4, activeMipmapLevel);
    renderer.render(scene, cameraPZ);

    // mipmap在最后一次render()调用期间生成
    // 此时，立方体渲染目标的所有面都已定义

    // 恢复mipmap生成设置
    renderTarget.texture.generateMipmaps = generateMipmaps;

    // 面5：负Z方向（后面）- 最后渲染以触发mipmap生成
    renderer.setRenderTarget(renderTarget, 5, activeMipmapLevel);
    renderer.render(scene, cameraNZ);

    // 恢复原始渲染目标
    renderer.setRenderTarget(currentRenderTarget, currentActiveCubeFace, currentActiveMipmapLevel);

    // 恢复XR状态
    renderer.xr.enabled = currentXrEnabled;

    // 标记需要PMREM更新（预过滤环境贴图）
    renderTarget.texture.needsPMREMUpdate = true;
  }
}

// 导出CubeCamera类
export { CubeCamera };
