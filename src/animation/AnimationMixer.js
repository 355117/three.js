// 导入动画动作类
import { AnimationAction } from "./AnimationAction.js";
// 导入事件分发器基类
import { EventDispatcher } from "../core/EventDispatcher.js";
// 导入线性插值器
import { LinearInterpolant } from "../math/interpolants/LinearInterpolant.js";
// 导入属性绑定类
import { PropertyBinding } from "./PropertyBinding.js";
// 导入属性混合器类
import { PropertyMixer } from "./PropertyMixer.js";
// 导入动画剪辑类
import { AnimationClip } from "./AnimationClip.js";
// 导入正常动画混合模式常量
import { NormalAnimationBlendMode } from "../constants.js";

// 控制插值器结果缓冲区，用于存储插值计算结果
const _controlInterpolantsResultBuffer = new Float32Array(1);

/**
 * `AnimationMixer` 是场景中特定对象的动画播放器。
 * 当场景中的多个对象独立进行动画时，每个对象可以使用一个 `AnimationMixer`。
 *
 * AnimationMixer 负责管理和播放动画剪辑，处理动画的混合、时间控制和内存管理。
 */
class AnimationMixer extends EventDispatcher {
  /**
   * 构造一个新的动画混合器。
   *
   * @param {Object3D} root - 将由此混合器播放动画的对象
   */
  constructor(root) {
    // 调用父类构造函数，初始化事件分发器
    super();

    // 存储根对象引用，所有动画都将应用到此对象及其子对象上
    this._root = root;
    // 初始化内存管理器，设置动作、绑定和插值器的缓存系统
    this._initMemoryManager();
    // 累积索引，用于双缓冲技术，在0和1之间切换
    this._accuIndex = 0;

    /**
     * 全局混合器时间（以秒为单位；从混合器创建时的 `0` 开始）。
     * 这是混合器的主时间轴，所有动画都基于此时间进行计算。
     *
     * @type {number}
     * @default 0
     */
    this.time = 0;

    /**
     * 全局时间的缩放因子。
     *
     * 注意：将此成员设置为 `0` 然后再设置回 `1` 是
     * 暂停/取消暂停由此混合器控制的所有动作的一种方法。
     * 值为2.0表示双倍速度播放，0.5表示半速播放。
     *
     * @type {number}
     * @default 1
     */
    this.timeScale = 1.0;
  }

  /**
   * 将动作绑定到属性混合器。
   * 此方法为动画动作创建或复用属性绑定，建立动画轨道与对象属性之间的连接。
   *
   * @param {AnimationAction} action - 要绑定的动画动作
   * @param {AnimationAction} prototypeAction - 原型动作，用于复用已有的绑定路径
   */
  _bindAction(action, prototypeAction) {
    // 获取根对象，优先使用动作的本地根对象，否则使用混合器的根对象
    const root = action._localRoot || this._root,
      // 获取动画剪辑中的所有轨道
      tracks = action._clip.tracks,
      // 轨道数量
      nTracks = tracks.length,
      // 动作的属性绑定数组
      bindings = action._propertyBindings,
      // 动作的插值器数组
      interpolants = action._interpolants,
      // 根对象的唯一标识符
      rootUuid = root.uuid,
      // 按根对象和名称组织的绑定缓存
      bindingsByRoot = this._bindingsByRootAndName;

    // 获取当前根对象的绑定映射
    let bindingsByName = bindingsByRoot[rootUuid];

    // 如果该根对象还没有绑定映射，则创建一个新的
    if (bindingsByName === undefined) {
      bindingsByName = {};
      bindingsByRoot[rootUuid] = bindingsByName;
    }

    // 遍历所有轨道，为每个轨道创建或复用属性绑定
    for (let i = 0; i !== nTracks; ++i) {
      // 获取当前轨道和轨道名称
      const track = tracks[i],
        trackName = track.name;

      // 尝试从缓存中获取已存在的绑定
      let binding = bindingsByName[trackName];

      if (binding !== undefined) {
        // 如果找到了已存在的绑定，增加引用计数并复用
        ++binding.referenceCount;
        bindings[i] = binding;
      } else {
        // 如果没有找到缓存的绑定，检查动作是否已有绑定
        binding = bindings[i];

        if (binding !== undefined) {
          // 已存在绑定，确保缓存知道这个绑定

          if (binding._cacheIndex === null) {
            // 绑定不在缓存中，增加引用计数并添加到非活跃绑定列表
            ++binding.referenceCount;
            this._addInactiveBinding(binding, rootUuid, trackName);
          }

          // 继续处理下一个轨道
          continue;
        }

        // 从原型动作中获取解析路径（如果存在）
        const path = prototypeAction && prototypeAction._propertyBindings[i].binding.parsedPath;

        // 创建新的属性混合器，包含属性绑定
        binding = new PropertyMixer(PropertyBinding.create(root, trackName, path), track.ValueTypeName, track.getValueSize());

        // 增加引用计数并添加到非活跃绑定列表
        ++binding.referenceCount;
        this._addInactiveBinding(binding, rootUuid, trackName);

        // 将绑定存储到动作的绑定数组中
        bindings[i] = binding;
      }

      // 将绑定的缓冲区设置为插值器的结果缓冲区
      interpolants[i].resultBuffer = binding.buffer;
    }
  }

