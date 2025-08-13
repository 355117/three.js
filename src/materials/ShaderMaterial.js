// 导入基础材质类
import { Material } from "./Material.js";
// 导入uniform工具函数
import { cloneUniforms, cloneUniformsGroups } from "../renderers/shaders/UniformsUtils.js";

// 导入默认顶点着色器
import default_vertex from "../renderers/shaders/ShaderChunk/default_vertex.glsl.js";
// 导入默认片段着色器
import default_fragment from "../renderers/shaders/ShaderChunk/default_fragment.glsl.js";

/**
 * 使用自定义着色器渲染的材质。着色器是用GLSL编写的在GPU上运行的小程序。
 * A material rendered with custom shaders. A shader is a small program written in GLSL.
 * that runs on the GPU.
 * 如果您需要实现任何内置材质中未包含的效果，您可能希望使用自定义着色器。
 * You may want to use a custom shader if you need to implement an effect not included with any of the built-in materials.
 *
 * 使用`ShaderMaterial`时需要注意以下几点：
 * There are the following notes to bear in mind when using a `ShaderMaterial`:
 *
 * - `ShaderMaterial`只能与{@link WebGLRenderer}一起使用。
 * - `ShaderMaterial` can only be used with {@link WebGLRenderer}.
 * - 内置的属性和uniform会与您的代码一起传递给着色器。如果您不希望这样，请使用{@link RawShaderMaterial}。
 * - Built in attributes and uniforms are passed to the shaders along with your code. If you don't want that, use {@link RawShaderMaterial} instead.
 * - 您可以使用指令`#pragma unroll_loop_start`和`#pragma unroll_loop_end`来通过着色器预处理器展开GLSL中的`for`循环。
 * - You can use the directive `#pragma unroll_loop_start` and `#pragma unroll_loop_end`
 * in order to unroll a `for` loop in GLSL by the shader preprocessor.
 * 指令必须放在循环的正上方。循环格式必须符合定义的标准。
 * The directive has to be placed right above the loop. The loop formatting has to correspond to a defined standard.
 *   - 循环必须是[标准化的]{@link https://en.wikipedia.org/wiki/Normalized_loop}。
 *   - The loop has to be [normalized]{@link https://en.wikipedia.org/wiki/Normalized_loop}.
 *   - 循环变量必须是*i*。
 *   - The loop variable has to be *i*.
 *   - 值`UNROLLED_LOOP_INDEX`将被替换为给定迭代的*i*的显式值，并可在预处理器语句中使用。
 *   - The value `UNROLLED_LOOP_INDEX` will be replaced with the explicitly
 * value of *i* for the given iteration and can be used in preprocessor statements.
 *
 * ```js
 * const material = new THREE.ShaderMaterial( {
 * 	uniforms: {
 * 		time: { value: 1.0 },
 * 		resolution: { value: new THREE.Vector2() }
 * 	},
 * 	vertexShader: document.getElementById( 'vertexShader' ).textContent,
 * 	fragmentShader: document.getElementById( 'fragmentShader' ).textContent
 * } );
 * ```
 *
 * @augments Material
 */
class ShaderMaterial extends Material {
  /**
   * 构造一个新的着色器材质。
   * Constructs a new shader material.
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
    super();

    /**
     * 此标志可用于类型测试。
     * This flag can be used for type testing.
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isShaderMaterial = true;

    // 设置材质类型
    this.type = "ShaderMaterial";

    /**
     * 在顶点着色器和片段着色器的GLSL代码中使用`#define`指令定义自定义常量；
     * Defines custom constants using `#define` directives within the GLSL code
     * for both the vertex shader and the fragment shader;
     * 每个键/值对产生另一个指令。
     * each key/value pair yields another directive.
     * ```js
     * defines: {
     * 	FOO: 15,
     * 	BAR: true
     * }
     * ```
     * 产生以下行：
     * Yields the lines:
     * ```
     * #define FOO 15
     * #define BAR true
     * ```
     *
     * @type {Object}
     */
    this.defines = {};

    /**
     * 形式如下的对象：
     * An object of the form:
     * ```js
     * {
     * 	"uniform1": { value: 1.0 },
     * 	"uniform2": { value: 2 }
     * }
     * ```
     * 指定要传递给着色器代码的uniform；键是uniform名称，值是以下形式的定义
     * specifying the uniforms to be passed to the shader code; keys are uniform
     * names, values are definitions of the form
     * ```
     * {
     * 	value: 1.0
     * }
     * ```
     * 其中`value`是uniform的值。名称必须与GLSL代码中定义的uniform名称匹配。
     * where `value` is the value of the uniform. Names must match the name of
     * the uniform, as defined in the GLSL code.
     * 请注意，uniform在每一帧都会刷新，因此更新uniform的值将立即更新GLSL代码中可用的值。
     * Note that uniforms are refreshed on every frame, so updating the value of the uniform will immediately update the value available to the GLSL code.
     *
     * @type {Object}
     */
    this.uniforms = {};

