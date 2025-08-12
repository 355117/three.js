// 导入节点更新类型常量，用于控制节点的更新频率和时机
import { NodeUpdateType } from "./constants.js";

/**
 * 用于更新节点的管理类。该模块跟踪诸如经过时间、增量时间、渲染ID和帧ID等指标，
 * 以便根据节点的配置正确调用节点更新方法 {@link Node#updateBefore}、{@link Node#update}
 * 和 {@link Node#updateAfter}。
 *
 * NodeFrame类是Three.js节点系统的核心组件，负责管理节点的生命周期和更新逻辑。
 * 它实现了一个智能的更新系统，可以根据不同的更新类型（帧更新、渲染更新、对象更新）
 * 来控制节点的更新频率，避免不必要的重复计算，提高渲染性能。
 */
class NodeFrame {
  /**
   * 构造一个新的节点帧管理器。
   *
   * 此构造函数初始化NodeFrame实例的所有必要属性，包括时间跟踪、
   * 更新控制映射和渲染上下文引用。
   */
  constructor() {
    /**
     * 经过的时间（以秒为单位）。
     * 记录从应用程序开始运行到当前的总时间，用于时间相关的动画和效果。
     *
     * @type {number}
     * @default 0
     */
    this.time = 0;

    /**
     * 增量时间（以秒为单位）。
     * 记录当前帧与上一帧之间的时间差，用于帧率无关的动画计算。
     *
     * @type {number}
     * @default 0
     */
    this.deltaTime = 0;

    /**
     * 帧ID。
     * 每一帧递增的唯一标识符，用于跟踪和控制基于帧的更新。
     *
     * @type {number}
     * @default 0
     */
    this.frameId = 0;

    /**
     * 渲染ID。
     * 每次渲染操作递增的唯一标识符，用于跟踪和控制基于渲染的更新。
     *
     * @type {number}
     * @default 0
     */
    this.renderId = 0;

    /**
     * 用于控制 {@link Node#update} 调用的映射。
     * 存储节点的更新状态信息，防止在同一帧或渲染周期内重复更新。
     *
     * @type {WeakMap<Node, Object>}
     */
    this.updateMap = new WeakMap();

    /**
     * 用于控制 {@link Node#updateBefore} 调用的映射。
     * 存储节点的预更新状态信息，确保预更新逻辑的正确执行。
     *
     * @type {WeakMap<Node, Object>}
     */
    this.updateBeforeMap = new WeakMap();

    /**
     * 用于控制 {@link Node#updateAfter} 调用的映射。
     * 存储节点的后更新状态信息，确保后更新逻辑的正确执行。
     *
     * @type {WeakMap<Node, Object>}
     */
    this.updateAfterMap = new WeakMap();

    /**
     * 当前渲染器的引用。
     * 指向正在使用的Three.js渲染器实例，提供渲染上下文信息。
     *
     * @type {?Renderer}
     * @default null
     */
    this.renderer = null;

    /**
     * 当前材质的引用。
     * 指向正在处理的材质对象，用于材质相关的节点更新。
     *
     * @type {?Material}
     * @default null
     */
    this.material = null;

    /**
     * 当前相机的引用。
     * 指向正在使用的相机对象，用于视图相关的节点更新。
     *
     * @type {?Camera}
     * @default null
     */
    this.camera = null;

    /**
     * 当前3D对象的引用。
     * 指向正在渲染的3D对象，用于对象相关的节点更新。
     *
     * @type {?Object3D}
     * @default null
     */
    this.object = null;

    /**
     * 当前场景的引用。
     * 指向正在渲染的场景对象，用于场景相关的节点更新。
     *
     * @type {?Scene}
     * @default null
     */
    this.scene = null;
  }

