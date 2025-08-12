// 导入警告工具函数，用于显示一次性警告信息
import { warnOnce } from "../../../utils.js";
// 导入时间戳查询池基类
import TimestampQueryPool from "../../common/TimestampQueryPool.js";

/**
 * 管理WebGL时间戳查询池，用于性能测量
 * 处理使用WebGL扩展的计时器查询的创建、执行和解析
 *
 * @augments TimestampQueryPool
 */
class WebGLTimestampQueryPool extends TimestampQueryPool {
  /**
   * 创建一个新的WebGL时间戳查询池
   *
   * @param {WebGLRenderingContext|WebGL2RenderingContext} gl - WebGL渲染上下文
   * @param {string} type - 此查询池的类型标识符
   * @param {number} [maxQueries=2048] - 此池可容纳的最大查询数量
   */
  constructor(gl, type, maxQueries = 2048) {
    // 调用父类构造函数
    super(maxQueries);

    // 存储WebGL上下文引用
    this.gl = gl;
    // 存储查询池类型
    this.type = type;

    // 检查计时器查询扩展是否可用
    // 优先使用WebGL2版本，回退到WebGL1版本
    this.ext = gl.getExtension("EXT_disjoint_timer_query_webgl2") || gl.getExtension("EXT_disjoint_timer_query");

    // 如果扩展不可用，禁用时间戳跟踪
    if (!this.ext) {
      console.warn("EXT_disjoint_timer_query not supported; timestamps will be disabled.");
      this.trackTimestamp = false;
      return;
    }

    // 创建查询对象数组
    this.queries = [];
    for (let i = 0; i < this.maxQueries; i++) {
      // 为每个查询位置创建一个WebGL查询对象
      this.queries.push(gl.createQuery());
    }

    // 当前活动的查询索引
    this.activeQuery = null;
    // 跟踪每个查询的状态：'inactive'（非活动）、'started'（已开始）、'ended'（已结束）
    this.queryStates = new Map();
  }

  /**
   * 为给定的渲染上下文分配一对查询
   *
   * @param {Object} renderContext - 要为其分配查询的渲染上下文
   * @returns {?number} 分配的查询的基础偏移量，如果分配失败则返回null
   */
  allocateQueriesForContext(renderContext) {
    // 如果未启用时间戳跟踪，直接返回null
    if (!this.trackTimestamp) return null;

    // 检查是否有足够的空间容纳新的查询对
    if (this.currentQueryIndex + 2 > this.maxQueries) {
      // 发出警告，提示查询数量已达到上限
      warnOnce(
        `WebGPUTimestampQueryPool [${
          this.type
        }]: Maximum number of queries exceeded, when using trackTimestamp it is necessary to resolves the queries via renderer.resolveTimestampsAsync( THREE.TimestampQuery.${this.type.toUpperCase()} ).`
      );
      return null;
    }

    // 获取当前查询的基础偏移量
    const baseOffset = this.currentQueryIndex;
    // 为查询对预留2个位置
    this.currentQueryIndex += 2;

    // 初始化查询状态为非活动状态
    this.queryStates.set(baseOffset, "inactive");
    // 将渲染上下文ID与查询偏移量关联
    this.queryOffsets.set(renderContext.id, baseOffset);

    return baseOffset;
  }

  /**
   * 为指定的渲染上下文开始时间戳查询
   *
   * @param {Object} renderContext - 要开始计时的渲染上下文
   */
  beginQuery(renderContext) {
    // 如果未启用时间戳跟踪或已被释放，直接返回
    if (!this.trackTimestamp || this.isDisposed) {
      return;
    }

    // 获取该渲染上下文对应的查询偏移量
    const baseOffset = this.queryOffsets.get(renderContext.id);
    if (baseOffset == null) {
      return;
    }

    // 如果已有活动查询，不启动新查询
    if (this.activeQuery !== null) {
      return;
    }

    // 获取对应的查询对象
    const query = this.queries[baseOffset];
    if (!query) {
      return;
    }

    try {
      // 只有在查询处于非活动状态时才开始
      if (this.queryStates.get(baseOffset) === "inactive") {
        // 开始WebGL时间查询，测量经过的时间
        this.gl.beginQuery(this.ext.TIME_ELAPSED_EXT, query);
        // 设置当前活动查询
        this.activeQuery = baseOffset;
        // 更新查询状态为已开始
        this.queryStates.set(baseOffset, "started");
      }
    } catch (error) {
      // 如果开始查询时出错，重置状态
      console.error("Error in beginQuery:", error);
      this.activeQuery = null;
      this.queryStates.set(baseOffset, "inactive");
    }
  }

  /**
   * 结束指定渲染上下文的活动时间戳查询
   *
   * @param {Object} renderContext - 要结束计时的渲染上下文
   * @param {string} renderContext.id - 渲染上下文的唯一标识符
   */
  endQuery(renderContext) {
    // 如果未启用时间戳跟踪或已被释放，直接返回
    if (!this.trackTimestamp || this.isDisposed) {
      return;
    }

    // 获取该渲染上下文对应的查询偏移量
    const baseOffset = this.queryOffsets.get(renderContext.id);
    if (baseOffset == null) {
      return;
    }

    // 只有当这是活动查询时才结束
    if (this.activeQuery !== baseOffset) {
      return;
    }

    try {
      // 结束WebGL时间查询
      this.gl.endQuery(this.ext.TIME_ELAPSED_EXT);
      // 更新查询状态为已结束
      this.queryStates.set(baseOffset, "ended");
      // 清除活动查询标记
      this.activeQuery = null;
    } catch (error) {
      // 如果结束查询时出错，重置状态
      console.error("Error in endQuery:", error);
      // 出错时重置状态
      this.queryStates.set(baseOffset, "inactive");
      this.activeQuery = null;
    }
  }

