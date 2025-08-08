/**
 * 导入 WebGL uniform 管理器
 */
import { WebGLUniforms } from "./WebGLUniforms.js";
/**
 * 导入 WebGL 着色器类
 */
import { WebGLShader } from "./WebGLShader.js";
/**
 * 导入着色器代码片段库
 */
import { ShaderChunk } from "../shaders/ShaderChunk.js";
/**
 * 导入渲染相关常量
 */
import {
  NoToneMapping,
  AddOperation,
  MixOperation,
  MultiplyOperation,
  CubeRefractionMapping,
  CubeUVReflectionMapping,
  CubeReflectionMapping,
  PCFSoftShadowMap,
  PCFShadowMap,
  VSMShadowMap,
  AgXToneMapping,
  ACESFilmicToneMapping,
  NeutralToneMapping,
  CineonToneMapping,
  CustomToneMapping,
  ReinhardToneMapping,
  LinearToneMapping,
  GLSL3,
  LinearTransfer,
  SRGBTransfer,
} from "../../constants.js";
/**
 * 导入颜色管理类
 */
import { ColorManagement } from "../../math/ColorManagement.js";
/**
 * 导入三维向量类
 */
import { Vector3 } from "../../math/Vector3.js";
/**
 * 导入三维矩阵类
 */
import { Matrix3 } from "../../math/Matrix3.js";

/**
 * 并行着色器编译扩展的完成状态常量
 * 来源：https://www.khronos.org/registry/webgl/extensions/KHR_parallel_shader_compile/
 */
// From https://www.khronos.org/registry/webgl/extensions/KHR_parallel_shader_compile/
const COMPLETION_STATUS_KHR = 0x91b1;

/**
 * 程序 ID 计数器，用于为每个程序分配唯一 ID
 */
let programIdCount = 0;

/**
 * 处理着色器源码错误显示
 * 在错误行周围显示上下文代码，便于调试
 *
 * @param {string} string - 着色器源码
 * @param {number} errorLine - 错误行号
 * @returns {string} 格式化的错误上下文
 */
function handleSource(string, errorLine) {
  const lines = string.split("\n");
  const lines2 = [];

  // 显示错误行前后6行的代码
  const from = Math.max(errorLine - 6, 0);
  const to = Math.min(errorLine + 6, lines.length);

  for (let i = from; i < to; i++) {
    const line = i + 1;
    // 错误行用 '>' 标记，其他行用空格
    lines2.push(`${line === errorLine ? ">" : " "} ${line}: ${lines[i]}`);
  }

  return lines2.join("\n");
}

/**
 * 用于颜色空间转换的临时矩阵
 */
const _m0 = /*@__PURE__*/ new Matrix3();

/**
 * 获取颜色空间编码组件
 * 生成颜色空间转换所需的矩阵和传输函数
 *
 * @param {string} colorSpace - 目标颜色空间
 * @returns {Array} 返回 [编码矩阵, 传输函数名称]
 */
function getEncodingComponents(colorSpace) {
  // 获取从工作颜色空间到目标颜色空间的转换矩阵
  ColorManagement._getMatrix(_m0, ColorManagement.workingColorSpace, colorSpace);

  // 将矩阵转换为 GLSL mat3 格式
  const encodingMatrix = `mat3( ${_m0.elements.map((v) => v.toFixed(4))} )`;

  // 根据颜色空间的传输函数返回对应的 GLSL 函数名
  switch (ColorManagement.getTransfer(colorSpace)) {
    case LinearTransfer:
      return [encodingMatrix, "LinearTransferOETF"];

    case SRGBTransfer:
      return [encodingMatrix, "sRGBTransferOETF"];

    default:
      console.warn("THREE.WebGLProgram: Unsupported color space: ", colorSpace);
      return [encodingMatrix, "LinearTransferOETF"];
  }
}

/**
 * 获取着色器编译错误信息
 * 格式化着色器编译错误，包含错误位置的上下文代码
 *
 * @param {WebGLRenderingContext} gl - WebGL 上下文
 * @param {WebGLShader} shader - 着色器对象
 * @param {string} type - 着色器类型（'vertex' 或 'fragment'）
 * @returns {string} 格式化的错误信息
 */
function getShaderErrors(gl, shader, type) {
  const status = gl.getShaderParameter(shader, gl.COMPILE_STATUS);

  const shaderInfoLog = gl.getShaderInfoLog(shader) || "";
  const errors = shaderInfoLog.trim();

  // 如果编译成功且没有错误信息，返回空字符串
  if (status && errors === "") return "";

  // 尝试解析错误行号
  const errorMatches = /ERROR: 0:(\d+)/.exec(errors);
  if (errorMatches) {
    // --enable-privileged-webgl-extension
    // console.log( '**' + type + '**', gl.getExtension( 'WEBGL_debug_shaders' ).getTranslatedShaderSource( shader ) );

    const errorLine = parseInt(errorMatches[1]);
    // 返回包含错误上下文的详细错误信息
    return type.toUpperCase() + "\n\n" + errors + "\n\n" + handleSource(gl.getShaderSource(shader), errorLine);
  } else {
    return errors;
  }
}

/**
 * 生成纹理编码函数
 * 根据颜色空间生成对应的 GLSL 编码函数代码
 *
 * @param {string} functionName - 函数名称
 * @param {string} colorSpace - 颜色空间
 * @returns {string} 生成的 GLSL 函数代码
 */
function getTexelEncodingFunction(functionName, colorSpace) {
  const components = getEncodingComponents(colorSpace);

  return [`vec4 ${functionName}( vec4 value ) {`, `	return ${components[1]}( vec4( value.rgb * ${components[0]}, value.a ) );`, "}"].join("\n");
}

/**
 * 生成色调映射函数
 * 根据色调映射类型生成对应的 GLSL 函数代码
 *
 * @param {string} functionName - 函数名称
 * @param {number} toneMapping - 色调映射类型常量
 * @returns {string} 生成的 GLSL 色调映射函数代码
 */
