// 导入着色器材质类
import { ShaderMaterial } from "./ShaderMaterial.js";

/**
 * 这个类的工作方式与{@link ShaderMaterial}完全相同，
 * This class works just like {@link ShaderMaterial},
 * 除了内置的uniform和attribute定义不会自动添加到GLSL着色器代码前面。
 * except that definitions of built-in uniforms and attributes are not automatically prepended to the GLSL shader code.
 *
 * `RawShaderMaterial`只能与{@link WebGLRenderer}一起使用。
 * `RawShaderMaterial` can only be used with {@link WebGLRenderer}.
 *
 * @augments ShaderMaterial
 */
class RawShaderMaterial extends ShaderMaterial {
  /**
   * 构造一个新的原始着色器材质。
   * Constructs a new raw shader material.
   *
   * @param {Object} [parameters] - 包含一个或多个属性的对象，用于定义材质的外观
   * An object with one or more properties defining the material's appearance.
   * 材质的任何属性（包括从继承材质的任何属性）都可以在这里传递。
   * Any property of the material (including any property from inherited materials) can be passed in here.
   * 颜色值可以传递{@link Color#set}接受的任何类型的值。
   * Color values can be passed any type of value accepted by {@link Color#set}.
   */
  constructor(parameters) {
    // 调用父类构造函数
    super(parameters);

    /**
     * 此标志可用于类型测试。
     * This flag can be used for type testing.
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isRawShaderMaterial = true;

    // 设置材质类型
    this.type = "RawShaderMaterial";
  }
}

// 导出RawShaderMaterial类
export { RawShaderMaterial };
