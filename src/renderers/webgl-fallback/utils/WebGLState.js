// 导入面剔除相关常量
import {
  CullFaceNone,
  CullFaceBack,
  CullFaceFront,
  DoubleSide,
  BackSide,
  // 导入混合模式相关常量
  NormalBlending,
  NoBlending,
  CustomBlending,
  AddEquation,
  AdditiveBlending,
  SubtractiveBlending,
  MultiplyBlending,
  SubtractEquation,
  ReverseSubtractEquation,
  // 导入混合因子相关常量
  ZeroFactor,
  OneFactor,
  SrcColorFactor,
  SrcAlphaFactor,
  SrcAlphaSaturateFactor,
  DstColorFactor,
  DstAlphaFactor,
  OneMinusSrcColorFactor,
  OneMinusSrcAlphaFactor,
  OneMinusDstColorFactor,
  OneMinusDstAlphaFactor,
  // 导入深度测试相关常量
  NeverDepth,
  AlwaysDepth,
  LessDepth,
  LessEqualDepth,
  EqualDepth,
  GreaterEqualDepth,
  GreaterDepth,
  NotEqualDepth,
} from "../../../constants.js";
// 导入四维向量类，用于存储视口和裁剪区域信息
import { Vector4 } from "../../../math/Vector4.js";

// 全局变量：混合方程式到WebGL常量的映射表
let equationToGL, factorToGL;

/**
 * WebGL 2后端状态管理工具模块
 *
 * 该模块的主要目标是通过缓存WebGL状态来减少状态变更的次数
 * 使用一系列变量来缓存WebGL状态，这样渲染器只在必要时执行状态变更命令
 * 从而提高整体性能，避免不必要的GPU状态切换开销
 *
 * @private
 */
class WebGLState {
  /**
   * 构造一个新的状态管理工具对象
   *
   * @param {WebGLBackend} backend - WebGL 2后端实例
   */
  constructor(backend) {
    /**
     * WebGL 2后端的引用
     * 用于访问渲染器和其他后端功能
     *
     * @type {WebGLBackend}
     */
    this.backend = backend;

    /**
     * WebGL渲染上下文的引用
     * 直接引用以便快速访问WebGL API
     *
     * @type {WebGL2RenderingContext}
     */
    this.gl = this.backend.gl;

    // 以下属性用于缓存WebGL状态
    // 为了方便起见，不对每个属性单独进行文档说明

    // 启用状态缓存：存储各种WebGL功能的启用/禁用状态
    this.enabled = {};
    // 当前面翻转状态：是否翻转三角形的正面方向
    this.currentFlipSided = null;
    // 当前面剔除模式：前面、后面或双面剔除
    this.currentCullFace = null;
    // 当前使用的着色器程序
    this.currentProgram = null;
    // 当前混合是否启用
    this.currentBlendingEnabled = false;
    // 当前混合模式
    this.currentBlending = null;
    // 当前RGB源混合因子
    this.currentBlendSrc = null;
    // 当前RGB目标混合因子
    this.currentBlendDst = null;
    // 当前Alpha源混合因子
    this.currentBlendSrcAlpha = null;
    // 当前Alpha目标混合因子
    this.currentBlendDstAlpha = null;
    // 当前预乘Alpha状态
    this.currentPremultipledAlpha = null;
    // 当前多边形偏移因子
    this.currentPolygonOffsetFactor = null;
    // 当前多边形偏移单位
    this.currentPolygonOffsetUnits = null;
    // 当前颜色掩码
    this.currentColorMask = null;
    // 当前深度测试函数
    this.currentDepthFunc = null;
    // 当前深度写入掩码
    this.currentDepthMask = null;
    // 当前模板测试函数
    this.currentStencilFunc = null;
    // 当前模板测试参考值
    this.currentStencilRef = null;
    // 当前模板测试掩码
    this.currentStencilFuncMask = null;
    // 当前模板测试失败操作
    this.currentStencilFail = null;
    // 当前模板测试通过但深度测试失败操作
    this.currentStencilZFail = null;
    // 当前模板测试和深度测试都通过操作
    this.currentStencilZPass = null;
    // 当前模板写入掩码
    this.currentStencilMask = null;
    // 当前线宽
    this.currentLineWidth = null;
    // 当前硬件裁剪平面数量
    this.currentClippingPlanes = 0;

    // 当前绑定的顶点数组对象(VAO)
    this.currentVAO = null;
    // 当前绑定的索引缓冲区
    this.currentIndex = null;

    // 当前绑定的帧缓冲区映射表
    this.currentBoundFramebuffers = {};
    // 当前绘制缓冲区的弱映射表
    this.currentDrawbuffers = new WeakMap();

    // 获取设备支持的最大纹理单元数量
    this.maxTextures = this.gl.getParameter(this.gl.MAX_TEXTURE_IMAGE_UNITS);
    // 当前活跃的纹理槽
    this.currentTextureSlot = null;
    // 当前绑定的纹理映射表
    this.currentBoundTextures = {};
    // 当前绑定的缓冲区基址映射表
    this.currentBoundBufferBases = {};

    // 初始化状态管理器
    this._init();
  }