function getToneMappingFunction(functionName, toneMapping) {
  let toneMappingName;

  switch (toneMapping) {
    case LinearToneMapping:
      toneMappingName = "Linear";
      break;

    case ReinhardToneMapping:
      toneMappingName = "Reinhard";
      break;

    case CineonToneMapping:
      toneMappingName = "Cineon";
      break;

    case ACESFilmicToneMapping:
      toneMappingName = "ACESFilmic";
      break;

    case AgXToneMapping:
      toneMappingName = "AgX";
      break;

    case NeutralToneMapping:
      toneMappingName = "Neutral";
      break;

    case CustomToneMapping:
      toneMappingName = "Custom";
      break;

    default:
      console.warn("THREE.WebGLProgram: Unsupported toneMapping:", toneMapping);
      toneMappingName = "Linear";
  }

  return "vec3 " + functionName + "( vec3 color ) { return " + toneMappingName + "ToneMapping( color ); }";
}

/**
 * 用于亮度计算的临时向量
 */
const _v0 = /*@__PURE__*/ new Vector3();

/**
 * 生成亮度计算函数
 * 根据当前颜色管理设置生成 GLSL 亮度计算函数
 *
 * @returns {string} 生成的 GLSL 亮度函数代码
 */
function getLuminanceFunction() {
  ColorManagement.getLuminanceCoefficients(_v0);

  const r = _v0.x.toFixed(4);
  const g = _v0.y.toFixed(4);
  const b = _v0.z.toFixed(4);

  return ["float luminance( const in vec3 rgb ) {", `	const vec3 weights = vec3( ${r}, ${g}, ${b} );`, "	return dot( weights, rgb );", "}"].join("\n");
}

/**
 * 生成顶点着色器扩展声明
 * 根据参数生成所需的 WebGL 扩展声明
 *
 * @param {Object} parameters - 着色器参数对象
 * @returns {string} 扩展声明字符串
 */
function generateVertexExtensions(parameters) {
  const chunks = [
    parameters.extensionClipCullDistance ? "#extension GL_ANGLE_clip_cull_distance : require" : "",
    parameters.extensionMultiDraw ? "#extension GL_ANGLE_multi_draw : require" : "",
  ];

  return chunks.filter(filterEmptyLine).join("\n");
}

/**
 * 生成预处理器定义
 * 将定义对象转换为 GLSL #define 指令
 *
 * @param {Object} defines - 定义对象
 * @returns {string} #define 指令字符串
 */
function generateDefines(defines) {
  const chunks = [];

  for (const name in defines) {
    const value = defines[name];

    if (value === false) continue;

    chunks.push("#define " + name + " " + value);
  }

  return chunks.join("\n");
}

/**
 * 获取顶点属性位置信息
 * 遍历程序中的所有活动顶点属性，获取其类型、位置和大小信息
 *
 * @param {WebGLRenderingContext} gl - WebGL 上下文
 * @param {WebGLProgram} program - WebGL 程序对象
 * @returns {Object} 属性位置映射对象
 */
function fetchAttributeLocations(gl, program) {
  const attributes = {};

  const n = gl.getProgramParameter(program, gl.ACTIVE_ATTRIBUTES);

  for (let i = 0; i < n; i++) {
    const info = gl.getActiveAttrib(program, i);
    const name = info.name;

    let locationSize = 1;
    if (info.type === gl.FLOAT_MAT2) locationSize = 2;
    if (info.type === gl.FLOAT_MAT3) locationSize = 3;
    if (info.type === gl.FLOAT_MAT4) locationSize = 4;

    // console.log( 'THREE.WebGLProgram: ACTIVE VERTEX ATTRIBUTE:', name, i );

    attributes[name] = {
      type: info.type,
      location: gl.getAttribLocation(program, name),
      locationSize: locationSize,
    };
  }

  return attributes;
}

/**
 * 过滤空字符串
 * 用于数组过滤，移除空字符串元素
 *
 * @param {string} string - 待检查的字符串
 * @returns {boolean} 字符串是否非空
 */
function filterEmptyLine(string) {
  return string !== "";
}

/**
 * 替换光源数量占位符
 * 将着色器代码中的光源数量占位符替换为实际数值
 *
 * @param {string} string - 着色器源码
 * @param {Object} parameters - 包含光源数量的参数对象
 * @returns {string} 替换后的着色器代码
 */
function replaceLightNums(string, parameters) {
  const numSpotLightCoords = parameters.numSpotLightShadows + parameters.numSpotLightMaps - parameters.numSpotLightShadowsWithMaps;

  return string
    .replace(/NUM_DIR_LIGHTS/g, parameters.numDirLights)
    .replace(/NUM_SPOT_LIGHTS/g, parameters.numSpotLights)
    .replace(/NUM_SPOT_LIGHT_MAPS/g, parameters.numSpotLightMaps)
    .replace(/NUM_SPOT_LIGHT_COORDS/g, numSpotLightCoords)
    .replace(/NUM_RECT_AREA_LIGHTS/g, parameters.numRectAreaLights)
    .replace(/NUM_POINT_LIGHTS/g, parameters.numPointLights)
    .replace(/NUM_HEMI_LIGHTS/g, parameters.numHemiLights)
    .replace(/NUM_DIR_LIGHT_SHADOWS/g, parameters.numDirLightShadows)
    .replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g, parameters.numSpotLightShadowsWithMaps)
    .replace(/NUM_SPOT_LIGHT_SHADOWS/g, parameters.numSpotLightShadows)
    .replace(/NUM_POINT_LIGHT_SHADOWS/g, parameters.numPointLightShadows);
}

/**
 * 替换裁剪平面数量占位符
 * 将着色器代码中的裁剪平面数量占位符替换为实际数值
 *
 * @param {string} string - 着色器源码
 * @param {Object} parameters - 包含裁剪平面数量的参数对象
 * @returns {string} 替换后的着色器代码
 */
function replaceClippingPlaneNums(string, parameters) {
  return string.replace(/NUM_CLIPPING_PLANES/g, parameters.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g, parameters.numClippingPlanes - parameters.numClipIntersection);
}

/**
 * 解析包含文件
 * 处理着色器代码中的 #include 指令，将其替换为实际的着色器代码片段
 */

