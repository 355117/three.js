// 导入属性绑定类，用于处理对象属性的动画绑定
import { PropertyBinding } from "./PropertyBinding.js";
// 导入UUID生成工具，用于为对象生成唯一标识符
import { generateUUID } from "../math/MathUtils.js";

/**
 * 动画对象组 - 接收共享动画状态的对象组
 *
 * 使用方法：
 *
 * - 添加您原本会作为 'root' 传递给 AnimationMixer 构造函数或 .clipAction 方法的对象
 * - 将此对象作为 'root' 传递
 * - 您也可以在混合器运行时添加和移除对象
 *
 * 注意：
 *
 * - 此类的对象在混合器中表现为一个对象，
 * 因此必须在组上进行各个对象的缓存控制
 *
 * 限制：
 *
 * - 组中所有对象的动画属性必须兼容
 * - 单个属性只能通过目标组或直接控制，不能同时使用两种方式
 */
class AnimationObjectGroup {
  /**
   * 构造一个新的动画组
   *
   * @param {...Object3D} arguments - 共享相同动画状态的任意数量的3D对象
   */
  constructor() {
    /**
     * 此标志可用于类型测试
     *
     * @type {boolean}
     * @readonly
     * @default true
     */
    this.isAnimationObjectGroup = true;

    /**
     * 3D对象的UUID（唯一标识符）
     *
     * @type {string}
     * @readonly
     */
    this.uuid = generateUUID();

    // 缓存的对象后跟活动的对象
    this._objects = Array.prototype.slice.call(arguments);

    // 缓存对象数量的阈值
    this.nCachedObjects_ = 0;
    // 注意：由 PropertyBinding.Composite 读取

    // 创建索引对象用于存储UUID到索引的映射
    const indices = {};
    this._indicesByUUID = indices; // 用于记录管理

    // 遍历构造函数参数，为每个对象建立UUID到索引的映射
    for (let i = 0, n = arguments.length; i !== n; ++i) {
      indices[arguments[i].uuid] = i;
    }

    // 存储属性路径的数组（内容：字符串）
    this._paths = [];
    // 存储解析后的路径的数组（内容：解析对象）
    this._parsedPaths = [];
    // 存储属性绑定的数组（内容：PropertyBinding数组）
    this._bindings = [];
    // 存储路径到绑定索引的映射（内容：这些数组中的索引）
    this._bindingsIndicesByPath = {};

    // 保存当前作用域的引用，用于在getter中访问
    const scope = this;

    // 统计信息对象，提供关于对象和绑定的实时统计
    this.stats = {
      // 对象统计
      objects: {
        // 获取总对象数量
        get total() {
          return scope._objects.length;
        },
        // 获取正在使用的对象数量（总数减去缓存数量）
        get inUse() {
          return this.total - scope.nCachedObjects_;
        },
      },
      // 获取每个对象的绑定数量
      get bindingsPerObject() {
        return scope._bindings.length;
      },
    };
  }

  /**
   * 向此动画组添加任意数量的对象
   *
   * @param {...Object3D} arguments - 要添加的3D对象
   */
  add() {
    // 获取对象数组和相关的索引映射
    const objects = this._objects,
      indicesByUUID = this._indicesByUUID,
      paths = this._paths,
      parsedPaths = this._parsedPaths,
      bindings = this._bindings,
      nBindings = bindings.length;

    // 初始化变量
    let knownObject = undefined, // 已知对象的引用
      nObjects = objects.length, // 当前对象总数
      nCachedObjects = this.nCachedObjects_; // 缓存对象数量

    // 遍历所有要添加的对象
    for (let i = 0, n = arguments.length; i !== n; ++i) {
      // 获取当前要添加的对象和其UUID
      const object = arguments[i],
        uuid = object.uuid;
      let index = indicesByUUID[uuid]; // 查找对象在数组中的索引

      if (index === undefined) {
        // 未知对象 -> 将其添加到活动区域

        // 为新对象分配索引并更新映射
        index = nObjects++;
        indicesByUUID[uuid] = index;
        objects.push(object);

        // 记录完成，现在为所有绑定做同样的操作

        // 为新对象创建属性绑定并添加到对应的绑定数组中
        for (let j = 0, m = nBindings; j !== m; ++j) {
          bindings[j].push(new PropertyBinding(object, paths[j], parsedPaths[j]));
        }
      } else if (index < nCachedObjects) {
        // 对象在缓存区域，需要移动到活动区域
        knownObject = objects[index];

        // 将现有对象移动到活动区域

        // 减少缓存对象计数，获取第一个活动索引
        const firstActiveIndex = --nCachedObjects,
          lastCachedObject = objects[firstActiveIndex]; // 获取最后一个缓存对象

        // 交换对象位置：将最后一个缓存对象移到当前位置
        indicesByUUID[lastCachedObject.uuid] = index;
        objects[index] = lastCachedObject;

        // 将当前对象移到第一个活动位置
        indicesByUUID[uuid] = firstActiveIndex;
        objects[firstActiveIndex] = object;

        // 记录完成，现在为所有绑定做同样的操作

        // 处理属性绑定的重新排列
        for (let j = 0, m = nBindings; j !== m; ++j) {
          const bindingsForPath = bindings[j], // 获取当前路径的绑定数组
            lastCached = bindingsForPath[firstActiveIndex]; // 获取最后一个缓存的绑定

          let binding = bindingsForPath[index]; // 获取当前索引的绑定

          // 交换绑定位置
          bindingsForPath[index] = lastCached;

          if (binding === undefined) {
            // 由于我们不为缓存的对象创建新绑定，
            // 绑定可能存在也可能不存在

            // 为对象创建新的属性绑定
            binding = new PropertyBinding(object, paths[j], parsedPaths[j]);
          }

          // 将绑定放到第一个活动位置
          bindingsForPath[firstActiveIndex] = binding;
        }
      } else if (objects[index] !== knownObject) {
        // 检测到具有相同UUID的不同对象，这是一个错误情况
        console.error("THREE.AnimationObjectGroup: Different objects with the same UUID " + "detected. Clean the caches or recreate your infrastructure when reloading scenes.");
      } // else 对象已经在我们想要的位置
    } // for arguments 循环结束

    // 更新缓存对象计数
    this.nCachedObjects_ = nCachedObjects;
  }