  /**
   * 初始化状态管理工具的内部状态
   * 设置常量映射表和获取当前WebGL状态
   *
   * @private
   */
  _init() {
    const gl = this.gl;

    // 在此处只存储WebGL常量映射

    // 混合方程式常量到WebGL常量的映射表
    equationToGL = {
      [AddEquation]: gl.FUNC_ADD, // 加法混合
      [SubtractEquation]: gl.FUNC_SUBTRACT, // 减法混合
      [ReverseSubtractEquation]: gl.FUNC_REVERSE_SUBTRACT, // 反向减法混合
    };

    // 混合因子常量到WebGL常量的映射表
    factorToGL = {
      [ZeroFactor]: gl.ZERO, // 零因子
      [OneFactor]: gl.ONE, // 一因子
      [SrcColorFactor]: gl.SRC_COLOR, // 源颜色因子
      [SrcAlphaFactor]: gl.SRC_ALPHA, // 源Alpha因子
      [SrcAlphaSaturateFactor]: gl.SRC_ALPHA_SATURATE, // 源Alpha饱和因子
      [DstColorFactor]: gl.DST_COLOR, // 目标颜色因子
      [DstAlphaFactor]: gl.DST_ALPHA, // 目标Alpha因子
      [OneMinusSrcColorFactor]: gl.ONE_MINUS_SRC_COLOR, // 1减源颜色因子
      [OneMinusSrcAlphaFactor]: gl.ONE_MINUS_SRC_ALPHA, // 1减源Alpha因子
      [OneMinusDstColorFactor]: gl.ONE_MINUS_DST_COLOR, // 1减目标颜色因子
      [OneMinusDstAlphaFactor]: gl.ONE_MINUS_DST_ALPHA, // 1减目标Alpha因子
    };

    // 获取当前裁剪区域参数
    const scissorParam = gl.getParameter(gl.SCISSOR_BOX);
    // 获取当前视口参数
    const viewportParam = gl.getParameter(gl.VIEWPORT);

    // 初始化当前裁剪区域状态
    this.currentScissor = new Vector4().fromArray(scissorParam);
    // 初始化当前视口状态
    this.currentViewport = new Vector4().fromArray(viewportParam);

    // 创建临时四维向量，用于状态比较
    this._tempVec4 = new Vector4();
  }

  /**
   * 启用指定的WebGL功能
   *
   * 该方法缓存功能状态，因此只在必要时调用`gl.enable()`
   * 避免重复的状态切换，提高渲染性能
   *
   * @param {GLenum} id - 要启用的WebGL功能标识符
   */
  enable(id) {
    // 获取启用状态缓存
    const { enabled } = this;

    // 只有当功能未启用时才调用WebGL API
    if (enabled[id] !== true) {
      this.gl.enable(id);
      enabled[id] = true;
    }
  }

  /**
   * 禁用指定的WebGL功能
   *
   * 该方法缓存功能状态，因此只在必要时调用`gl.disable()`
   * 避免重复的状态切换，提高渲染性能
   *
   * @param {GLenum} id - 要禁用的WebGL功能标识符
   */
  disable(id) {
    // 获取启用状态缓存
    const { enabled } = this;

    // 只有当功能未禁用时才调用WebGL API
    if (enabled[id] !== false) {
      this.gl.disable(id);
      enabled[id] = false;
    }
  }

  /**
   * 设置多边形的正面朝向
   * 通过设置缠绕方向来指定多边形是正面朝向还是背面朝向
   *
   * 该方法缓存状态，因此只在必要时调用`gl.frontFace()`
   * 用于控制面剔除和光照计算的正确性
   *
   * @param {boolean} flipSided - 是否翻转三角形的正面方向
   */
  setFlipSided(flipSided) {
    // 只有当翻转状态发生变化时才更新
    if (this.currentFlipSided !== flipSided) {
      const { gl } = this;

      if (flipSided) {
        // 设置顺时针为正面
        gl.frontFace(gl.CW);
      } else {
        // 设置逆时针为正面（默认）
        gl.frontFace(gl.CCW);
      }

      // 更新缓存状态
      this.currentFlipSided = flipSided;
    }
  }

  /**
   * 设置面剔除模式
   * 指定是否以及如何剔除正面和/或背面多边形
   *
   * 该方法缓存状态，因此只在必要时调用`gl.cullFace()`
   * 面剔除可以提高渲染性能，避免绘制不可见的面
   *
   * @param {number} cullFace - 定义哪些多边形是剔除候选对象
   */
  setCullFace(cullFace) {
    const { gl } = this;

    // 如果不是无剔除模式
    if (cullFace !== CullFaceNone) {
      // 启用面剔除功能
      this.enable(gl.CULL_FACE);

      // 只有当剔除模式发生变化时才更新
      if (cullFace !== this.currentCullFace) {
        if (cullFace === CullFaceBack) {
          // 剔除背面
          gl.cullFace(gl.BACK);
        } else if (cullFace === CullFaceFront) {
          // 剔除正面
          gl.cullFace(gl.FRONT);
        } else {
          // 剔除正面和背面
          gl.cullFace(gl.FRONT_AND_BACK);
        }
      }
    } else {
      // 禁用面剔除功能
      this.disable(gl.CULL_FACE);
    }

    // 更新缓存状态
    this.currentCullFace = cullFace;
  }