  /**
   * 激活一个动画动作。
   * 将动作从非活跃状态转换为活跃状态，使其能够影响动画播放。
   *
   * @param {AnimationAction} action - 要激活的动画动作
   */
  _activateAction(action) {
    // 检查动作是否已经处于活跃状态
    if (!this._isActiveAction(action)) {
      // 如果动作的缓存索引为null，说明它已被缓存遗忘
      if (action._cacheIndex === null) {
        // 此动作已被缓存遗忘，但用户似乎仍在使用它 -> 重新绑定

        // 获取根对象和剪辑的UUID
        const rootUuid = (action._localRoot || this._root).uuid,
          clipUuid = action._clip.uuid,
          // 获取该剪辑的所有动作
          actionsForClip = this._actionsByClip[clipUuid];

        // 重新绑定动作，使用已知动作中的第一个作为原型
        this._bindAction(action, actionsForClip && actionsForClip.knownActions[0]);

        // 将动作添加到非活跃动作列表中
        this._addInactiveAction(action, clipUuid, rootUuid);
      }

      // 获取动作的属性绑定数组
      const bindings = action._propertyBindings;

      // 增加引用计数并整理状态
      for (let i = 0, n = bindings.length; i !== n; ++i) {
        const binding = bindings[i];

        // 如果绑定的使用计数从0变为1，则需要激活绑定
        if (binding.useCount++ === 0) {
          // 将绑定从非活跃状态转为活跃状态
          this._lendBinding(binding);
          // 保存原始状态，以便后续恢复
          binding.saveOriginalState();
        }
      }

      // 将动作从非活跃状态转为活跃状态
      this._lendAction(action);
    }
  }

  /**
   * 停用一个动画动作。
   * 将动作从活跃状态转换为非活跃状态，停止其对动画播放的影响。
   *
   * @param {AnimationAction} action - 要停用的动画动作
   */
  _deactivateAction(action) {
    // 检查动作是否处于活跃状态
    if (this._isActiveAction(action)) {
      // 获取动作的属性绑定数组
      const bindings = action._propertyBindings;

      // 减少引用计数并整理状态
      for (let i = 0, n = bindings.length; i !== n; ++i) {
        const binding = bindings[i];

        // 如果绑定的使用计数减少到0，则需要停用绑定
        if (--binding.useCount === 0) {
          // 恢复属性的原始状态
          binding.restoreOriginalState();
          // 将绑定从活跃状态转为非活跃状态
          this._takeBackBinding(binding);
        }
      }

      // 将动作从活跃状态转为非活跃状态
      this._takeBackAction(action);
    }
  }

  // 内存管理器

