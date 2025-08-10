// 导入核心3D对象类，Scene继承自Object3D
import { Object3D } from "../core/Object3D.js";
// 导入欧拉角类，用于处理旋转
import { Euler } from "../math/Euler.js";

/**
 * 场景类
 *
 * Scene 是 Three.js 中的核心容器类，用于设置要渲染的内容和位置
 * 场景是所有3D对象的根容器，包括网格、线条、灯光、相机等
 *
 * 主要功能：
 * - 作为所有3D对象的容器和组织结构
 * - 管理场景的全局设置（背景、环境、雾效果等）
 * - 提供场景级别的变换和层次结构
 * - 控制渲染相关的全局属性
 *
 * 场景层次结构：
 * Scene (根节点)
 * ├── Mesh (网格对象)
 * ├── Light (灯光)
 * ├── Camera (相机)
 * ├── Group (组对象)
 * │   ├── Mesh
 * │   └── Mesh
 * └── ...
 *
 * 使用场景：
 * - 3D应用程序的主要容器
 * - 游戏世界的根对象
 * - 可视化应用的数据容器
 * - VR/AR应用的虚拟环境
 *
 * @augments Object3D - 继承自Object3D，具有变换、层次结构等基础功能
 */
class Scene extends Object3D {
  /**
   * 构造一个新的场景实例
   *
   * 创建一个空的场景，初始化所有默认属性
   * 场景创建后可以添加各种3D对象、设置背景、配置环境等
   */
  constructor() {
    // 调用父类Object3D的构造函数
    super();

    /**
     * 类型标识符
     *
     * 用于运行时类型检测，可以通过此属性判断对象是否为 Scene 实例
     * 这是 Three.js 中常用的类型检测模式
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isScene = true;

    /**
     * 对象类型名称
     *
     * 标识此对象的类型为 'Scene'，用于序列化、调试等用途
     *
     * @type {string}
     * @default 'Scene'
     */
    this.type = "Scene";

    // ===== 背景和环境设置 =====

    /**
     * 场景背景
     *
     * 定义场景的背景，支持多种类型的背景设置
     * 背景会在所有其他对象之后渲染，作为场景的最远层
     *
     * 支持的背景类型：
     * - Color: 纯色背景，创建统一的颜色背景
     * - Texture: 平面纹理背景，将纹理平铺作为背景
     * - CubeTexture: 立方体纹理（天空盒），创建360度环境
     * - EquirectangularTexture: 等距柱状投影纹理，常用于HDR环境
     *
     * 使用示例：
     * ```js
     * // 纯色背景
     * scene.background = new THREE.Color(0x87CEEB);
     *
     * // 天空盒背景
     * scene.background = cubeTexture;
     *
     * // HDR环境背景
     * scene.background = hdrTexture;
     * ```
     *
     * @type {?(Color|Texture|CubeTexture)}
     * @default null
     */
    this.background = null;

    /**
     * 环境贴图
     *
     * 为场景中所有物理材质设置环境贴图，用于反射和环境光照
     * 环境贴图提供基于图像的光照（IBL），增强材质的真实感
     *
     * 注意事项：
     * - 不会覆盖材质上已经设置的 envMap 属性
     * - 主要影响 MeshStandardMaterial 和 MeshPhysicalMaterial
     * - 可以与背景设置不同，实现更灵活的光照效果
     *
     * 使用场景：
     * - PBR材质的环境反射
     * - 基于图像的光照
     * - 真实感渲染
     *
     * @type {?Texture}
     * @default null
     */
    this.environment = null;

    /**
     * 雾效果实例
     *
     * 定义影响场景中所有渲染对象的雾效果类型
     * 雾效果可以增强场景的深度感和大气感
     *
     * 支持的雾类型：
     * - Fog: 线性雾，雾密度随距离线性变化
     * - FogExp2: 指数平方雾，提供更自然的雾效果
     *
     * 雾效果的作用：
     * - 增强场景的深度感和层次感
     * - 模拟真实世界的大气效果
     * - 隐藏远距离物体，优化渲染性能
     * - 创造特定的视觉氛围
     *
     * @type {?(Fog|FogExp2)}
     * @default null
     */
    this.fog = null;

    // ===== 背景视觉效果设置 =====

    /**
     * 背景模糊度
     *
     * 设置背景的模糊程度，仅影响分配给 background 的环境贴图
     * 可以创造景深效果或柔化背景细节
     *
     * 取值范围：0.0 到 1.0
     * - 0.0: 完全清晰，无模糊效果
     * - 1.0: 最大模糊，背景变得非常柔和
     *
     * 使用场景：
     * - 突出前景对象
     * - 创造景深效果
     * - 柔化HDR环境的高频细节
     *
     * @type {number}
     * @default 0
     */
    this.backgroundBlurriness = 0;

    /**
     * 背景强度
     *
     * 调节背景的颜色强度，仅适用于背景纹理
     * 可以控制背景的亮度和对比度
     *
     * 取值说明：
     * - 1.0: 原始强度（默认）
     * - >1.0: 增强亮度，背景更明亮
     * - <1.0: 降低亮度，背景更暗淡
     * - 0.0: 完全黑色背景
     *
     * 使用场景：
     * - 调整场景整体亮度
     * - 匹配不同光照条件
     * - 创造特定的视觉氛围
     *
     * @type {number}
     * @default 1
     */
    this.backgroundIntensity = 1;

    /**
     * 背景旋转
     *
     * 设置背景的旋转角度（以弧度为单位）
     * 仅影响分配给 background 的环境贴图
     *
     * 使用场景：
     * - 调整天空盒的方向
     * - 匹配场景中物体的朝向
     * - 创造动态的背景效果
     * - 校正HDR环境贴图的方向
     *
     * 注意事项：
     * - 旋转顺序为 XYZ 欧拉角
     * - 角度以弧度为单位
     * - 仅对环境贴图类型的背景有效
     *
     * @type {Euler}
     * @default (0,0,0)
     */
    this.backgroundRotation = new Euler();

    // ===== 环境设置 =====

    /**
     * 环境强度
     *
     * 调节环境贴图的颜色强度，仅影响分配给 environment 的环境贴图
     * 控制环境光照对材质的影响程度
     *
     * 取值说明：
     * - 1.0: 原始强度（默认）
     * - >1.0: 增强环境光照，材质反射更明亮
     * - <1.0: 减弱环境光照，材质反射更暗淡
     * - 0.0: 无环境光照影响
     *
     * 使用场景：
     * - 调整材质的环境反射强度
     * - 匹配不同的光照条件
     * - 创造特定的视觉效果
     * - 平衡直接光照和环境光照
     *
     * @type {number}
     * @default 1
     */
    this.environmentIntensity = 1;

    /**
     * 环境贴图旋转
     *
     * 设置环境贴图的旋转角度（以弧度为单位）
     * 仅在使用 environment 时影响场景中的物理材质
     *
     * 使用场景：
     * - 调整环境反射的方向
     * - 匹配场景光照的主要方向
     * - 创造动态的环境光照效果
     * - 校正环境贴图的方向
     *
     * 注意事项：
     * - 旋转顺序为 XYZ 欧拉角
     * - 角度以弧度为单位
     * - 影响所有使用环境贴图的物理材质
     *
     * @type {Euler}
     * @default (0,0,0)
     */
    this.environmentRotation = new Euler();

    // ===== 材质覆盖设置 =====

    /**
     * 材质覆盖
     *
     * 强制场景中的所有对象使用指定的材质进行渲染
     * 可以通过设置材质的 allowOverride 属性为 false 来排除特定材质
     *
     * 使用场景：
     * - 创建线框模式或深度可视化
     * - 实现特殊的渲染效果
     * - 调试和分析场景
     * - 创建统一的视觉风格
     *
     * 覆盖规则：
     * - 所有对象都会使用此材质渲染
     * - 原始材质的几何信息仍然保留
     * - 可以通过 Material.allowOverride = false 排除特定材质
     *
     * 性能考虑：
     * - 可以减少材质切换，提高渲染性能
     * - 适用于需要统一渲染风格的场景
     *
     * @type {?Material}
     * @default null
     */
    this.overrideMaterial = null;

    // ===== 开发工具集成 =====

    // 如果存在 Three.js 开发工具，通知其观察此场景实例
    // 这用于浏览器扩展或调试工具的集成
    if (typeof __THREE_DEVTOOLS__ !== "undefined") {
      __THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe", { detail: this }));
    }
  }

