/**
 * 光照模型抽象类 - 用于实现光照模型的基类
 * 该模块定义了多个方法，具体的光照模型可以实现这些方法
 * 这些方法在光照评估过程的不同阶段被执行
 */
class LightingModel {
  /**
   * 启动方法 - 用于设置光照模型和上下文数据，这些数据稍后在评估过程中使用
   *
   * @abstract
   * @param {NodeBuilder} builder - 当前节点构建器
   */
  start(builder) {
    // 直接光照设置

    // 设置光源节点，获取所有光源节点并进行配置
    builder.lightsNode.setupLights(builder, builder.lightsNode.getLightNodes(builder));

    // 间接光照设置

    // 调用间接光照方法
    this.indirect(builder);
  }

  /**
   * 完成方法 - 用于执行最终任务，如对输出光照进行最终更新
   *
   * @abstract
   * @param {NodeBuilder} builder - 当前节点构建器
   */
  finish(/*builder*/) {
    // 抽象方法，派生类可以实现具体逻辑
  }

  /**
   * 直接光照方法 - 用于实现直接光照项
   * 在方向光、点光源和聚光灯节点的构建过程中执行
   *
   * @abstract
   * @param {Object} lightData - 光源数据
   * @param {NodeBuilder} builder - 当前节点构建器
   */
  direct(/*lightData, builder*/) {
    // 抽象方法，派生类需要实现直接光照计算
  }

  /**
   * 矩形区域光直接光照方法 - 用于实现矩形区域光源的直接光照项
   *
   * @abstract
   * @param {Object} lightData - 光源数据
   * @param {NodeBuilder} builder - 当前节点构建器
   */
  directRectArea(/*lightData, builder*/) {
    // 抽象方法，派生类需要实现矩形区域光的直接光照计算
  }

  /**
   * 间接光照方法 - 用于实现间接光照项
   *
   * @abstract
   * @param {NodeBuilder} builder - 当前节点构建器
   */
  indirect(/*builder*/) {
    // 抽象方法，派生类需要实现间接光照计算
  }

  /**
   * 环境光遮蔽方法 - 用于实现环境光遮蔽项
   * 与其他方法不同，此方法必须由光照模型在其间接光照项中手动调用
   *
   * @abstract
   * @param {any} input - 输入参数
   * @param {any} stack - 堆栈参数
   * @param {NodeBuilder} builder - 当前节点构建器
   */
  ambientOcclusion(/*input, stack, builder*/) {
    // 抽象方法，派生类需要实现环境光遮蔽计算
  }
}

// 导出光照模型类作为默认导出
export default LightingModel;