  /**
   * 初始化内存管理器。
   * 设置用于管理动作、绑定和控制插值器的数据结构和统计信息。
   * 使用双缓冲技术来优化性能，将活跃和非活跃对象分开管理。
   */
  _initMemoryManager() {
    // 动作数组：前 nActiveActions 个是活跃的，后面是非活跃的
    this._actions = [];
    // 活跃动作的数量
    this._nActiveActions = 0;

    // 按剪辑组织的动作映射
    this._actionsByClip = {};
    // 内部结构：
    // {
    // 	knownActions: Array< AnimationAction > - 用作原型的已知动作
    // 	actionByRoot: AnimationAction - 根据根对象查找动作
    // }

    // 绑定数组：前 nActiveBindings 个是活跃的，后面是非活跃的
    this._bindings = [];
    // 活跃绑定的数量
    this._nActiveBindings = 0;

    // 按根对象和名称组织的绑定映射：内部结构为 Map< name, PropertyMixer >
    this._bindingsByRootAndName = {};

    // 控制插值器数组：与上面相同的管理方式
    this._controlInterpolants = [];
    // 活跃控制插值器的数量
    this._nActiveControlInterpolants = 0;

    // 保存当前作用域的引用，用于统计对象中的getter函数
    const scope = this;

    // 统计信息对象，提供各种资源的使用情况
    this.stats = {
      // 动作统计
      actions: {
        // 获取动作总数（包括活跃和非活跃的）
        get total() {
          return scope._actions.length;
        },
        // 获取正在使用的动作数量
        get inUse() {
          return scope._nActiveActions;
        },
      },
      // 绑定统计
      bindings: {
        // 获取绑定总数（包括活跃和非活跃的）
        get total() {
          return scope._bindings.length;
        },
        // 获取正在使用的绑定数量
        get inUse() {
          return scope._nActiveBindings;
        },
      },
      // 控制插值器统计
      controlInterpolants: {
        // 获取控制插值器总数（包括活跃和非活跃的）
        get total() {
          return scope._controlInterpolants.length;
        },
        // 获取正在使用的控制插值器数量
        get inUse() {
          return scope._nActiveControlInterpolants;
        },
      },
    };
  }

  // AnimationAction 对象的内存管理

  /**
   * 检查动作是否处于活跃状态。
   *
   * @param {AnimationAction} action - 要检查的动画动作
   * @return {boolean} 如果动作处于活跃状态则返回true
   */
  _isActiveAction(action) {
    // 获取动作的缓存索引
    const index = action._cacheIndex;
    // 动作活跃的条件：索引不为null且小于活跃动作数量
    return index !== null && index < this._nActiveActions;
  }

  /**
   * 将动作添加到非活跃动作列表中。
   * 同时更新剪辑和根对象的映射关系。
   *
   * @param {AnimationAction} action - 要添加的动画动作
   * @param {string} clipUuid - 动画剪辑的UUID
   * @param {string} rootUuid - 根对象的UUID
   */
  _addInactiveAction(action, clipUuid, rootUuid) {
    // 获取动作数组和按剪辑分组的动作映射
    const actions = this._actions,
      actionsByClip = this._actionsByClip;

    // 获取该剪辑对应的动作组
    let actionsForClip = actionsByClip[clipUuid];

    if (actionsForClip === undefined) {
      // 如果该剪辑还没有动作组，创建新的动作组
      actionsForClip = {
        knownActions: [action], // 已知动作数组
        actionByRoot: {}, // 按根对象索引的动作映射
      };

      // 设置动作在剪辑缓存中的索引
      action._byClipCacheIndex = 0;

      // 将动作组添加到剪辑映射中
      actionsByClip[clipUuid] = actionsForClip;
    } else {
      // 如果动作组已存在，将动作添加到已知动作数组中
      const knownActions = actionsForClip.knownActions;

      // 设置动作在剪辑缓存中的索引
      action._byClipCacheIndex = knownActions.length;
      knownActions.push(action);
    }

    // 设置动作在全局动作数组中的缓存索引
    action._cacheIndex = actions.length;
    // 将动作添加到全局动作数组的末尾
    actions.push(action);

    // 在根对象映射中记录该动作
    actionsForClip.actionByRoot[rootUuid] = action;
  }