  /**
   * 从此动画组中移除任意数量的对象
   *
   * @param {...Object3D} arguments - 要移除的3D对象
   */
  remove() {
    // 获取对象数组和相关的索引映射
    const objects = this._objects,
      indicesByUUID = this._indicesByUUID,
      bindings = this._bindings,
      nBindings = bindings.length;

    // 获取当前缓存对象数量
    let nCachedObjects = this.nCachedObjects_;

    // 遍历所有要移除的对象
    for (let i = 0, n = arguments.length; i !== n; ++i) {
      // 获取当前要移除的对象、其UUID和索引
      const object = arguments[i],
        uuid = object.uuid,
        index = indicesByUUID[uuid];

      // 只有当对象存在且在活动区域时才进行移除操作
      if (index !== undefined && index >= nCachedObjects) {
        // 将现有对象移动到缓存区域

        // 获取最后一个缓存索引（即将成为新的缓存位置）
        const lastCachedIndex = nCachedObjects++,
          firstActiveObject = objects[lastCachedIndex]; // 获取第一个活动对象

        // 交换对象位置：将第一个活动对象移到当前位置
        indicesByUUID[firstActiveObject.uuid] = index;
        objects[index] = firstActiveObject;

        // 将要移除的对象移到缓存区域的末尾
        indicesByUUID[uuid] = lastCachedIndex;
        objects[lastCachedIndex] = object;

        // 记录完成，现在为所有绑定做同样的操作

        // 处理属性绑定的重新排列
        for (let j = 0, m = nBindings; j !== m; ++j) {
          const bindingsForPath = bindings[j], // 获取当前路径的绑定数组
            firstActive = bindingsForPath[lastCachedIndex], // 获取第一个活动绑定
            binding = bindingsForPath[index]; // 获取当前索引的绑定

          // 交换绑定位置
          bindingsForPath[index] = firstActive;
          bindingsForPath[lastCachedIndex] = binding;
        }
      }
    } // for arguments 循环结束

    // 更新缓存对象计数
    this.nCachedObjects_ = nCachedObjects;
  }

