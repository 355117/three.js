/**
 * GLSLNodeBuilder.js
 *
 * GLSL节点构建器 - 负责将Three.js的节点材质系统转换为GLSL着色器代码
 * 这是WebGL渲染器的核心组件，用于生成顶点着色器、片段着色器和计算着色器
 */

// 导入节点系统相关模块
import { GLSLNodeParser, NodeBuilder, TextureNode, vectorComponents } from "../../../nodes/Nodes.js";

// 导入通用节点缓冲区和组管理模块
import NodeUniformBuffer from "../../common/nodes/NodeUniformBuffer.js";
import NodeUniformsGroup from "../../common/nodes/NodeUniformsGroup.js";

// 导入纹理采样节点模块
import { NodeSampledTexture, NodeSampledCubeTexture, NodeSampledTexture3D } from "../../common/nodes/NodeSampledTexture.js";

// 导入Three.js常量定义
import {
  NoColorSpace,
  ByteType,
  ShortType,
  RGBAIntegerFormat,
  RGBIntegerFormat,
  RedIntegerFormat,
  RGIntegerFormat,
  UnsignedByteType,
  UnsignedIntType,
  UnsignedShortType,
  RedFormat,
  RGFormat,
  IntType,
  RGBFormat,
  RGBAFormat,
  FloatType,
} from "../../../constants.js";
import { DataTexture } from "../../../textures/DataTexture.js";

/**
 * GLSL方法名映射表
 * 将通用方法名映射到对应的GLSL内置函数名
 */
const glslMethods = {
  textureDimensions: "textureSize", // 纹理尺寸查询函数
  equals: "equal", // 相等比较函数
};

/**
 * 精度修饰符映射表
 * 将抽象精度级别映射到GLSL精度修饰符
 */
const precisionLib = {
  low: "lowp", // 低精度
  medium: "mediump", // 中等精度
  high: "highp", // 高精度
};

/**
 * 功能支持表
 * 定义当前GLSL实现支持的功能特性
 */
const supports = {
  swizzleAssign: true, // 支持向量分量重排赋值
  storageBuffer: false, // 不支持存储缓冲区（WebGL限制）
};

/**
 * 插值类型映射表
 * 将抽象插值类型映射到GLSL插值修饰符
 */
const interpolationTypeMap = {
  perspective: "smooth", // 透视校正插值
  linear: "noperspective", // 线性插值（无透视校正）
};

/**
 * 插值模式映射表
 * 定义插值采样模式
 */
const interpolationModeMap = {
  centroid: "centroid", // 质心采样模式
};

/**
 * 默认精度设置字符串
 * 定义GLSL着色器中各种数据类型的默认精度
 * 这些设置确保在不同设备上的一致性和性能
 */
const defaultPrecisions = `
precision highp float;              // 浮点数使用高精度
precision highp int;                // 整数使用高精度
precision highp sampler2D;          // 2D纹理采样器使用高精度
precision highp sampler3D;          // 3D纹理采样器使用高精度
precision highp samplerCube;        // 立方体纹理采样器使用高精度
precision highp sampler2DArray;     // 2D纹理数组采样器使用高精度

precision highp usampler2D;         // 无符号整数2D纹理采样器使用高精度
precision highp usampler3D;         // 无符号整数3D纹理采样器使用高精度
precision highp usamplerCube;       // 无符号整数立方体纹理采样器使用高精度
precision highp usampler2DArray;    // 无符号整数2D纹理数组采样器使用高精度

precision highp isampler2D;         // 有符号整数2D纹理采样器使用高精度
precision highp isampler3D;         // 有符号整数3D纹理采样器使用高精度
precision highp isamplerCube;       // 有符号整数立方体纹理采样器使用高精度
precision highp isampler2DArray;    // 有符号整数2D纹理数组采样器使用高精度

precision lowp sampler2DShadow;     // 2D阴影纹理采样器使用低精度（性能优化）
precision lowp sampler2DArrayShadow; // 2D阴影纹理数组采样器使用低精度
precision lowp samplerCubeShadow;   // 立方体阴影纹理采样器使用低精度
`;

/**
 * GLSL节点构建器
 *
 * 这是一个专门针对GLSL的节点构建器，负责将Three.js的节点材质系统
 * 转换为可执行的GLSL着色器代码。它是WebGL渲染管线的核心组件。
 *
 * 主要功能：
 * 1. 节点图转换：将抽象的节点图转换为具体的GLSL代码
 * 2. 着色器生成：生成顶点着色器、片段着色器和计算着色器
 * 3. 资源绑定：创建uniform、texture、buffer等资源的绑定
 * 4. 扩展管理：处理GLSL扩展和内置变量
 * 5. 精度控制：管理不同数据类型的精度设置
 * 6. 兼容性处理：处理WebGL的限制和特殊情况
 *
 * 工作流程：
 * 1. 解析节点材质的节点图结构
 * 2. 分析依赖关系和数据流
 * 3. 生成对应的GLSL函数和变量声明
 * 4. 组装完整的着色器代码
 * 5. 创建资源绑定和布局信息
 *
 * @augments NodeBuilder
 */
class GLSLNodeBuilder extends NodeBuilder {
  /**
   * 构造一个新的GLSL节点构建器
   *
   * 这个构造器初始化了GLSL着色器代码生成所需的所有核心数据结构，
   * 包括uniform组管理、变换反馈、扩展支持和内置变量跟踪
   *
   * @param {Object3D} object - 要渲染的3D对象，包含几何体和材质信息
   * @param {Renderer} renderer - WebGL渲染器实例，提供渲染上下文和能力查询
   */
  constructor(object, renderer) {
    // 调用父类构造器，传入GLSL节点解析器
    super(object, renderer, new GLSLNodeParser());

    /**
     * uniform组字典
     * 为每个着色器阶段('vertex', 'fragment', 'compute')维护一个字典，
     * 该字典按组('render','frame','object')管理统一缓冲对象(UBO)
     *
     * 结构: {
     *   vertex: { render: NodeUniformsGroup, frame: NodeUniformsGroup, ... },
     *   fragment: { render: NodeUniformsGroup, frame: NodeUniformsGroup, ... },
     *   compute: { render: NodeUniformsGroup, frame: NodeUniformsGroup, ... }
     * }
     *
     * @type {Object<string,Object<string,NodeUniformsGroup>>}
     */
    this.uniformGroups = {};

    /**
     * 变换反馈数组
     * 存储定义varying和attribute数据的对象，用于Transform Feedback功能
     * Transform Feedback允许顶点着色器的输出被捕获到缓冲区中
     *
     * @type {Array<Object<string,AttributeNode|string>>}
     */
    this.transforms = [];

    /**
     * 扩展字典
     * 为每个着色器阶段维护一个Map，记录使用的GLSL扩展
     * 扩展用于启用额外的GLSL功能，如多重绘制、剪裁距离等
     *
     * @type {Object<string,Map<string,Object>>}
     */
    this.extensions = {};

    /**
     * 内置变量字典
     * 为每个着色器阶段维护一个数组，记录使用的GLSL内置变量
     * 内置变量如gl_Position、gl_FragColor、gl_VertexID等
     *
     * @type {Object<string,Array<string>>}
     */
    this.builtins = { vertex: [], fragment: [], compute: [] };
  }