  /**
   * 从非活跃动作列表中移除动作。
   * 使用交换技术保持数组的紧凑性，同时清理所有相关的映射关系。
   *
   * @param {AnimationAction} action - 要移除的动画动作
   */
  _removeInactiveAction(action) {
    // 获取动作数组和要移除动作的缓存索引
    const actions = this._actions,
      lastInactiveAction = actions[actions.length - 1],
      cacheIndex = action._cacheIndex;

    // 将最后一个非活跃动作移动到要移除动作的位置
    lastInactiveAction._cacheIndex = cacheIndex;
    actions[cacheIndex] = lastInactiveAction;
    // 移除数组末尾的元素
    actions.pop();

    // 清除被移除动作的缓存索引
    action._cacheIndex = null;

    // 从剪辑映射中移除动作
    const clipUuid = action._clip.uuid,
      actionsByClip = this._actionsByClip,
      actionsForClip = actionsByClip[clipUuid],
      knownActionsForClip = actionsForClip.knownActions,
      lastKnownAction = knownActionsForClip[knownActionsForClip.length - 1],
      byClipCacheIndex = action._byClipCacheIndex;

    // 将最后一个已知动作移动到要移除动作的位置
    lastKnownAction._byClipCacheIndex = byClipCacheIndex;
    knownActionsForClip[byClipCacheIndex] = lastKnownAction;
    knownActionsForClip.pop();

    // 清除被移除动作的剪辑缓存索引
    action._byClipCacheIndex = null;

    // 从根对象映射中移除动作
    const actionByRoot = actionsForClip.actionByRoot,
      rootUuid = (action._localRoot || this._root).uuid;

    delete actionByRoot[rootUuid];

    // 如果该剪辑没有更多的已知动作，则删除整个剪辑映射
    if (knownActionsForClip.length === 0) {
      delete actionsByClip[clipUuid];
    }

    // 移除该动作相关的非活跃绑定
    this._removeInactiveBindingsForAction(action);
  }

  /**
   * 移除动作相关的非活跃绑定。
   * 减少绑定的引用计数，如果计数为0则完全移除绑定。
   *
   * @param {AnimationAction} action - 要处理的动画动作
   */
  _removeInactiveBindingsForAction(action) {
    // 获取动作的属性绑定数组
    const bindings = action._propertyBindings;

    // 遍历所有绑定
    for (let i = 0, n = bindings.length; i !== n; ++i) {
      const binding = bindings[i];

      // 减少绑定的引用计数，如果计数变为0则移除绑定
      if (--binding.referenceCount === 0) {
        this._removeInactiveBinding(binding);
      }
    }
  }

  /**
   * 将动作从非活跃状态转为活跃状态。
   * 使用交换技术将动作移动到活跃区域，保持数组的紧凑性。
   *
   * @param {AnimationAction} action - 要激活的动画动作
   */
  _lendAction(action) {
    // 数组布局示意图：
    // [ active actions |  inactive actions  ]
    // [  active actions >| inactive actions ]
    //                 s        a
    //                  <-swap->
    //                 a        s

    // 获取动作数组和相关索引
    const actions = this._actions,
      prevIndex = action._cacheIndex, // 动作当前的索引位置
      lastActiveIndex = this._nActiveActions++, // 最后一个活跃位置（递增活跃计数）
      firstInactiveAction = actions[lastActiveIndex]; // 第一个非活跃动作

    // 将要激活的动作移动到活跃区域的末尾
    action._cacheIndex = lastActiveIndex;
    actions[lastActiveIndex] = action;

    // 将原来的第一个非活跃动作移动到原位置
    firstInactiveAction._cacheIndex = prevIndex;
    actions[prevIndex] = firstInactiveAction;
  }

  /**
   * 将动作从活跃状态转为非活跃状态。
   * 使用交换技术将动作移动到非活跃区域，保持数组的紧凑性。
   *
   * @param {AnimationAction} action - 要停用的动画动作
   */
  _takeBackAction(action) {
    // 数组布局示意图：
    // [  active actions  | inactive actions ]
    // [ active actions |< inactive actions  ]
    //        a        s
    //         <-swap->
    //        s        a

    // 获取动作数组和相关索引
    const actions = this._actions,
      prevIndex = action._cacheIndex, // 动作当前的索引位置
      firstInactiveIndex = --this._nActiveActions, // 第一个非活跃位置（递减活跃计数）
      lastActiveAction = actions[firstInactiveIndex]; // 最后一个活跃动作

    // 将要停用的动作移动到非活跃区域的开始
    action._cacheIndex = firstInactiveIndex;
    actions[firstInactiveIndex] = action;

    // 将原来的最后一个活跃动作移动到原位置
    lastActiveAction._cacheIndex = prevIndex;
    actions[prevIndex] = lastActiveAction;
  }

  // PropertyMixer 对象的内存管理