  /**
   * 异步解析所有已完成的查询并返回总持续时间
   *
   * @async
   * @returns {Promise<number>} 总持续时间（毫秒），如果解析失败则返回最后一个有效值
   */
  async resolveQueriesAsync() {
    // 如果未启用时间戳跟踪或正在解析中，返回最后一个值
    if (!this.trackTimestamp || this.pendingResolve) {
      return this.lastValue;
    }

    // 设置解析状态标志，防止重复解析
    this.pendingResolve = true;

    try {
      // 等待所有已结束的查询完成
      const resolvePromises = [];

      // 遍历所有查询状态
      for (const [baseOffset, state] of this.queryStates) {
        // 只处理已结束的查询
        if (state === "ended") {
          const query = this.queries[baseOffset];
          // 将查询解析Promise添加到数组中
          resolvePromises.push(this.resolveQuery(query));
        }
      }

      // 如果没有需要解析的查询，返回最后一个值
      if (resolvePromises.length === 0) {
        return this.lastValue;
      }

      // 等待所有查询解析完成
      const results = await Promise.all(resolvePromises);
      // 计算总持续时间
      const totalDuration = results.reduce((acc, val) => acc + val, 0);

      // 存储最后一个有效结果
      this.lastValue = totalDuration;

      // 重置状态，为下一轮查询做准备
      this.currentQueryIndex = 0;
      this.queryOffsets.clear();
      this.queryStates.clear();
      this.activeQuery = null;

      return totalDuration;
    } catch (error) {
      // 解析查询时出错
      console.error("Error resolving queries:", error);
      return this.lastValue;
    } finally {
      // 无论成功还是失败，都要清除解析状态标志
      this.pendingResolve = false;
    }
  }

  /**
   * 解析单个查询，检查完成状态和分离操作
   *
   * @async
   * @param {WebGLQuery} query - 要解析的查询对象
   * @returns {Promise<number>} 经过的时间（毫秒）
   */
  async resolveQuery(query) {
    return new Promise((resolve) => {
      // 如果已被释放，返回最后一个值
      if (this.isDisposed) {
        resolve(this.lastValue);
        return;
      }

      // 用于管理超时的变量
      let timeoutId;
      let isResolved = false;

      // 清理函数，用于清除超时
      const cleanup = () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
      };

      // 最终解析函数，确保只解析一次
      const finalizeResolution = (value) => {
        if (!isResolved) {
          isResolved = true;
          cleanup();
          resolve(value);
        }
      };

      // 检查查询状态的函数
      const checkQuery = () => {
        // 如果已被释放，使用最后一个值完成解析
        if (this.isDisposed) {
          finalizeResolution(this.lastValue);
          return;
        }

        try {
          // 检查GPU计时器是否分离（即计时不可靠）
          const disjoint = this.gl.getParameter(this.ext.GPU_DISJOINT_EXT);
          if (disjoint) {
            // 如果计时器分离，使用最后一个值
            finalizeResolution(this.lastValue);
            return;
          }

          // 检查查询结果是否可用
          const available = this.gl.getQueryParameter(query, this.gl.QUERY_RESULT_AVAILABLE);
          if (!available) {
            // 如果结果尚未可用，1毫秒后再次检查
            timeoutId = setTimeout(checkQuery, 1);
            return;
          }

          // 获取经过的时间（纳秒）并转换为毫秒
          const elapsed = this.gl.getQueryParameter(query, this.gl.QUERY_RESULT);
          resolve(Number(elapsed) / 1e6); // 将纳秒转换为毫秒
        } catch (error) {
          // 检查查询时出错，使用最后一个值
          console.error("Error checking query:", error);
          resolve(this.lastValue);
        }
      };

      // 开始检查查询状态
      checkQuery();
    });
  }

  /**
   * 释放此查询池持有的所有资源
   * 包括删除所有查询对象和清除内部状态
   */
  dispose() {
    // 如果已经被释放，直接返回
    if (this.isDisposed) {
      return;
    }

    // 标记为已释放
    this.isDisposed = true;

    // 如果未启用时间戳跟踪，直接返回
    if (!this.trackTimestamp) return;

    // 删除所有WebGL查询对象
    for (const query of this.queries) {
      this.gl.deleteQuery(query);
    }

    // 清空查询数组
    this.queries = [];
    // 清除查询状态映射
    this.queryStates.clear();
    // 清除查询偏移量映射
    this.queryOffsets.clear();
    // 重置最后一个值
    this.lastValue = 0;
    // 清除活动查询引用
    this.activeQuery = null;
  }
}

// 导出WebGL时间戳查询池类
export default WebGLTimestampQueryPool;
