// 全局ID计数器，用于为每个可编程阶段分配唯一ID
let _id = 0;

/**
 * 可编程阶段类
 * 用于表示可编程阶段，包括顶点着色器、片段着色器或计算着色器。
 * 与固定功能状态（如混合）不同，它们代表管线的可编程部分。
 *
 * @private
 */
class ProgrammableStage {
  /**
   * 构造一个新的可编程阶段
   *
   * @param {string} code - 着色器代码
   * @param {('vertex'|'fragment'|'compute')} stage - 阶段类型
   * @param {string} name - 着色器名称
   * @param {?Array<Object>} [transforms=null] - 变换数组（仅适用于使用Transform Feedback的WebGL 2计算阶段）
   * @param {?Array<Object>} [attributes=null] - 属性数组（仅适用于使用Transform Feedback的WebGL 2计算阶段）
   */
  constructor(code, stage, name, transforms = null, attributes = null) {
    /**
     * 可编程阶段的唯一标识符
     *
     * @type {number}
     */
    this.id = _id++; // 分配并递增全局ID

    /**
     * 着色器代码字符串
     *
     * @type {string}
     */
    this.code = code; // 存储着色器源代码

    /**
     * 阶段类型
     * 可以是 'vertex'（顶点）、'fragment'（片段）或 'compute'（计算）
     *
     * @type {string}
     */
    this.stage = stage; // 设置着色器阶段类型

    /**
     * 阶段名称
     * 用于调试目的
     *
     * @type {string}
     */
    this.name = name; // 设置着色器名称

    /**
     * 变换数组
     * 仅适用于使用Transform Feedback的WebGL 2计算阶段
     *
     * @type {?Array<Object>}
     */
    this.transforms = transforms; // 存储变换配置

    /**
     * 属性数组
     * 仅适用于使用Transform Feedback的WebGL 2计算阶段
     *
     * @type {?Array<Object>}
     */
    this.attributes = attributes; // 存储属性配置

    /**
     * 可编程阶段当前被使用的次数
     * 用于跟踪着色器的使用频率
     *
     * @type {number}
     * @default 0
     */
    this.usedTimes = 0; // 初始化使用计数器
  }
}

// 导出ProgrammableStage类作为默认导出
export default ProgrammableStage;