  /**
   * 为给定节点和更新映射返回一个字典，该字典用于正确地按帧或渲染调用节点更新方法。
   *
   * 此私有方法管理节点的更新状态映射，为每个节点创建和维护渲染映射和帧映射。
   * 这些映射用于跟踪节点在不同更新周期中的状态，确保更新逻辑的正确执行。
   *
   * @private
   * @param {WeakMap<Node, Object>} referenceMap - 引用的弱映射，存储节点的更新状态
   * @param {Node} nodeRef - 当前节点的引用
   * @return {Object<string,WeakMap>} 包含renderMap和frameMap的字典对象
   */
  _getMaps(referenceMap, nodeRef) {
    // 从引用映射中获取节点对应的映射字典
    let maps = referenceMap.get(nodeRef);

    // 如果映射字典不存在，则创建新的映射字典
    if (maps === undefined) {
      // 创建包含渲染映射和帧映射的字典对象
      maps = {
        renderMap: new WeakMap(), // 用于跟踪基于渲染的更新状态
        frameMap: new WeakMap(), // 用于跟踪基于帧的更新状态
      };

      // 将新创建的映射字典存储到引用映射中
      referenceMap.set(nodeRef, maps);
    }

    // 返回映射字典，供调用者使用
    return maps;
  }

  /**
   * 此方法为给定节点执行 {@link Node#updateBefore}。
   * 它确保遵循 {@link Node#updateBeforeType}，意味着根据更新类型，
   * 更新只会在每帧、每次渲染或每个对象执行一次。
   *
   * updateBefore是节点更新生命周期的第一个阶段，通常用于准备工作和状态初始化。
   *
   * @param {Node} node - 应该被更新的节点
   */
  updateBeforeNode(node) {
    // 获取节点的预更新类型，决定更新频率
    const updateType = node.getUpdateBeforeType();
    // 获取节点的更新引用，用于跟踪更新状态
    const reference = node.updateReference(this);

    // 如果是基于帧的更新类型
    if (updateType === NodeUpdateType.FRAME) {
      // 获取帧映射，用于跟踪基于帧的更新状态
      const { frameMap } = this._getMaps(this.updateBeforeMap, reference);

      // 检查当前帧是否已经更新过该节点
      if (frameMap.get(reference) !== this.frameId) {
        // 执行节点的预更新方法，如果返回值不是false
        if (node.updateBefore(this) !== false) {
          // 记录当前帧ID，标记该节点在此帧已更新
          frameMap.set(reference, this.frameId);
        }
      }
    } else if (updateType === NodeUpdateType.RENDER) {
      // 如果是基于渲染的更新类型
      // 获取渲染映射，用于跟踪基于渲染的更新状态
      const { renderMap } = this._getMaps(this.updateBeforeMap, reference);

      // 检查当前渲染周期是否已经更新过该节点
      if (renderMap.get(reference) !== this.renderId) {
        // 执行节点的预更新方法，如果返回值不是false
        if (node.updateBefore(this) !== false) {
          // 记录当前渲染ID，标记该节点在此渲染周期已更新
          renderMap.set(reference, this.renderId);
        }
      }
    } else if (updateType === NodeUpdateType.OBJECT) {
      // 如果是基于对象的更新类型，每次都执行更新
      // 这种类型的更新不需要跟踪状态，每次调用都会执行
      node.updateBefore(this);
    }
  }