  /**
   * 将绑定添加到非活跃绑定列表中。
   * 同时更新根对象和轨道名称的映射关系。
   *
   * @param {PropertyMixer} binding - 要添加的属性绑定
   * @param {string} rootUuid - 根对象的UUID
   * @param {string} trackName - 轨道名称
   */
  _addInactiveBinding(binding, rootUuid, trackName) {
    // 获取按根对象分组的绑定映射和绑定数组
    const bindingsByRoot = this._bindingsByRootAndName,
      bindings = this._bindings;

    // 获取该根对象的绑定映射
    let bindingByName = bindingsByRoot[rootUuid];

    if (bindingByName === undefined) {
      // 如果该根对象还没有绑定映射，创建新的映射
      bindingByName = {};
      bindingsByRoot[rootUuid] = bindingByName;
    }

    // 在名称映射中记录该绑定
    bindingByName[trackName] = binding;

    // 设置绑定在全局绑定数组中的缓存索引
    binding._cacheIndex = bindings.length;
    // 将绑定添加到全局绑定数组的末尾
    bindings.push(binding);
  }

  /**
   * 从非活跃绑定列表中移除绑定。
   * 使用交换技术保持数组的紧凑性，同时清理所有相关的映射关系。
   *
   * @param {PropertyMixer} binding - 要移除的属性绑定
   */
  _removeInactiveBinding(binding) {
    // 获取相关的数据结构和索引信息
    const bindings = this._bindings,
      propBinding = binding.binding,
      rootUuid = propBinding.rootNode.uuid,
      trackName = propBinding.path,
      bindingsByRoot = this._bindingsByRootAndName,
      bindingByName = bindingsByRoot[rootUuid],
      lastInactiveBinding = bindings[bindings.length - 1],
      cacheIndex = binding._cacheIndex;

    // 将最后一个非活跃绑定移动到要移除绑定的位置
    lastInactiveBinding._cacheIndex = cacheIndex;
    bindings[cacheIndex] = lastInactiveBinding;
    // 移除数组末尾的元素
    bindings.pop();

    // 从名称映射中删除该绑定
    delete bindingByName[trackName];

    // 如果该根对象没有更多的绑定，则删除整个根对象映射
    if (Object.keys(bindingByName).length === 0) {
      delete bindingsByRoot[rootUuid];
    }
  }

  /**
   * 将绑定从非活跃状态转为活跃状态。
   * 使用交换技术将绑定移动到活跃区域，保持数组的紧凑性。
   *
   * @param {PropertyMixer} binding - 要激活的属性绑定
   */
  _lendBinding(binding) {
    // 获取绑定数组和相关索引
    const bindings = this._bindings,
      prevIndex = binding._cacheIndex, // 绑定当前的索引位置
      lastActiveIndex = this._nActiveBindings++, // 最后一个活跃位置（递增活跃计数）
      firstInactiveBinding = bindings[lastActiveIndex]; // 第一个非活跃绑定

    // 将要激活的绑定移动到活跃区域的末尾
    binding._cacheIndex = lastActiveIndex;
    bindings[lastActiveIndex] = binding;

    // 将原来的第一个非活跃绑定移动到原位置
    firstInactiveBinding._cacheIndex = prevIndex;
    bindings[prevIndex] = firstInactiveBinding;
  }

  /**
   * 将绑定从活跃状态转为非活跃状态。
   * 使用交换技术将绑定移动到非活跃区域，保持数组的紧凑性。
   *
   * @param {PropertyMixer} binding - 要停用的属性绑定
   */
  _takeBackBinding(binding) {
    // 获取绑定数组和相关索引
    const bindings = this._bindings,
      prevIndex = binding._cacheIndex, // 绑定当前的索引位置
      firstInactiveIndex = --this._nActiveBindings, // 第一个非活跃位置（递减活跃计数）
      lastActiveBinding = bindings[firstInactiveIndex]; // 最后一个活跃绑定

    // 将要停用的绑定移动到非活跃区域的开始
    binding._cacheIndex = firstInactiveIndex;
    bindings[firstInactiveIndex] = binding;

    // 将原来的最后一个活跃绑定移动到原位置
    lastActiveBinding._cacheIndex = prevIndex;
    bindings[prevIndex] = lastActiveBinding;
  }

  // 用于权重和时间缩放的插值器内存管理