  /**
   * 设置线条图元的宽度
   *
   * 该方法缓存状态，因此只在必要时调用`gl.lineWidth()`
   * 用于控制线条渲染的粗细程度
   *
   * @param {number} width - 线条宽度（像素）
   */
  setLineWidth(width) {
    const { currentLineWidth, gl } = this;

    // 只有当线宽发生变化时才更新
    if (width !== currentLineWidth) {
      gl.lineWidth(width);
      this.currentLineWidth = width;
    }
  }

  /**
   * 设置混合模式
   *
   * 该方法缓存状态，因此只在必要时调用`gl.blendEquation()`、`gl.blendEquationSeparate()`、
   * `gl.blendFunc()`和`gl.blendFuncSeparate()`等WebGL API
   * 混合模式控制新绘制的像素如何与帧缓冲区中已有的像素进行混合
   *
   * @param {number} blending - 混合类型（如正常混合、加法混合等）
   * @param {number} blendEquation - 混合方程式（仅用于自定义混合）
   * @param {number} blendSrc - RGB源混合因子（仅用于自定义混合）
   * @param {number} blendDst - RGB目标混合因子（仅用于自定义混合）
   * @param {number} blendEquationAlpha - Alpha混合方程式（仅用于自定义混合）
   * @param {number} blendSrcAlpha - Alpha源混合因子（仅用于自定义混合）
   * @param {number} blendDstAlpha - Alpha目标混合因子（仅用于自定义混合）
   * @param {boolean} premultipliedAlpha - 是否启用预乘Alpha
   */
  setBlending(blending, blendEquation, blendSrc, blendDst, blendEquationAlpha, blendSrcAlpha, blendDstAlpha, premultipliedAlpha) {
    const { gl } = this;

    // 如果是无混合模式
    if (blending === NoBlending) {
      // 如果当前混合已启用，则禁用它
      if (this.currentBlendingEnabled === true) {
        this.disable(gl.BLEND);
        this.currentBlendingEnabled = false;
      }
      // 直接返回，不需要进一步处理
      return;
    }

    // 如果当前混合未启用，则启用它
    if (this.currentBlendingEnabled === false) {
      this.enable(gl.BLEND);
      this.currentBlendingEnabled = true;
    }

    // 如果不是自定义混合模式，使用预定义的混合模式
    if (blending !== CustomBlending) {
      // 只有当混合模式或预乘Alpha状态发生变化时才更新
      if (blending !== this.currentBlending || premultipliedAlpha !== this.currentPremultipledAlpha) {
        // 确保混合方程式为加法模式（预定义混合模式都使用加法）
        if (this.currentBlendEquation !== AddEquation || this.currentBlendEquationAlpha !== AddEquation) {
          gl.blendEquation(gl.FUNC_ADD);

          this.currentBlendEquation = AddEquation;
          this.currentBlendEquationAlpha = AddEquation;
        }

        // 根据是否使用预乘Alpha设置不同的混合函数
        if (premultipliedAlpha) {
          // 预乘Alpha模式：颜色值已经乘以Alpha值
          switch (blending) {
            case NormalBlending:
              // 正常混合：新颜色直接覆盖，Alpha通道正常混合
              gl.blendFuncSeparate(gl.ONE, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
              break;

            case AdditiveBlending:
              // 加法混合：新颜色直接相加
              gl.blendFunc(gl.ONE, gl.ONE);
              break;

            case SubtractiveBlending:
              // 减法混合：从目标颜色中减去源颜色
              gl.blendFuncSeparate(gl.ZERO, gl.ONE_MINUS_SRC_COLOR, gl.ZERO, gl.ONE);
              break;

            case MultiplyBlending:
              // 乘法混合：颜色相乘产生更暗的效果
              gl.blendFuncSeparate(gl.DST_COLOR, gl.ONE_MINUS_SRC_ALPHA, gl.ZERO, gl.ONE);
              break;

            default:
              console.error("THREE.WebGLState: Invalid blending: ", blending);
              break;
          }
        } else {
          // 非预乘Alpha模式：需要考虑Alpha值的影响
          switch (blending) {
            case NormalBlending:
              // 正常混合：使用源Alpha进行标准Alpha混合
              gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
              break;

            case AdditiveBlending:
              // 加法混合：源颜色按Alpha比例相加
              gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE, gl.ONE, gl.ONE);
              break;

            case SubtractiveBlending:
              // 减法混合需要预乘Alpha才能正确工作
              console.error("THREE.WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");
              break;

            case MultiplyBlending:
              // 乘法混合需要预乘Alpha才能正确工作
              console.error("THREE.WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");
              break;

            default:
              console.error("THREE.WebGLState: Invalid blending: ", blending);
              break;
          }
        }

        // 清除自定义混合因子缓存，因为使用了预定义模式
        this.currentBlendSrc = null;
        this.currentBlendDst = null;
        this.currentBlendSrcAlpha = null;
        this.currentBlendDstAlpha = null;

        // 更新当前混合状态
        this.currentBlending = blending;
        // 更新预乘Alpha状态
        this.currentPremultipledAlpha = premultipliedAlpha;
      }

      // 预定义混合模式处理完成，直接返回
      return;
    }

    // 自定义混合模式处理
    // 为未指定的Alpha参数设置默认值（使用RGB参数的值）
    blendEquationAlpha = blendEquationAlpha || blendEquation;
    blendSrcAlpha = blendSrcAlpha || blendSrc;
    blendDstAlpha = blendDstAlpha || blendDst;

    // 检查并更新混合方程式（RGB和Alpha可以分别设置）
    if (blendEquation !== this.currentBlendEquation || blendEquationAlpha !== this.currentBlendEquationAlpha) {
      // 分别设置RGB和Alpha的混合方程式
      gl.blendEquationSeparate(equationToGL[blendEquation], equationToGL[blendEquationAlpha]);

      this.currentBlendEquation = blendEquation;
      this.currentBlendEquationAlpha = blendEquationAlpha;
    }

    // 检查并更新混合因子（源和目标因子，RGB和Alpha可以分别设置）
    if (blendSrc !== this.currentBlendSrc || blendDst !== this.currentBlendDst || blendSrcAlpha !== this.currentBlendSrcAlpha || blendDstAlpha !== this.currentBlendDstAlpha) {
      // 分别设置RGB和Alpha的混合因子
      gl.blendFuncSeparate(factorToGL[blendSrc], factorToGL[blendDst], factorToGL[blendSrcAlpha], factorToGL[blendDstAlpha]);

      // 更新缓存的混合因子状态
      this.currentBlendSrc = blendSrc;
      this.currentBlendDst = blendDst;
      this.currentBlendSrcAlpha = blendSrcAlpha;
      this.currentBlendDstAlpha = blendDstAlpha;
    }

    // 更新当前混合模式和预乘Alpha状态
    this.currentBlending = blending;
    this.currentPremultipledAlpha = false; // 自定义混合不使用预乘Alpha
  }