  /**
   * 此方法为给定节点执行 {@link Node#updateAfter}。
   * 它确保遵循 {@link Node#updateAfterType}，意味着根据更新类型，
   * 更新只会在每帧、每次渲染或每个对象执行一次。
   *
   * updateAfter是节点更新生命周期的最后一个阶段，通常用于清理工作和状态收尾。
   *
   * @param {Node} node - 应该被更新的节点
   */
  updateAfterNode(node) {
    // 获取节点的后更新类型，决定更新频率
    const updateType = node.getUpdateAfterType();
    // 获取节点的更新引用，用于跟踪更新状态
    const reference = node.updateReference(this);

    // 如果是基于帧的更新类型
    if (updateType === NodeUpdateType.FRAME) {
      // 获取帧映射，用于跟踪基于帧的更新状态
      const { frameMap } = this._getMaps(this.updateAfterMap, reference);

      // 检查当前帧是否已经更新过该节点
      if (frameMap.get(reference) !== this.frameId) {
        // 执行节点的后更新方法，如果返回值不是false
        if (node.updateAfter(this) !== false) {
          // 记录当前帧ID，标记该节点在此帧已更新
          frameMap.set(reference, this.frameId);
        }
      }
    } else if (updateType === NodeUpdateType.RENDER) {
      // 如果是基于渲染的更新类型
      // 获取渲染映射，用于跟踪基于渲染的更新状态
      const { renderMap } = this._getMaps(this.updateAfterMap, reference);

      // 检查当前渲染周期是否已经更新过该节点
      if (renderMap.get(reference) !== this.renderId) {
        // 执行节点的后更新方法，如果返回值不是false
        if (node.updateAfter(this) !== false) {
          // 记录当前渲染ID，标记该节点在此渲染周期已更新
          renderMap.set(reference, this.renderId);
        }
      }
    } else if (updateType === NodeUpdateType.OBJECT) {
      // 如果是基于对象的更新类型，每次都执行更新
      // 这种类型的更新不需要跟踪状态，每次调用都会执行
      node.updateAfter(this);
    }
  }

  /**
   * 此方法为给定节点执行 {@link Node#update}。
   * 它确保遵循 {@link Node#updateType}，意味着根据更新类型，
   * 更新只会在每帧、每次渲染或每个对象执行一次。
   *
   * update是节点更新生命周期的核心阶段，通常用于主要的计算和状态更新。
   *
   * @param {Node} node - 应该被更新的节点
   */
  updateNode(node) {
    // 获取节点的更新类型，决定更新频率
    const updateType = node.getUpdateType();
    // 获取节点的更新引用，用于跟踪更新状态
    const reference = node.updateReference(this);

    // 如果是基于帧的更新类型
    if (updateType === NodeUpdateType.FRAME) {
      // 获取帧映射，用于跟踪基于帧的更新状态
      const { frameMap } = this._getMaps(this.updateMap, reference);

      // 检查当前帧是否已经更新过该节点
      if (frameMap.get(reference) !== this.frameId) {
        // 执行节点的更新方法，如果返回值不是false
        if (node.update(this) !== false) {
          // 记录当前帧ID，标记该节点在此帧已更新
          frameMap.set(reference, this.frameId);
        }
      }
    } else if (updateType === NodeUpdateType.RENDER) {
      // 如果是基于渲染的更新类型
      // 获取渲染映射，用于跟踪基于渲染的更新状态
      const { renderMap } = this._getMaps(this.updateMap, reference);

      // 检查当前渲染周期是否已经更新过该节点
      if (renderMap.get(reference) !== this.renderId) {
        // 执行节点的更新方法，如果返回值不是false
        if (node.update(this) !== false) {
          // 记录当前渲染ID，标记该节点在此渲染周期已更新
          renderMap.set(reference, this.renderId);
        }
      }
    } else if (updateType === NodeUpdateType.OBJECT) {
      // 如果是基于对象的更新类型，每次都执行更新
      // 这种类型的更新不需要跟踪状态，每次调用都会执行
      node.update(this);
    }
  }

  /**
   * 更新节点帧的内部状态。此方法由渲染器在其内部动画循环中调用。
   *
   * 此方法负责维护时间相关的状态，包括帧ID递增、时间计算和增量时间计算。
   * 这些时间信息对于实现平滑的动画和帧率无关的效果至关重要。
   */
  update() {
    // 递增帧ID，为每一帧提供唯一标识
    this.frameId++;

    // 如果是第一次调用，初始化上次时间记录
    if (this.lastTime === undefined) this.lastTime = performance.now();

    // 计算增量时间（当前时间与上次时间的差值，转换为秒）
    // 这个值用于实现帧率无关的动画
    this.deltaTime = (performance.now() - this.lastTime) / 1000;

    // 更新上次时间记录为当前时间
    this.lastTime = performance.now();

    // 累加总时间，记录从开始到现在的总经过时间
    this.time += this.deltaTime;
  }
}

// 导出NodeFrame类作为默认导出，供其他模块使用
export default NodeFrame;