/**
 * 包含文件的正则表达式模式
 * 匹配 #include <filename> 格式的指令
 */
const includePattern = /^[ \t]*#include +<([\w\d./]+)>/gm;

/**
 * 解析着色器代码中的包含指令
 * 递归处理所有 #include 指令，将其替换为对应的着色器代码片段
 *
 * @param {string} string - 包含 #include 指令的着色器代码
 * @returns {string} 解析后的着色器代码
 */
function resolveIncludes(string) {
  return string.replace(includePattern, includeReplacer);
}

/**
 * 着色器代码片段映射表
 * 用于处理已弃用的着色器代码片段名称
 */
const shaderChunkMap = new Map();

/**
 * 包含文件替换函数
 * 将 #include 指令替换为对应的着色器代码片段
 *
 * @param {string} match - 匹配的完整字符串（未使用）
 * @param {string} include - 包含文件名
 * @returns {string} 对应的着色器代码片段
 */
function includeReplacer(match, include) {
  let string = ShaderChunk[include];

  if (string === undefined) {
    const newInclude = shaderChunkMap.get(include);

    if (newInclude !== undefined) {
      string = ShaderChunk[newInclude];
      console.warn('THREE.WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.', include, newInclude);
    } else {
      throw new Error("Can not resolve #include <" + include + ">");
    }
  }

  return resolveIncludes(string);
}

/**
 * 展开循环
 * 处理着色器代码中的循环展开指令，提高性能
 */

/**
 * 循环展开的正则表达式模式
 * 匹配 #pragma unroll_loop_start ... #pragma unroll_loop_end 格式的循环
 */
const unrollLoopPattern = /#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;

/**
 * 展开着色器代码中的循环
 * 将循环展开指令替换为展开后的代码，减少运行时循环开销
 *
 * @param {string} string - 包含循环展开指令的着色器代码
 * @returns {string} 展开后的着色器代码
 */
function unrollLoops(string) {
  return string.replace(unrollLoopPattern, loopReplacer);
}

/**
 * 循环替换函数
 * 将循环展开为多个重复的代码块
 *
 * @param {string} match - 匹配的完整字符串（未使用）
 * @param {string} start - 循环起始值
 * @param {string} end - 循环结束值
 * @param {string} snippet - 循环体代码
 * @returns {string} 展开后的代码
 */
function loopReplacer(match, start, end, snippet) {
  let string = "";

  for (let i = parseInt(start); i < parseInt(end); i++) {
    string += snippet.replace(/\[\s*i\s*\]/g, "[ " + i + " ]").replace(/UNROLLED_LOOP_INDEX/g, i);
  }

  return string;
}

/**
 * 着色器生成工具函数
 */

/**
 * 生成精度声明
 * 为着色器生成各种数据类型的精度声明
 *
 * @param {Object} parameters - 着色器参数对象
 * @returns {string} 精度声明字符串
 */
function generatePrecision(parameters) {
  let precisionstring = `precision ${parameters.precision} float;
	precision ${parameters.precision} int;
	precision ${parameters.precision} sampler2D;
	precision ${parameters.precision} samplerCube;
	precision ${parameters.precision} sampler3D;
	precision ${parameters.precision} sampler2DArray;
	precision ${parameters.precision} sampler2DShadow;
	precision ${parameters.precision} samplerCubeShadow;
	precision ${parameters.precision} sampler2DArrayShadow;
	precision ${parameters.precision} isampler2D;
	precision ${parameters.precision} isampler3D;
	precision ${parameters.precision} isamplerCube;
	precision ${parameters.precision} isampler2DArray;
	precision ${parameters.precision} usampler2D;
	precision ${parameters.precision} usampler3D;
	precision ${parameters.precision} usamplerCube;
	precision ${parameters.precision} usampler2DArray;
	`;

  if (parameters.precision === "highp") {
    precisionstring += "\n#define HIGH_PRECISION";
  } else if (parameters.precision === "mediump") {
    precisionstring += "\n#define MEDIUM_PRECISION";
  } else if (parameters.precision === "lowp") {
    precisionstring += "\n#define LOW_PRECISION";
  }

  return precisionstring;
}

/**
 * 生成阴影贴图类型定义
 * 根据阴影贴图类型生成对应的预处理器定义
 *
 * @param {Object} parameters - 着色器参数对象
 * @returns {string} 阴影贴图类型定义
 */
function generateShadowMapTypeDefine(parameters) {
  let shadowMapTypeDefine = "SHADOWMAP_TYPE_BASIC";

  if (parameters.shadowMapType === PCFShadowMap) {
    shadowMapTypeDefine = "SHADOWMAP_TYPE_PCF";
  } else if (parameters.shadowMapType === PCFSoftShadowMap) {
    shadowMapTypeDefine = "SHADOWMAP_TYPE_PCF_SOFT";
  } else if (parameters.shadowMapType === VSMShadowMap) {
    shadowMapTypeDefine = "SHADOWMAP_TYPE_VSM";
  }

  return shadowMapTypeDefine;
}

/**
 * 生成环境贴图类型定义
 * 根据环境贴图映射模式生成对应的预处理器定义
 *
 * @param {Object} parameters - 着色器参数对象
 * @returns {string} 环境贴图类型定义
 */
function generateEnvMapTypeDefine(parameters) {
  let envMapTypeDefine = "ENVMAP_TYPE_CUBE";

  if (parameters.envMap) {
    switch (parameters.envMapMode) {
      case CubeReflectionMapping:
      case CubeRefractionMapping:
        envMapTypeDefine = "ENVMAP_TYPE_CUBE";
        break;

      case CubeUVReflectionMapping:
        envMapTypeDefine = "ENVMAP_TYPE_CUBE_UV";
        break;
    }
  }

  return envMapTypeDefine;
}

/**
 * 生成环境贴图模式定义
 * 根据环境贴图映射模式生成反射或折射定义
 *
 * @param {Object} parameters - 着色器参数对象
 * @returns {string} 环境贴图模式定义
 */