  /**
   * 设置颜色掩码
   * 指定渲染到帧缓冲区时是否可以写入颜色值
   *
   * 该方法缓存状态，因此只在必要时调用`gl.colorMask()`
   * 用于控制RGBA各通道的写入权限
   *
   * @param {boolean} colorMask - 颜色掩码（true允许写入，false禁止写入）
   */
  setColorMask(colorMask) {
    // 只有当颜色掩码发生变化时才更新
    if (this.currentColorMask !== colorMask) {
      // 设置RGBA四个通道的写入掩码
      this.gl.colorMask(colorMask, colorMask, colorMask, colorMask);
      this.currentColorMask = colorMask;
    }
  }

  /**
   * 设置深度测试的启用状态
   * 控制是否启用深度缓冲区测试
   *
   * 深度测试用于确定像素的前后关系，实现正确的遮挡效果
   *
   * @param {boolean} depthTest - 是否启用深度测试
   */
  setDepthTest(depthTest) {
    const { gl } = this;

    if (depthTest) {
      // 启用深度测试
      this.enable(gl.DEPTH_TEST);
    } else {
      // 禁用深度测试
      this.disable(gl.DEPTH_TEST);
    }
  }

  /**
   * 设置深度掩码
   * 指定渲染到帧缓冲区时是否可以写入深度值
   *
   * 该方法缓存状态，因此只在必要时调用`gl.depthMask()`
   * 即使深度测试启用，也可以通过深度掩码禁止写入深度值
   *
   * @param {boolean} depthMask - 深度掩码（true允许写入，false禁止写入）
   */
  setDepthMask(depthMask) {
    // 只有当深度掩码发生变化时才更新
    if (this.currentDepthMask !== depthMask) {
      this.gl.depthMask(depthMask);
      this.currentDepthMask = depthMask;
    }
  }

  /**
   * 设置深度比较函数
   * 指定深度测试时使用的比较函数
   *
   * 该方法缓存状态，因此只在必要时调用`gl.depthFunc()`
   * 深度函数决定了新像素与深度缓冲区中现有深度值的比较方式
   *
   * @param {number} depthFunc - 深度比较函数类型
   */
  setDepthFunc(depthFunc) {
    // 只有当深度函数发生变化时才更新
    if (this.currentDepthFunc !== depthFunc) {
      const { gl } = this;

      // 根据深度函数类型设置相应的WebGL深度函数
      switch (depthFunc) {
        case NeverDepth:
          // 永远不通过深度测试
          gl.depthFunc(gl.NEVER);
          break;

        case AlwaysDepth:
          // 总是通过深度测试
          gl.depthFunc(gl.ALWAYS);
          break;

        case LessDepth:
          // 新深度值小于缓冲区深度值时通过
          gl.depthFunc(gl.LESS);
          break;

        case LessEqualDepth:
          // 新深度值小于等于缓冲区深度值时通过
          gl.depthFunc(gl.LEQUAL);
          break;

        case EqualDepth:
          // 新深度值等于缓冲区深度值时通过
          gl.depthFunc(gl.EQUAL);
          break;

        case GreaterEqualDepth:
          // 新深度值大于等于缓冲区深度值时通过
          gl.depthFunc(gl.GEQUAL);
          break;

        case GreaterDepth:
          // 新深度值大于缓冲区深度值时通过
          gl.depthFunc(gl.GREATER);
          break;

        case NotEqualDepth:
          // 新深度值不等于缓冲区深度值时通过
          gl.depthFunc(gl.NOTEQUAL);
          break;

        default:
          // 默认使用小于等于比较
          gl.depthFunc(gl.LEQUAL);
      }

      // 更新缓存状态
      this.currentDepthFunc = depthFunc;
    }
  }

