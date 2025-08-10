/**
 * NodeBuilderState.js
 *
 * 节点构建器状态类 - 存储节点构建结果和渲染状态
 *
 * 这个模块表示节点构建器在为渲染对象构建节点后的状态。该状态保存了
 * 构建的结果，供渲染器进一步处理使用。
 *
 * 具有相同缓存键的渲染对象共享同一个节点构建器状态，这样可以：
 * 1. 减少重复的着色器编译
 * 2. 共享uniform缓冲区和纹理绑定
 * 3. 优化渲染性能
 * 4. 减少GPU资源占用
 *
 * 主要功能：
 * - 存储编译后的着色器代码
 * - 管理节点属性和绑定组
 * - 跟踪需要更新的节点
 * - 提供绑定组的克隆机制
 */

import BindGroup from "../BindGroup.js"; // 绑定组类，用于管理uniform和纹理绑定

/**
 * 节点构建器状态类
 *
 * 这个类表示节点构建器在为渲染对象构建节点后的状态。该状态保存了
 * 构建的结果，供渲染器进一步处理使用。
 *
 * 具有相同缓存键的渲染对象共享同一个节点构建器状态，这样可以避免
 * 重复编译着色器和创建资源，提高渲染效率。
 *
 * @private
 */
class NodeBuilderState {
  /**
   * 构造新的节点构建器状态
   *
   * 初始化节点构建器状态的所有组件，包括着色器代码、属性、绑定、
   * 更新节点等。这些数据是节点构建过程的最终结果。
   *
   * @param {string} vertexShader - 原生顶点着色器代码
   * @param {string} fragmentShader - 原生片段着色器代码
   * @param {string} computeShader - 原生计算着色器代码
   * @param {Array<NodeAttribute>} nodeAttributes - 节点属性数组
   * @param {Array<BindGroup>} bindings - 绑定组数组
   * @param {Array<Node>} updateNodes - 实现update()方法的节点数组
   * @param {Array<Node>} updateBeforeNodes - 实现updateBefore()方法的节点数组
   * @param {Array<Node>} updateAfterNodes - 实现updateAfter()方法的节点数组
   * @param {NodeMaterialObserver} observer - 节点材质观察器
   * @param {Array<Object>} transforms - 变换属性对象数组（仅在WebGL 2计算着色器中相关）
   */
  constructor(vertexShader, fragmentShader, computeShader, nodeAttributes, bindings, updateNodes, updateBeforeNodes, updateAfterNodes, observer, transforms = []) {
    /**
     * 原生顶点着色器代码
     *
     * 经过节点系统编译后生成的最终顶点着色器源代码，
     * 可以直接提交给GPU进行编译和执行。
     *
     * @type {string}
     */
    this.vertexShader = vertexShader;

    /**
     * 原生片段着色器代码
     *
     * 经过节点系统编译后生成的最终片段着色器源代码，
     * 可以直接提交给GPU进行编译和执行。
     *
     * @type {string}
     */
    this.fragmentShader = fragmentShader;

    /**
     * 原生计算着色器代码
     *
     * 经过节点系统编译后生成的最终计算着色器源代码，
     * 用于GPU计算任务，如粒子系统、物理模拟等。
     *
     * @type {string}
     */
    this.computeShader = computeShader;

    /**
     * 变换属性对象数组
     *
     * 包含变换反馈相关的属性对象，仅在使用WebGL 2计算着色器时相关。
     * 用于在顶点着色器中捕获变换后的顶点数据。
     *
     * @type {Array<Object>}
     */
    this.transforms = transforms;

    /**
     * 节点属性数组
     *
     * 表示着色器属性的节点属性数组，包含顶点属性、实例属性等。
     * 这些属性定义了几何体数据如何传递给着色器。
     *
     * @type {Array<import('../../../nodes/core/NodeAttribute.js').NodeAttribute>}
     */
    this.nodeAttributes = nodeAttributes;

    /**
     * 绑定组数组
     *
     * 表示着色器的uniform缓冲区、存储缓冲区、纹理或采样器的绑定组数组。
     * 每个绑定组包含一组相关的资源绑定。
     *
     * @type {Array<BindGroup>}
     */
    this.bindings = bindings;

    /**
     * 更新节点数组
     *
     * 实现update()方法的节点数组，这些节点在每帧渲染时都会被更新。
     * 通常包含时间相关、动画相关的节点。
     *
     * @type {Array<import('../../../nodes/core/Node.js').Node>}
     */
    this.updateNodes = updateNodes;

    /**
     * 前置更新节点数组
     *
     * 实现updateBefore()方法的节点数组，这些节点在渲染前被更新。
     * 用于需要在主要渲染逻辑之前执行的更新操作。
     *
     * @type {Array<import('../../../nodes/core/Node.js').Node>}
     */
    this.updateBeforeNodes = updateBeforeNodes;

    /**
     * 后置更新节点数组
     *
     * 实现updateAfter()方法的节点数组，这些节点在渲染后被更新。
     * 用于需要在主要渲染逻辑之后执行的清理或后处理操作。
     *
     * @type {Array<import('../../../nodes/core/Node.js').Node>}
     */
    this.updateAfterNodes = updateAfterNodes;

    /**
     * 节点材质观察器
     *
     * 用于监听和响应节点材质变化的观察器对象。
     * 当材质属性发生变化时，观察器会触发相应的更新操作。
     *
     * @type {import('../../../materials/nodes/NodeMaterialObserver.js').NodeMaterialObserver}
     */
    this.observer = observer;

    /**
     * 状态使用次数
     *
     * 记录此状态被渲染对象使用的次数。用于统计和优化，
     * 帮助识别高频使用的状态以进行特殊优化。
     *
     * @type {number}
     */
    this.usedTimes = 0;
  }

  /**
   * 创建绑定组数组
   *
   * 基于此状态的现有绑定组创建新的绑定组数组。共享的绑定组不会被克隆，
   * 而非共享的绑定组会被克隆以避免状态冲突。
   *
   * 这个方法的主要作用是：
   * 1. 为每个渲染对象创建独立的绑定组实例
   * 2. 避免多个渲染对象之间的状态干扰
   * 3. 优化共享资源的使用（共享绑定组直接复用）
   * 4. 确保每个渲染对象有自己的uniform数据副本
   *
   * @return {Array<BindGroup>} 新创建的绑定组数组
   */
  createBindings() {
    const bindings = []; // 新的绑定组数组

    // 遍历所有现有的绑定组
    for (const instanceGroup of this.bindings) {
      // 检查绑定组是否为共享类型
      // 注意：组内所有绑定必须具有相同的groupNode
      const shared = instanceGroup.bindings[0].groupNode.shared;

      if (shared !== true) {
        // 非共享绑定组：创建新的绑定组实例
        const bindingsGroup = new BindGroup(instanceGroup.name, [], instanceGroup.index, instanceGroup);
        bindings.push(bindingsGroup);

        // 克隆组内的每个绑定
        for (const instanceBinding of instanceGroup.bindings) {
          bindingsGroup.bindings.push(instanceBinding.clone());
        }
      } else {
        // 共享绑定组：直接复用现有实例
        bindings.push(instanceGroup);
      }
    }

    return bindings;
  }
}

export default NodeBuilderState;