function generateEnvMapModeDefine(parameters) {
  let envMapModeDefine = "ENVMAP_MODE_REFLECTION";

  if (parameters.envMap) {
    switch (parameters.envMapMode) {
      case CubeRefractionMapping:
        envMapModeDefine = "ENVMAP_MODE_REFRACTION";
        break;
    }
  }

  return envMapModeDefine;
}

/**
 * 生成环境贴图混合定义
 * 根据混合操作类型生成对应的预处理器定义
 *
 * @param {Object} parameters - 着色器参数对象
 * @returns {string} 环境贴图混合定义
 */
function generateEnvMapBlendingDefine(parameters) {
  let envMapBlendingDefine = "ENVMAP_BLENDING_NONE";

  if (parameters.envMap) {
    switch (parameters.combine) {
      case MultiplyOperation:
        envMapBlendingDefine = "ENVMAP_BLENDING_MULTIPLY";
        break;

      case MixOperation:
        envMapBlendingDefine = "ENVMAP_BLENDING_MIX";
        break;

      case AddOperation:
        envMapBlendingDefine = "ENVMAP_BLENDING_ADD";
        break;
    }
  }

  return envMapBlendingDefine;
}

/**
 * 生成 CubeUV 尺寸信息
 * 计算 CubeUV 环境贴图的纹理尺寸参数
 *
 * @param {Object} parameters - 着色器参数对象
 * @returns {Object|null} 包含纹理宽度、高度和最大 mip 级别的对象，如果没有环境贴图则返回 null
 */
function generateCubeUVSize(parameters) {
  const imageHeight = parameters.envMapCubeUVHeight;

  if (imageHeight === null) return null;

  const maxMip = Math.log2(imageHeight) - 2;

  const texelHeight = 1.0 / imageHeight;

  const texelWidth = 1.0 / (3 * Math.max(Math.pow(2, maxMip), 7 * 16));

  return { texelWidth, texelHeight, maxMip };
}

/**
 * WebGL 程序构造函数
 * 创建和编译 WebGL 着色器程序，包括顶点着色器和片段着色器
 *
 * @param {WebGLRenderer} renderer - WebGL 渲染器
 * @param {string} cacheKey - 程序缓存键
 * @param {Object} parameters - 着色器参数对象
 * @param {WebGLBindingStates} bindingStates - WebGL 绑定状态管理器
 * @returns {WebGLProgram} 返回 WebGL 程序实例
 */