  /**
   * 检查给定纹理是否需要手动转换到工作色彩空间
   *
   * 视频纹理通常具有特定的色彩空间（如YUV），需要在着色器中进行色彩空间转换
   * 以确保正确的颜色显示。这个方法用于确定是否需要在GLSL代码中添加
   * 色彩空间转换逻辑。
   *
   * @param {Texture} texture - 要检查的纹理对象
   * @return {boolean} 如果纹理需要色彩空间转换则返回true，否则返回false
   */
  needsToWorkingColorSpace(texture) {
    // 只有视频纹理且具有非默认色彩空间时才需要转换
    return texture.isVideoTexture === true && texture.colorSpace !== NoColorSpace;
  }

  /**
   * 获取给定通用方法名对应的原生着色器方法名
   *
   * 将抽象的方法名映射到具体的GLSL内置函数名。如果映射表中没有找到
   * 对应的映射，则直接返回原方法名。
   *
   * @param {string} method - 要解析的方法名
   * @return {string} 解析后的GLSL方法名
   */
  getMethod(method) {
    // 从映射表中查找，如果没有找到则返回原方法名
    return glslMethods[method] || method;
  }

  /**
   * 返回三元运算的原生代码片段
   *
   * 生成GLSL中的条件表达式（三元运算符），格式为：condition ? trueValue : falseValue
   * 这是GLSL中实现条件逻辑的标准方式。
   *
   * @param {string} condSnippet - 决定选择哪个表达式的条件
   * @param {string} ifSnippet - 条件为真时要解析的表达式
   * @param {string} elseSnippet - 条件为假时要解析的表达式
   * @return {string} 解析后的三元运算表达式
   */
  getTernary(condSnippet, ifSnippet, elseSnippet) {
    return `${condSnippet} ? ${ifSnippet} : ${elseSnippet}`;
  }

  /**
   * 返回输出结构体名称
   *
   * 在GLSL中不需要输出结构体名称，因为GLSL使用内置的输出变量
   * （如gl_Position、fragColor等）而不是自定义结构体。
   *
   * @return {string} 空字符串，因为GLSL不使用输出结构体
   */
  getOutputStructName() {
    return "";
  }

  /**
   * 构建给定着色器节点的函数代码
   *
   * 将着色器节点转换为完整的GLSL函数定义，包括函数签名、参数列表、
   * 局部变量声明、函数体代码和返回语句。
   *
   * @param {ShaderNodeInternal} shaderNode - 要构建的着色器节点
   * @return {string} 生成的GLSL函数代码
   */
  buildFunctionCode(shaderNode) {
    const layout = shaderNode.layout;
    const flowData = this.flowShaderNode(shaderNode);

    // 构建函数参数列表
    const parameters = [];

    for (const input of layout.inputs) {
      // 为每个输入参数生成类型和名称
      parameters.push(this.getType(input.type) + " " + input.name);
    }

    // 生成完整的GLSL函数代码
    const code = `${this.getType(layout.type)} ${layout.name}( ${parameters.join(", ")} ) {

	${flowData.vars}

${flowData.code}
	return ${flowData.result};

}`;

    return code;
  }

  /**
   * 为给定的存储缓冲区节点设置像素缓冲对象(PBO)
   *
   * 在WebGL中，由于不支持存储缓冲区，需要使用纹理来模拟存储缓冲区的功能。
   * 这个方法将存储缓冲区的数据转换为2D纹理，以便在着色器中进行随机访问。
   *
   * PBO的工作原理：
   * 1. 将一维数组数据重新排列为2D纹理
   * 2. 计算合适的纹理尺寸（宽度和高度）
   * 3. 根据数据类型选择合适的纹理格式
   * 4. 创建DataTexture并设置为高精度
   *
   * @param {StorageBufferNode} storageBufferNode - 存储缓冲区节点
   */
  setupPBO(storageBufferNode) {
    const attribute = storageBufferNode.value;

    // 如果PBO尚未创建，则进行初始化
    if (attribute.pbo === undefined) {
      const originalArray = attribute.array;
      const numElements = attribute.count * attribute.itemSize;

      const { itemSize } = attribute;

      // 检查数据类型是否为整数类型
      const isInteger = attribute.array.constructor.name.toLowerCase().includes("int");

      // 根据itemSize和数据类型选择纹理格式
      let format = isInteger ? RedIntegerFormat : RedFormat;

      if (itemSize === 2) {
        format = isInteger ? RGIntegerFormat : RGFormat;
      } else if (itemSize === 3) {
        format = isInteger ? RGBIntegerFormat : RGBFormat;
      } else if (itemSize === 4) {
        format = isInteger ? RGBAIntegerFormat : RGBAFormat;
      }

      // 数组类型到Three.js类型的映射
      const typeMap = {
        Float32Array: FloatType,
        Uint8Array: UnsignedByteType,
        Uint16Array: UnsignedShortType,
        Uint32Array: UnsignedIntType,
        Int8Array: ByteType,
        Int16Array: ShortType,
        Int32Array: IntType,
        Uint8ClampedArray: UnsignedByteType,
      };

      // 计算纹理尺寸：使用2的幂次方以获得最佳性能
      const width = Math.pow(2, Math.ceil(Math.log2(Math.sqrt(numElements / itemSize))));
      let height = Math.ceil(numElements / itemSize / width);
      if (width * height * itemSize < numElements) height++; // 确保有足够的空间

      const newSize = width * height * itemSize;

      // 创建新的数组并复制原始数据
      const newArray = new originalArray.constructor(newSize);
      newArray.set(originalArray, 0);
      attribute.array = newArray;

      // 创建PBO纹理
      const pboTexture = new DataTexture(attribute.array, width, height, format, typeMap[attribute.array.constructor.name] || FloatType);
      pboTexture.needsUpdate = true;
      pboTexture.isPBOTexture = true;

      // 创建纹理节点并设置高精度
      const pbo = new TextureNode(pboTexture, null, null);
      pbo.setPrecision("high");

      // 保存PBO引用
      attribute.pboNode = pbo;
      attribute.pbo = pbo.value;

      // 注册为uniform
      this.getUniformFromNode(attribute.pboNode, "texture", this.shaderStage, this.context.nodeName);
    }
  }

