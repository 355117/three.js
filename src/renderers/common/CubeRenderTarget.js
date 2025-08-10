/**
 * CubeRenderTarget.js
 *
 * 立方体渲染目标 - 用于立方体贴图渲染和转换的渲染目标
 *
 * 这个类表示立方体渲染目标，是`WebGLCubeRenderTarget`的特殊版本，
 * 与`WebGPURenderer`兼容，并提供了等距柱状投影到立方体贴图的转换功能。
 */

// 导入节点系统相关模块
import { equirectUV } from "../../nodes/utils/EquirectUV.js"; // 等距柱状投影UV计算
import { texture as TSL_Texture } from "../../nodes/accessors/TextureNode.js"; // 纹理节点
import { positionWorldDirection } from "../../nodes/accessors/Position.js"; // 世界方向位置
import NodeMaterial from "../../materials/nodes/NodeMaterial.js"; // 节点材质

// 导入Three.js核心模块
import { WebGLCubeRenderTarget } from "../../renderers/WebGLCubeRenderTarget.js"; // WebGL立方体渲染目标基类
import { Scene } from "../../scenes/Scene.js"; // 场景
import { CubeCamera } from "../../cameras/CubeCamera.js"; // 立方体相机
import { BoxGeometry } from "../../geometries/BoxGeometry.js"; // 盒子几何体
import { Mesh } from "../../objects/Mesh.js"; // 网格对象
import { BackSide, NoBlending, LinearFilter, LinearMipmapLinearFilter } from "../../constants.js"; // 常量

// @TODO: 考虑将WebGLCubeRenderTarget重命名为CubeRenderTarget

/**
 * 立方体渲染目标类
 *
 * 这个类表示立方体渲染目标，是`WebGLCubeRenderTarget`的特殊版本，
 * 与`WebGPURenderer`兼容。它提供了立方体贴图的渲染功能，以及
 * 从等距柱状投影纹理转换为立方体贴图的便捷方法。
 *
 * 主要功能：
 * - 立方体贴图渲染
 * - 等距柱状投影转换
 * - 环境映射生成
 * - 天空盒创建
 *
 * @augments WebGLCubeRenderTarget
 */
class CubeRenderTarget extends WebGLCubeRenderTarget {
  /**
   * 构造新的立方体渲染目标
   *
   * 创建一个新的立方体渲染目标实例，用于渲染立方体贴图。
   * 立方体贴图由6个面组成，每个面都是正方形纹理。
   *
   * @param {number} [size=1] - 渲染目标的尺寸（每个面的边长）
   * @param {RenderTarget~Options} [options] - 配置对象，包含纹理格式、过滤方式等
   */
  constructor(size = 1, options = {}) {
    // 调用父类构造函数
    super(size, options);

    /**
     * 立方体渲染目标类型标识
     *
     * 这个标志可用于类型测试，帮助识别这是一个立方体渲染目标。
     * 在运行时可以通过检查这个属性来确定渲染目标类型。
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isCubeRenderTarget = true;
  }

  /**
   * 将给定的等距柱状投影纹理转换为立方体贴图
   *
   * 这个方法将等距柱状投影（全景）纹理转换为立方体贴图格式。
   * 等距柱状投影是一种将球面映射到矩形的投影方式，常用于
   * 全景图像和HDRI环境贴图。
   *
   * 转换过程：
   * 1. 创建一个内向的立方体几何体
   * 2. 使用特殊的UV映射将等距柱状投影重新映射到立方体面
   * 3. 使用立方体相机从6个方向渲染场景
   * 4. 生成最终的立方体贴图
   *
   * @param {import('../../renderers/WebGLRenderer.js').WebGLRenderer|import('../../renderers/webgpu/WebGPURenderer.js').default} renderer - 渲染器实例
   * @param {import('../../textures/Texture.js').Texture} texture - 等距柱状投影纹理
   * @return {CubeRenderTarget} 返回此立方体渲染目标的引用，支持链式调用
   */
  fromEquirectangularTexture(renderer, texture) {
    // 保存原始纹理设置，以便后续恢复
    const currentMinFilter = texture.minFilter;
    const currentGenerateMipmaps = texture.generateMipmaps;

    // 启用mipmap生成以获得更好的质量
    texture.generateMipmaps = true;

    // 复制源纹理的属性到目标立方体纹理
    this.texture.type = texture.type;
    this.texture.colorSpace = texture.colorSpace;

    // 设置立方体纹理的过滤和mipmap属性
    this.texture.generateMipmaps = texture.generateMipmaps;
    this.texture.minFilter = texture.minFilter;
    this.texture.magFilter = texture.magFilter;

    // 创建一个立方体几何体作为渲染载体
    // 使用较大的尺寸(5x5x5)确保完全覆盖相机视野
    const geometry = new BoxGeometry(5, 5, 5);

    // 创建等距柱状投影到立方体的UV映射节点
    // positionWorldDirection提供世界空间方向向量
    // equirectUV将方向向量转换为等距柱状投影的UV坐标
    const uvNode = equirectUV(positionWorldDirection);

    // 创建用于转换的材质
    const material = new NodeMaterial();
    material.colorNode = TSL_Texture(texture, uvNode, 0); // 使用自定义UV采样纹理
    material.side = BackSide; // 渲染内侧面，因为相机在立方体内部
    material.blending = NoBlending; // 不使用混合，直接替换颜色

    // 创建网格对象
    const mesh = new Mesh(geometry, material);

    // 创建临时场景并添加网格
    const scene = new Scene();
    scene.add(mesh);

    // 避免极点模糊问题
    // LinearMipmapLinearFilter在极点处可能产生模糊，改用LinearFilter
    if (texture.minFilter === LinearMipmapLinearFilter) texture.minFilter = LinearFilter;

    // 创建立方体相机，用于从6个方向渲染场景
    // 参数：近平面=1, 远平面=10, 渲染目标=this
    const camera = new CubeCamera(1, 10, this);

    // 保存当前的多渲染目标(MRT)设置并临时禁用
    const currentMRT = renderer.getMRT();
    renderer.setMRT(null);

    // 执行立方体渲染，生成6个面的纹理
    camera.update(renderer, scene);

    // 恢复原始的MRT设置
    renderer.setMRT(currentMRT);

    // 恢复原始纹理设置
    texture.minFilter = currentMinFilter;
    texture.currentGenerateMipmaps = currentGenerateMipmaps;

    // 清理临时资源，避免内存泄漏
    mesh.geometry.dispose();
    mesh.material.dispose();

    // 返回this以支持链式调用
    return this;
  }
}

// 导出立方体渲染目标类
export default CubeRenderTarget;
