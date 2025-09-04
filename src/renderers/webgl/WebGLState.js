// 导入深度测试、面剔除、混合模式等相关常量
// 这些常量定义了WebGL渲染状态的各种选项
import {
  NotEqualDepth,
  GreaterDepth,
  GreaterEqualDepth,
  EqualDepth,
  LessEqualDepth,
  LessDepth,
  AlwaysDepth,
  NeverDepth,
  CullFaceFront,
  CullFaceBack,
  CullFaceNone,
  DoubleSide,
  BackSide,
  CustomBlending,
  MultiplyBlending,
  SubtractiveBlending,
  AdditiveBlending,
  NoBlending,
  NormalBlending,
  AddEquation,
  SubtractEquation,
  ReverseSubtractEquation,
  MinEquation,
  MaxEquation,
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
  ConstantColorFactor,
  OneMinusConstantColorFactor,
  ConstantAlphaFactor,
  OneMinusConstantAlphaFactor,
} from "../../constants.js";
// 导入颜色和向量数学类
import { Color } from "../../math/Color.js";
import { Vector4 } from "../../math/Vector4.js";

/**
 * EXT_clip_control 扩展说明
 *
 * EXT_clip_control 是一个 WebGL 扩展，提供了 clipControlEXT() 函数来控制：
 * 1. 裁剪坐标系统的原点位置（屏幕空间Y轴方向）
 * 2. NDC（标准化设备坐标）的深度范围
 *
 * clipControlEXT(origin, depthMode) 参数详解：
 *
 * origin 参数（坐标系原点）：
 * - LOWER_LEFT_EXT：左下角为原点，Y轴向上（WebGL/OpenGL传统方式）
 * - UPPER_LEFT_EXT：左上角为原点，Y轴向下（Direct3D方式）
 *
 * depthMode 参数（深度范围）：
 * - NEGATIVE_ONE_TO_ONE_EXT：深度范围[-1,1]，-1=近平面，1=远平面（OpenGL传统）
 * - ZERO_TO_ONE_EXT：深度范围[0,1]，0=近平面，1=远平面（Direct3D方式）
 *
 * 在反向深度缓冲区中的应用：
 * - 使用 ZERO_TO_ONE_EXT 深度范围配合反转的深度函数
 * - 提供更均匀的深度精度分布，特别适合大范围场景
 * - 有效减少 Z-fighting 现象，性能优于对数深度缓冲区
 */

/**
 * 反向深度函数映射表
 *
 * 当使用反向深度缓冲区时，需要将深度测试函数进行反向映射。
 * 反向深度缓冲区可以提供更好的深度精度分布，特别是在远距离场景中。
 *
 * 深度值反转原理：
 * - 标准深度：近=0.0，远=1.0，使用LessDepth测试（新深度<缓冲区深度时通过）
 * - 反向深度：近=1.0，远=0.0，需要GreaterDepth测试（新深度>缓冲区深度时通过）
 *
 * 映射逻辑说明：
 * - 在反向深度中，较近的物体有较大的深度值
 * - 因此原本的"小于"比较需要变成"大于"比较
 * - 所有比较操作都需要相应地反转
 *
 * 例如：LessDepth (小于) 在反向深度中变成 GreaterDepth (大于)
 */
const reversedFuncs = {
  [NeverDepth]: AlwaysDepth, // 从不通过 -> 总是通过
  [LessDepth]: GreaterDepth, // 小于 -> 大于（近物体深度值更大）
  [EqualDepth]: NotEqualDepth, // 等于 -> 不等于
  [LessEqualDepth]: GreaterEqualDepth, // 小于等于 -> 大于等于

  [AlwaysDepth]: NeverDepth, // 总是通过 -> 从不通过
  [GreaterDepth]: LessDepth, // 大于 -> 小于（远物体深度值更小）
  [NotEqualDepth]: EqualDepth, // 不等于 -> 等于
  [GreaterEqualDepth]: LessEqualDepth, // 大于等于 -> 小于等于
};

/**
 * WebGL状态管理器
 *
 * 这是Three.js WebGL渲染器的核心状态管理系统。它负责：
 * 1. 缓存WebGL状态，避免重复的API调用
 * 2. 管理颜色、深度、模板缓冲区
 * 3. 处理混合模式、面剔除、多边形偏移等渲染状态
 * 4. 管理纹理绑定和激活
 * 5. 处理视口和裁剪区域
 *
 * 通过智能的状态缓存和批量操作，显著提高渲染性能。
 *
 * @param {WebGL2RenderingContext} gl - WebGL渲染上下文
 * @param {WebGLExtensions} extensions - WebGL扩展管理器
 * @returns {Object} 状态管理器对象
 */