  /**
   * 返回表示给定节点属性名的GLSL代码片段
   *
   * 为节点生成在着色器中使用的属性名称。对于uniform节点（非纹理和非缓冲区），
   * 会添加着色器阶段前缀以避免命名冲突。
   *
   * @param {Node} node - 节点对象
   * @param {string} [shaderStage=this.shaderStage] - 生成代码片段的着色器阶段
   * @return {string} 属性名称
   */
  getPropertyName(node, shaderStage = this.shaderStage) {
    // 对于uniform节点（非纹理和非缓冲区），添加着色器阶段前缀
    if (node.isNodeUniform && node.node.isTextureNode !== true && node.node.isBufferNode !== true) {
      // 使用着色器阶段的首字母作为前缀，如 "v_uniformName" 或 "f_uniformName"
      return shaderStage.charAt(0) + "_" + node.name;
    }

    // 其他情况调用父类方法
    return super.getPropertyName(node, shaderStage);
  }

  /**
   * Setups the Pixel Buffer Object (PBO) for the given storage
   * buffer node.
   *
   * @param {StorageArrayElementNode} storageArrayElementNode - The storage array element node.
   * @return {string} The property name.
   */
  generatePBO(storageArrayElementNode) {
    const { node, indexNode } = storageArrayElementNode;
    const attribute = node.value;

    if (this.renderer.backend.has(attribute)) {
      const attributeData = this.renderer.backend.get(attribute);
      attributeData.pbo = attribute.pbo;
    }

    const nodeUniform = this.getUniformFromNode(attribute.pboNode, "texture", this.shaderStage, this.context.nodeName);
    const textureName = this.getPropertyName(nodeUniform);

    this.increaseUsage(indexNode); // force cache generate to be used as index in x,y
    const indexSnippet = indexNode.build(this, "uint");

    const elementNodeData = this.getDataFromNode(storageArrayElementNode);

    let propertyName = elementNodeData.propertyName;

    if (propertyName === undefined) {
      // property element

      const nodeVar = this.getVarFromNode(storageArrayElementNode);

      propertyName = this.getPropertyName(nodeVar);

      // property size

      const bufferNodeData = this.getDataFromNode(node);

      let propertySizeName = bufferNodeData.propertySizeName;

      if (propertySizeName === undefined) {
        propertySizeName = propertyName + "Size";

        this.getVarFromNode(node, propertySizeName, "uint");

        this.addLineFlowCode(`${propertySizeName} = uint( textureSize( ${textureName}, 0 ).x )`, storageArrayElementNode);

        bufferNodeData.propertySizeName = propertySizeName;
      }

      //

      const { itemSize } = attribute;

      const channel = "." + vectorComponents.join("").slice(0, itemSize);
      const uvSnippet = `ivec2(${indexSnippet} % ${propertySizeName}, ${indexSnippet} / ${propertySizeName})`;

      const snippet = this.generateTextureLoad(null, textureName, uvSnippet, null, "0");

      //

      let prefix = "vec4";

      if (attribute.pbo.type === UnsignedIntType) {
        prefix = "uvec4";
      } else if (attribute.pbo.type === IntType) {
        prefix = "ivec4";
      }

      this.addLineFlowCode(`${propertyName} = ${prefix}(${snippet})${channel}`, storageArrayElementNode);

      elementNodeData.propertyName = propertyName;
    }

    return propertyName;
  }

  /**
   * 生成从纹理读取单个纹素的GLSL代码片段（无采样或过滤）
   *
   * 使用texelFetch函数直接读取纹理中指定位置的纹素值，不进行任何插值或过滤。
   * 这对于需要精确像素值的应用场景很有用，如数据纹理或计算着色器。
   *
   * @param {Texture} texture - 纹理对象（参数保留用于未来扩展）
   * @param {string} textureProperty - 着色器中纹理uniform的名称
   * @param {string} uvIndexSnippet - 表示纹理坐标的GLSL代码片段
   * @param {?string} depthSnippet - 表示纹理数组索引的GLSL代码片段（可选）
   * @param {string} [levelSnippet='0'] - 表示mip级别的GLSL代码片段，0为完整尺寸
   * @return {string} 生成的GLSL代码片段
   */
  generateTextureLoad(texture, textureProperty, uvIndexSnippet, depthSnippet, levelSnippet = "0") {
    if (depthSnippet) {
      // 3D纹理或纹理数组：使用ivec3坐标
      return `texelFetch( ${textureProperty}, ivec3( ${uvIndexSnippet}, ${depthSnippet} ), ${levelSnippet} )`;
    } else {
      // 2D纹理：使用ivec2坐标
      return `texelFetch( ${textureProperty}, ${uvIndexSnippet}, ${levelSnippet} )`;
    }
  }

  /**
   * 生成纹理采样的GLSL代码片段
   *
   * 使用texture函数对纹理进行采样，支持不同类型的纹理：
   * - 深度纹理：返回.x分量（深度值）
   * - 普通纹理：返回完整的颜色值
   * - 纹理数组：通过depthSnippet指定数组索引
   *
   * @param {Texture} texture - 纹理对象，用于确定纹理类型
   * @param {string} textureProperty - 着色器中纹理uniform的名称
   * @param {string} uvSnippet - 表示纹理坐标的GLSL代码片段
   * @param {?string} depthSnippet - 表示纹理数组索引的GLSL代码片段（可选）
   * @return {string} 生成的GLSL代码片段
   */
  generateTexture(texture, textureProperty, uvSnippet, depthSnippet) {
    if (texture.isDepthTexture) {
      // 深度纹理处理
      if (depthSnippet) uvSnippet = `vec4( ${uvSnippet}, ${depthSnippet} )`;
      // 深度纹理只返回x分量（深度值）
      return `texture( ${textureProperty}, ${uvSnippet} ).x`;
    } else {
      // 普通纹理处理
      if (depthSnippet) uvSnippet = `vec3( ${uvSnippet}, ${depthSnippet} )`;
      // 返回完整的纹理采样结果
      return `texture( ${textureProperty}, ${uvSnippet} )`;
    }
  }

  /**
   * 生成使用显式mip级别采样纹理的GLSL代码片段
   *
   * 使用textureLod函数在指定的mip级别上采样纹理，而不是让GPU自动选择mip级别。
   * 这对于需要精确控制纹理细节级别的场景很有用。
   *
   * @param {Texture} texture - 纹理对象（参数保留用于未来扩展）
   * @param {string} textureProperty - 着色器中纹理uniform的名称
   * @param {string} uvSnippet - 表示纹理坐标的GLSL代码片段
   * @param {string} levelSnippet - 表示mip级别的GLSL代码片段，0为完整尺寸
   * @return {string} 生成的GLSL代码片段
   */
  generateTextureLevel(texture, textureProperty, uvSnippet, levelSnippet) {
    return `textureLod( ${textureProperty}, ${uvSnippet}, ${levelSnippet} )`;
  }

