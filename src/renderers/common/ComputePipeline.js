/**
 * ComputePipeline.js
 *
 * 计算管线 - 表示GPU计算管线
 *
 * 这个模块定义了计算管线类，用于表示GPU计算管线。
 * 计算管线继承自基础Pipeline类，专门用于计算着色器的执行。
 */

// 导入基础管线类
import Pipeline from "./Pipeline.js";

/**
 * 计算管线类
 *
 * 用于表示计算管线的类。计算管线封装了计算着色器程序，
 * 定义了如何在GPU上执行并行计算任务。
 *
 * 计算管线主要用于：
 * - 粒子系统计算
 * - 物理模拟
 * - 图像后处理
 * - 通用GPU计算（GPGPU）
 *
 * @private
 * @augments Pipeline
 */
class ComputePipeline extends Pipeline {
  /**
   * 构造新的计算管线
   *
   * 创建一个新的计算管线实例，设置缓存键和计算着色器程序。
   * 注意：注释中说的是"render pipeline"，但实际应该是"compute pipeline"。
   *
   * @param {string} cacheKey - 管线的缓存键，用于标识和缓存管线
   * @param {import('./ProgrammableStage.js').default} computeProgram - 管线的计算着色器程序
   */
  constructor(cacheKey, computeProgram) {
    // 调用父类构造函数，传入缓存键
    super(cacheKey);

    /**
     * 管线的计算着色器程序
     *
     * 包含计算着色器代码和相关配置的可编程阶段对象。
     * 这定义了在GPU上执行的实际计算逻辑。
     *
     * @type {import('./ProgrammableStage.js').default}
     */
    this.computeProgram = computeProgram;

    /**
     * 计算管线类型标识
     *
     * 这个标志可用于类型测试，帮助识别这是一个计算管线。
     * 在运行时可以通过检查这个属性来确定管线类型。
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isComputePipeline = true;
  }
}

// 导出计算管线类
export default ComputePipeline;