    /**
     * 用于配置UBO的uniform组数组。
     * An array holding uniforms groups for configuring UBOs.
     *
     * @type {Array<UniformsGroup>}
     */
    this.uniformsGroups = [];

    /**
     * 顶点着色器GLSL代码。这是着色器的实际代码。
     * Vertex shader GLSL code. This is the actual code for the shader.
     *
     * @type {string}
     */
    this.vertexShader = default_vertex;

    /**
     * 片段着色器GLSL代码。这是着色器的实际代码。
     * Fragment shader GLSL code. This is the actual code for the shader.
     *
     * @type {string}
     */
    this.fragmentShader = default_fragment;

    /**
     * 控制线条的粗细。
     * Controls line thickness or lines.
     *
     * WebGL和WebGPU忽略此设置，始终以一个像素的宽度渲染线图元。
     * WebGL and WebGPU ignore this setting and always render line primitives with a
     * width of one pixel.
     *
     * @type {number}
     * @default 1
     */
    this.linewidth = 1;

    /**
     * 将几何体渲染为线框。
     * Renders the geometry as a wireframe.
     *
     * @type {boolean}
     * @default false
     */
    this.wireframe = false;

    /**
     * 控制线框的粗细。
     * Controls the thickness of the wireframe.
     *
     * WebGL和WebGPU忽略此属性，始终渲染1像素宽的线条。
     * WebGL and WebGPU ignore this property and always render
     * 1 pixel wide lines.
     *
     * @type {number}
     * @default 1
     */
    this.wireframeLinewidth = 1;

    /**
     * 定义材质颜色是否受全局雾设置影响；`true`表示将雾uniform传递给着色器。
     * Define whether the material color is affected by global fog settings; `true`
     * to pass fog uniforms to the shader.
     *
     * @type {boolean}
     * @default false
     */
    this.fog = false;

    /**
     * 定义此材质是否使用光照；`true`表示将与光照相关的uniform数据传递给此着色器。
     * Defines whether this material uses lighting; `true` to pass uniform data
     * related to lighting to this shader.
     *
     * @type {boolean}
     * @default false
     */
    this.lights = false;

    /**
     * 定义此材质是否支持裁剪；`true`表示让渲染器传递clippingPlanes uniform。
     * Defines whether this material supports clipping; `true` to let the renderer
     * pass the clippingPlanes uniform.
     *
     * @type {boolean}
     * @default false
     */
    this.clipping = false;

    /**
     * 被重写并默认设置为`true`。
     * Overwritten and set to `true` by default.
     *
     * @type {boolean}
     * @default true
     */
    this.forceSinglePass = true;

    /**
     * 此对象允许启用某些WebGL 2扩展。
     * This object allows to enable certain WebGL 2 extensions.
     *
     * - clipCullDistance: 设置为`true`以使用顶点着色器裁剪
     * - clipCullDistance: set to `true` to use vertex shader clipping
     * - multiDraw: 设置为`true`以使用顶点着色器multi_draw / 启用gl_DrawID
     * - multiDraw: set to `true` to use vertex shader multi_draw / enable gl_DrawID
     *
     * @type {{clipCullDistance:false,multiDraw:false}}
     */
    this.extensions = {
      clipCullDistance: false, // 设置为使用顶点着色器裁剪
      multiDraw: false, // 设置为使用顶点着色器multi_draw / 启用gl_DrawID
    };

    /**
     * 当渲染的几何体不包含这些属性但材质包含时，这些默认值将传递给着色器。
     * When the rendered geometry doesn't include these attributes but the
     * material does, these default values will be passed to the shaders.
     * 这避免了缓冲区数据缺失时的错误。
     * This avoids errors when buffer data is missing.
     *
     * - color: [ 1, 1, 1 ]
     * - uv: [ 0, 0 ]
     * - uv1: [ 0, 0 ]
     *
     * @type {Object}
     */
    this.defaultAttributeValues = {
      color: [1, 1, 1],
      uv: [0, 0],
      uv1: [0, 0],
    };

    /**
     * 如果设置，这将调用[gl.bindAttribLocation]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/bindAttribLocation}
     * If set, this calls [gl.bindAttribLocation]{@link https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/bindAttribLocation}
     * 将通用顶点索引绑定到属性变量。
     * to bind a generic vertex index to an attribute variable.
     *
     * @type {string|undefined}
     * @default undefined
     */
    this.index0AttributeName = undefined;

    /**
     * 可用于在{@link Object3D#onBeforeRender}中更改uniform时强制uniform更新。
     * Can be used to force a uniform update while changing uniforms in
     * {@link Object3D#onBeforeRender}.
     *
     * @type {boolean}
     * @default false
     */
    this.uniformsNeedUpdate = false;

    /**
     * 定义自定义着色器代码的GLSL版本。
     * Defines the GLSL version of custom shader code.
     *
     * @type {?(GLSL1|GLSL3)}
     * @default null
     */
    this.glslVersion = null;