  /**
   * 生成使用mip级别偏移采样纹理的GLSL代码片段
   *
   * 使用texture函数的bias参数来调整自动计算的mip级别。正值会使纹理更模糊，
   * 负值会使纹理更清晰。这对于实现特殊的视觉效果很有用。
   *
   * @param {Texture} texture - 纹理对象（参数保留用于未来扩展）
   * @param {string} textureProperty - 着色器中纹理uniform的名称
   * @param {string} uvSnippet - 表示纹理坐标的GLSL代码片段
   * @param {string} biasSnippet - 表示应用到mip级别的偏移值的GLSL代码片段
   * @return {string} 生成的GLSL代码片段
   */
  generateTextureBias(texture, textureProperty, uvSnippet, biasSnippet) {
    return `texture( ${textureProperty}, ${uvSnippet}, ${biasSnippet} )`;
  }

  /**
   * 生成使用显式梯度采样纹理的GLSL代码片段
   *
   * 使用textureGrad函数通过显式提供的梯度来采样纹理。这允许精确控制
   * 纹理过滤的方式，常用于实现各向异性过滤或特殊的采样模式。
   *
   * @param {Texture} texture - 纹理对象（参数保留用于未来扩展）
   * @param {string} textureProperty - 着色器中纹理uniform的名称
   * @param {string} uvSnippet - 表示纹理坐标的GLSL代码片段
   * @param {Array<string>} gradSnippet - 包含两个梯度GLSL代码片段的数组
   * @return {string} 生成的GLSL代码片段
   */
  generateTextureGrad(texture, textureProperty, uvSnippet, gradSnippet) {
    return `textureGrad( ${textureProperty}, ${uvSnippet}, ${gradSnippet[0]}, ${gradSnippet[1]} )`;
  }

  /**
   * 生成深度纹理采样和比较的GLSL代码片段
   *
   * 对深度纹理进行采样并将采样的深度值与参考值进行比较。这主要用于
   * 阴影映射等技术，其中需要比较当前片段的深度与阴影贴图中存储的深度。
   *
   * 注意：深度比较功能只在片段着色器中支持。
   *
   * @param {Texture} texture - 纹理对象（参数保留用于未来扩展）
   * @param {string} textureProperty - 着色器中纹理uniform的名称
   * @param {string} uvSnippet - 表示纹理坐标的GLSL代码片段
   * @param {string} compareSnippet - 表示参考值的GLSL代码片段
   * @param {?string} depthSnippet - 表示纹理数组索引的GLSL代码片段（可选）
   * @param {string} [shaderStage=this.shaderStage] - 生成代码片段的着色器阶段
   * @return {string} 生成的GLSL代码片段
   */
  generateTextureCompare(texture, textureProperty, uvSnippet, compareSnippet, depthSnippet, shaderStage = this.shaderStage) {
    if (shaderStage === "fragment") {
      if (depthSnippet) {
        // 深度纹理数组：使用vec4坐标（uv + 数组索引 + 比较值）
        return `texture( ${textureProperty}, vec4( ${uvSnippet}, ${depthSnippet}, ${compareSnippet} ) )`;
      }

      // 普通深度纹理：使用vec3坐标（uv + 比较值）
      return `texture( ${textureProperty}, vec3( ${uvSnippet}, ${compareSnippet} ) )`;
    } else {
      // 深度比较只在片段着色器中支持
      console.error(`WebGPURenderer: THREE.DepthTexture.compareFunction() does not support ${shaderStage} shader.`);
    }
  }

  /**
   * 返回给定着色器阶段的变量定义GLSL字符串
   *
   * 收集并格式化指定着色器阶段中使用的所有局部变量声明。
   * 这些变量通常用于存储中间计算结果。
   *
   * @param {string} shaderStage - 着色器阶段（vertex、fragment、compute）
   * @return {string} 定义变量的GLSL代码片段
   */
  getVars(shaderStage) {
    const snippets = [];

    const vars = this.vars[shaderStage];

    if (vars !== undefined) {
      for (const variable of vars) {
        // 为每个变量生成声明语句
        snippets.push(`${this.getVar(variable.type, variable.name, variable.count)};`);
      }
    }

    // 使用制表符缩进连接所有变量声明
    return snippets.join("\n\t");
  }

  /**
   * 返回给定着色器阶段的uniform定义GLSL字符串
   *
   * 生成指定着色器阶段中所有uniform变量的声明。根据uniform类型的不同，
   * 会生成不同的GLSL声明语句：
   * - 纹理类型：生成采样器声明
   * - 缓冲区类型：生成uniform块声明
   * - 标量/向量类型：组织到uniform组中
   *
   * @param {string} shaderStage - 着色器阶段（vertex、fragment、compute）
   * @return {string} 定义uniform的GLSL代码片段
   */
  getUniforms(shaderStage) {
    const uniforms = this.uniforms[shaderStage];

    const bindingSnippets = []; // 独立的uniform声明
    const uniformGroups = {}; // 分组的uniform声明

    // 遍历所有uniform，根据类型生成相应的声明
    for (const uniform of uniforms) {
      let snippet = null;
      let group = false; // 标记是否需要分组

      if (uniform.type === "texture" || uniform.type === "texture3D") {
        // 处理纹理uniform
        const texture = uniform.node.value;

        let typePrefix = ""; // 类型前缀（用于整数纹理）

        // 为数据纹理确定类型前缀
        if (texture.isDataTexture === true || texture.isData3DTexture === true) {
          if (texture.type === UnsignedIntType) {
            typePrefix = "u"; // 无符号整数纹理
          } else if (texture.type === IntType) {
            typePrefix = "i"; // 有符号整数纹理
          }
        }

        // 根据纹理类型生成采样器声明
        if (uniform.type === "texture3D" && texture.isArrayTexture === false) {
          snippet = `${typePrefix}sampler3D ${uniform.name};`;
        } else if (texture.compareFunction) {
          // 阴影纹理采样器
          if (texture.isArrayTexture === true) {
            snippet = `sampler2DArrayShadow ${uniform.name};`;
          } else {
            snippet = `sampler2DShadow ${uniform.name};`;
          }
        } else if (texture.isArrayTexture === true || texture.isDataArrayTexture === true || texture.isCompressedArrayTexture === true) {
          // 纹理数组采样器
          snippet = `${typePrefix}sampler2DArray ${uniform.name};`;
        } else {
          // 普通2D纹理采样器
          snippet = `${typePrefix}sampler2D ${uniform.name};`;
        }
      } else if (uniform.type === "cubeTexture") {
        // 立方体纹理采样器
        snippet = `samplerCube ${uniform.name};`;
      } else if (uniform.type === "buffer") {
        // 缓冲区uniform块
        const bufferNode = uniform.node;
        const bufferType = this.getType(bufferNode.bufferType);
        const bufferCount = bufferNode.bufferCount;

        const bufferCountSnippet = bufferCount > 0 ? bufferCount : "";
        snippet = `${bufferNode.name} {\n\t${bufferType} ${uniform.name}[${bufferCountSnippet}];\n};\n`;
      } else {
        // 标量/向量uniform（需要分组）
        const vectorType = this.getVectorType(uniform.type);
        snippet = `${vectorType} ${this.getPropertyName(uniform, shaderStage)};`;
        group = true;
      }

      // 添加精度修饰符
      const precision = uniform.node.precision;
      if (precision !== null) {
        snippet = precisionLib[precision] + " " + snippet;
      }

      if (group) {
        // 分组uniform：添加缩进
        snippet = "\t" + snippet;

        const groupName = uniform.groupNode.name;
        const groupSnippets = uniformGroups[groupName] || (uniformGroups[groupName] = []);

        groupSnippets.push(snippet);
      } else {
        // 独立uniform：添加uniform关键字
        snippet = "uniform " + snippet;
        bindingSnippets.push(snippet);
      }
    }

    let output = "";

    // 生成uniform组的结构体声明
    for (const name in uniformGroups) {
      const groupSnippets = uniformGroups[name];
      // 为每个组生成uniform块
      output += this._getGLSLUniformStruct(shaderStage + "_" + name, groupSnippets.join("\n")) + "\n";
    }

    // 添加独立的uniform声明
    output += bindingSnippets.join("\n");

    return output;
  }