  // ===== 场景操作方法 =====

  /**
   * 复制另一个场景的属性到当前场景
   *
   * 从源场景复制所有相关属性，包括背景、环境、雾效果等
   * 这是一个深拷贝操作，会克隆所有可克隆的对象
   *
   * 复制的属性包括：
   * - 背景设置（background）
   * - 环境贴图（environment）
   * - 雾效果（fog）
   * - 所有视觉效果参数
   * - 材质覆盖设置
   * - 矩阵自动更新设置
   *
   * 使用场景：
   * - 场景模板的复制
   * - 场景状态的备份和恢复
   * - 批量创建相似场景
   *
   * @param {Scene} source - 源场景对象
   * @param {boolean} recursive - 是否递归复制子对象（继承自Object3D）
   * @return {Scene} 返回当前场景实例，支持链式调用
   */
  copy(source, recursive) {
    // 调用父类的复制方法，处理基础的Object3D属性
    super.copy(source, recursive);

    // 复制背景设置（如果存在则克隆）
    if (source.background !== null) this.background = source.background.clone();
    // 复制环境贴图（如果存在则克隆）
    if (source.environment !== null) this.environment = source.environment.clone();
    // 复制雾效果（如果存在则克隆）
    if (source.fog !== null) this.fog = source.fog.clone();

    // 复制背景视觉效果参数
    this.backgroundBlurriness = source.backgroundBlurriness;
    this.backgroundIntensity = source.backgroundIntensity;
    this.backgroundRotation.copy(source.backgroundRotation);

    // 复制环境设置参数
    this.environmentIntensity = source.environmentIntensity;
    this.environmentRotation.copy(source.environmentRotation);

    // 复制材质覆盖设置（如果存在则克隆）
    if (source.overrideMaterial !== null) this.overrideMaterial = source.overrideMaterial.clone();

    // 复制矩阵自动更新设置
    this.matrixAutoUpdate = source.matrixAutoUpdate;

    // 返回当前实例，支持链式调用
    return this;
  }

