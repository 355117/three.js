// 导入渲染相关的常量、几何体、材质和纹理类
import { BackSide, LinearFilter, LinearMipmapLinearFilter, NoBlending } from "../constants.js";
import { Mesh } from "../objects/Mesh.js";
import { BoxGeometry } from "../geometries/BoxGeometry.js";
import { ShaderMaterial } from "../materials/ShaderMaterial.js";
import { cloneUniforms } from "./shaders/UniformsUtils.js";
import { WebGLRenderTarget } from "./WebGLRenderTarget.js";
import { CubeCamera } from "../cameras/CubeCamera.js";
import { CubeTexture } from "../textures/CubeTexture.js";

/**
 * WebGL 立方体渲染目标
 *
 * 用于在 WebGL 渲染器上下文中创建立方体贴图的渲染目标。
 * 主要用于环境映射、反射、折射等效果的实现。
 *
 * 立方体渲染目标包含6个面（+X, -X, +Y, -Y, +Z, -Z），
 * 每个面都是一个正方形的渲染表面。
 *
 * @augments WebGLRenderTarget
 */
class WebGLCubeRenderTarget extends WebGLRenderTarget {
  /**
   * 构造一个新的立方体渲染目标
   *
   * @param {number} [size=1] - 渲染目标的尺寸（每个面的边长）
   * @param {RenderTarget~Options} [options] - 配置选项对象
   */
  constructor(size = 1, options = {}) {
    // 调用父类构造函数，创建正方形的渲染目标
    super(size, size, options);

    /**
     * 类型标识符，用于类型检测
     * 可以通过此属性判断对象是否为 WebGLCubeRenderTarget 实例
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isWebGLCubeRenderTarget = true;

    // 创建立方体贴图的6个面的图像描述符
    const image = { width: size, height: size, depth: 1 };
    const images = [image, image, image, image, image, image]; // 6个面：+X, -X, +Y, -Y, +Z, -Z

    /**
     * 立方体纹理对象
     * 重写了父类的 texture 属性，使用 CubeTexture 而不是普通的 Texture
     *
     * @type {CubeTexture}
     */
    this.texture = new CubeTexture(images);
    this._setTextureOptions(options);

    // 坐标系约定说明：
    // 根据约定（可能基于1990年代的 RenderMan 规范），WebGL（和 three.js）中的立方体贴图
    // 使用左手坐标系定义，即当沿着正Z轴向上看时，正X轴指向右侧。
    // 通过延续这一约定，现有的立方体贴图能够继续正确渲染。

    // three.js 使用右手坐标系。因此在 three.js 中使用的环境贴图看起来 px 和 nx 面是交换的，
    // isRenderTargetTexture 标志控制这种转换。当使用 WebGLCubeRenderTarget.texture 作为
    // 立方体纹理时不需要翻转（当立方体纹理的 isRenderTargetTexture 设置为 true 时会被检测到）。

    this.texture.isRenderTargetTexture = true;
  }