  /**
   * 返回给定缓冲区属性的类型
   *
   * 根据缓冲区属性的数据类型和GPU类型确定在GLSL中使用的类型。
   * 对于整数类型，会根据实际的数组类型进行调整，以确保类型匹配。
   *
   * @param {BufferAttribute} attribute - 缓冲区属性
   * @return {string} GLSL类型字符串
   */
  getTypeFromAttribute(attribute) {
    // 获取基础节点类型
    let nodeType = super.getTypeFromAttribute(attribute);

    // 处理整数类型的特殊情况
    if (/^[iu]/.test(nodeType) && attribute.gpuType !== IntType) {
      let dataAttribute = attribute;

      // 处理交错缓冲区属性
      if (attribute.isInterleavedBufferAttribute) dataAttribute = attribute.data;

      const array = dataAttribute.array;

      // 如果不是真正的32位整数数组，移除整数类型前缀
      if ((array instanceof Uint32Array || array instanceof Int32Array) === false) {
        nodeType = nodeType.slice(1); // 移除 'i' 或 'u' 前缀
      }
    }

    return nodeType;
  }

  /**
   * 返回给定着色器阶段的属性定义GLSL字符串
   *
   * 生成顶点属性的输入声明。只有顶点着色器和计算着色器需要属性输入，
   * 片段着色器通过varying接收数据。每个属性都会分配一个location。
   *
   * @param {string} shaderStage - 着色器阶段（vertex、fragment、compute）
   * @return {string} 定义着色器属性的GLSL代码片段
   */
  getAttributes(shaderStage) {
    let snippet = "";

    // 只有顶点着色器和计算着色器需要属性输入
    if (shaderStage === "vertex" || shaderStage === "compute") {
      const attributes = this.getAttributesArray();

      let location = 0; // 属性位置计数器

      for (const attribute of attributes) {
        // 为每个属性生成带location的输入声明
        snippet += `layout( location = ${location++} ) in ${attribute.type} ${attribute.name};\n`;
      }
    }

    return snippet;
  }

  /**
   * 返回给定结构体类型节点成员的GLSL字符串
   *
   * 生成结构体内部成员变量的声明，每个成员占一行并带有适当的缩进。
   *
   * @param {StructTypeNode} struct - 结构体类型节点
   * @return {string} 定义结构体成员的GLSL代码片段
   */
  getStructMembers(struct) {
    const snippets = [];

    for (const member of struct.members) {
      // 为每个成员生成类型和名称声明，带制表符缩进
      snippets.push(`\t${member.type} ${member.name};`);
    }

    return snippets.join("\n");
  }

  /**
   * 返回给定着色器阶段的结构体定义GLSL字符串
   *
   * 生成着色器中使用的所有结构体定义。对于输出结构体，会生成
   * 带location的输出变量声明；对于普通结构体，生成完整的结构体定义。
   *
   * @param {string} shaderStage - 着色器阶段（vertex、fragment、compute）
   * @return {string} 定义结构体的GLSL代码片段
   */
  getStructs(shaderStage) {
    const snippets = [];
    const structs = this.structs[shaderStage];

    const outputSnippet = []; // 输出变量声明

    for (const struct of structs) {
      if (struct.output) {
        // 输出结构体：生成带location的输出变量
        for (const member of struct.members) {
          outputSnippet.push(`layout( location = ${member.index} ) out ${member.type} ${member.name};`);
        }
      } else {
        // 普通结构体：生成完整的结构体定义
        let snippet = "struct " + struct.name + " {\n";
        snippet += this.getStructMembers(struct);
        snippet += "\n};\n";

        snippets.push(snippet);
      }
    }

    // 如果没有输出变量，添加默认的fragColor输出
    if (outputSnippet.length === 0) {
      outputSnippet.push("layout( location = 0 ) out vec4 fragColor;");
    }

    // 组合输出变量声明和结构体定义
    return "\n" + outputSnippet.join("\n") + "\n\n" + snippets.join("\n");
  }