  /**
   * 将场景序列化为 JSON 格式
   *
   * 将场景的所有属性转换为 JSON 对象，用于数据存储、传输或场景保存
   * 继承自 Object3D 的基础序列化功能，并添加场景特有的属性
   *
   * 序列化的场景属性包括：
   * - 雾效果设置
   * - 背景视觉效果参数（模糊度、强度、旋转）
   * - 环境设置参数（强度、旋转）
   * - 继承自 Object3D 的基础属性
   *
   * 优化策略：
   * - 只序列化非默认值的属性，减少数据大小
   * - 旋转信息转换为数组格式便于存储
   *
   * 使用场景：
   * - 场景文件的保存和加载
   * - 网络传输和数据交换
   * - 场景状态的备份
   * - 配置文件的生成
   *
   * @param {Object} meta - 序列化元信息，包含纹理、材质等共享资源的映射
   * @return {Object} 表示序列化场景的 JSON 对象
   */
  toJSON(meta) {
    // 调用父类的序列化方法，获取基础的Object3D数据
    const data = super.toJSON(meta);

    // 序列化雾效果（如果存在）
    if (this.fog !== null) data.object.fog = this.fog.toJSON();

    // 序列化背景视觉效果参数（仅当非默认值时）
    if (this.backgroundBlurriness > 0) data.object.backgroundBlurriness = this.backgroundBlurriness;
    if (this.backgroundIntensity !== 1) data.object.backgroundIntensity = this.backgroundIntensity;
    data.object.backgroundRotation = this.backgroundRotation.toArray(); // 转换为数组格式

    // 序列化环境设置参数（仅当非默认值时）
    if (this.environmentIntensity !== 1) data.object.environmentIntensity = this.environmentIntensity;
    data.object.environmentRotation = this.environmentRotation.toArray(); // 转换为数组格式

    return data;
  }
}

// ===== 模块导出 =====

/**
 * 导出 Scene 类
 *
 * Scene 类是 Three.js 中的核心容器类，用于组织和管理3D场景
 * 提供了完整的场景管理功能，包括对象层次结构、背景设置、环境配置等
 * 是构建3D应用程序的基础组件
 */
export { Scene };