  /**
   * 设置裁剪区域
   * 定义裁剪测试的矩形区域，只有在此区域内的像素才会被渲染
   *
   * 该方法缓存状态，避免重复设置相同的裁剪区域
   * 裁剪测试可以提高渲染性能，避免绘制屏幕外的像素
   *
   * @param {number} x - 裁剪区域左下角的x坐标
   * @param {number} y - 裁剪区域左下角的y坐标
   * @param {number} width - 裁剪区域的宽度
   * @param {number} height - 裁剪区域的高度
   */
  scissor(x, y, width, height) {
    // 使用临时向量存储新的裁剪区域参数
    const scissor = this._tempVec4.set(x, y, width, height);

    // 只有当裁剪区域发生变化时才更新
    if (this.currentScissor.equals(scissor) === false) {
      const { gl } = this;

      // 设置WebGL裁剪区域
      gl.scissor(scissor.x, scissor.y, scissor.z, scissor.w);
      // 更新缓存的裁剪区域状态
      this.currentScissor.copy(scissor);
    }
  }

  /**
   * 设置视口
   * 定义渲染输出的屏幕区域，控制NDC坐标到屏幕坐标的映射
   *
   * 该方法缓存状态，避免重复设置相同的视口
   * 视口变换是渲染管线的最后一步
   *
   * @param {number} x - 视口左下角的x坐标
   * @param {number} y - 视口左下角的y坐标
   * @param {number} width - 视口的宽度
   * @param {number} height - 视口的高度
   */
  viewport(x, y, width, height) {
    // 使用临时向量存储新的视口参数
    const viewport = this._tempVec4.set(x, y, width, height);

    // 只有当视口发生变化时才更新
    if (this.currentViewport.equals(viewport) === false) {
      const { gl } = this;

      // 设置WebGL视口
      gl.viewport(viewport.x, viewport.y, viewport.z, viewport.w);
      // 更新缓存的视口状态
      this.currentViewport.copy(viewport);
    }
  }

  /**
   * 设置裁剪测试的启用状态
   * 控制是否启用裁剪测试功能
   *
   * 裁剪测试用于限制渲染区域，只有在裁剪区域内的像素才会被绘制
   * 这是一种有效的性能优化手段
   *
   * @param {boolean} boolean - 是否启用裁剪测试
   */
  setScissorTest(boolean) {
    const gl = this.gl;

    if (boolean) {
      // 启用裁剪测试
      gl.enable(gl.SCISSOR_TEST);
    } else {
      // 禁用裁剪测试
      gl.disable(gl.SCISSOR_TEST);
    }
  }

  /**
   * 设置模板测试的启用状态
   * 控制是否启用模板缓冲区测试
   *
   * 模板测试用于实现复杂的渲染效果，如阴影体积、镜面反射等
   * 通过模板缓冲区可以精确控制像素的渲染
   *
   * @param {boolean} stencilTest - 是否启用模板测试
   */
  setStencilTest(stencilTest) {
    const { gl } = this;

    if (stencilTest) {
      // 启用模板测试
      this.enable(gl.STENCIL_TEST);
    } else {
      // 禁用模板测试
      this.disable(gl.STENCIL_TEST);
    }
  }

  /**
   * 设置模板写入掩码
   * 指定渲染到帧缓冲区时是否可以写入模板值
   *
   * 该方法缓存状态，因此只在必要时调用`gl.stencilMask()`
   * 模板掩码控制哪些位可以被写入模板缓冲区
   *
   * @param {boolean} stencilMask - 模板写入掩码
   */
  setStencilMask(stencilMask) {
    // 只有当模板掩码发生变化时才更新
    if (this.currentStencilMask !== stencilMask) {
      this.gl.stencilMask(stencilMask);
      this.currentStencilMask = stencilMask;
    }
  }

  /**
   * 设置模板测试函数
   * 指定模板测试的比较函数和参数
   *
   * 该方法缓存状态，因此只在必要时调用`gl.stencilFunc()`
   * 模板测试函数决定了像素是否通过模板测试
   *
   * @param {number} stencilFunc - 模板比较函数（如gl.ALWAYS、gl.EQUAL等）
   * @param {number} stencilRef - 模板测试的参考值
   * @param {number} stencilMask - 位掩码，用于对参考值和存储的模板值进行AND运算
   */
  setStencilFunc(stencilFunc, stencilRef, stencilMask) {
    // 只有当任一参数发生变化时才更新
    if (this.currentStencilFunc !== stencilFunc || this.currentStencilRef !== stencilRef || this.currentStencilFuncMask !== stencilMask) {
      this.gl.stencilFunc(stencilFunc, stencilRef, stencilMask);

      // 更新缓存的模板测试参数
      this.currentStencilFunc = stencilFunc;
      this.currentStencilRef = stencilRef;
      this.currentStencilFuncMask = stencilMask;
    }
  }