  /**
   * 返回给定着色器阶段的varying变量定义GLSL字符串
   *
   * 生成在着色器阶段之间传递数据的varying变量声明。根据着色器阶段的不同：
   * - 顶点/计算着色器：生成输出varying（out）
   * - 片段着色器：生成输入varying（in）
   *
   * 还会处理插值类型和采样模式，以及内置变量的声明。
   *
   * @param {string} shaderStage - 着色器阶段（vertex、fragment、compute）
   * @return {string} 定义varying变量的GLSL代码片段
   */
  getVaryings(shaderStage) {
    let snippet = "";

    const varyings = this.varyings;

    if (shaderStage === "vertex" || shaderStage === "compute") {
      // 顶点着色器和计算着色器：生成输出varying
      for (const varying of varyings) {
        // 计算着色器中的varying总是需要插值
        if (shaderStage === "compute") varying.needsInterpolation = true;

        const type = this.getType(varying.type);

        if (varying.needsInterpolation) {
          if (varying.interpolationType) {
            // 使用指定的插值类型和采样模式
            const interpolationType = interpolationTypeMap[varying.interpolationType] || varying.interpolationType;
            const sampling = interpolationModeMap[varying.interpolationSampling] || "";

            snippet += `${interpolationType} ${sampling} out ${type} ${varying.name};\n`;
          } else {
            // 自动确定插值类型：整数类型使用flat插值
            const flat = type.includes("int") || type.includes("uv") || type.includes("iv") ? "flat " : "";

            snippet += `${flat}out ${type} ${varying.name};\n`;
          }
        } else {
          // 不需要插值的变量：生成普通变量（不是varying）
          snippet += `${type} ${varying.name};\n`;
        }
      }
    } else if (shaderStage === "fragment") {
      // 片段着色器：生成输入varying
      for (const varying of varyings) {
        if (varying.needsInterpolation) {
          const type = this.getType(varying.type);

          if (varying.interpolationType) {
            // 使用指定的插值类型和采样模式
            const interpolationType = interpolationTypeMap[varying.interpolationType] || varying.interpolationType;
            const sampling = interpolationModeMap[varying.interpolationSampling] || "";

            snippet += `${interpolationType} ${sampling} in ${type} ${varying.name};\n`;
          } else {
            // 自动确定插值类型：整数类型使用flat插值
            const flat = type.includes("int") || type.includes("uv") || type.includes("iv") ? "flat " : "";

            snippet += `${flat}in ${type} ${varying.name};\n`;
          }
        }
      }
    }

    // 添加内置变量声明
    for (const builtin of this.builtins[shaderStage]) {
      snippet += `${builtin};\n`;
    }

    return snippet;
  }

  /**
   * 返回顶点索引内置变量
   *
   * 在顶点着色器中，gl_VertexID提供当前正在处理的顶点的索引。
   * 这对于程序化生成几何体或实现特殊的顶点处理逻辑很有用。
   *
   * @return {string} 顶点索引的GLSL表达式
   */
  getVertexIndex() {
    return "uint( gl_VertexID )";
  }

  /**
   * 返回实例索引内置变量
   *
   * 在实例化渲染中，gl_InstanceID提供当前实例的索引。
   * 这允许为每个实例生成不同的变换或属性。
   *
   * @return {string} 实例索引的GLSL表达式
   */
  getInstanceIndex() {
    return "uint( gl_InstanceID )";
  }

  /**
   * 返回调用本地索引内置变量
   *
   * 在计算着色器中，这个索引表示当前工作组内的本地调用索引。
   * 通过工作组大小取模来计算本地索引。
   *
   * @return {string} 调用本地索引的GLSL表达式
   */
  getInvocationLocalIndex() {
    const workgroupSize = this.object.workgroupSize;
    // 计算工作组的总大小
    const size = workgroupSize.reduce((acc, curr) => acc * curr, 1);
    return `uint( gl_InstanceID ) % ${size}u`;
  }

  /**
   * 返回绘制索引内置变量
   *
   * 在多重绘制调用中，gl_DrawID提供当前绘制调用的索引。
   * 这需要WEBGL_multi_draw扩展的支持。
   *
   * @return {?string} 绘制索引的GLSL表达式，如果不支持则返回null
   */
  getDrawIndex() {
    const extensions = this.renderer.backend.extensions;

    if (extensions.has("WEBGL_multi_draw")) {
      return "uint( gl_DrawID )";
    }

    return null;
  }

  /**
   * 返回正面朝向内置变量
   *
   * gl_FrontFacing指示当前片段是否来自正面朝向的图元。
   * 这对于实现双面材质或背面剔除很有用。
   *
   * @return {string} 正面朝向的GLSL表达式
   */
  getFrontFacing() {
    return "gl_FrontFacing";
  }

  /**
   * 返回片段坐标内置变量
   *
   * gl_FragCoord提供当前片段在窗口坐标系中的位置。
   * 这里只返回xy分量，通常用于屏幕空间效果。
   *
   * @return {string} 片段坐标的GLSL表达式
   */
  getFragCoord() {
    return "gl_FragCoord.xy";
  }

  /**
   * 返回片段深度内置变量
   *
   * gl_FragDepth允许片段着色器手动设置深度值。
   * 这对于实现自定义深度测试或特殊效果很有用。
   *
   * @return {string} 片段深度的GLSL表达式
   */
  getFragDepth() {
    return "gl_FragDepth";
  }

  /**
   * 启用给定的GLSL扩展
   *
   * 为指定的着色器阶段启用GLSL扩展。扩展用于访问额外的GLSL功能，
   * 如多重绘制、剪裁距离等。每个扩展只会被启用一次。
   *
   * @param {string} name - 扩展名称（如"GL_ANGLE_multi_draw"）
   * @param {string} behavior - 扩展行为（如"require"、"enable"、"warn"、"disable"）
   * @param {string} [shaderStage=this.shaderStage] - 着色器阶段
   */
  enableExtension(name, behavior, shaderStage = this.shaderStage) {
    // 获取或创建该着色器阶段的扩展映射
    const map = this.extensions[shaderStage] || (this.extensions[shaderStage] = new Map());

    // 只有当扩展尚未启用时才添加
    if (map.has(name) === false) {
      map.set(name, {
        name,
        behavior,
      });
    }
  }

  /**
   * 返回给定着色器阶段已启用扩展的GLSL字符串
   *
   * 生成#extension指令来启用所需的GLSL扩展。还会自动检测某些情况
   * （如批量网格）并启用相应的扩展。
   *
   * @param {string} shaderStage - 着色器阶段（vertex、fragment、compute）
   * @return {string} 定义已启用扩展的GLSL代码片段
   */
  getExtensions(shaderStage) {
    const snippets = [];

    // 顶点着色器的特殊处理：检查批量网格
    if (shaderStage === "vertex") {
      const ext = this.renderer.backend.extensions;
      const isBatchedMesh = this.object.isBatchedMesh;

      // 如果是批量网格且支持多重绘制扩展，则启用它
      if (isBatchedMesh && ext.has("WEBGL_multi_draw")) {
        this.enableExtension("GL_ANGLE_multi_draw", "require", shaderStage);
      }
    }

    // 生成所有已启用扩展的#extension指令
    const extensions = this.extensions[shaderStage];

    if (extensions !== undefined) {
      for (const { name, behavior } of extensions.values()) {
        snippets.push(`#extension ${name} : ${behavior}`);
      }
    }

    return snippets.join("\n");
  }

  /**
   * 返回剪裁距离内置变量
   *
   * gl_ClipDistance用于实现用户定义的剪裁平面。通过设置这个数组的值，
   * 可以在顶点着色器中定义剪裁平面，GPU会自动剪裁超出平面的几何体。
   *
   * @return {string} 剪裁距离的GLSL表达式
   */
  getClipDistance() {
    return "gl_ClipDistance";
  }