  /**
   * 借出一个控制插值器用于权重和时间缩放。
   * 如果没有可用的插值器，则创建一个新的线性插值器。
   *
   * @return {LinearInterpolant} 可用的控制插值器
   */
  _lendControlInterpolant() {
    // 获取控制插值器数组和下一个活跃索引
    const interpolants = this._controlInterpolants,
      lastActiveIndex = this._nActiveControlInterpolants++;

    // 尝试获取已存在的插值器
    let interpolant = interpolants[lastActiveIndex];

    if (interpolant === undefined) {
      // 如果没有可用的插值器，创建一个新的线性插值器
      // 参数：输入数组(2个元素)，输出数组(2个元素)，步长为1，共享结果缓冲区
      interpolant = new LinearInterpolant(new Float32Array(2), new Float32Array(2), 1, _controlInterpolantsResultBuffer);

      // 设置插值器的缓存索引
      interpolant.__cacheIndex = lastActiveIndex;
      // 将插值器存储到数组中
      interpolants[lastActiveIndex] = interpolant;
    }

    // 返回可用的插值器
    return interpolant;
  }

  /**
   * 归还控制插值器，将其从活跃状态转为非活跃状态。
   * 使用交换技术将插值器移动到非活跃区域，保持数组的紧凑性。
   *
   * @param {LinearInterpolant} interpolant - 要归还的控制插值器
   */
  _takeBackControlInterpolant(interpolant) {
    // 获取插值器数组和相关索引
    const interpolants = this._controlInterpolants,
      prevIndex = interpolant.__cacheIndex, // 插值器当前的索引位置
      firstInactiveIndex = --this._nActiveControlInterpolants, // 第一个非活跃位置（递减活跃计数）
      lastActiveInterpolant = interpolants[firstInactiveIndex]; // 最后一个活跃插值器

    // 将要归还的插值器移动到非活跃区域的开始
    interpolant.__cacheIndex = firstInactiveIndex;
    interpolants[firstInactiveIndex] = interpolant;

    // 将原来的最后一个活跃插值器移动到原位置
    lastActiveInterpolant.__cacheIndex = prevIndex;
    interpolants[prevIndex] = lastActiveInterpolant;
  }

  /**
   * 为传入的剪辑返回一个 {@link AnimationAction} 实例。
   *
   * 如果符合剪辑和根对象参数的动作尚不存在，此方法将创建它。
   * 使用相同的剪辑和根对象参数多次调用此方法总是返回相同的动作。
   * 这是获取动画动作的主要方法，支持动作的复用和缓存。
   *
   * @param {AnimationClip|string} clip - 动画剪辑对象或动画剪辑的名称
   * @param {Object3D} [optionalRoot] - 可选的替代根对象
   * @param {(NormalAnimationBlendMode|AdditiveAnimationBlendMode)} [blendMode] - 混合模式
   * @return {?AnimationAction} 动画动作实例，如果剪辑无效则返回null
   */
  clipAction(clip, optionalRoot, blendMode) {
    // 确定根对象，优先使用可选根对象，否则使用混合器的根对象
    const root = optionalRoot || this._root,
      rootUuid = root.uuid;

    // 如果clip是字符串，则通过名称查找剪辑对象；否则直接使用传入的剪辑
    let clipObject = typeof clip === "string" ? AnimationClip.findByName(root, clip) : clip;

    // 获取剪辑的UUID，如果剪辑对象存在则使用其UUID，否则使用传入的clip值
    const clipUuid = clipObject !== null ? clipObject.uuid : clip;

    // 获取该剪辑对应的所有动作
    const actionsForClip = this._actionsByClip[clipUuid];
    let prototypeAction = null;

    // 如果没有指定混合模式，则使用默认值
    if (blendMode === undefined) {
      if (clipObject !== null) {
        // 如果剪辑对象存在，使用剪辑的混合模式
        blendMode = clipObject.blendMode;
      } else {
        // 否则使用正常混合模式
        blendMode = NormalAnimationBlendMode;
      }
    }

    // 检查是否已存在符合条件的动作
    if (actionsForClip !== undefined) {
      const existingAction = actionsForClip.actionByRoot[rootUuid];

      // 如果找到了现有动作且混合模式匹配，直接返回
      if (existingAction !== undefined && existingAction.blendMode === blendMode) {
        return existingAction;
      }

      // 我们知道这个剪辑，所以不需要重新解析所有绑定，可以直接复制
      prototypeAction = actionsForClip.knownActions[0];

      // 同时，从原型动作中获取剪辑对象
      if (clipObject === null) clipObject = prototypeAction._clip;
    }

    // 通过字符串指定时，剪辑必须是已知的
    if (clipObject === null) return null;

    // 分配运行所需的所有资源
    const newAction = new AnimationAction(this, clipObject, optionalRoot, blendMode);

    // 绑定新动作
    this._bindAction(newAction, prototypeAction);

    // 让内存管理器知道这个动作
    this._addInactiveAction(newAction, clipUuid, rootUuid);

    // 返回新创建的动作
    return newAction;
  }