    // 如果提供了参数，设置参数值
    if (parameters !== undefined) {
      this.setValues(parameters);
    }
  }

  /**
   * 复制另一个ShaderMaterial的属性到当前材质。
   * Copy properties from another ShaderMaterial to this material.
   *
   * @param {ShaderMaterial} source - 要复制的源材质
   * @returns {ShaderMaterial} 返回当前材质实例，支持链式调用
   */
  copy(source) {
    // 调用父类的copy方法
    super.copy(source);

    // 复制片段着色器代码
    this.fragmentShader = source.fragmentShader;
    // 复制顶点着色器代码
    this.vertexShader = source.vertexShader;

    // 克隆uniform对象
    this.uniforms = cloneUniforms(source.uniforms);
    // 克隆uniform组
    this.uniformsGroups = cloneUniformsGroups(source.uniformsGroups);

    // 复制定义对象
    this.defines = Object.assign({}, source.defines);

    // 复制线框属性
    this.wireframe = source.wireframe;
    // 复制线框线宽
    this.wireframeLinewidth = source.wireframeLinewidth;

    // 复制雾效果属性
    this.fog = source.fog;
    // 复制光照属性
    this.lights = source.lights;
    // 复制裁剪属性
    this.clipping = source.clipping;

    // 复制扩展对象
    this.extensions = Object.assign({}, source.extensions);

    // 复制GLSL版本
    this.glslVersion = source.glslVersion;

    // 返回当前实例以支持链式调用
    return this;
  }

  /**
   * 将材质序列化为JSON格式。
   * Serialize the material to JSON format.
   *
   * @param {Object} meta - 元数据对象，包含纹理、图像等的映射
   * @returns {Object} 序列化后的材质数据
   */
  toJSON(meta) {
    // 调用父类的toJSON方法
    const data = super.toJSON(meta);

    // 设置GLSL版本
    data.glslVersion = this.glslVersion;
    // 初始化uniform数据对象
    data.uniforms = {};

    // 遍历所有uniform
    for (const name in this.uniforms) {
      const uniform = this.uniforms[name];
      const value = uniform.value;

      // 如果值是纹理
      if (value && value.isTexture) {
        data.uniforms[name] = {
          type: "t",
          value: value.toJSON(meta).uuid,
        };
      } else if (value && value.isColor) {
        // 如果值是颜色
        data.uniforms[name] = {
          type: "c",
          value: value.getHex(),
        };
      } else if (value && value.isVector2) {
        // 如果值是二维向量
        data.uniforms[name] = {
          type: "v2",
          value: value.toArray(),
        };
      } else if (value && value.isVector3) {
        // 如果值是三维向量
        data.uniforms[name] = {
          type: "v3",
          value: value.toArray(),
        };
      } else if (value && value.isVector4) {
        // 如果值是四维向量
        data.uniforms[name] = {
          type: "v4",
          value: value.toArray(),
        };
      } else if (value && value.isMatrix3) {
        // 如果值是3x3矩阵
        data.uniforms[name] = {
          type: "m3",
          value: value.toArray(),
        };
      } else if (value && value.isMatrix4) {
        // 如果值是4x4矩阵
        data.uniforms[name] = {
          type: "m4",
          value: value.toArray(),
        };
      } else {
        // 其他类型的值
        data.uniforms[name] = {
          value: value,
        };

        // 注意：数组变体v2v、v3v、v4v、m4v和tv目前不支持
        // note: the array variants v2v, v3v, v4v, m4v and tv are not supported so far
      }
    }

    // 如果有定义，添加到数据中
    if (Object.keys(this.defines).length > 0) data.defines = this.defines;

    // 设置着色器代码
    data.vertexShader = this.vertexShader;
    data.fragmentShader = this.fragmentShader;

    // 设置光照和裁剪属性
    data.lights = this.lights;
    data.clipping = this.clipping;

    // 处理扩展
    const extensions = {};

    for (const key in this.extensions) {
      if (this.extensions[key] === true) extensions[key] = true;
    }

    // 如果有扩展，添加到数据中
    if (Object.keys(extensions).length > 0) data.extensions = extensions;

    // 返回序列化后的数据
    return data;
  }
}

/**
 * 此类型表示存储和运行着色器代码所需的字段。
 * This type represents the fields required to store and run the shader code.
 *
 * @typedef {Object} ShaderMaterial~Shader
 * @property {string} name - 着色器的名称。The name of the shader.
 * @property {Object<string, Uniform>} uniforms - 着色器的uniform。The uniforms of the shader.
 * @property {Object<string, any>} defines - 着色器的定义。The defines of the shader.
 * @property {string} vertexShader - 顶点着色器代码。The vertex shader code.
 * @property {string} fragmentShader - 片段着色器代码。The fragment shader code.
 **/

// 导出ShaderMaterial类
export { ShaderMaterial };