  /**
   * 检查请求的功能是否可用
   *
   * 查询WebGL实现是否支持特定功能。对于需要扩展支持的功能，
   * 会检查相应的WebGL扩展是否可用。结果会被缓存以提高性能。
   *
   * @param {string} name - 请求的功能名称（如"float32Filterable"、"clipDistance"）
   * @return {boolean} 如果功能受支持则返回true，否则返回false
   */
  isAvailable(name) {
    // 首先检查缓存的结果
    let result = supports[name];

    if (result === undefined) {
      let extensionName;

      result = false; // 默认不支持

      // 根据功能名称确定需要的扩展
      switch (name) {
        case "float32Filterable":
          // 32位浮点纹理过滤支持
          extensionName = "OES_texture_float_linear";
          break;

        case "clipDistance":
          // 剪裁距离支持
          extensionName = "WEBGL_clip_cull_distance";
          break;
      }

      // 如果需要扩展，检查扩展是否可用
      if (extensionName !== undefined) {
        const extensions = this.renderer.backend.extensions;

        if (extensions.has(extensionName)) {
          extensions.get(extensionName); // 激活扩展
          result = true;
        }
      }

      // 缓存结果
      supports[name] = result;
    }

    return result;
  }

  /**
   * 是否沿垂直轴翻转纹理数据
   *
   * 在WebGL/GLSL上下文中，纹理坐标系统与OpenGL一致，Y轴向上为正，
   * 因此总是需要翻转纹理数据以匹配Web标准的Y轴向下为正的坐标系。
   *
   * @return {boolean} 在GLSL上下文中总是返回true
   */
  isFlipY() {
    return true;
  }

  /**
   * 启用硬件剪裁功能
   *
   * 启用基于硬件的剪裁平面功能，允许在GPU级别进行几何体剪裁。
   * 这比在片段着色器中进行剪裁更高效。
   *
   * @param {string} planeCount - 剪裁平面的数量
   */
  enableHardwareClipping(planeCount) {
    // 启用剪裁距离扩展
    this.enableExtension("GL_ANGLE_clip_cull_distance", "require");

    // 在顶点着色器中声明剪裁距离数组
    this.builtins["vertex"].push(`out float gl_ClipDistance[ ${planeCount} ]`);
  }

  /**
   * 启用多视图渲染
   *
   * 启用多视图渲染功能，允许在单次绘制调用中渲染到多个视图。
   * 这主要用于VR/AR应用中的立体渲染。
   */
  enableMultiview() {
    // 为片段和顶点着色器启用多视图扩展
    this.enableExtension("GL_OVR_multiview2", "require", "fragment");
    this.enableExtension("GL_OVR_multiview2", "require", "vertex");

    // 声明视图数量
    this.builtins["vertex"].push("layout(num_views = 2) in");
  }

  /**
   * 在Transform Feedback上下文中注册变换
   *
   * 注册一个变换，用于将顶点着色器的输出捕获到缓冲区中。
   * Transform Feedback允许将顶点处理的结果保存起来供后续使用。
   *
   * @param {string} varyingName - varying变量名称
   * @param {AttributeNode} attributeNode - 属性节点
   */
  registerTransform(varyingName, attributeNode) {
    this.transforms.push({ varyingName, attributeNode });
  }

  /**
   * 返回给定着色器阶段的变换定义GLSL字符串
   *
   * 生成Transform Feedback所需的变量赋值语句，将属性值赋给对应的varying变量。
   *
   * @param {string} shaderStage - 着色器阶段（参数未使用但保留用于接口一致性）
   * @return {string} 定义变换的GLSL代码片段
   */
  getTransforms(/* shaderStage  */) {
    const transforms = this.transforms;

    let snippet = "";

    // 为每个变换生成赋值语句
    for (let i = 0; i < transforms.length; i++) {
      const transform = transforms[i];
      const attributeName = this.getPropertyName(transform.attributeNode);

      if (attributeName) snippet += `${transform.varyingName} = ${attributeName};\n\t`;
    }

    return snippet;
  }

  /**
   * 基于给定名称和变量生成GLSL uniform结构体
   *
   * 生成标准的GLSL uniform块定义，使用std140布局以确保跨平台兼容性。
   * uniform块允许将相关的uniform变量组织在一起，提高性能和管理效率。
   *
   * @private
   * @param {string} name - 结构体名称
   * @param {string} vars - 结构体变量定义
   * @return {string} 表示结构体的GLSL代码片段
   */
  _getGLSLUniformStruct(name, vars) {
    return `
layout( std140 ) uniform ${name} {
${vars}
};`;
  }

  /**
   * 基于给定着色器数据生成GLSL顶点着色器
   *
   * 组装完整的顶点着色器代码，包括版本声明、扩展、精度设置、
   * uniform声明、varying声明、属性声明、函数代码和主函数。
   *
   * @private
   * @param {Object} shaderData - 着色器数据对象，包含所有必要的代码片段
   * @return {string} 完整的顶点着色器代码
   */
  _getGLSLVertexCode(shaderData) {
    return `#version 300 es

${this.getSignature()}

// extensions - GLSL扩展声明
${shaderData.extensions}

// precision - 精度设置
${defaultPrecisions}

// uniforms - uniform变量声明
${shaderData.uniforms}

// varyings - varying变量声明
${shaderData.varyings}

// attributes - 顶点属性声明
${shaderData.attributes}

// codes - 函数代码
${shaderData.codes}

void main() {

	// vars - 局部变量声明
	${shaderData.vars}

	// transforms - Transform Feedback变换
	${shaderData.transforms}

	// flow - 主要逻辑流程
	${shaderData.flow}

	gl_PointSize = 1.0;

}
`;
  }

  /**
   * 基于给定着色器数据生成GLSL片段着色器
   *
   * 组装完整的片段着色器代码，包括版本声明、扩展、精度设置、
   * uniform声明、varying声明、函数代码、结构体定义和主函数。
   * 与顶点着色器不同，片段着色器不需要属性声明和变换处理。
   *
   * @private
   * @param {Object} shaderData - 着色器数据对象，包含所有必要的代码片段
   * @return {string} 完整的片段着色器代码
   */
  _getGLSLFragmentCode(shaderData) {
    return `#version 300 es

${this.getSignature()}

// extensions - GLSL扩展声明
${shaderData.extensions}

// precision - 精度设置
${defaultPrecisions}

// uniforms - uniform变量声明
${shaderData.uniforms}

// varyings - varying变量声明（输入）
${shaderData.varyings}

// codes - 函数代码
${shaderData.codes}

// structs - 结构体定义和输出声明
${shaderData.structs}

void main() {

	// vars - 局部变量声明
	${shaderData.vars}

	// flow - 主要逻辑流程
	${shaderData.flow}

}
`;
  }