function WebGLProgram(renderer, cacheKey, parameters, bindingStates) {
  // TODO 将此事件发送到 Three.js 开发工具
  // TODO Send this event to Three.js DevTools
  // console.log( 'WebGLProgram', cacheKey );

  // 获取 WebGL 渲染上下文
  const gl = renderer.getContext();

  // 获取预处理器定义
  const defines = parameters.defines;

  // 获取着色器源码
  let vertexShader = parameters.vertexShader;
  let fragmentShader = parameters.fragmentShader;

  // 生成各种着色器定义
  const shadowMapTypeDefine = generateShadowMapTypeDefine(parameters); // 阴影贴图类型定义
  const envMapTypeDefine = generateEnvMapTypeDefine(parameters); // 环境贴图类型定义
  const envMapModeDefine = generateEnvMapModeDefine(parameters); // 环境贴图模式定义
  const envMapBlendingDefine = generateEnvMapBlendingDefine(parameters); // 环境贴图混合定义
  const envMapCubeUVSize = generateCubeUVSize(parameters); // CubeUV 尺寸信息

  // 生成顶点着色器扩展
  const customVertexExtensions = generateVertexExtensions(parameters);

  // 生成自定义预处理器定义
  const customDefines = generateDefines(defines);

  // 创建 WebGL 程序对象
  const program = gl.createProgram();

  // 初始化着色器前缀变量
  let prefixVertex, prefixFragment;
  // 设置 GLSL 版本字符串
  let versionString = parameters.glslVersion ? "#version " + parameters.glslVersion + "\n" : "";

  if (parameters.isRawShaderMaterial) {
    // 原始着色器材质的前缀设置（用户自定义着色器）
    prefixVertex = ["#define SHADER_TYPE " + parameters.shaderType, "#define SHADER_NAME " + parameters.shaderName, customDefines].filter(filterEmptyLine).join("\n");

    if (prefixVertex.length > 0) {
      prefixVertex += "\n";
    }

    prefixFragment = ["#define SHADER_TYPE " + parameters.shaderType, "#define SHADER_NAME " + parameters.shaderName, customDefines].filter(filterEmptyLine).join("\n");

    if (prefixFragment.length > 0) {
      prefixFragment += "\n";
    }
  } else {
    prefixVertex = [
      generatePrecision(parameters),

      "#define SHADER_TYPE " + parameters.shaderType,
      "#define SHADER_NAME " + parameters.shaderName,

      customDefines,

      parameters.extensionClipCullDistance ? "#define USE_CLIP_DISTANCE" : "",
      parameters.batching ? "#define USE_BATCHING" : "",
      parameters.batchingColor ? "#define USE_BATCHING_COLOR" : "",
      parameters.instancing ? "#define USE_INSTANCING" : "",
      parameters.instancingColor ? "#define USE_INSTANCING_COLOR" : "",
      parameters.instancingMorph ? "#define USE_INSTANCING_MORPH" : "",

      parameters.useFog && parameters.fog ? "#define USE_FOG" : "",
      parameters.useFog && parameters.fogExp2 ? "#define FOG_EXP2" : "",

      parameters.map ? "#define USE_MAP" : "",
      parameters.envMap ? "#define USE_ENVMAP" : "",
      parameters.envMap ? "#define " + envMapModeDefine : "",
      parameters.lightMap ? "#define USE_LIGHTMAP" : "",
      parameters.aoMap ? "#define USE_AOMAP" : "",
      parameters.bumpMap ? "#define USE_BUMPMAP" : "",
      parameters.normalMap ? "#define USE_NORMALMAP" : "",
      parameters.normalMapObjectSpace ? "#define USE_NORMALMAP_OBJECTSPACE" : "",
      parameters.normalMapTangentSpace ? "#define USE_NORMALMAP_TANGENTSPACE" : "",
      parameters.displacementMap ? "#define USE_DISPLACEMENTMAP" : "",
      parameters.emissiveMap ? "#define USE_EMISSIVEMAP" : "",

      parameters.anisotropy ? "#define USE_ANISOTROPY" : "",
      parameters.anisotropyMap ? "#define USE_ANISOTROPYMAP" : "",

      parameters.clearcoatMap ? "#define USE_CLEARCOATMAP" : "",
      parameters.clearcoatRoughnessMap ? "#define USE_CLEARCOAT_ROUGHNESSMAP" : "",
      parameters.clearcoatNormalMap ? "#define USE_CLEARCOAT_NORMALMAP" : "",

      parameters.iridescenceMap ? "#define USE_IRIDESCENCEMAP" : "",
      parameters.iridescenceThicknessMap ? "#define USE_IRIDESCENCE_THICKNESSMAP" : "",

      parameters.specularMap ? "#define USE_SPECULARMAP" : "",
      parameters.specularColorMap ? "#define USE_SPECULAR_COLORMAP" : "",
      parameters.specularIntensityMap ? "#define USE_SPECULAR_INTENSITYMAP" : "",

      parameters.roughnessMap ? "#define USE_ROUGHNESSMAP" : "",
      parameters.metalnessMap ? "#define USE_METALNESSMAP" : "",
      parameters.alphaMap ? "#define USE_ALPHAMAP" : "",
      parameters.alphaHash ? "#define USE_ALPHAHASH" : "",

      parameters.transmission ? "#define USE_TRANSMISSION" : "",
      parameters.transmissionMap ? "#define USE_TRANSMISSIONMAP" : "",
      parameters.thicknessMap ? "#define USE_THICKNESSMAP" : "",

      parameters.sheenColorMap ? "#define USE_SHEEN_COLORMAP" : "",
      parameters.sheenRoughnessMap ? "#define USE_SHEEN_ROUGHNESSMAP" : "",

      //

      parameters.mapUv ? "#define MAP_UV " + parameters.mapUv : "",
      parameters.alphaMapUv ? "#define ALPHAMAP_UV " + parameters.alphaMapUv : "",
      parameters.lightMapUv ? "#define LIGHTMAP_UV " + parameters.lightMapUv : "",
      parameters.aoMapUv ? "#define AOMAP_UV " + parameters.aoMapUv : "",
      parameters.emissiveMapUv ? "#define EMISSIVEMAP_UV " + parameters.emissiveMapUv : "",
      parameters.bumpMapUv ? "#define BUMPMAP_UV " + parameters.bumpMapUv : "",
      parameters.normalMapUv ? "#define NORMALMAP_UV " + parameters.normalMapUv : "",
      parameters.displacementMapUv ? "#define DISPLACEMENTMAP_UV " + parameters.displacementMapUv : "",

      parameters.metalnessMapUv ? "#define METALNESSMAP_UV " + parameters.metalnessMapUv : "",
      parameters.roughnessMapUv ? "#define ROUGHNESSMAP_UV " + parameters.roughnessMapUv : "",

      parameters.anisotropyMapUv ? "#define ANISOTROPYMAP_UV " + parameters.anisotropyMapUv : "",

      parameters.clearcoatMapUv ? "#define CLEARCOATMAP_UV " + parameters.clearcoatMapUv : "",
      parameters.clearcoatNormalMapUv ? "#define CLEARCOAT_NORMALMAP_UV " + parameters.clearcoatNormalMapUv : "",
      parameters.clearcoatRoughnessMapUv ? "#define CLEARCOAT_ROUGHNESSMAP_UV " + parameters.clearcoatRoughnessMapUv : "",

      parameters.iridescenceMapUv ? "#define IRIDESCENCEMAP_UV " + parameters.iridescenceMapUv : "",
      parameters.iridescenceThicknessMapUv ? "#define IRIDESCENCE_THICKNESSMAP_UV " + parameters.iridescenceThicknessMapUv : "",

      parameters.sheenColorMapUv ? "#define SHEEN_COLORMAP_UV " + parameters.sheenColorMapUv : "",
      parameters.sheenRoughnessMapUv ? "#define SHEEN_ROUGHNESSMAP_UV " + parameters.sheenRoughnessMapUv : "",

      parameters.specularMapUv ? "#define SPECULARMAP_UV " + parameters.specularMapUv : "",
      parameters.specularColorMapUv ? "#define SPECULAR_COLORMAP_UV " + parameters.specularColorMapUv : "",
      parameters.specularIntensityMapUv ? "#define SPECULAR_INTENSITYMAP_UV " + parameters.specularIntensityMapUv : "",

      parameters.transmissionMapUv ? "#define TRANSMISSIONMAP_UV " + parameters.transmissionMapUv : "",
      parameters.thicknessMapUv ? "#define THICKNESSMAP_UV " + parameters.thicknessMapUv : "",

      //

      parameters.vertexTangents && parameters.flatShading === false ? "#define USE_TANGENT" : "",
      parameters.vertexColors ? "#define USE_COLOR" : "",
      parameters.vertexAlphas ? "#define USE_COLOR_ALPHA" : "",
      parameters.vertexUv1s ? "#define USE_UV1" : "",
      parameters.vertexUv2s ? "#define USE_UV2" : "",
      parameters.vertexUv3s ? "#define USE_UV3" : "",

      parameters.pointsUvs ? "#define USE_POINTS_UV" : "",

      parameters.flatShading ? "#define FLAT_SHADED" : "",

      parameters.skinning ? "#define USE_SKINNING" : "",

      parameters.morphTargets ? "#define USE_MORPHTARGETS" : "",
      parameters.morphNormals && parameters.flatShading === false ? "#define USE_MORPHNORMALS" : "",
      parameters.morphColors ? "#define USE_MORPHCOLORS" : "",
      parameters.morphTargetsCount > 0 ? "#define MORPHTARGETS_TEXTURE_STRIDE " + parameters.morphTextureStride : "",
      parameters.morphTargetsCount > 0 ? "#define MORPHTARGETS_COUNT " + parameters.morphTargetsCount : "",
      parameters.doubleSided ? "#define DOUBLE_SIDED" : "",
      parameters.flipSided ? "#define FLIP_SIDED" : "",

      parameters.shadowMapEnabled ? "#define USE_SHADOWMAP" : "",
      parameters.shadowMapEnabled ? "#define " + shadowMapTypeDefine : "",

      parameters.sizeAttenuation ? "#define USE_SIZEATTENUATION" : "",

      parameters.numLightProbes > 0 ? "#define USE_LIGHT_PROBES" : "",

      parameters.logarithmicDepthBuffer ? "#define USE_LOGDEPTHBUF" : "",
      parameters.reversedDepthBuffer ? "#define USE_REVERSEDEPTHBUF" : "",

      "uniform mat4 modelMatrix;",
      "uniform mat4 modelViewMatrix;",
      "uniform mat4 projectionMatrix;",
      "uniform mat4 viewMatrix;",
      "uniform mat3 normalMatrix;",
      "uniform vec3 cameraPosition;",
      "uniform bool isOrthographic;",

      "#ifdef USE_INSTANCING",

      "	attribute mat4 instanceMatrix;",

      "#endif",

      "#ifdef USE_INSTANCING_COLOR",

      "	attribute vec3 instanceColor;",

      "#endif",

      "#ifdef USE_INSTANCING_MORPH",

      "	uniform sampler2D morphTexture;",

      "#endif",

      "attribute vec3 position;",
      "attribute vec3 normal;",
      "attribute vec2 uv;",

      "#ifdef USE_UV1",

      "	attribute vec2 uv1;",

      "#endif",

      "#ifdef USE_UV2",

      "	attribute vec2 uv2;",

      "#endif",

      "#ifdef USE_UV3",

      "	attribute vec2 uv3;",

      "#endif",

      "#ifdef USE_TANGENT",

      "	attribute vec4 tangent;",

      "#endif",

      "#if defined( USE_COLOR_ALPHA )",

      "	attribute vec4 color;",

      "#elif defined( USE_COLOR )",

      "	attribute vec3 color;",

      "#endif",

      "#ifdef USE_SKINNING",

      "	attribute vec4 skinIndex;",
      "	attribute vec4 skinWeight;",

      "#endif",

      "\n",
    ]
      .filter(filterEmptyLine)
      .join("\n");

    prefixFragment = [
      generatePrecision(parameters),

      "#define SHADER_TYPE " + parameters.shaderType,
      "#define SHADER_NAME " + parameters.shaderName,

      customDefines,

      parameters.useFog && parameters.fog ? "#define USE_FOG" : "",
      parameters.useFog && parameters.fogExp2 ? "#define FOG_EXP2" : "",

      parameters.alphaToCoverage ? "#define ALPHA_TO_COVERAGE" : "",
      parameters.map ? "#define USE_MAP" : "",
      parameters.matcap ? "#define USE_MATCAP" : "",
      parameters.envMap ? "#define USE_ENVMAP" : "",
      parameters.envMap ? "#define " + envMapTypeDefine : "",
      parameters.envMap ? "#define " + envMapModeDefine : "",
      parameters.envMap ? "#define " + envMapBlendingDefine : "",
      envMapCubeUVSize ? "#define CUBEUV_TEXEL_WIDTH " + envMapCubeUVSize.texelWidth : "",
      envMapCubeUVSize ? "#define CUBEUV_TEXEL_HEIGHT " + envMapCubeUVSize.texelHeight : "",
      envMapCubeUVSize ? "#define CUBEUV_MAX_MIP " + envMapCubeUVSize.maxMip + ".0" : "",
      parameters.lightMap ? "#define USE_LIGHTMAP" : "",
      parameters.aoMap ? "#define USE_AOMAP" : "",
      parameters.bumpMap ? "#define USE_BUMPMAP" : "",
      parameters.normalMap ? "#define USE_NORMALMAP" : "",
      parameters.normalMapObjectSpace ? "#define USE_NORMALMAP_OBJECTSPACE" : "",
      parameters.normalMapTangentSpace ? "#define USE_NORMALMAP_TANGENTSPACE" : "",
      parameters.emissiveMap ? "#define USE_EMISSIVEMAP" : "",

      parameters.anisotropy ? "#define USE_ANISOTROPY" : "",
      parameters.anisotropyMap ? "#define USE_ANISOTROPYMAP" : "",

      parameters.clearcoat ? "#define USE_CLEARCOAT" : "",
      parameters.clearcoatMap ? "#define USE_CLEARCOATMAP" : "",
      parameters.clearcoatRoughnessMap ? "#define USE_CLEARCOAT_ROUGHNESSMAP" : "",
      parameters.clearcoatNormalMap ? "#define USE_CLEARCOAT_NORMALMAP" : "",

      parameters.dispersion ? "#define USE_DISPERSION" : "",

      parameters.iridescence ? "#define USE_IRIDESCENCE" : "",
      parameters.iridescenceMap ? "#define USE_IRIDESCENCEMAP" : "",
      parameters.iridescenceThicknessMap ? "#define USE_IRIDESCENCE_THICKNESSMAP" : "",

      parameters.specularMap ? "#define USE_SPECULARMAP" : "",
      parameters.specularColorMap ? "#define USE_SPECULAR_COLORMAP" : "",
      parameters.specularIntensityMap ? "#define USE_SPECULAR_INTENSITYMAP" : "",

      parameters.roughnessMap ? "#define USE_ROUGHNESSMAP" : "",
      parameters.metalnessMap ? "#define USE_METALNESSMAP" : "",

      parameters.alphaMap ? "#define USE_ALPHAMAP" : "",
      parameters.alphaTest ? "#define USE_ALPHATEST" : "",
      parameters.alphaHash ? "#define USE_ALPHAHASH" : "",

      parameters.sheen ? "#define USE_SHEEN" : "",
      parameters.sheenColorMap ? "#define USE_SHEEN_COLORMAP" : "",
      parameters.sheenRoughnessMap ? "#define USE_SHEEN_ROUGHNESSMAP" : "",

      parameters.transmission ? "#define USE_TRANSMISSION" : "",
      parameters.transmissionMap ? "#define USE_TRANSMISSIONMAP" : "",
      parameters.thicknessMap ? "#define USE_THICKNESSMAP" : "",

      parameters.vertexTangents && parameters.flatShading === false ? "#define USE_TANGENT" : "",
      parameters.vertexColors || parameters.instancingColor || parameters.batchingColor ? "#define USE_COLOR" : "",
      parameters.vertexAlphas ? "#define USE_COLOR_ALPHA" : "",
      parameters.vertexUv1s ? "#define USE_UV1" : "",
      parameters.vertexUv2s ? "#define USE_UV2" : "",
      parameters.vertexUv3s ? "#define USE_UV3" : "",

      parameters.pointsUvs ? "#define USE_POINTS_UV" : "",

      parameters.gradientMap ? "#define USE_GRADIENTMAP" : "",

      parameters.flatShading ? "#define FLAT_SHADED" : "",

      parameters.doubleSided ? "#define DOUBLE_SIDED" : "",
      parameters.flipSided ? "#define FLIP_SIDED" : "",

      parameters.shadowMapEnabled ? "#define USE_SHADOWMAP" : "",
      parameters.shadowMapEnabled ? "#define " + shadowMapTypeDefine : "",

      parameters.premultipliedAlpha ? "#define PREMULTIPLIED_ALPHA" : "",

      parameters.numLightProbes > 0 ? "#define USE_LIGHT_PROBES" : "",

      parameters.decodeVideoTexture ? "#define DECODE_VIDEO_TEXTURE" : "",
      parameters.decodeVideoTextureEmissive ? "#define DECODE_VIDEO_TEXTURE_EMISSIVE" : "",

      parameters.logarithmicDepthBuffer ? "#define USE_LOGDEPTHBUF" : "",
      parameters.reversedDepthBuffer ? "#define USE_REVERSEDEPTHBUF" : "",

      "uniform mat4 viewMatrix;",
      "uniform vec3 cameraPosition;",
      "uniform bool isOrthographic;",

      parameters.toneMapping !== NoToneMapping ? "#define TONE_MAPPING" : "",
      parameters.toneMapping !== NoToneMapping ? ShaderChunk["tonemapping_pars_fragment"] : "", // this code is required here because it is used by the toneMapping() function defined below
      parameters.toneMapping !== NoToneMapping ? getToneMappingFunction("toneMapping", parameters.toneMapping) : "",

      parameters.dithering ? "#define DITHERING" : "",
      parameters.opaque ? "#define OPAQUE" : "",

      ShaderChunk["colorspace_pars_fragment"], // this code is required here because it is used by the various encoding/decoding function defined below
      getTexelEncodingFunction("linearToOutputTexel", parameters.outputColorSpace),
      getLuminanceFunction(),

      parameters.useDepthPacking ? "#define DEPTH_PACKING " + parameters.depthPacking : "",

      "\n",
    ]
      .filter(filterEmptyLine)
      .join("\n");
  }

  // 处理着色器源码：解析包含文件、替换占位符、展开循环
  vertexShader = resolveIncludes(vertexShader);
  vertexShader = replaceLightNums(vertexShader, parameters);
  vertexShader = replaceClippingPlaneNums(vertexShader, parameters);

  fragmentShader = resolveIncludes(fragmentShader);
  fragmentShader = replaceLightNums(fragmentShader, parameters);
  fragmentShader = replaceClippingPlaneNums(fragmentShader, parameters);

  vertexShader = unrollLoops(vertexShader);
  fragmentShader = unrollLoops(fragmentShader);

  if (parameters.isRawShaderMaterial !== true) {
    // 为内置材质和 ShaderMaterial 进行 GLSL 3.0 转换
    versionString = "#version 300 es\n";

    // 更新顶点着色器前缀以适配 GLSL 3.0
    prefixVertex = [customVertexExtensions, "#define attribute in", "#define varying out", "#define texture2D texture"].join("\n") + "\n" + prefixVertex;

    // 更新片段着色器前缀以适配 GLSL 3.0
    prefixFragment =
      [
        "#define varying in",
        parameters.glslVersion === GLSL3 ? "" : "layout(location = 0) out highp vec4 pc_fragColor;",
        parameters.glslVersion === GLSL3 ? "" : "#define gl_FragColor pc_fragColor",
        "#define gl_FragDepthEXT gl_FragDepth",
        "#define texture2D texture",
        "#define textureCube texture",
        "#define texture2DProj textureProj",
        "#define texture2DLodEXT textureLod",
        "#define texture2DProjLodEXT textureProjLod",
        "#define textureCubeLodEXT textureLod",
        "#define texture2DGradEXT textureGrad",
        "#define texture2DProjGradEXT textureProjGrad",
        "#define textureCubeGradEXT textureGrad",
      ].join("\n") +
      "\n" +
      prefixFragment;
  }

  // 组装最终的着色器源码
  const vertexGlsl = versionString + prefixVertex + vertexShader;
  const fragmentGlsl = versionString + prefixFragment + fragmentShader;

  // console.log( '*VERTEX*', vertexGlsl );
  // console.log( '*FRAGMENT*', fragmentGlsl );

  // 编译着色器
  const glVertexShader = WebGLShader(gl, gl.VERTEX_SHADER, vertexGlsl);
  const glFragmentShader = WebGLShader(gl, gl.FRAGMENT_SHADER, fragmentGlsl);

  // 将着色器附加到程序
  gl.attachShader(program, glVertexShader);
  gl.attachShader(program, glFragmentShader);

  // 强制将特定属性绑定到索引 0
  if (parameters.index0AttributeName !== undefined) {
    gl.bindAttribLocation(program, 0, parameters.index0AttributeName);
  } else if (parameters.morphTargets === true) {
    // 具有变形目标的程序会将 position 移出属性 0
    gl.bindAttribLocation(program, 0, "position");
  }

  // 链接程序
  gl.linkProgram(program);

  /**
   * 首次使用时的初始化函数
   * 检查着色器链接错误，设置诊断信息，并初始化 uniform 和属性缓存
   *
   * @param {Object} self - WebGLProgram 实例的引用
   */
  function onFirstUse(self) {
    // 检查链接错误
    if (renderer.debug.checkShaderErrors) {
      const programInfoLog = gl.getProgramInfoLog(program) || "";
      const vertexShaderInfoLog = gl.getShaderInfoLog(glVertexShader) || "";
      const fragmentShaderInfoLog = gl.getShaderInfoLog(glFragmentShader) || "";

      const programLog = programInfoLog.trim();
      const vertexLog = vertexShaderInfoLog.trim();
      const fragmentLog = fragmentShaderInfoLog.trim();

      let runnable = true;
      let haveDiagnostics = true;

      if (gl.getProgramParameter(program, gl.LINK_STATUS) === false) {
        runnable = false;

        if (typeof renderer.debug.onShaderError === "function") {
          renderer.debug.onShaderError(gl, program, glVertexShader, glFragmentShader);
        } else {
          // 默认错误报告
          const vertexErrors = getShaderErrors(gl, glVertexShader, "vertex");
          const fragmentErrors = getShaderErrors(gl, glFragmentShader, "fragment");

          console.error(
            "THREE.WebGLProgram: Shader Error " +
              gl.getError() +
              " - " +
              "VALIDATE_STATUS " +
              gl.getProgramParameter(program, gl.VALIDATE_STATUS) +
              "\n\n" +
              "Material Name: " +
              self.name +
              "\n" +
              "Material Type: " +
              self.type +
              "\n\n" +
              "Program Info Log: " +
              programLog +
              "\n" +
              vertexErrors +
              "\n" +
              fragmentErrors
          );
        }
      } else if (programLog !== "") {
        console.warn("THREE.WebGLProgram: Program Info Log:", programLog);
      } else if (vertexLog === "" || fragmentLog === "") {
        haveDiagnostics = false;
      }

      if (haveDiagnostics) {
        self.diagnostics = {
          runnable: runnable,

          programLog: programLog,

          vertexShader: {
            log: vertexLog,
            prefix: prefixVertex,
          },

          fragmentShader: {
            log: fragmentLog,
            prefix: prefixFragment,
          },
        };
      }
    }

    // 清理资源
    // 在 iOS9 和 iOS10 中会崩溃。#18402
    // gl.detachShader( program, glVertexShader );
    // gl.detachShader( program, glFragmentShader );

    gl.deleteShader(glVertexShader);
    gl.deleteShader(glFragmentShader);

    // 初始化 uniform 和属性缓存
    cachedUniforms = new WebGLUniforms(gl, program);
    cachedAttributes = fetchAttributeLocations(gl, program);
  }

  // ========== Uniform 缓存管理 ==========

  /**
   * 缓存的 uniform 变量管理器
   * 延迟初始化，首次访问时创建
   */
  let cachedUniforms;

  /**
   * 获取 uniform 变量管理器
   * 延迟初始化，首次调用时创建 uniform 和属性缓存
   *
   * @returns {WebGLUniforms} 返回 uniform 管理器
   */
  this.getUniforms = function () {
    if (cachedUniforms === undefined) {
      // 填充 cachedUniforms 和 cachedAttributes
      onFirstUse(this);
    }

    return cachedUniforms;
  };

  // ========== 属性位置缓存管理 ==========

  /**
   * 缓存的顶点属性位置信息
   * 延迟初始化，首次访问时创建
   */
  let cachedAttributes;

  /**
   * 获取顶点属性位置信息
   * 延迟初始化，首次调用时创建属性和 uniform 缓存
   *
   * @returns {Object} 返回属性位置映射对象
   */
  this.getAttributes = function () {
    if (cachedAttributes === undefined) {
      // 填充 cachedAttributes 和 cachedUniforms
      onFirstUse(this);
    }

    return cachedAttributes;
  };

  // ========== 程序就绪状态管理 ==========

  /**
   * 程序就绪状态标志
   * 如果不支持 KHR_parallel_shader_compile 扩展，立即标记为就绪
   * 这可能会在首次使用时导致停顿
   */
  let programReady = parameters.rendererExtensionParallelShaderCompile === false;

  /**
   * 检查程序是否准备就绪
   * 支持并行着色器编译时，检查编译状态；否则立即返回 true
   *
   * @returns {boolean} 程序是否准备就绪
   */
  this.isReady = function () {
    if (programReady === false) {
      programReady = gl.getProgramParameter(program, COMPLETION_STATUS_KHR);
    }

    return programReady;
  };

  // ========== 资源管理 ==========

  /**
   * 销毁程序并释放相关资源
   * 清理绑定状态并删除 WebGL 程序对象
   */
  this.destroy = function () {
    bindingStates.releaseStatesOfProgram(this);

    gl.deleteProgram(program);
    this.program = undefined;
  };

  // ========== 程序属性设置 ==========

  /**
   * 着色器类型
   * 标识着色器的类型（如 "MeshBasicMaterial"、"MeshStandardMaterial" 等）
   */
  this.type = parameters.shaderType;

  /**
   * 着色器名称
   * 着色器的具体名称，用于调试和识别
   */
  this.name = parameters.shaderName;

  /**
   * 程序唯一 ID
   * 全局递增的唯一标识符，用于区分不同的程序实例
   */
  this.id = programIdCount++;

  /**
   * 程序缓存键
   * 用于程序缓存的键值，相同参数的程序可以复用
   */
  this.cacheKey = cacheKey;

  /**
   * 程序使用次数（引用计数）
   * 跟踪程序被多少个材质使用，用于资源管理
   */
  this.usedTimes = 1;

  /**
   * WebGL 程序对象
   * 实际的 WebGL 程序，包含链接后的顶点和片段着色器
   */
  this.program = program;

  /**
   * 编译后的顶点着色器
   * WebGL 顶点着色器对象
   */
  this.vertexShader = glVertexShader;

  /**
   * 编译后的片段着色器
   * WebGL 片段着色器对象
   */
  this.fragmentShader = glFragmentShader;

  return this;
}

/**
 * 导出 WebGL 程序构造函数
 */
export { WebGLProgram };