  /**
   * 返回传入剪辑的现有动画动作。
   * 与clipAction不同，此方法不会创建新动作，只查找已存在的动作。
   *
   * @param {AnimationClip|string} clip - 动画剪辑对象或动画剪辑的名称
   * @param {Object3D} [optionalRoot] - 可选的替代根对象
   * @return {?AnimationAction} 动画动作实例，如果未找到动作则返回null
   */
  existingAction(clip, optionalRoot) {
    // 确定根对象和相关标识符
    const root = optionalRoot || this._root,
      rootUuid = root.uuid,
      // 如果clip是字符串，通过名称查找剪辑对象
      clipObject = typeof clip === "string" ? AnimationClip.findByName(root, clip) : clip,
      // 获取剪辑UUID
      clipUuid = clipObject ? clipObject.uuid : clip,
      // 获取该剪辑的所有动作
      actionsForClip = this._actionsByClip[clipUuid];

    // 如果找到了该剪辑的动作组，返回对应根对象的动作
    if (actionsForClip !== undefined) {
      return actionsForClip.actionByRoot[rootUuid] || null;
    }

    // 如果没有找到，返回null
    return null;
  }

  /**
   * 停用此混合器上所有先前安排的动作。
   * 这会停止所有当前正在播放的动画。
   *
   * @return {AnimationMixer} 返回此动画混合器的引用，支持链式调用
   */
  stopAllAction() {
    // 获取动作数组和活跃动作数量
    const actions = this._actions,
      nActions = this._nActiveActions;

    // 从后往前遍历活跃动作并停止它们
    // 从后往前遍历是为了避免在停止过程中索引发生变化的问题
    for (let i = nActions - 1; i >= 0; --i) {
      actions[i].stop();
    }

    // 返回this以支持链式调用
    return this;
  }

  /**
   * 推进全局混合器时间并更新动画。
   *
   * 这通常在渲染循环中通过传递来自 {@link Clock} 或 {@link Timer} 的
   * 增量时间来完成。这是动画系统的核心更新方法。
   *
   * @param {number} deltaTime - 增量时间（以秒为单位）
   * @return {AnimationMixer} 返回此动画混合器的引用，支持链式调用
   */
  update(deltaTime) {
    // 应用时间缩放因子
    deltaTime *= this.timeScale;

    // 获取动作数组、活跃动作数量和更新后的时间
    const actions = this._actions,
      nActions = this._nActiveActions,
      // 更新全局时间
      time = (this.time += deltaTime),
      // 计算时间方向（正向或反向播放）
      timeDirection = Math.sign(deltaTime),
      // 切换累积索引，用于双缓冲技术（在0和1之间切换）
      accuIndex = (this._accuIndex ^= 1);

    // 运行活跃动作

    // 遍历所有活跃动作并更新它们
    for (let i = 0; i !== nActions; ++i) {
      const action = actions[i];

      // 更新动作：传递当前时间、增量时间、时间方向和累积索引
      action._update(time, deltaTime, timeDirection, accuIndex);
    }

    // 更新场景图

    // 获取绑定数组和活跃绑定数量
    const bindings = this._bindings,
      nBindings = this._nActiveBindings;

    // 遍历所有活跃绑定并应用它们的值到场景图
    for (let i = 0; i !== nBindings; ++i) {
      bindings[i].apply(accuIndex);
    }

    // 返回this以支持链式调用
    return this;
  }

  /**
   * 将全局混合器设置为特定时间并相应地更新动画。
   *
   * 当您需要跳转到动画中的确切时间时，这很有用。
   * 输入参数将被 {@link AnimationMixer#timeScale} 缩放。
   * 这对于实现动画的随机访问或同步多个动画很有用。
   *
   * @param {number} time - 要设置的时间（以秒为单位）
   * @return {AnimationMixer} 返回此动画混合器的引用，支持链式调用
   */
  setTime(time) {
    // 将AnimationMixer对象的时间属性归零
    this.time = 0;
    // 将所有关联的AnimationAction对象的时间属性归零
    for (let i = 0; i < this._actions.length; i++) {
      this._actions[i].time = 0;
    }

    // 使用update方法设置确切时间，返回此AnimationMixer对象
    return this.update(time);
  }