  /**
   * 为此动画组的指定3D对象释放所有内存资源
   *
   * @param {...Object3D} arguments - 要取消缓存的3D对象
   */
  uncache() {
    // 获取对象数组和相关的索引映射
    const objects = this._objects,
      indicesByUUID = this._indicesByUUID,
      bindings = this._bindings,
      nBindings = bindings.length;

    // 初始化缓存对象数量和总对象数量
    let nCachedObjects = this.nCachedObjects_,
      nObjects = objects.length;

    // 遍历所有要取消缓存的对象
    for (let i = 0, n = arguments.length; i !== n; ++i) {
      // 获取当前要取消缓存的对象、其UUID和索引
      const object = arguments[i],
        uuid = object.uuid,
        index = indicesByUUID[uuid];

      // 只有当对象存在时才进行取消缓存操作
      if (index !== undefined) {
        // 从UUID映射中删除对象
        delete indicesByUUID[uuid];

        if (index < nCachedObjects) {
          // 对象在缓存区域，收缩缓存区域

          // 减少缓存对象计数，获取第一个活动索引
          const firstActiveIndex = --nCachedObjects,
            lastCachedObject = objects[firstActiveIndex], // 获取最后一个缓存对象
            lastIndex = --nObjects, // 减少总对象数，获取最后一个对象索引
            lastObject = objects[lastIndex]; // 获取最后一个对象

          // 最后一个缓存对象占据当前对象的位置
          indicesByUUID[lastCachedObject.uuid] = index;
          objects[index] = lastCachedObject;

          // 最后一个对象移到激活槽位并弹出
          indicesByUUID[lastObject.uuid] = firstActiveIndex;
          objects[firstActiveIndex] = lastObject;
          objects.pop(); // 移除数组末尾的对象

          // 记录完成，现在为所有绑定做同样的操作

          // 处理属性绑定的重新排列
          for (let j = 0, m = nBindings; j !== m; ++j) {
            const bindingsForPath = bindings[j], // 获取当前路径的绑定数组
              lastCached = bindingsForPath[firstActiveIndex], // 获取最后一个缓存的绑定
              last = bindingsForPath[lastIndex]; // 获取最后一个绑定

            // 重新排列绑定
            bindingsForPath[index] = lastCached;
            bindingsForPath[firstActiveIndex] = last;
            bindingsForPath.pop(); // 移除绑定数组末尾的元素
          }
        } else {
          // 对象在活动区域，只需与最后一个交换并弹出

          // 减少总对象数，获取最后一个对象
          const lastIndex = --nObjects,
            lastObject = objects[lastIndex];

          // 如果不是最后一个对象，更新UUID映射
          if (lastIndex > 0) {
            indicesByUUID[lastObject.uuid] = index;
          }

          // 将最后一个对象移到当前位置
          objects[index] = lastObject;
          objects.pop(); // 移除数组末尾的对象

          // 记录完成，现在为所有绑定做同样的操作

          // 处理属性绑定的重新排列
          for (let j = 0, m = nBindings; j !== m; ++j) {
            const bindingsForPath = bindings[j]; // 获取当前路径的绑定数组

            // 将最后一个绑定移到当前位置
            bindingsForPath[index] = bindingsForPath[lastIndex];
            bindingsForPath.pop(); // 移除绑定数组末尾的元素
          }
        } // cached or active 分支结束
      } // if object is known 条件结束
    } // for arguments 循环结束

    // 更新缓存对象计数
    this.nCachedObjects_ = nCachedObjects;
  }

  // 由友元类 PropertyBinding.Composite 使用的内部接口：

  /**
   * 订阅指定路径的属性绑定
   *
   * @param {string} path - 属性路径
   * @param {Object} parsedPath - 解析后的路径对象
   * @returns {Array} 返回给定路径的绑定数组，该数组根据组中包含的对象进行更改
   */
  subscribe_(path, parsedPath) {
    // 返回给定路径的绑定数组，该数组根据组中包含的对象进行更改

    // 获取路径到绑定索引的映射
    const indicesByPath = this._bindingsIndicesByPath;
    let index = indicesByPath[path]; // 查找路径对应的索引
    const bindings = this._bindings; // 获取绑定数组

    // 如果路径已存在，直接返回对应的绑定数组
    if (index !== undefined) return bindings[index];

    // 获取相关数组和变量
    const paths = this._paths,
      parsedPaths = this._parsedPaths,
      objects = this._objects,
      nObjects = objects.length,
      nCachedObjects = this.nCachedObjects_,
      bindingsForPath = new Array(nObjects); // 为新路径创建绑定数组

    // 为新路径分配索引
    index = bindings.length;

    // 建立路径到索引的映射
    indicesByPath[path] = index;

    // 将新路径和相关信息添加到对应数组中
    paths.push(path);
    parsedPaths.push(parsedPath);
    bindings.push(bindingsForPath);

    // 为所有活动对象（非缓存对象）创建属性绑定
    for (let i = nCachedObjects, n = objects.length; i !== n; ++i) {
      const object = objects[i]; // 获取当前对象
      // 为当前对象创建属性绑定并存储在对应位置
      bindingsForPath[i] = new PropertyBinding(object, path, parsedPath);
    }

    // 返回新创建的绑定数组
    return bindingsForPath;
  }

  /**
   * 取消订阅指定路径的属性绑定
   *
   * @param {string} path - 要取消订阅的属性路径
   */
  unsubscribe_(path) {
    // 告诉组忘记某个属性路径，不再更新之前通过 'subscribe_' 获得的数组

    // 获取路径到绑定索引的映射和对应索引
    const indicesByPath = this._bindingsIndicesByPath,
      index = indicesByPath[path];

    // 只有当路径存在时才进行取消订阅操作
    if (index !== undefined) {
      // 获取相关数组
      const paths = this._paths,
        parsedPaths = this._parsedPaths,
        bindings = this._bindings,
        lastBindingsIndex = bindings.length - 1, // 最后一个绑定的索引
        lastBindings = bindings[lastBindingsIndex], // 最后一个绑定数组
        lastBindingsPath = paths[lastBindingsIndex]; // 最后一个绑定的路径

      // 将最后一个绑定的路径映射到当前索引
      indicesByPath[lastBindingsPath] = index;

      // 用最后一个绑定替换当前绑定，然后移除最后一个
      bindings[index] = lastBindings;
      bindings.pop();

      // 对解析路径数组做同样的操作
      parsedPaths[index] = parsedPaths[lastBindingsIndex];
      parsedPaths.pop();

      // 对路径数组做同样的操作
      paths[index] = paths[lastBindingsIndex];
      paths.pop();
    }
  }
}

// 导出 AnimationObjectGroup 类
export { AnimationObjectGroup };