function WebGLState(gl, extensions) {
  /**
   * 颜色缓冲区管理器
   *
   * 管理WebGL颜色缓冲区的状态，包括颜色写入掩码和清除颜色。
   * 通过缓存当前状态避免重复的WebGL API调用。
   *
   * @returns {Object} 颜色缓冲区管理对象
   */
  function ColorBuffer() {
    // 锁定状态，当为true时阻止状态更改
    let locked = false;

    // 临时颜色向量，用于比较
    const color = new Vector4();
    // 当前颜色写入掩码状态
    let currentColorMask = null;
    // 当前清除颜色状态
    const currentColorClear = new Vector4(0, 0, 0, 0);

    return {
      /**
       * 设置颜色写入掩码
       *
       * 控制哪些颜色通道可以被写入到颜色缓冲区。
       *
       * @param {boolean} colorMask - 颜色写入掩码，true表示允许写入
       */
      setMask: function (colorMask) {
        // 只有在状态改变且未锁定时才调用WebGL API
        if (currentColorMask !== colorMask && !locked) {
          // 设置RGBA四个通道的写入掩码
          gl.colorMask(colorMask, colorMask, colorMask, colorMask);
          currentColorMask = colorMask;
        }
      },

      /**
       * 设置锁定状态
       *
       * 当锁定时，setMask方法将不会更改WebGL状态。
       * 这在某些特殊渲染过程中很有用。
       *
       * @param {boolean} lock - 是否锁定颜色缓冲区状态
       */
      setLocked: function (lock) {
        locked = lock;
      },

      /**
       * 设置清除颜色
       *
       * 设置调用gl.clear()时使用的颜色值。
       *
       * @param {number} r - 红色分量 (0-1)
       * @param {number} g - 绿色分量 (0-1)
       * @param {number} b - 蓝色分量 (0-1)
       * @param {number} a - 透明度分量 (0-1)
       * @param {boolean} premultipliedAlpha - 是否使用预乘透明度
       */
      setClear: function (r, g, b, a, premultipliedAlpha) {
        // 如果使用预乘透明度，需要将RGB分量乘以alpha值
        if (premultipliedAlpha === true) {
          r *= a;
          g *= a;
          b *= a;
        }

        // 设置临时颜色向量
        color.set(r, g, b, a);

        // 只有在颜色改变时才调用WebGL API
        if (currentColorClear.equals(color) === false) {
          gl.clearColor(r, g, b, a);
          currentColorClear.copy(color);
        }
      },

      /**
       * 重置颜色缓冲区状态
       *
       * 将所有状态重置为初始值，强制下次设置时重新调用WebGL API。
       */
      reset: function () {
        locked = false;

        currentColorMask = null;
        // 设置为无效状态，强制下次更新
        currentColorClear.set(-1, 0, 0, 0); // set to invalid state
      },
    };
  }

  /**
   * 深度缓冲区管理器
   *
   * 管理WebGL深度缓冲区的状态，包括深度测试、深度写入掩码、深度函数等。
   * 支持反向深度缓冲区，可以提供更好的深度精度分布。
   *
   * @returns {Object} 深度缓冲区管理对象
   */
  function DepthBuffer() {
    // 锁定状态，当为true时阻止状态更改
    let locked = false;

    // 是否使用反向深度缓冲区
    let currentReversed = false;
    // 当前深度写入掩码状态
    let currentDepthMask = null;
    // 当前深度测试函数
    let currentDepthFunc = null;
    // 当前深度清除值
    let currentDepthClear = null;

    return {
      /**
       * 设置反向深度缓冲区
       *
       * 反向深度缓冲区将深度值从[0,1]反转为[1,0]，
       * 可以提供更好的深度精度分布，特别是在远距离场景中。
       *
       * @param {boolean} reversed - 是否启用反向深度缓冲区
       */
      setReversed: function (reversed) {
        if (currentReversed !== reversed) {
          // 获取EXT_clip_control扩展
          // 该扩展允许控制WebGL的裁剪坐标系统和深度范围
          const ext = extensions.get("EXT_clip_control");

          if (reversed) {
            // 设置为反向深度缓冲区模式
            // clipControlEXT(origin, depthMode) 函数参数说明：
            //
            // 第一个参数 origin - 坐标系原点位置：
            //   - LOWER_LEFT_EXT: 左下角为原点，Y轴向上（WebGL/OpenGL传统方式）
            //   - UPPER_LEFT_EXT: 左上角为原点，Y轴向下（Direct3D方式）
            //
            // 第二个参数 depthMode - NDC深度坐标范围：
            //   - ZERO_TO_ONE_EXT: 深度范围[0,1]，0=近平面，1=远平面（Direct3D方式） NDC 深度坐标范围为 [0, 1]
            //   - NEGATIVE_ONE_TO_ONE_EXT: 深度范围[-1,1]，-1=近平面，1=远平面（OpenGL传统） NDC 深度坐标范围为 [-1, 1]
            //
            // 反向深度使用[0,1]范围配合反转的深度函数，提供更均匀的深度精度分布
            ext.clipControlEXT(ext.LOWER_LEFT_EXT, ext.ZERO_TO_ONE_EXT);
          } else {
            // 设置为标准深度缓冲区模式
            // 使用WebGL传统的坐标系和深度范围
            // LOWER_LEFT_EXT: 保持左下角原点，Y轴向上的WebGL传统坐标系
            // NEGATIVE_ONE_TO_ONE_EXT: 使用[-1,1]的传统深度范围
            ext.clipControlEXT(ext.LOWER_LEFT_EXT, ext.NEGATIVE_ONE_TO_ONE_EXT);
          }

          currentReversed = reversed;

          // 重新设置深度清除值以适应新的深度范围
          // 当深度范围改变时，需要重新计算清除值以确保正确的深度初始化
          const oldDepth = currentDepthClear;
          currentDepthClear = null;
          this.setClear(oldDepth);
        }
      },

      /**
       * 获取当前是否使用反向深度缓冲区
       *
       * @returns {boolean} 是否使用反向深度缓冲区
       */
      getReversed: function () {
        return currentReversed;
      },

      /**
       * 设置深度测试开关
       *
       * 深度测试用于确定像素是否应该被绘制，
       * 基于其深度值与深度缓冲区中现有值的比较。
       *
       * @param {boolean} depthTest - 是否启用深度测试
       */
      setTest: function (depthTest) {
        if (depthTest) {
          enable(gl.DEPTH_TEST);
        } else {
          disable(gl.DEPTH_TEST);
        }
      },

      /**
       * 设置深度写入掩码
       *
       * 控制是否允许写入深度缓冲区。
       * 即使深度测试通过，如果掩码为false，深度值也不会被写入。
       *
       * @param {boolean} depthMask - 深度写入掩码，true表示允许写入
       */
      setMask: function (depthMask) {
        // 只有在状态改变且未锁定时才调用WebGL API
        if (currentDepthMask !== depthMask && !locked) {
          gl.depthMask(depthMask);
          currentDepthMask = depthMask;
        }
      },

      /**
       * 设置深度测试函数
       *
       * 深度测试函数决定了新像素的深度值与深度缓冲区中现有值的比较方式。
       * 如果启用了反向深度缓冲区，函数会自动进行反向映射。
       *
       * @param {number} depthFunc - 深度测试函数常量
       *   - NeverDepth: 从不通过深度测试
       *   - AlwaysDepth: 总是通过深度测试
       *   - LessDepth: 当新深度值小于缓冲区值时通过
       *   - LessEqualDepth: 当新深度值小于等于缓冲区值时通过
       *   - EqualDepth: 当新深度值等于缓冲区值时通过
       *   - GreaterEqualDepth: 当新深度值大于等于缓冲区值时通过
       *   - GreaterDepth: 当新深度值大于缓冲区值时通过
       *   - NotEqualDepth: 当新深度值不等于缓冲区值时通过
       */
      setFunc: function (depthFunc) {
        // 深度函数自动转换逻辑：
        //
        // 当启用反向深度缓冲区时，深度值的含义发生了变化：
        // - 标准深度：0.0=近，1.0=远，较近物体应该通过深度测试
        // - 反向深度：1.0=近，0.0=远，较近物体有更大的深度值
        //
        // 因此需要将深度比较函数进行相应的反转：
        // - 原本用LessDepth（小于）来让近物体通过测试
        // - 反向深度中需要用GreaterDepth（大于）来让近物体（大深度值）通过测试
        //
        // 这个转换对应用层是透明的，开发者仍然可以使用相同的深度函数语义
        if (currentReversed) depthFunc = reversedFuncs[depthFunc];

        // 只有在深度函数改变时才调用WebGL API，避免不必要的状态切换
        if (currentDepthFunc !== depthFunc) {
          switch (depthFunc) {
            case NeverDepth:
              gl.depthFunc(gl.NEVER); // 从不通过
              break;

            case AlwaysDepth:
              gl.depthFunc(gl.ALWAYS); // 总是通过
              break;

            case LessDepth:
              gl.depthFunc(gl.LESS); // 小于时通过
              break;

            case LessEqualDepth:
              gl.depthFunc(gl.LEQUAL); // 小于等于时通过
              break;

            case EqualDepth:
              gl.depthFunc(gl.EQUAL); // 等于时通过
              break;

            case GreaterEqualDepth:
              gl.depthFunc(gl.GEQUAL); // 大于等于时通过
              break;

            case GreaterDepth:
              gl.depthFunc(gl.GREATER); // 大于时通过
              break;

            case NotEqualDepth:
              gl.depthFunc(gl.NOTEQUAL); // 不等于时通过
              break;

            default:
              // 默认使用小于等于函数
              gl.depthFunc(gl.LEQUAL);
          }

          currentDepthFunc = depthFunc;
        }
      },

      /**
       * 设置锁定状态
       *
       * 当锁定时，setMask方法将不会更改WebGL状态。
       * 这在某些特殊渲染过程中很有用。
       *
       * @param {boolean} lock - 是否锁定深度缓冲区状态
       */
      setLocked: function (lock) {
        locked = lock;
      },

      /**
       * 设置深度清除值
       *
       * 设置调用gl.clear()时使用的深度值。
       * 如果使用反向深度缓冲区，深度值会被自动反转。
       *
       * @param {number} depth - 深度清除值 (0-1)
       */
      setClear: function (depth) {
        if (currentDepthClear !== depth) {
          // 深度清除值处理逻辑：
          //
          // 重要说明：这里的depth参数是应用层语义，始终使用[0,1]范围
          // - depth=0.0 表示最近距离（应用层语义）
          // - depth=1.0 表示最远距离（应用层语义）
          //
          // 标准深度缓冲区（NDC范围[-1,1]）：
          //   - 应用层depth=0.0 -> WebGL使用0.0（对应NDC的-1，但gl.clearDepth接受[0,1]）
          //   - 应用层depth=1.0 -> WebGL使用1.0（对应NDC的+1）
          //   - gl.clearDepth()函数本身接受[0,1]范围，内部映射到NDC的[-1,1]
          //
          // 反向深度缓冲区（NDC范围[0,1]）：
          //   - 需要反转深度值：1.0-depth
          //   - 应用层depth=0.0（最近）-> WebGL使用1.0（在反向深度NDC中1表示最近）
          //   - 应用层depth=1.0（最远）-> WebGL使用0.0（在反向深度NDC中0表示最远）
          //
          // 您提到的 -1 是 NDC（标准化设备坐标） 层面的值，但 gl.clearDepth() 函数的API设计是：

          // 输入范围：始终是 [0, 1]
          // 内部映射：WebGL根据当前的深度模式将 [0,1] 映射到实际的NDC范围
          // 这就是为什么即使在标准深度模式下，我们也不会直接传递 -1 给 gl.clearDepth()，而是传递 0.0，让WebGL内部处理到 NDC 的映射。
          // 这样确保了无论使用哪种深度缓冲区模式，
          // 应用层都可以使用统一的深度值语义（1.0=远，0.0=近）
          if (currentReversed) {
            depth = 1 - depth;
          }

          gl.clearDepth(depth);
          currentDepthClear = depth;
        }
      },

      /**
       * 重置深度缓冲区状态
       *
       * 将所有状态重置为初始值，强制下次设置时重新调用WebGL API。
       */
      reset: function () {
        locked = false;

        currentDepthMask = null;
        currentDepthFunc = null;
        currentDepthClear = null;
        currentReversed = false;
      },
    };
  }

  /**
   * 模板缓冲区管理器
   *
   * 管理WebGL模板缓冲区的状态，包括模板测试、模板函数、模板操作等。
   * 模板缓冲区常用于实现复杂的渲染效果，如阴影体积、轮廓渲染等。
   *
   * @returns {Object} 模板缓冲区管理对象
   */
  function StencilBuffer() {
    // 锁定状态，当为true时阻止状态更改
    let locked = false;

    // 当前模板写入掩码
    let currentStencilMask = null;
    // 当前模板测试函数
    let currentStencilFunc = null;
    // 当前模板参考值
    let currentStencilRef = null;
    // 当前模板函数掩码
    let currentStencilFuncMask = null;
    // 当前模板测试失败时的操作
    let currentStencilFail = null;
    // 当前模板测试通过但深度测试失败时的操作
    let currentStencilZFail = null;
    // 当前模板测试和深度测试都通过时的操作
    let currentStencilZPass = null;
    // 当前模板清除值
    let currentStencilClear = null;

    return {
      /**
       * 设置模板测试开关
       *
       * 模板测试用于基于模板缓冲区的值来决定像素是否应该被绘制。
       * 常用于实现复杂的渲染效果和遮罩。
       *
       * @param {boolean} stencilTest - 是否启用模板测试
       */
      setTest: function (stencilTest) {
        if (!locked) {
          if (stencilTest) {
            enable(gl.STENCIL_TEST);
          } else {
            disable(gl.STENCIL_TEST);
          }
        }
      },

      /**
       * 设置模板写入掩码
       *
       * 控制哪些位可以被写入到模板缓冲区。
       * 掩码为1的位允许写入，为0的位保持不变。
       *
       * @param {number} stencilMask - 模板写入掩码 (0-255)
       */
      setMask: function (stencilMask) {
        if (currentStencilMask !== stencilMask && !locked) {
          gl.stencilMask(stencilMask);
          currentStencilMask = stencilMask;
        }
      },

      /**
       * 设置模板测试函数
       *
       * 定义模板测试的比较函数、参考值和掩码。
       *
       * @param {number} stencilFunc - 模板测试函数 (gl.NEVER, gl.LESS, gl.EQUAL等)
       * @param {number} stencilRef - 模板参考值 (0-255)
       * @param {number} stencilMask - 模板测试掩码 (0-255)
       */
      setFunc: function (stencilFunc, stencilRef, stencilMask) {
        if (currentStencilFunc !== stencilFunc || currentStencilRef !== stencilRef || currentStencilFuncMask !== stencilMask) {
          gl.stencilFunc(stencilFunc, stencilRef, stencilMask);

          currentStencilFunc = stencilFunc;
          currentStencilRef = stencilRef;
          currentStencilFuncMask = stencilMask;
        }
      },

      /**
       * 设置模板操作
       *
       * 定义在不同测试结果下对模板缓冲区值的操作。
       *
       * @param {number} stencilFail - 模板测试失败时的操作
       * @param {number} stencilZFail - 模板测试通过但深度测试失败时的操作
       * @param {number} stencilZPass - 模板测试和深度测试都通过时的操作
       *   可选值: gl.KEEP, gl.ZERO, gl.REPLACE, gl.INCR, gl.DECR, gl.INVERT等
       */
      setOp: function (stencilFail, stencilZFail, stencilZPass) {
        if (currentStencilFail !== stencilFail || currentStencilZFail !== stencilZFail || currentStencilZPass !== stencilZPass) {
          gl.stencilOp(stencilFail, stencilZFail, stencilZPass);

          currentStencilFail = stencilFail;
          currentStencilZFail = stencilZFail;
          currentStencilZPass = stencilZPass;
        }
      },

      /**
       * 设置锁定状态
       *
       * 当锁定时，setTest方法将不会更改WebGL状态。
       *
       * @param {boolean} lock - 是否锁定模板缓冲区状态
       */
      setLocked: function (lock) {
        locked = lock;
      },

      /**
       * 设置模板清除值
       *
       * 设置调用gl.clear()时使用的模板值。
       *
       * @param {number} stencil - 模板清除值 (0-255)
       */
      setClear: function (stencil) {
        if (currentStencilClear !== stencil) {
          gl.clearStencil(stencil);
          currentStencilClear = stencil;
        }
      },

      /**
       * 重置模板缓冲区状态
       *
       * 将所有状态重置为初始值，强制下次设置时重新调用WebGL API。
       */
      reset: function () {
        locked = false;

        currentStencilMask = null;
        currentStencilFunc = null;
        currentStencilRef = null;
        currentStencilFuncMask = null;
        currentStencilFail = null;
        currentStencilZFail = null;
        currentStencilZPass = null;
        currentStencilClear = null;
      },
    };
  }

  // ========================================
  // 缓冲区管理器实例化
  // ========================================

  // 创建颜色、深度、模板缓冲区管理器实例
  const colorBuffer = new ColorBuffer();
  const depthBuffer = new DepthBuffer();
  const stencilBuffer = new StencilBuffer();

  // ========================================
  // Uniform Buffer Object (UBO) 管理
  // ========================================

  // UBO绑定点映射，用于管理uniform缓冲区对象的绑定
  const uboBindings = new WeakMap();
  // UBO程序映射，存储程序与uniform块的映射关系
  const uboProgramMap = new WeakMap();

  // ========================================
  // WebGL能力状态管理
  // ========================================

  // 已启用的WebGL能力状态缓存 (如 DEPTH_TEST, BLEND等)
  let enabledCapabilities = {};

  // ========================================
  // 帧缓冲区管理
  // ========================================

  // 当前绑定的帧缓冲区对象
  let currentBoundFramebuffers = {};
  // 绘制缓冲区映射，用于多渲染目标
  let currentDrawbuffers = new WeakMap();
  // 默认绘制缓冲区数组
  let defaultDrawbuffers = [];

  // ========================================
  // 着色器程序管理
  // ========================================

  // 当前使用的着色器程序
  let currentProgram = null;

  // ========================================
  // 混合状态管理
  // ========================================

  // 混合是否启用
  let currentBlendingEnabled = false;
  // 当前混合模式
  let currentBlending = null;
  // 当前混合方程式
  let currentBlendEquation = null;
  // 当前源混合因子
  let currentBlendSrc = null;
  // 当前目标混合因子
  let currentBlendDst = null;
  // 当前Alpha通道混合方程式
  let currentBlendEquationAlpha = null;
  // 当前Alpha通道源混合因子
  let currentBlendSrcAlpha = null;
  // 当前Alpha通道目标混合因子
  let currentBlendDstAlpha = null;
  // 当前混合颜色
  let currentBlendColor = new Color(0, 0, 0);
  // 当前混合Alpha值
  let currentBlendAlpha = 0;
  // 是否使用预乘Alpha
  let currentPremultipledAlpha = false;

  // ========================================
  // 面剔除和翻转状态
  // ========================================

  // 当前是否翻转面
  let currentFlipSided = null;
  // 当前面剔除模式
  let currentCullFace = null;

  // ========================================
  // 线宽状态
  // ========================================

  // 当前线宽
  let currentLineWidth = null;

  // ========================================
  // 多边形偏移状态
  // ========================================

  // 当前多边形偏移因子
  let currentPolygonOffsetFactor = null;
  // 当前多边形偏移单位
  let currentPolygonOffsetUnits = null;

  // ========================================
  // 纹理管理
  // ========================================

  // 获取最大纹理单元数量
  const maxTextures = gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS);

  // ========================================
  // WebGL版本检测和功能支持
  // ========================================

  // 线宽是否可用
  let lineWidthAvailable = false;
  // WebGL版本号
  let version = 0;
  // 获取WebGL版本字符串
  const glVersion = gl.getParameter(gl.VERSION);

  // 解析WebGL版本并确定线宽功能支持
  if (glVersion.indexOf("WebGL") !== -1) {
    version = parseFloat(/^WebGL (\d)/.exec(glVersion)[1]);
    lineWidthAvailable = version >= 1.0;
  } else if (glVersion.indexOf("OpenGL ES") !== -1) {
    version = parseFloat(/^OpenGL ES (\d)/.exec(glVersion)[1]);
    lineWidthAvailable = version >= 2.0;
  }

  // ========================================
  // 纹理绑定状态
  // ========================================

  // 当前激活的纹理槽
  let currentTextureSlot = null;
  // 当前绑定的纹理对象映射
  let currentBoundTextures = {};

  // ========================================
  // 视口和裁剪区域管理
  // ========================================

  // 获取当前裁剪区域参数
  const scissorParam = gl.getParameter(gl.SCISSOR_BOX);
  // 获取当前视口参数
  const viewportParam = gl.getParameter(gl.VIEWPORT);

  // 当前裁剪区域状态
  const currentScissor = new Vector4().fromArray(scissorParam);
  // 当前视口状态
  const currentViewport = new Vector4().fromArray(viewportParam);

  /**
   * 创建空纹理对象
   *
   * 创建一个1x1像素的空纹理，用作占位符或默认纹理。
   * 这些空纹理在纹理绑定时用于避免WebGL错误。
   *
   * @param {number} type - 纹理类型 (gl.TEXTURE_2D, gl.TEXTURE_CUBE_MAP等)
   * @param {number} target - 纹理目标
   * @param {number} count - 需要创建的纹理面数量
   * @param {number} dimensions - 3D纹理的深度维度
   * @returns {WebGLTexture} 创建的纹理对象
   */
  function createTexture(type, target, count, dimensions) {
    // 创建4字节的数据数组，匹配默认的4字节对齐
    const data = new Uint8Array(4); // 4是必需的，以匹配默认的解包对齐方式4。
    // 创建WebGL纹理对象
    const texture = gl.createTexture();

    // 绑定纹理并设置基本参数
    gl.bindTexture(type, texture);
    gl.texParameteri(type, gl.TEXTURE_MIN_FILTER, gl.NEAREST); // 最近邻过滤
    gl.texParameteri(type, gl.TEXTURE_MAG_FILTER, gl.NEAREST); // 最近邻过滤

    // 根据纹理类型创建相应的纹理数据
    for (let i = 0; i < count; i++) {
      if (type === gl.TEXTURE_3D || type === gl.TEXTURE_2D_ARRAY) {
        // 创建3D纹理或2D纹理数组
        gl.texImage3D(target, 0, gl.RGBA, 1, 1, dimensions, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
      } else {
        // 创建2D纹理或立方体贴图的各个面
        gl.texImage2D(target + i, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
      }
    }

    return texture;
  }

  // ========================================
  // 空纹理对象创建
  // ========================================

  // 创建各种类型的空纹理对象，用作默认纹理
  const emptyTextures = {};
  emptyTextures[gl.TEXTURE_2D] = createTexture(gl.TEXTURE_2D, gl.TEXTURE_2D, 1);
  emptyTextures[gl.TEXTURE_CUBE_MAP] = createTexture(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_CUBE_MAP_POSITIVE_X, 6);
  emptyTextures[gl.TEXTURE_2D_ARRAY] = createTexture(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_2D_ARRAY, 1, 1);
  emptyTextures[gl.TEXTURE_3D] = createTexture(gl.TEXTURE_3D, gl.TEXTURE_3D, 1, 1);

  // ========================================
  // 初始化默认状态
  // ========================================

  // 设置默认清除颜色为黑色，完全不透明
  colorBuffer.setClear(0, 0, 0, 1);
  // 设置默认深度清除值为1.0 (最远)
  depthBuffer.setClear(1);
  // 设置默认模板清除值为0
  stencilBuffer.setClear(0);

  // 启用深度测试
  enable(gl.DEPTH_TEST);
  // 设置深度测试函数为小于等于
  depthBuffer.setFunc(LessEqualDepth);

  // 设置默认面向为不翻转
  setFlipSided(false);
  // 设置默认剔除背面
  setCullFace(CullFaceBack);
  // 启用面剔除
  enable(gl.CULL_FACE);

  // 设置默认无混合模式
  setBlending(NoBlending);

  // ========================================
  // 核心状态管理函数
  // ========================================

  /**
   * 启用WebGL能力
   *
   * 智能启用WebGL能力，只有在状态确实改变时才调用gl.enable()。
   * 通过状态缓存避免重复的WebGL API调用，提高性能。
   *
   * @param {number} id - WebGL能力常量 (如 gl.DEPTH_TEST, gl.BLEND等)
   */
  function enable(id) {
    if (enabledCapabilities[id] !== true) {
      gl.enable(id);
      enabledCapabilities[id] = true;
    }
  }

  /**
   * 禁用WebGL能力
   *
   * 智能禁用WebGL能力，只有在状态确实改变时才调用gl.disable()。
   * 通过状态缓存避免重复的WebGL API调用，提高性能。
   *
   * @param {number} id - WebGL能力常量 (如 gl.DEPTH_TEST, gl.BLEND等)
   */
  function disable(id) {
    if (enabledCapabilities[id] !== false) {
      gl.disable(id);
      enabledCapabilities[id] = false;
    }
  }

  /**
   * 绑定帧缓冲区
   *
   * 智能绑定帧缓冲区对象，只有在绑定目标确实改变时才调用WebGL API。
   * 处理DRAW_FRAMEBUFFER和FRAMEBUFFER之间的等价关系。
   *
   * @param {number} target - 帧缓冲区目标 (gl.FRAMEBUFFER, gl.DRAW_FRAMEBUFFER, gl.READ_FRAMEBUFFER)
   * @param {WebGLFramebuffer|null} framebuffer - 要绑定的帧缓冲区对象，null表示绑定到默认帧缓冲区
   * @returns {boolean} 如果绑定状态发生改变返回true，否则返回false
   */
  function bindFramebuffer(target, framebuffer) {
    if (currentBoundFramebuffers[target] !== framebuffer) {
      gl.bindFramebuffer(target, framebuffer);

      currentBoundFramebuffers[target] = framebuffer;

      // 处理DRAW_FRAMEBUFFER和FRAMEBUFFER的等价关系
      // gl.DRAW_FRAMEBUFFER is equivalent to gl.FRAMEBUFFER

      if (target === gl.DRAW_FRAMEBUFFER) {
        currentBoundFramebuffers[gl.FRAMEBUFFER] = framebuffer;
      }

      if (target === gl.FRAMEBUFFER) {
        currentBoundFramebuffers[gl.DRAW_FRAMEBUFFER] = framebuffer;
      }

      return true;
    }

    return false;
  }

  /**
   * 设置绘制缓冲区
   *
   * 管理多渲染目标(MRT)的绘制缓冲区配置。
   * 根据渲染目标的纹理数量自动配置相应的颜色附件。
   *
   * @param {WebGLRenderTarget|null} renderTarget - 渲染目标对象，null表示渲染到默认帧缓冲区
   * @param {WebGLFramebuffer|null} framebuffer - 关联的帧缓冲区对象
   */
  function drawBuffers(renderTarget, framebuffer) {
    // 默认使用默认绘制缓冲区数组
    let drawBuffers = defaultDrawbuffers;

    let needsUpdate = false;

    if (renderTarget) {
      // 获取或创建该帧缓冲区的绘制缓冲区配置
      drawBuffers = currentDrawbuffers.get(framebuffer);

      if (drawBuffers === undefined) {
        drawBuffers = [];
        currentDrawbuffers.set(framebuffer, drawBuffers);
      }

      const textures = renderTarget.textures;

      // 检查是否需要更新绘制缓冲区配置
      if (drawBuffers.length !== textures.length || drawBuffers[0] !== gl.COLOR_ATTACHMENT0) {
        // 为每个纹理分配一个颜色附件
        for (let i = 0, il = textures.length; i < il; i++) {
          drawBuffers[i] = gl.COLOR_ATTACHMENT0 + i;
        }

        drawBuffers.length = textures.length;

        needsUpdate = true;
      }
    } else {
      // 渲染到默认帧缓冲区时使用BACK缓冲区
      //当渲染到屏幕时，必须将绘制目标设置为 gl.BACK
      if (drawBuffers[0] !== gl.BACK) {
        drawBuffers[0] = gl.BACK;

        needsUpdate = true;
      }
    }

    // 只有在配置改变时才调用WebGL API
    if (needsUpdate) {
      gl.drawBuffers(drawBuffers);
    }
  }

  /**
   * 使用着色器程序
   *
   * 智能切换着色器程序，只有在程序确实改变时才调用gl.useProgram()。
   * 通过程序缓存避免重复的WebGL API调用。
   *
   * @param {WebGLProgram|null} program - 要使用的着色器程序对象
   * @returns {boolean} 如果程序发生改变返回true，否则返回false
   */
  function useProgram(program) {
    if (currentProgram !== program) {
      gl.useProgram(program);

      currentProgram = program;

      return true;
    }

    return false;
  }

  // ========================================
  // 混合模式映射表
  // ========================================

  /**
   * 混合方程式映射表
   * 将Three.js的混合方程式常量映射到WebGL常量
   */
  const equationToGL = {
    [AddEquation]: gl.FUNC_ADD, // 加法混合：src + dst
    [SubtractEquation]: gl.FUNC_SUBTRACT, // 减法混合：src - dst
    [ReverseSubtractEquation]: gl.FUNC_REVERSE_SUBTRACT, // 反向减法混合：dst - src
  };

  // 添加最小值和最大值混合方程式（需要扩展支持）
  equationToGL[MinEquation] = gl.MIN; // 最小值混合：min(src, dst)
  equationToGL[MaxEquation] = gl.MAX; // 最大值混合：max(src, dst)

  /**
   * 混合因子映射表
   * 将Three.js的混合因子常量映射到WebGL常量
   */
  const factorToGL = {
    [ZeroFactor]: gl.ZERO, // 零因子：(0, 0, 0, 0)
    [OneFactor]: gl.ONE, // 一因子：(1, 1, 1, 1)
    [SrcColorFactor]: gl.SRC_COLOR, // 源颜色因子
    [SrcAlphaFactor]: gl.SRC_ALPHA, // 源Alpha因子
    [SrcAlphaSaturateFactor]: gl.SRC_ALPHA_SATURATE, // 源Alpha饱和因子
    [DstColorFactor]: gl.DST_COLOR, // 目标颜色因子
    [DstAlphaFactor]: gl.DST_ALPHA, // 目标Alpha因子
    [OneMinusSrcColorFactor]: gl.ONE_MINUS_SRC_COLOR, // 1减去源颜色因子
    [OneMinusSrcAlphaFactor]: gl.ONE_MINUS_SRC_ALPHA, // 1减去源Alpha因子
    [OneMinusDstColorFactor]: gl.ONE_MINUS_DST_COLOR, // 1减去目标颜色因子
    [OneMinusDstAlphaFactor]: gl.ONE_MINUS_DST_ALPHA, // 1减去目标Alpha因子
    [ConstantColorFactor]: gl.CONSTANT_COLOR, // 常量颜色因子
    [OneMinusConstantColorFactor]: gl.ONE_MINUS_CONSTANT_COLOR, // 1减去常量颜色因子
    [ConstantAlphaFactor]: gl.CONSTANT_ALPHA, // 常量Alpha因子
    [OneMinusConstantAlphaFactor]: gl.ONE_MINUS_CONSTANT_ALPHA, // 1减去常量Alpha因子
  };

  /**
   * 设置混合模式
   *
   * 这是WebGL状态管理的核心函数之一，负责配置颜色混合的各种参数。
   * 支持预定义的混合模式和自定义混合模式，智能缓存状态以避免重复的WebGL调用。
   *
   * @param {number} blending - 混合模式 (NoBlending, NormalBlending, AdditiveBlending等)
   * @param {number} blendEquation - 混合方程式 (可选)
   * @param {number} blendSrc - 源混合因子 (可选)
   * @param {number} blendDst - 目标混合因子 (可选)
   * @param {number} blendEquationAlpha - Alpha通道混合方程式 (可选)
   * @param {number} blendSrcAlpha - Alpha通道源混合因子 (可选)
   * @param {number} blendDstAlpha - Alpha通道目标混合因子 (可选)
   * @param {Color} blendColor - 混合颜色 (可选)
   * @param {number} blendAlpha - 混合Alpha值 (可选)
   * @param {boolean} premultipliedAlpha - 是否使用预乘Alpha (可选)
   */
  function setBlending(blending, blendEquation, blendSrc, blendDst, blendEquationAlpha, blendSrcAlpha, blendDstAlpha, blendColor, blendAlpha, premultipliedAlpha) {
    // 处理无混合模式
    if (blending === NoBlending) {
      if (currentBlendingEnabled === true) {
        disable(gl.BLEND);
        currentBlendingEnabled = false;
      }

      return;
    }

    // 确保混合功能已启用
    if (currentBlendingEnabled === false) {
      enable(gl.BLEND);
      currentBlendingEnabled = true;
    }

    // 处理预定义混合模式（非自定义混合）
    if (blending !== CustomBlending) {
      if (blending !== currentBlending || premultipliedAlpha !== currentPremultipledAlpha) {
        // 重置混合方程式为加法
        if (currentBlendEquation !== AddEquation || currentBlendEquationAlpha !== AddEquation) {
          gl.blendEquation(gl.FUNC_ADD);

          currentBlendEquation = AddEquation;
          currentBlendEquationAlpha = AddEquation;
        }

        // 根据是否使用预乘Alpha设置不同的混合函数
        if (premultipliedAlpha) {
          // 预乘Alpha模式下的混合设置
          switch (blending) {
            case NormalBlending:
              // 正常混合：结果 = 源 + 目标 * (1 - 源Alpha)
              gl.blendFuncSeparate(gl.ONE, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
              break;

            case AdditiveBlending:
              // 加法混合：结果 = 源 + 目标
              gl.blendFunc(gl.ONE, gl.ONE);
              break;

            case SubtractiveBlending:
              // 减法混合：结果 = 目标 * (1 - 源颜色)
              gl.blendFuncSeparate(gl.ZERO, gl.ONE_MINUS_SRC_COLOR, gl.ZERO, gl.ONE);
              break;

            case MultiplyBlending:
              // 乘法混合：结果 = 源 * 目标颜色
              gl.blendFuncSeparate(gl.DST_COLOR, gl.ONE_MINUS_SRC_ALPHA, gl.ZERO, gl.ONE);
              break;

            default:
              console.error("THREE.WebGLState: Invalid blending: ", blending);
              break;
          }
        } else {
          // 非预乘Alpha模式下的混合设置
          switch (blending) {
            case NormalBlending:
              // 正常混合：结果 = 源 * 源Alpha + 目标 * (1 - 源Alpha)
              gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
              break;

            case AdditiveBlending:
              // 加法混合：结果 = 源 * 源Alpha + 目标
              gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE, gl.ONE, gl.ONE);
              break;

            case SubtractiveBlending:
              // 减法混合需要预乘Alpha
              console.error("THREE.WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");
              break;

            case MultiplyBlending:
              // 乘法混合需要预乘Alpha
              console.error("THREE.WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");
              break;

            default:
              console.error("THREE.WebGLState: Invalid blending: ", blending);
              break;
          }
        }

        // 重置自定义混合参数
        currentBlendSrc = null;
        currentBlendDst = null;
        currentBlendSrcAlpha = null;
        currentBlendDstAlpha = null;
        currentBlendColor.set(0, 0, 0);
        currentBlendAlpha = 0;

        // 更新当前混合状态
        currentBlending = blending;
        currentPremultipledAlpha = premultipliedAlpha;
      }

      return;
    }

    // ========================================
    // 自定义混合模式处理
    // ========================================

    // 为Alpha通道参数设置默认值（如果未提供）
    blendEquationAlpha = blendEquationAlpha || blendEquation;
    blendSrcAlpha = blendSrcAlpha || blendSrc;
    blendDstAlpha = blendDstAlpha || blendDst;

    // 设置混合方程式（如果发生改变）
    if (blendEquation !== currentBlendEquation || blendEquationAlpha !== currentBlendEquationAlpha) {
      // 分别设置RGB和Alpha通道的混合方程式
      gl.blendEquationSeparate(equationToGL[blendEquation], equationToGL[blendEquationAlpha]);

      currentBlendEquation = blendEquation;
      currentBlendEquationAlpha = blendEquationAlpha;
    }

    // 设置混合因子（如果发生改变）
    if (blendSrc !== currentBlendSrc || blendDst !== currentBlendDst || blendSrcAlpha !== currentBlendSrcAlpha || blendDstAlpha !== currentBlendDstAlpha) {
      // 分别设置RGB和Alpha通道的混合因子
      gl.blendFuncSeparate(factorToGL[blendSrc], factorToGL[blendDst], factorToGL[blendSrcAlpha], factorToGL[blendDstAlpha]);

      currentBlendSrc = blendSrc;
      currentBlendDst = blendDst;
      currentBlendSrcAlpha = blendSrcAlpha;
      currentBlendDstAlpha = blendDstAlpha;
    }

    // 设置混合颜色（如果发生改变）
    if (blendColor.equals(currentBlendColor) === false || blendAlpha !== currentBlendAlpha) {
      // 设置常量混合颜色和Alpha值
      gl.blendColor(blendColor.r, blendColor.g, blendColor.b, blendAlpha);

      currentBlendColor.copy(blendColor);
      currentBlendAlpha = blendAlpha;
    }

    // 更新当前混合状态
    currentBlending = blending;
    currentPremultipledAlpha = false; // 自定义混合不使用预乘Alpha
  }

  /**
   * 根据材质设置WebGL渲染状态
   *
   * 这是一个高级函数，根据Three.js材质对象的属性自动配置所有相关的WebGL状态。
   * 包括面剔除、混合模式、深度测试、模板测试、多边形偏移等。
   *
   * @param {Material} material - Three.js材质对象
   * @param {boolean} frontFaceCW - 前面是否为顺时针方向
   */
  function setMaterial(material, frontFaceCW) {
    // 根据材质的side属性设置面剔除
    material.side === DoubleSide ? disable(gl.CULL_FACE) : enable(gl.CULL_FACE);

    // 确定是否需要翻转面
    let flipSided = material.side === BackSide;
    if (frontFaceCW) flipSided = !flipSided;

    setFlipSided(flipSided);

    // 设置混合模式
    // 如果是正常混合且不透明，则禁用混合以提高性能
    material.blending === NormalBlending && material.transparent === false
      ? setBlending(NoBlending)
      : setBlending(
          material.blending,
          material.blendEquation,
          material.blendSrc,
          material.blendDst,
          material.blendEquationAlpha,
          material.blendSrcAlpha,
          material.blendDstAlpha,
          material.blendColor,
          material.blendAlpha,
          material.premultipliedAlpha
        );

    // 设置深度缓冲区状态
    depthBuffer.setFunc(material.depthFunc); // 深度测试函数
    depthBuffer.setTest(material.depthTest); // 是否启用深度测试
    depthBuffer.setMask(material.depthWrite); // 是否写入深度缓冲区

    // 设置颜色缓冲区写入掩码
    colorBuffer.setMask(material.colorWrite);

    // 设置模板缓冲区状态
    const stencilWrite = material.stencilWrite;
    stencilBuffer.setTest(stencilWrite);
    if (stencilWrite) {
      stencilBuffer.setMask(material.stencilWriteMask);
      stencilBuffer.setFunc(material.stencilFunc, material.stencilRef, material.stencilFuncMask);
      stencilBuffer.setOp(material.stencilFail, material.stencilZFail, material.stencilZPass);
    }

    // 设置多边形偏移（用于解决Z-fighting问题）
    setPolygonOffset(material.polygonOffset, material.polygonOffsetFactor, material.polygonOffsetUnits);

    // 设置Alpha到覆盖率转换（用于抗锯齿）
    material.alphaToCoverage === true ? enable(gl.SAMPLE_ALPHA_TO_COVERAGE) : disable(gl.SAMPLE_ALPHA_TO_COVERAGE);
  }

  // ========================================
  // 渲染状态设置函数
  // ========================================

  /**
   * 设置面的翻转状态
   *
   * 控制前面的定义方向（顺时针或逆时针）。
   * 这影响面剔除和光照计算。
   * back是顺时针，front是逆时针。
   * @param {boolean} flipSided - 是否翻转面，true为顺时针，false为逆时针
   */
  function setFlipSided(flipSided) {
    if (currentFlipSided !== flipSided) {
      if (flipSided) {
        gl.frontFace(gl.CW); // 顺时针为前面
      } else {
        gl.frontFace(gl.CCW); // 逆时针为前面（默认）
      }

      currentFlipSided = flipSided;
    }
  }

  /**
   * 设置面剔除模式
   *
   * 控制哪些面被剔除（不渲染）以提高性能。
   * 通常剔除背面以减少不必要的渲染。
   *
   * @param {number} cullFace - 面剔除模式
   *   - CullFaceNone: 不剔除任何面
   *   - CullFaceBack: 剔除背面
   *   - CullFaceFront: 剔除前面
   */
  function setCullFace(cullFace) {
    if (cullFace !== CullFaceNone) {
      enable(gl.CULL_FACE);

      if (cullFace !== currentCullFace) {
        if (cullFace === CullFaceBack) {
          gl.cullFace(gl.BACK); // 剔除背面
        } else if (cullFace === CullFaceFront) {
          gl.cullFace(gl.FRONT); // 剔除前面
        } else {
          gl.cullFace(gl.FRONT_AND_BACK); // 剔除前面和背面
        }
      }
    } else {
      disable(gl.CULL_FACE); // 禁用面剔除
    }

    currentCullFace = cullFace;
  }

  /**
   * 设置线宽
   *
   * 设置线段和线框的宽度。
   * 注意：并非所有WebGL实现都支持线宽设置。
   *
   * @param {number} width - 线宽值（像素）
   */
  function setLineWidth(width) {
    if (width !== currentLineWidth) {
      // 只有在支持线宽的情况下才设置
      if (lineWidthAvailable) gl.lineWidth(width);

      currentLineWidth = width;
    }
  }

  /**
   * 设置多边形偏移
   *
   * 用于解决Z-fighting（深度冲突）问题。
   * 通过在深度值上添加偏移来避免共面多边形的渲染冲突。
   *
   * @param {boolean} polygonOffset - 是否启用多边形偏移
   * @param {number} factor - 偏移因子
   * @param {number} units - 偏移单位
   */
  function setPolygonOffset(polygonOffset, factor, units) {
    if (polygonOffset) {
      enable(gl.POLYGON_OFFSET_FILL);

      // 只有在偏移值改变时才更新
      if (currentPolygonOffsetFactor !== factor || currentPolygonOffsetUnits !== units) {
        gl.polygonOffset(factor, units);

        currentPolygonOffsetFactor = factor;
        currentPolygonOffsetUnits = units;
      }
    } else {
      disable(gl.POLYGON_OFFSET_FILL);
    }
  }

  /**
   * 设置裁剪测试
   *
   * 启用或禁用裁剪测试。裁剪测试只渲染指定矩形区域内的像素。
   *
   * @param {boolean} scissorTest - 是否启用裁剪测试
   */
  function setScissorTest(scissorTest) {
    if (scissorTest) {
      enable(gl.SCISSOR_TEST);
    } else {
      disable(gl.SCISSOR_TEST);
    }
  }

  // ========================================
  // 纹理管理函数
  // ========================================

  /**
   * 激活纹理单元
   *
   * 设置当前活动的纹理单元。WebGL支持多个纹理单元，
   * 允许在着色器中同时使用多个纹理。
   *
   * @param {number} webglSlot - 纹理单元槽位 (gl.TEXTURE0, gl.TEXTURE1等)
   */
  function activeTexture(webglSlot) {
    // 如果未指定槽位，使用最后一个可用的纹理单元
    if (webglSlot === undefined) webglSlot = gl.TEXTURE0 + maxTextures - 1;

    if (currentTextureSlot !== webglSlot) {
      gl.activeTexture(webglSlot);
      currentTextureSlot = webglSlot;
    }
  }

  /**
   * 绑定纹理到指定单元
   *
   * 智能绑定纹理对象到指定的纹理单元，避免重复绑定。
   * 如果纹理为null，会绑定相应类型的空纹理以避免WebGL错误。
   *
   * @param {number} webglType - 纹理类型 (gl.TEXTURE_2D, gl.TEXTURE_CUBE_MAP等)
   * @param {WebGLTexture|null} webglTexture - 要绑定的纹理对象
   * @param {number} webglSlot - 纹理单元槽位（可选）
   */
  function bindTexture(webglType, webglTexture, webglSlot) {
    // 确定要使用的纹理槽位
    if (webglSlot === undefined) {
      if (currentTextureSlot === null) {
        webglSlot = gl.TEXTURE0 + maxTextures - 1;
      } else {
        webglSlot = currentTextureSlot;
      }
    }

    // 获取或创建该槽位的绑定信息
    let boundTexture = currentBoundTextures[webglSlot];

    if (boundTexture === undefined) {
      boundTexture = { type: undefined, texture: undefined };
      currentBoundTextures[webglSlot] = boundTexture;
    }

    // 只有在绑定状态确实改变时才调用WebGL API
    if (boundTexture.type !== webglType || boundTexture.texture !== webglTexture) {
      // 确保激活了正确的纹理单元
      if (currentTextureSlot !== webglSlot) {
        gl.activeTexture(webglSlot);
        currentTextureSlot = webglSlot;
      }

      // 绑定纹理，如果为null则使用空纹理
      gl.bindTexture(webglType, webglTexture || emptyTextures[webglType]);

      // 更新绑定状态
      boundTexture.type = webglType;
      boundTexture.texture = webglTexture;
    }
  }

  /**
   * 解绑当前纹理单元的纹理
   *
   * 将当前活动纹理单元的纹理绑定设置为null。
   * 用于清理纹理绑定状态。
   */
  function unbindTexture() {
    const boundTexture = currentBoundTextures[currentTextureSlot];

    if (boundTexture !== undefined && boundTexture.type !== undefined) {
      gl.bindTexture(boundTexture.type, null);

      // 清除绑定状态
      boundTexture.type = undefined;
      boundTexture.texture = undefined;
    }
  }

  // ========================================
  // 纹理操作包装函数
  // ========================================
  // 这些函数包装了WebGL的纹理操作，添加了错误处理

  /**
   * 压缩纹理图像2D包装函数
   *
   * 安全地调用gl.compressedTexImage2D，捕获并记录任何错误。
   * 用于上传压缩格式的2D纹理数据。
   */
  function compressedTexImage2D() {
    try {
      gl.compressedTexImage2D(...arguments);
    } catch (error) {
      console.error("THREE.WebGLState:", error);
    }
  }

  /**
   * 压缩纹理图像3D包装函数
   *
   * 安全地调用gl.compressedTexImage3D，捕获并记录任何错误。
   * 用于上传压缩格式的3D纹理数据。
   */
  function compressedTexImage3D() {
    try {
      gl.compressedTexImage3D(...arguments);
    } catch (error) {
      console.error("THREE.WebGLState:", error);
    }
  }

  /**
   * 纹理子图像2D包装函数
   *
   * 安全地调用gl.texSubImage2D，捕获并记录任何错误。
   * 用于更新2D纹理的部分区域。
   */
  function texSubImage2D() {
    try {
      gl.texSubImage2D(...arguments);
    } catch (error) {
      console.error("THREE.WebGLState:", error);
    }
  }

  /**
   * 纹理子图像3D包装函数
   *
   * 安全地调用gl.texSubImage3D，捕获并记录任何错误。
   * 用于更新3D纹理的部分区域。
   */
  function texSubImage3D() {
    try {
      gl.texSubImage3D(...arguments);
    } catch (error) {
      console.error("THREE.WebGLState:", error);
    }
  }

  /**
   * 压缩纹理子图像2D包装函数
   *
   * 安全地调用gl.compressedTexSubImage2D，捕获并记录任何错误。
   * 用于更新压缩格式2D纹理的部分区域。
   */
  function compressedTexSubImage2D() {
    try {
      gl.compressedTexSubImage2D(...arguments);
    } catch (error) {
      console.error("THREE.WebGLState:", error);
    }
  }

  /**
   * 压缩纹理子图像3D包装函数
   *
   * 安全地调用gl.compressedTexSubImage3D，捕获并记录任何错误。
   * 用于更新压缩格式3D纹理的部分区域。
   */
  function compressedTexSubImage3D() {
    try {
      gl.compressedTexSubImage3D(...arguments);
    } catch (error) {
      console.error("THREE.WebGLState:", error);
    }
  }

  /**
   * 纹理存储2D包装函数
   *
   * 安全地调用gl.texStorage2D，捕获并记录任何错误。
   * 用于分配2D纹理的不可变存储。
   */
  function texStorage2D() {
    try {
      gl.texStorage2D(...arguments);
    } catch (error) {
      console.error("THREE.WebGLState:", error);
    }
  }

  /**
   * 纹理存储3D包装函数
   *
   * 安全地调用gl.texStorage3D，捕获并记录任何错误。
   * 用于分配3D纹理的不可变存储。
   */
  function texStorage3D() {
    try {
      gl.texStorage3D(...arguments);
    } catch (error) {
      console.error("THREE.WebGLState:", error);
    }
  }

  /**
   * 纹理图像2D包装函数
   *
   * 安全地调用gl.texImage2D，捕获并记录任何错误。
   * 用于上传2D纹理数据。
   */
  function texImage2D() {
    try {
      gl.texImage2D(...arguments);
    } catch (error) {
      console.error("THREE.WebGLState:", error);
    }
  }

  /**
   * 纹理图像3D包装函数
   *
   * 安全地调用gl.texImage3D，捕获并记录任何错误。
   * 用于上传3D纹理数据。
   */
  function texImage3D() {
    try {
      gl.texImage3D(...arguments);
    } catch (error) {
      console.error("THREE.WebGLState:", error);
    }
  }

  // ========================================
  // 视口和裁剪区域管理
  // ========================================

  /**
   * 设置裁剪区域
   *
   * 定义裁剪测试的矩形区域。只有在该区域内的像素才会被渲染。
   * 智能比较避免重复设置相同的裁剪区域。
   *
   * @param {Vector4} scissor - 裁剪区域 (x, y, width, height)
   */
  function scissor(scissor) {
    if (currentScissor.equals(scissor) === false) {
      gl.scissor(scissor.x, scissor.y, scissor.z, scissor.w);
      currentScissor.copy(scissor);
    }
  }

  /**
   * 设置视口
   *
   * 定义渲染输出的视口区域。控制NDC坐标到屏幕坐标的映射。
   * 智能比较避免重复设置相同的视口。
   *
   * @param {Vector4} viewport - 视口区域 (x, y, width, height)
   */
  function viewport(viewport) {
    if (currentViewport.equals(viewport) === false) {
      gl.viewport(viewport.x, viewport.y, viewport.z, viewport.w);
      currentViewport.copy(viewport);
    }
  }

  // ========================================
  // Uniform Buffer Object (UBO) 管理
  // ========================================

  /**
   * 更新UBO映射
   *
   * 建立uniform组和着色器程序之间的映射关系。
   * 获取uniform块在着色器程序中的索引。
   *
   * @param {UniformsGroup} uniformsGroup - uniform组对象
   * @param {WebGLProgram} program - 着色器程序
   */
  function updateUBOMapping(uniformsGroup, program) {
    let mapping = uboProgramMap.get(program);

    if (mapping === undefined) {
      mapping = new WeakMap();

      uboProgramMap.set(program, mapping);
    }

    let blockIndex = mapping.get(uniformsGroup);

    if (blockIndex === undefined) {
      // 获取uniform块在着色器程序中的索引
      blockIndex = gl.getUniformBlockIndex(program, uniformsGroup.name);

      mapping.set(uniformsGroup, blockIndex);
    }
  }

  /**
   * 绑定uniform块
   *
   * 将着色器程序中的uniform块绑定到全局绑定点。
   * 这允许多个着色器程序共享相同的uniform缓冲区。
   *
   * @param {UniformsGroup} uniformsGroup - uniform组对象
   * @param {WebGLProgram} program - 着色器程序
   */
  function uniformBlockBinding(uniformsGroup, program) {
    const mapping = uboProgramMap.get(program);
    const blockIndex = mapping.get(uniformsGroup);

    if (uboBindings.get(program) !== blockIndex) {
      // 将着色器特定的块索引绑定到全局绑定点
      // bind shader specific block index to global block point
      gl.uniformBlockBinding(program, blockIndex, uniformsGroup.__bindingPointIndex);

      uboBindings.set(program, blockIndex);
    }
  }

  // ========================================
  // 状态重置函数
  // ========================================

  /**
   * 重置所有WebGL状态
   *
   * 将所有WebGL状态重置为默认值，包括：
   * - 禁用所有WebGL能力
   * - 重置混合、深度、模板、面剔除等状态
   * - 清除所有绑定的资源
   * - 重置内部状态缓存
   *
   * 通常在渲染器初始化或需要完全重置状态时调用。
   */
  function reset() {
    // ========================================
    // 重置WebGL状态
    // ========================================

    // 禁用所有WebGL能力
    gl.disable(gl.BLEND); // 禁用混合
    gl.disable(gl.CULL_FACE); // 禁用面剔除
    gl.disable(gl.DEPTH_TEST); // 禁用深度测试
    gl.disable(gl.POLYGON_OFFSET_FILL); // 禁用多边形偏移
    gl.disable(gl.SCISSOR_TEST); // 禁用裁剪测试
    gl.disable(gl.STENCIL_TEST); // 禁用模板测试
    gl.disable(gl.SAMPLE_ALPHA_TO_COVERAGE); // 禁用Alpha到覆盖率

    // 重置混合状态
    gl.blendEquation(gl.FUNC_ADD); // 设置为加法混合
    gl.blendFunc(gl.ONE, gl.ZERO); // 设置混合因子
    gl.blendFuncSeparate(gl.ONE, gl.ZERO, gl.ONE, gl.ZERO); // 分别设置RGB和Alpha混合因子
    gl.blendColor(0, 0, 0, 0); // 重置混合颜色

    // 重置颜色缓冲区状态
    gl.colorMask(true, true, true, true); // 启用所有颜色通道写入
    gl.clearColor(0, 0, 0, 0); // 设置清除颜色为透明黑色

    // 重置深度缓冲区状态
    gl.depthMask(true); // 启用深度写入
    gl.depthFunc(gl.LESS); // 设置深度函数为小于

    depthBuffer.setReversed(false); // 禁用反向深度

    gl.clearDepth(1); // 设置深度清除值为1.0

    // 重置模板缓冲区状态
    gl.stencilMask(0xffffffff); // 启用所有模板位写入
    gl.stencilFunc(gl.ALWAYS, 0, 0xffffffff); // 设置模板函数为总是通过
    gl.stencilOp(gl.KEEP, gl.KEEP, gl.KEEP); // 设置模板操作为保持
    gl.clearStencil(0); // 设置模板清除值为0

    // 重置面剔除状态
    gl.cullFace(gl.BACK); // 剔除背面
    gl.frontFace(gl.CCW); // 前面为逆时针

    // 重置多边形偏移
    gl.polygonOffset(0, 0); // 无偏移

    // 重置纹理状态
    gl.activeTexture(gl.TEXTURE0); // 激活第一个纹理单元

    // 重置帧缓冲区绑定
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); // 绑定到默认帧缓冲区
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null); // 绑定绘制帧缓冲区
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null); // 绑定读取帧缓冲区

    // 重置着色器程序
    gl.useProgram(null); // 不使用任何程序

    // 重置线宽
    gl.lineWidth(1); // 设置线宽为1

    // 重置视口和裁剪区域为画布大小
    gl.scissor(0, 0, gl.canvas.width, gl.canvas.height);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    // ========================================
    // 重置内部状态缓存
    // ========================================

    // 清除能力状态缓存
    enabledCapabilities = {};

    // 重置纹理状态
    currentTextureSlot = null;
    currentBoundTextures = {};

    // 重置帧缓冲区状态
    currentBoundFramebuffers = {};
    currentDrawbuffers = new WeakMap();
    defaultDrawbuffers = [];

    // 重置着色器程序状态
    currentProgram = null;

    // 重置混合状态
    currentBlendingEnabled = false;
    currentBlending = null;
    currentBlendEquation = null;
    currentBlendSrc = null;
    currentBlendDst = null;
    currentBlendEquationAlpha = null;
    currentBlendSrcAlpha = null;
    currentBlendDstAlpha = null;
    currentBlendColor = new Color(0, 0, 0);
    currentBlendAlpha = 0;
    currentPremultipledAlpha = false;

    // 重置面状态
    currentFlipSided = null;
    currentCullFace = null;

    // 重置线宽状态
    currentLineWidth = null;

    // 重置多边形偏移状态
    currentPolygonOffsetFactor = null;
    currentPolygonOffsetUnits = null;

    // 重置视口和裁剪区域状态
    currentScissor.set(0, 0, gl.canvas.width, gl.canvas.height);
    currentViewport.set(0, 0, gl.canvas.width, gl.canvas.height);

    // 重置缓冲区管理器状态
    colorBuffer.reset();
    depthBuffer.reset();
    stencilBuffer.reset();
  }

  // ========================================
  // 返回WebGL状态管理器公共接口
  // ========================================

  /**
   * WebGL状态管理器公共接口
   *
   * 提供了完整的WebGL状态管理功能，包括：
   * - 缓冲区管理（颜色、深度、模板）
   * - WebGL能力控制（启用/禁用）
   * - 帧缓冲区和绘制缓冲区管理
   * - 着色器程序管理
   * - 混合模式和材质状态设置
   * - 面剔除和几何状态控制
   * - 纹理绑定和操作
   * - UBO（Uniform Buffer Object）管理
   * - 视口和裁剪区域控制
   * - 完整的状态重置功能
   */
  return {
    // 缓冲区管理器
    buffers: {
      color: colorBuffer, // 颜色缓冲区管理器
      depth: depthBuffer, // 深度缓冲区管理器
      stencil: stencilBuffer, // 模板缓冲区管理器
    },

    // WebGL能力控制
    enable: enable, // 启用WebGL能力
    disable: disable, // 禁用WebGL能力

    // 帧缓冲区管理
    bindFramebuffer: bindFramebuffer, // 绑定帧缓冲区
    drawBuffers: drawBuffers, // 设置绘制缓冲区

    // 着色器程序管理
    useProgram: useProgram, // 使用着色器程序

    // 混合和材质状态
    setBlending: setBlending, // 设置混合模式
    setMaterial: setMaterial, // 根据材质设置状态

    // 几何和面状态
    setFlipSided: setFlipSided, // 设置面翻转
    setCullFace: setCullFace, // 设置面剔除

    // 渲染参数
    setLineWidth: setLineWidth, // 设置线宽
    setPolygonOffset: setPolygonOffset, // 设置多边形偏移

    // 裁剪测试
    setScissorTest: setScissorTest, // 设置裁剪测试

    // 纹理管理
    activeTexture: activeTexture, // 激活纹理单元
    bindTexture: bindTexture, // 绑定纹理
    unbindTexture: unbindTexture, // 解绑纹理

    // 纹理操作（带错误处理）
    compressedTexImage2D: compressedTexImage2D, // 压缩纹理图像2D
    compressedTexImage3D: compressedTexImage3D, // 压缩纹理图像3D
    texImage2D: texImage2D, // 纹理图像2D
    texImage3D: texImage3D, // 纹理图像3D

    // UBO管理
    updateUBOMapping: updateUBOMapping, // 更新UBO映射
    uniformBlockBinding: uniformBlockBinding, // 绑定uniform块

    // 纹理存储和子图像操作
    texStorage2D: texStorage2D, // 纹理存储2D
    texStorage3D: texStorage3D, // 纹理存储3D
    texSubImage2D: texSubImage2D, // 纹理子图像2D
    texSubImage3D: texSubImage3D, // 纹理子图像3D
    compressedTexSubImage2D: compressedTexSubImage2D, // 压缩纹理子图像2D
    compressedTexSubImage3D: compressedTexSubImage3D, // 压缩纹理子图像3D

    // 视口和裁剪
    scissor: scissor, // 设置裁剪区域
    viewport: viewport, // 设置视口

    // 状态重置
    reset: reset, // 重置所有状态
  };
}

export { WebGLState };