  /**
   * 设置模板测试操作
   * 指定在不同测试结果下对模板缓冲区的操作
   *
   * 该方法缓存状态，因此只在必要时调用`gl.stencilOp()`
   * 模板操作决定了在各种测试情况下如何更新模板值
   *
   * @param {number} stencilFail - 模板测试失败时的操作
   * @param {number} stencilZFail - 模板测试通过但深度测试失败时的操作
   * @param {number} stencilZPass - 模板测试和深度测试都通过时的操作（或无深度测试时模板测试通过）
   */
  setStencilOp(stencilFail, stencilZFail, stencilZPass) {
    // 只有当任一操作发生变化时才更新
    if (this.currentStencilFail !== stencilFail || this.currentStencilZFail !== stencilZFail || this.currentStencilZPass !== stencilZPass) {
      this.gl.stencilOp(stencilFail, stencilZFail, stencilZPass);

      // 更新缓存的模板操作状态
      this.currentStencilFail = stencilFail;
      this.currentStencilZFail = stencilZFail;
      this.currentStencilZPass = stencilZPass;
    }
  }

  /**
   * 根据给定材质配置WebGL状态
   * 这是一个综合性方法，一次性设置材质相关的所有渲染状态
   *
   * @param {Material} material - 要配置状态的材质对象
   * @param {number} frontFaceCW - 正面是否为顺时针方向
   * @param {number} hardwareClippingPlanes - 硬件裁剪平面的数量
   */
  setMaterial(material, frontFaceCW, hardwareClippingPlanes) {
    const { gl } = this;

    // 根据材质的side属性设置面剔除
    // 双面材质禁用面剔除，其他情况启用面剔除
    material.side === DoubleSide ? this.disable(gl.CULL_FACE) : this.enable(gl.CULL_FACE);

    // 确定是否需要翻转面的朝向
    let flipSided = material.side === BackSide;
    if (frontFaceCW) flipSided = !flipSided;

    // 设置面的翻转状态
    this.setFlipSided(flipSided);

    // 设置混合模式
    // 如果是正常混合且不透明，则禁用混合；否则使用材质指定的混合参数
    material.blending === NormalBlending && material.transparent === false
      ? this.setBlending(NoBlending)
      : this.setBlending(
          material.blending,
          material.blendEquation,
          material.blendSrc,
          material.blendDst,
          material.blendEquationAlpha,
          material.blendSrcAlpha,
          material.blendDstAlpha,
          material.premultipliedAlpha
        );

    // 设置深度相关状态
    this.setDepthFunc(material.depthFunc); // 深度比较函数
    this.setDepthTest(material.depthTest); // 深度测试启用状态
    this.setDepthMask(material.depthWrite); // 深度写入掩码
    this.setColorMask(material.colorWrite); // 颜色写入掩码

    // 设置模板测试相关状态
    const stencilWrite = material.stencilWrite;
    this.setStencilTest(stencilWrite);
    if (stencilWrite) {
      // 只有启用模板写入时才设置模板相关参数
      this.setStencilMask(material.stencilWriteMask);
      this.setStencilFunc(material.stencilFunc, material.stencilRef, material.stencilFuncMask);
      this.setStencilOp(material.stencilFail, material.stencilZFail, material.stencilZPass);
    }

    // 设置多边形偏移（用于解决Z-fighting问题）
    this.setPolygonOffset(material.polygonOffset, material.polygonOffsetFactor, material.polygonOffsetUnits);

    // 设置Alpha到覆盖率转换（用于多重采样抗锯齿）
    material.alphaToCoverage === true && this.backend.renderer.samples > 1 ? this.enable(gl.SAMPLE_ALPHA_TO_COVERAGE) : this.disable(gl.SAMPLE_ALPHA_TO_COVERAGE);

    // 设置硬件裁剪平面
    if (hardwareClippingPlanes > 0) {
      if (this.currentClippingPlanes !== hardwareClippingPlanes) {
        // WebGL裁剪距离常量的起始值
        const CLIP_DISTANCE0_WEBGL = 0x3000;

        // 启用或禁用最多8个裁剪平面
        for (let i = 0; i < 8; i++) {
          if (i < hardwareClippingPlanes) {
            // 启用需要的裁剪平面
            this.enable(CLIP_DISTANCE0_WEBGL + i);
          } else {
            // 禁用不需要的裁剪平面
            this.disable(CLIP_DISTANCE0_WEBGL + i);
          }
        }
      }
    }
  }

  /**
   * 设置多边形偏移
   * 用于解决共面多边形的Z-fighting问题
   *
   * 该方法缓存状态，因此只在必要时调用`gl.polygonOffset()`
   * 多边形偏移通过修改深度值来避免深度冲突
   *
   * @param {boolean} polygonOffset - 是否启用多边形偏移
   * @param {number} factor - 可变深度偏移的缩放因子
   * @param {number} units - 常量深度偏移的乘数
   */
  setPolygonOffset(polygonOffset, factor, units) {
    const { gl } = this;

    if (polygonOffset) {
      // 启用多边形偏移填充
      this.enable(gl.POLYGON_OFFSET_FILL);

      // 只有当偏移参数发生变化时才更新
      if (this.currentPolygonOffsetFactor !== factor || this.currentPolygonOffsetUnits !== units) {
        gl.polygonOffset(factor, units);

        this.currentPolygonOffsetFactor = factor;
        this.currentPolygonOffsetUnits = units;
      }
    } else {
      // 禁用多边形偏移填充
      this.disable(gl.POLYGON_OFFSET_FILL);
    }
  }