  /**
   * 返回此混合器的根对象。
   * 根对象是所有动画将应用到的基础对象。
   *
   * @return {Object3D} 混合器的根对象
   */
  getRoot() {
    return this._root;
  }

  /**
   * 释放剪辑的所有内存资源。
   * 在使用此方法之前，请确保为所有相关动作调用 {@link AnimationAction#stop}。
   * 这会完全清除与指定剪辑相关的所有缓存数据。
   *
   * @param {AnimationClip} clip - 要取消缓存的剪辑
   */
  uncacheClip(clip) {
    // 获取相关的数据结构
    const actions = this._actions,
      clipUuid = clip.uuid,
      actionsByClip = this._actionsByClip,
      actionsForClip = actionsByClip[clipUuid];

    // 如果找到了该剪辑的动作组
    if (actionsForClip !== undefined) {
      // 注意：直接调用_removeInactiveAction会搞乱迭代状态，
      // 并且还需要更新我们可以直接丢弃的状态

      // 获取要移除的所有动作
      const actionsToRemove = actionsForClip.knownActions;

      // 遍历并移除所有相关动作
      for (let i = 0, n = actionsToRemove.length; i !== n; ++i) {
        const action = actionsToRemove[i];

        // 停用动作
        this._deactivateAction(action);

        // 手动处理动作的移除，避免使用_removeInactiveAction
        const cacheIndex = action._cacheIndex,
          lastInactiveAction = actions[actions.length - 1];

        // 清除动作的缓存索引
        action._cacheIndex = null;
        action._byClipCacheIndex = null;

        // 将最后一个非活跃动作移动到当前位置
        lastInactiveAction._cacheIndex = cacheIndex;
        actions[cacheIndex] = lastInactiveAction;
        actions.pop();

        // 移除动作相关的非活跃绑定
        this._removeInactiveBindingsForAction(action);
      }

      // 删除整个剪辑映射
      delete actionsByClip[clipUuid];
    }
  }

  /**
   * 释放根对象的所有内存资源。
   * 在使用此方法之前，请确保为所有相关动作调用 {@link AnimationAction#stop}，
   * 或者当混合器在单个根对象上操作时，可以调用 {@link AnimationMixer#stopAllAction}。
   *
   * @param {Object3D} root - 要取消缓存的根对象
   */
  uncacheRoot(root) {
    // 获取根对象的UUID和动作映射
    const rootUuid = root.uuid,
      actionsByClip = this._actionsByClip;

    // 遍历所有剪辑，查找与该根对象相关的动作
    for (const clipUuid in actionsByClip) {
      const actionByRoot = actionsByClip[clipUuid].actionByRoot,
        action = actionByRoot[rootUuid];

      // 如果找到了相关动作，停用并移除它
      if (action !== undefined) {
        this._deactivateAction(action);
        this._removeInactiveAction(action);
      }
    }

    // 处理与该根对象相关的绑定
    const bindingsByRoot = this._bindingsByRootAndName,
      bindingByName = bindingsByRoot[rootUuid];

    // 如果找到了相关绑定，恢复原始状态并移除
    if (bindingByName !== undefined) {
      for (const trackName in bindingByName) {
        const binding = bindingByName[trackName];
        // 恢复属性的原始状态
        binding.restoreOriginalState();
        // 移除绑定
        this._removeInactiveBinding(binding);
      }
    }
  }

  /**
   * 释放动作的所有内存资源。
   * 动作通过给定的剪辑和可选的根对象来标识。
   * 在使用此方法之前，请确保调用 {@link AnimationAction#stop} 来停用动作。
   *
   * @param {AnimationClip|string} clip - 动画剪辑对象或动画剪辑的名称
   * @param {Object3D} [optionalRoot] - 可选的替代根对象
   */
  uncacheAction(clip, optionalRoot) {
    // 查找现有动作
    const action = this.existingAction(clip, optionalRoot);

    // 如果找到了动作，停用并移除它
    if (action !== null) {
      this._deactivateAction(action);
      this._removeInactiveAction(action);
    }
  }
}

// 导出AnimationMixer类，使其可以被其他模块导入和使用
export { AnimationMixer };
