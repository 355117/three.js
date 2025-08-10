// 导入基础管线类
import Pipeline from "./Pipeline.js";

/**
 * 渲染管线类
 *
 * 用于表示渲染管线的类。渲染管线定义了图形渲染的完整流程，
 * 包括顶点着色器和片段着色器的组合。每个渲染管线都有唯一的
 * 缓存键，用于识别和复用相同配置的管线。
 *
 * @private
 * @augments Pipeline
 */
class RenderPipeline extends Pipeline {
  /**
   * 构造一个新的渲染管线
   *
   * @param {string} cacheKey - 管线的缓存键，用于唯一标识此管线配置
   * @param {ProgrammableStage} vertexProgram - 管线的顶点着色器程序
   * @param {ProgrammableStage} fragmentProgram - 管线的片段着色器程序
   */
  constructor(cacheKey, vertexProgram, fragmentProgram) {
    // 调用父类构造函数，传入缓存键
    super(cacheKey);

    /**
     * 管线的顶点着色器程序
     * 负责处理顶点变换、光照计算等顶点级操作
     *
     * @type {ProgrammableStage}
     */
    this.vertexProgram = vertexProgram;

    /**
     * 管线的片段着色器程序
     * 负责处理像素着色、纹理采样等片段级操作
     *
     * @type {ProgrammableStage}
     */
    this.fragmentProgram = fragmentProgram;
  }
}

// 导出渲染管线类
export default RenderPipeline;