  /**
   * 控制着色器阶段的代码构建过程
   *
   * 这是GLSLNodeBuilder的核心方法，负责将节点图转换为完整的GLSL着色器代码。
   * 该方法执行以下主要步骤：
   *
   * 1. 确定要构建的着色器类型（材质着色器或计算着色器）
   * 2. 对绑定组进行排序以确保正确的uniform布局
   * 3. 为每个着色器阶段生成代码流
   * 4. 收集所有着色器组件（uniforms、attributes、varyings等）
   * 5. 生成最终的GLSL着色器代码
   */
  buildCode() {
    // 根据是否有材质决定构建的着色器类型
    const shadersData = this.material !== null ? { fragment: {}, vertex: {} } : { compute: {} };

    // 对绑定组进行排序，确保uniform布局的一致性
    this.sortBindingGroups();

    // 为每个着色器阶段构建代码
    for (const shaderStage in shadersData) {
      // 初始化代码流
      let flow = "// code\n\n";
      flow += this.flowCode[shaderStage];

      // 获取当前阶段的流节点
      const flowNodes = this.flowNodes[shaderStage];
      const mainNode = flowNodes[flowNodes.length - 1]; // 主节点是最后一个节点

      // 遍历所有流节点，生成代码
      for (const node of flowNodes) {
        const flowSlotData = this.getFlowData(node /*, shaderStage*/);
        const slotName = node.name;

        // 如果节点有名称，添加注释标识
        if (slotName) {
          if (flow.length > 0) flow += "\n";
          flow += `\t// flow -> ${slotName}\n\t`;
        }

        // 添加节点的代码
        flow += `${flowSlotData.code}\n\t`;

        // 处理主节点的输出（非计算着色器）
        if (node === mainNode && shaderStage !== "compute") {
          flow += "// result\n\t";

          if (shaderStage === "vertex") {
            // 顶点着色器：设置gl_Position
            flow += "gl_Position = ";
            flow += `${flowSlotData.result};`;
          } else if (shaderStage === "fragment") {
            // 片段着色器：设置fragColor（如果不是输出结构节点）
            if (!node.outputNode.isOutputStructNode) {
              flow += "fragColor = ";
              flow += `${flowSlotData.result};`;
            }
          }
        }
      }

      // 收集当前阶段的所有着色器组件
      const stageData = shadersData[shaderStage];

      stageData.extensions = this.getExtensions(shaderStage); // GLSL扩展
      stageData.uniforms = this.getUniforms(shaderStage); // uniform变量
      stageData.attributes = this.getAttributes(shaderStage); // 顶点属性
      stageData.varyings = this.getVaryings(shaderStage); // varying变量
      stageData.vars = this.getVars(shaderStage); // 局部变量
      stageData.structs = this.getStructs(shaderStage); // 结构体定义
      stageData.codes = this.getCodes(shaderStage); // 函数代码
      stageData.transforms = this.getTransforms(shaderStage); // 变换反馈
      stageData.flow = flow; // 主要代码流
    }

    // 根据着色器类型生成最终的GLSL代码
    if (this.material !== null) {
      // 材质着色器：生成顶点和片段着色器
      this.vertexShader = this._getGLSLVertexCode(shadersData.vertex);
      this.fragmentShader = this._getGLSLFragmentCode(shadersData.fragment);
    } else {
      // 计算着色器：生成计算着色器代码
      this.computeShader = this._getGLSLVertexCode(shadersData.compute);
    }
  }

  /**
   * 从节点生成对应的uniform绑定实例
   *
   * 这是GLSLNodeBuilder中最重要的方法之一，负责为给定的uniform节点
   * 生成匹配的绑定实例。这些绑定后续会被渲染器用来创建绑定组和布局。
   *
   * 该方法处理不同类型的uniform：
   * - texture: 2D纹理采样器
   * - cubeTexture: 立方体纹理采样器
   * - texture3D: 3D纹理采样器
   * - buffer: 缓冲区对象
   * - 其他: 标量/向量uniform（组织到uniform组中）
   *
   * @param {Node} node - uniform节点，包含要绑定的数据
   * @param {string} type - 节点数据类型（texture、buffer、float等）
   * @param {string} shaderStage - 着色器阶段（vertex、fragment、compute）
   * @param {?string} [name=null] - 可选的uniform名称
   * @return {NodeUniform} 节点uniform对象
   */
  getUniformFromNode(node, type, shaderStage, name = null) {
    // 调用父类方法获取基础uniform节点
    const uniformNode = super.getUniformFromNode(node, type, shaderStage, name);
    const nodeData = this.getDataFromNode(node, shaderStage, this.globalCache);

    let uniformGPU = nodeData.uniformGPU;

    // 如果GPU uniform尚未创建，则进行初始化
    if (uniformGPU === undefined) {
      const group = node.groupNode;
      const groupName = group.name;

      // 获取对应组的绑定数组
      const bindings = this.getBindGroupArray(groupName, shaderStage);

      if (type === "texture") {
        // 创建2D纹理采样器绑定
        uniformGPU = new NodeSampledTexture(uniformNode.name, uniformNode.node, group);
        bindings.push(uniformGPU);
      } else if (type === "cubeTexture") {
        // 创建立方体纹理采样器绑定
        uniformGPU = new NodeSampledCubeTexture(uniformNode.name, uniformNode.node, group);
        bindings.push(uniformGPU);
      } else if (type === "texture3D") {
        // 创建3D纹理采样器绑定
        uniformGPU = new NodeSampledTexture3D(uniformNode.name, uniformNode.node, group);
        bindings.push(uniformGPU);
      } else if (type === "buffer") {
        // 创建缓冲区绑定
        node.name = `NodeBuffer_${node.id}`;
        uniformNode.name = `buffer${node.id}`;

        const buffer = new NodeUniformBuffer(node, group);
        buffer.name = node.name;

        bindings.push(buffer);
        uniformGPU = buffer;
      } else {
        // 处理标量/向量uniform：组织到uniform组中
        const uniformsStage = this.uniformGroups[shaderStage] || (this.uniformGroups[shaderStage] = {});

        let uniformsGroup = uniformsStage[groupName];

        if (uniformsGroup === undefined) {
          // 创建新的uniform组
          uniformsGroup = new NodeUniformsGroup(shaderStage + "_" + groupName, group);
          // uniformsGroup.setVisibility( gpuShaderStageLib[ shaderStage ] );

          uniformsStage[groupName] = uniformsGroup;
          bindings.push(uniformsGroup);
        }

        // 创建节点uniform并添加到组中
        uniformGPU = this.getNodeUniform(uniformNode, type);
        uniformsGroup.addUniform(uniformGPU);
      }

      // 缓存GPU uniform引用
      nodeData.uniformGPU = uniformGPU;
    }

    return uniformNode;
  }
}

export default GLSLNodeBuilder;