  /**
   * 将等距柱状投影纹理转换为立方体贴图
   *
   * 这个方法将全景图（等距柱状投影格式）转换为立方体贴图格式。
   * 等距柱状投影是一种将球面映射到矩形的投影方式，常用于全景图像。
   * 转换过程通过在立方体内部渲染全景图来实现。
   *
   * @param {WebGLRenderer} renderer - WebGL 渲染器实例
   * @param {Texture} texture - 等距柱状投影纹理（全景图）
   * @return {WebGLCubeRenderTarget} 返回当前立方体渲染目标的引用（支持链式调用）
   */
  fromEquirectangularTexture(renderer, texture) {
    // 复制源纹理的属性到立方体纹理
    this.texture.type = texture.type; // 数据类型（如 FloatType, UnsignedByteType）
    this.texture.colorSpace = texture.colorSpace; // 颜色空间（如 sRGB, Linear）

    // 复制纹理过滤和 mipmap 设置
    this.texture.generateMipmaps = texture.generateMipmaps; // 是否生成 mipmap
    this.texture.minFilter = texture.minFilter; // 缩小过滤方式
    this.texture.magFilter = texture.magFilter; // 放大过滤方式

    // 定义用于等距柱状投影转换的着色器
    const shader = {
      // 着色器 uniform 变量
      uniforms: {
        tEquirect: { value: null }, // 等距柱状投影纹理
      },

      // 顶点着色器：计算世界空间方向向量
      vertexShader: /* glsl */ `

				varying vec3 vWorldDirection;

				// 变换方向向量到世界空间
				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					// 将顶点位置转换为世界空间方向向量
					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,

      // 片段着色器：从等距柱状投影纹理采样
      fragmentShader: /* glsl */ `

				uniform sampler2D tEquirect; // 等距柱状投影纹理

				varying vec3 vWorldDirection; // 来自顶点着色器的世界方向

				#include <common>

				void main() {

					// 标准化方向向量
					vec3 direction = normalize( vWorldDirection );

					// 将3D方向向量转换为等距柱状投影的UV坐标
					vec2 sampleUV = equirectUv( direction );

					// 从等距柱状投影纹理采样
					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`,
    };

    // 创建立方体几何体，用作渲染的容器
    // 尺寸设为5x5x5，确保相机在立方体内部
    const geometry = new BoxGeometry(5, 5, 5);

    // 创建着色器材质，用于等距柱状投影转换
    const material = new ShaderMaterial({
      name: "CubemapFromEquirect", // 材质名称，用于调试

      uniforms: cloneUniforms(shader.uniforms), // 克隆 uniform 变量
      vertexShader: shader.vertexShader, // 顶点着色器
      fragmentShader: shader.fragmentShader, // 片段着色器
      side: BackSide, // 渲染立方体内侧面
      blending: NoBlending, // 不使用混合
    });

    // 设置等距柱状投影纹理到 uniform 变量
    material.uniforms.tEquirect.value = texture;

    // 创建网格对象，结合几何体和材质
    const mesh = new Mesh(geometry, material);

    // 保存原始的最小过滤设置
    const currentMinFilter = texture.minFilter;

    // 避免极点模糊问题
    // LinearMipmapLinearFilter 在极点处可能产生模糊，临时改为 LinearFilter
    if (texture.minFilter === LinearMipmapLinearFilter) texture.minFilter = LinearFilter;

    // 创建立方体相机，用于渲染6个面
    // 参数：近平面=1, 远平面=10, 渲染目标=this
    const camera = new CubeCamera(1, 10, this);
    // 更新相机，渲染网格到立方体贴图的6个面
    camera.update(renderer, mesh);

    // 恢复原始的过滤设置
    texture.minFilter = currentMinFilter;

    // 清理临时资源，防止内存泄漏
    mesh.geometry.dispose();
    mesh.material.dispose();

    // 返回当前实例，支持链式调用
    return this;
  }

  /**
   * 清除立方体渲染目标的所有面
   *
   * 遍历立方体贴图的6个面，分别清除每个面的缓冲区。
   * 这个方法确保所有面都被正确清除，为下一次渲染做准备。
   *
   * @param {WebGLRenderer} renderer - WebGL 渲染器实例
   * @param {boolean} [color=true] - 是否清除颜色缓冲区
   * @param {boolean} [depth=true] - 是否清除深度缓冲区
   * @param {boolean} [stencil=true] - 是否清除模板缓冲区
   */
  clear(renderer, color = true, depth = true, stencil = true) {
    // 保存当前的渲染目标，以便稍后恢复
    const currentRenderTarget = renderer.getRenderTarget();

    // 遍历立方体贴图的6个面
    // 0: +X, 1: -X, 2: +Y, 3: -Y, 4: +Z, 5: -Z
    for (let i = 0; i < 6; i++) {
      // 设置当前面为渲染目标
      renderer.setRenderTarget(this, i);

      // 清除指定的缓冲区
      renderer.clear(color, depth, stencil);
    }

    // 恢复之前的渲染目标
    renderer.setRenderTarget(currentRenderTarget);
  }
}

// 导出 WebGL 立方体渲染目标类
export { WebGLCubeRenderTarget };