  /**
   * 设置要使用的WebGL着色器程序
   *
   * 该方法缓存状态，因此只在必要时调用`gl.useProgram()`
   * 避免重复切换相同的着色器程序，提高渲染性能
   *
   * @param {WebGLProgram} program - 要使用的WebGL着色器程序
   * @return {boolean} 是否执行了程序切换操作
   */
  useProgram(program) {
    // 只有当程序发生变化时才切换
    if (this.currentProgram !== program) {
      this.gl.useProgram(program);
      this.currentProgram = program;
      return true;
    }

    return false;
  }

  /**
   * 设置顶点状态
   * 通过绑定给定的VAO和索引缓冲区来设置顶点数组状态
   *
   * @param {WebGLVertexArrayObject} vao - 顶点数组对象
   * @param {WebGLBuffer} indexBuffer - 索引缓冲区（可选）
   * @return {boolean} 是否执行了顶点状态变更
   */
  setVertexState(vao, indexBuffer = null) {
    const gl = this.gl;

    // 只有当VAO或索引缓冲区发生变化时才更新
    if (this.currentVAO !== vao || this.currentIndex !== indexBuffer) {
      // 绑定顶点数组对象
      gl.bindVertexArray(vao);

      // 如果提供了索引缓冲区，则绑定它
      if (indexBuffer !== null) {
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
      }

      // 更新缓存状态
      this.currentVAO = vao;
      this.currentIndex = indexBuffer;

      return true;
    }

    return false;
  }

  /**
   * 重置顶点数组状态
   * 解绑VAO和索引缓冲区，恢复到默认状态
   */
  resetVertexState() {
    const gl = this.gl;

    // 解绑顶点数组对象
    gl.bindVertexArray(null);
    // 解绑索引缓冲区
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

    // 清除缓存状态
    this.currentVAO = null;
    this.currentIndex = null;
  }

  // 帧缓冲区相关方法

  /**
   * 绑定指定的帧缓冲区
   * 帧缓冲区用于离屏渲染，可以渲染到纹理而不是屏幕
   *
   * 该方法缓存状态，因此只在必要时调用`gl.bindFramebuffer()`
   * 避免重复绑定相同的帧缓冲区，提高渲染性能
   *
   * @param {number} target - 绑定点目标（如gl.FRAMEBUFFER、gl.DRAW_FRAMEBUFFER等）
   * @param {WebGLFramebuffer} framebuffer - 要绑定的WebGL帧缓冲区
   * @return {boolean} 是否执行了绑定操作
   */
  bindFramebuffer(target, framebuffer) {
    const { gl, currentBoundFramebuffers } = this;

    // 只有当帧缓冲区发生变化时才绑定
    if (currentBoundFramebuffers[target] !== framebuffer) {
      gl.bindFramebuffer(target, framebuffer);

      // 更新缓存状态
      currentBoundFramebuffers[target] = framebuffer;

      // gl.DRAW_FRAMEBUFFER 等价于 gl.FRAMEBUFFER
      // 需要同步更新相关的绑定点状态

      if (target === gl.DRAW_FRAMEBUFFER) {
        // 绘制帧缓冲区也会影响通用帧缓冲区绑定点
        currentBoundFramebuffers[gl.FRAMEBUFFER] = framebuffer;
      }

      if (target === gl.FRAMEBUFFER) {
        // 通用帧缓冲区绑定点也会影响绘制帧缓冲区
        currentBoundFramebuffers[gl.DRAW_FRAMEBUFFER] = framebuffer;
      }

      return true;
    }

    return false;
  }

  /**
   * 定义片段颜色写入的绘制缓冲区
   * 配置自定义帧缓冲区的多重渲染目标(MRT)设置
   *
   * 该方法缓存状态，因此只在必要时调用`gl.drawBuffers()`
   * MRT允许在单次渲染过程中同时输出到多个颜色附件
   *
   * @param {RenderContext} renderContext - 渲染上下文
   * @param {WebGLFramebuffer} framebuffer - WebGL帧缓冲区
   */
  drawBuffers(renderContext, framebuffer) {
    const { gl } = this;

    // 初始化绘制缓冲区数组
    let drawBuffers = [];

    // 标记是否需要更新绘制缓冲区设置
    let needsUpdate = false;

    // 如果渲染上下文包含多个纹理（MRT模式）
    if (renderContext.textures !== null) {
      // 从缓存中获取当前帧缓冲区的绘制缓冲区配置
      drawBuffers = this.currentDrawbuffers.get(framebuffer);

      // 如果缓存中没有配置，创建新的配置
      if (drawBuffers === undefined) {
        drawBuffers = [];
        this.currentDrawbuffers.set(framebuffer, drawBuffers);
      }

      const textures = renderContext.textures;

      // 检查绘制缓冲区配置是否需要更新
      if (drawBuffers.length !== textures.length || drawBuffers[0] !== gl.COLOR_ATTACHMENT0) {
        // 为每个纹理分配一个颜色附件
        for (let i = 0, il = textures.length; i < il; i++) {
          drawBuffers[i] = gl.COLOR_ATTACHMENT0 + i;
        }

        // 设置数组长度以匹配纹理数量
        drawBuffers.length = textures.length;

        needsUpdate = true;
      }
    } else {
      // 单一渲染目标模式，使用后缓冲区
      if (drawBuffers[0] !== gl.BACK) {
        drawBuffers[0] = gl.BACK;

        needsUpdate = true;
      }
    }

    // 只有在需要更新时才调用WebGL API
    if (needsUpdate) {
      gl.drawBuffers(drawBuffers);
    }
  }

  // texture

  /**
   * 激活指定的纹理单元
   *
   * 该方法缓存状态，因此只在必要时调用`gl.activeTexture()`
   * 纹理单元决定了后续纹理绑定操作的目标槽位
   *
   * @param {number} webglSlot - 要激活的纹理单元槽位
   */
  activeTexture(webglSlot) {
    const { gl, currentTextureSlot, maxTextures } = this;

    // 如果未指定槽位，使用最后一个可用的纹理单元
    if (webglSlot === undefined) webglSlot = gl.TEXTURE0 + maxTextures - 1;

    // 只有当纹理槽位发生变化时才切换
    if (currentTextureSlot !== webglSlot) {
      gl.activeTexture(webglSlot);
      this.currentTextureSlot = webglSlot;
    }
  }

  /**
   * 将给定的WebGL纹理绑定到指定目标
   * 纹理绑定是渲染管线中的关键步骤，决定了着色器可以访问哪些纹理
   *
   * 该方法缓存状态，因此只在必要时调用`gl.bindTexture()`
   * 避免重复绑定相同的纹理，显著提高渲染性能
   *
   * @param {number} webglType - 绑定点目标（如gl.TEXTURE_2D、gl.TEXTURE_CUBE_MAP等）
   * @param {WebGLTexture} webglTexture - 要绑定的WebGL纹理对象
   * @param {number} webglSlot - 纹理单元槽位（可选）
   */
  bindTexture(webglType, webglTexture, webglSlot) {
    const { gl, currentTextureSlot, currentBoundTextures, maxTextures } = this;

    // 如果未指定纹理槽位，使用当前活跃槽位或最后一个可用槽位
    if (webglSlot === undefined) {
      if (currentTextureSlot === null) {
        // 使用最后一个可用的纹理单元
        webglSlot = gl.TEXTURE0 + maxTextures - 1;
      } else {
        // 使用当前活跃的纹理单元
        webglSlot = currentTextureSlot;
      }
    }

    // 获取指定槽位的绑定纹理信息
    let boundTexture = currentBoundTextures[webglSlot];

    // 如果槽位信息不存在，创建新的绑定信息对象
    if (boundTexture === undefined) {
      boundTexture = { type: undefined, texture: undefined };
      currentBoundTextures[webglSlot] = boundTexture;
    }

    // 只有当纹理类型或纹理对象发生变化时才绑定
    if (boundTexture.type !== webglType || boundTexture.texture !== webglTexture) {
      // 如果需要切换到不同的纹理单元
      if (currentTextureSlot !== webglSlot) {
        gl.activeTexture(webglSlot);
        this.currentTextureSlot = webglSlot;
      }

      // 绑定纹理到指定类型的绑定点
      gl.bindTexture(webglType, webglTexture);

      // 更新缓存的绑定信息
      boundTexture.type = webglType;
      boundTexture.texture = webglTexture;
    }
  }

  /**
   * 将给定的WebGL缓冲区绑定到指定绑定点的指定索引位置
   * 主要用于绑定统一缓冲区对象(UBO)和着色器存储缓冲区对象(SSBO)
   *
   * 该方法缓存状态，因此只在必要时调用`gl.bindBufferBase()`
   * 避免重复绑定相同的缓冲区，提高渲染性能
   *
   * @param {number} target - 绑定操作的目标（如gl.UNIFORM_BUFFER、gl.SHADER_STORAGE_BUFFER等）
   * @param {number} index - 目标绑定点的索引
   * @param {WebGLBuffer} buffer - 要绑定的WebGL缓冲区
   * @return {boolean} 是否执行了绑定操作
   */
  bindBufferBase(target, index, buffer) {
    const { gl } = this;

    // 创建唯一的缓存键，结合目标和索引
    const key = `${target}-${index}`;

    // 只有当缓冲区发生变化时才绑定
    if (this.currentBoundBufferBases[key] !== buffer) {
      gl.bindBufferBase(target, index, buffer);
      this.currentBoundBufferBases[key] = buffer;

      return true;
    }

    return false;
  }

  /**
   * 解绑当前绑定的纹理
   * 将当前活跃纹理单元的纹理绑定设置为null
   *
   * 该方法缓存状态，因此只在必要时调用`gl.bindTexture()`
   * 用于清理纹理绑定状态，避免意外的纹理引用
   */
  unbindTexture() {
    const { gl, currentTextureSlot, currentBoundTextures } = this;

    // 获取当前纹理单元的绑定信息
    const boundTexture = currentBoundTextures[currentTextureSlot];

    // 只有当存在已绑定的纹理时才解绑
    if (boundTexture !== undefined && boundTexture.type !== undefined) {
      // 将纹理绑定设置为null，实现解绑
      gl.bindTexture(boundTexture.type, null);

      // 清除缓存的绑定信息
      boundTexture.type = undefined;
      boundTexture.texture = undefined;
    }
  }
}

export default WebGLState;
