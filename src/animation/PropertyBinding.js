// 字符 [].:/ 是轨道绑定语法的保留字符
const _RESERVED_CHARS_RE = "\\[\\]\\.:\\/";
// 创建用于匹配保留字符的正则表达式
const _reservedRe = new RegExp("[" + _RESERVED_CHARS_RE + "]", "g");

// 尝试允许来自任何语言的节点名称。ES5的 `\w` 正则表达式只匹配
// 拉丁字符，而 unicode \p{L} 尚未得到支持。因此，
// 我们排除保留字符并匹配其他所有字符。
const _wordChar = "[^" + _RESERVED_CHARS_RE + "]";
// 允许包含点号的单词字符（排除其他保留字符）
const _wordCharOrDot = "[^" + _RESERVED_CHARS_RE.replace("\\.", "") + "]";

// 父目录，由 '/' 或 ':' 分隔。目前未使用，但必须
// 匹配以解析轨道名称的其余部分。
const _directoryRe = /*@__PURE__*/ /((?:WC+[\/:])*)/.source.replace("WC", _wordChar);

// 目标节点。可能包含单词字符 (a-zA-Z0-9_) 和 '.' 或 '-'。
const _nodeRe = /*@__PURE__*/ /(WCOD+)?/.source.replace("WCOD", _wordCharOrDot);

// 目标节点上的对象和访问器。不能包含保留
// 字符。访问器可以包含除右方括号之外的任何字符。
const _objectRe = /*@__PURE__*/ /(?:\.(WC+)(?:\[(.+)\])?)?/.source.replace("WC", _wordChar);

// 属性和访问器。不能包含保留字符。访问器可以
// 包含任何非方括号字符。
const _propertyRe = /*@__PURE__*/ /\.(WC+)(?:\[(.+)\])?/.source.replace("WC", _wordChar);

// 组合完整的轨道名称正则表达式
const _trackRe = new RegExp(
  "" +
    "^" + // 字符串开始
    _directoryRe + // 目录部分
    _nodeRe + // 节点部分
    _objectRe + // 对象部分
    _propertyRe + // 属性部分
    "$" // 字符串结束
);

// 支持的对象名称列表
const _supportedObjectNames = ["material", "materials", "bones", "map"];

/**
 * 复合属性绑定类
 * 用于处理动画对象组中多个对象的属性绑定
 */
class Composite {
  /**
   * 构造函数
   * @param {Object} targetGroup - 目标对象组
   * @param {string} path - 属性路径
   * @param {Object} optionalParsedPath - 可选的已解析路径对象
   */
  constructor(targetGroup, path, optionalParsedPath) {
    // 解析路径，如果没有提供已解析的路径则进行解析
    const parsedPath = optionalParsedPath || PropertyBinding.parseTrackName(path);

    // 保存目标对象组的引用
    this._targetGroup = targetGroup;
    // 订阅路径并获取绑定数组
    this._bindings = targetGroup.subscribe_(path, parsedPath);
  }

  /**
   * 获取属性值
   * @param {Array} array - 用于存储值的数组
   * @param {number} offset - 数组中的偏移量
   */
  getValue(array, offset) {
    this.bind(); // 绑定所有绑定

    // 获取第一个有效索引和对应的绑定
    const firstValidIndex = this._targetGroup.nCachedObjects_,
      binding = this._bindings[firstValidIndex];

    // 只在第一个绑定上调用 .getValue
    if (binding !== undefined) binding.getValue(array, offset);
  }

  /**
   * 设置属性值
   * @param {Array} array - 包含新值的数组
   * @param {number} offset - 数组中的偏移量
   */
  setValue(array, offset) {
    // 获取绑定数组
    const bindings = this._bindings;

    // 遍历所有有效的绑定并设置值
    for (let i = this._targetGroup.nCachedObjects_, n = bindings.length; i !== n; ++i) {
      bindings[i].setValue(array, offset);
    }
  }

  /**
   * 绑定所有属性绑定
   */
  bind() {
    // 获取绑定数组
    const bindings = this._bindings;

    // 遍历所有有效的绑定并执行绑定
    for (let i = this._targetGroup.nCachedObjects_, n = bindings.length; i !== n; ++i) {
      bindings[i].bind();
    }
  }

  /**
   * 解绑所有属性绑定
   */
  unbind() {
    // 获取绑定数组
    const bindings = this._bindings;

    // 遍历所有有效的绑定并执行解绑
    for (let i = this._targetGroup.nCachedObjects_, n = bindings.length; i !== n; ++i) {
      bindings[i].unbind();
    }
  }
}

// 注意：此类在每个方法的基础上使用状态模式：
// 'bind' 设置 'this.getValue' / 'setValue' 并遮蔽
// 这些方法的原型版本，用一个表示
// 绑定状态的版本。当找不到属性时，这些方法
// 变成无操作。

/**
 * 属性绑定类
 * 保存对场景图中真实属性的引用；内部使用。
 */
class PropertyBinding {
  /**
   * 构造一个新的属性绑定
   *
   * @param {Object} rootNode - 根节点
   * @param {string} path - 路径
   * @param {?Object} [parsedPath] - 已解析的路径
   */
  constructor(rootNode, path, parsedPath) {
    /**
     * 动画属性的对象路径
     *
     * @type {string}
     */
    this.path = path;

    /**
     * 包含路径信息的对象
     *
     * @type {Object}
     */
    this.parsedPath = parsedPath || PropertyBinding.parseTrackName(path);

    /**
     * 拥有动画属性的对象
     *
     * @type {?Object}
     */
    this.node = PropertyBinding.findNode(rootNode, this.parsedPath.nodeName);

    /**
     * 根节点
     *
     * @type {Object3D|Skeleton}
     */
    this.rootNode = rootNode;

    // 这些方法的初始状态，调用 'bind'
    this.getValue = this._getValue_unbound;
    this.setValue = this._setValue_unbound;
  }

  /**
   * 从给定参数创建属性绑定的工厂方法
   *
   * @static
   * @param {Object} root - 根节点
   * @param {string} path - 路径
   * @param {?Object} [parsedPath] - 已解析的路径
   * @return {PropertyBinding|Composite} 创建的属性绑定或复合绑定
   */
  static create(root, path, parsedPath) {
    // 如果不是动画对象组，创建普通的属性绑定
    if (!(root && root.isAnimationObjectGroup)) {
      return new PropertyBinding(root, path, parsedPath);
    } else {
      // 否则创建复合属性绑定
      return new PropertyBinding.Composite(root, path, parsedPath);
    }
  }

  /**
   * 将空格替换为下划线并从节点名称中删除不支持的字符，
   * 以确保与 parseTrackName() 的兼容性
   *
   * @param {string} name - 要清理的节点名称
   * @return {string} 清理后的节点名称
   */
  static sanitizeNodeName(name) {
    // 将空格替换为下划线，并移除保留字符
    return name.replace(/\s/g, "_").replace(_reservedRe, "");
  }

  /**
   * 解析给定的轨道名称（动画属性的对象路径）并
   * 返回包含路径信息的对象。匹配以下形式的字符串：
   *
   * - nodeName.property
   * - nodeName.property[accessor]
   * - nodeName.material.property[accessor]
   * - uuid.property[accessor]
   * - uuid.objectName[objectIndex].propertyName[propertyIndex]
   * - parentName/nodeName.property
   * - parentName/parentName/nodeName.property[index]
   * - .bone[Armature.DEF_cog].position
   * - scene:helium_balloon_model:helium_balloon_model.position
   *
   * @static
   * @param {string} trackName - 要解析的轨道名称
   * @return {Object} 解析后的轨道名称对象
   */
  static parseTrackName(trackName) {
    // 使用正则表达式匹配轨道名称
    const matches = _trackRe.exec(trackName);

    // 如果匹配失败，抛出错误
    if (matches === null) {
      throw new Error("PropertyBinding: Cannot parse trackName: " + trackName);
    }

    // 构建结果对象
    const results = {
      // directoryName: matches[ 1 ], // (tschw) 目前未使用
      nodeName: matches[2], // 节点名称
      objectName: matches[3], // 对象名称
      objectIndex: matches[4], // 对象索引
      propertyName: matches[5], // 属性名称（必需）
      propertyIndex: matches[6], // 属性索引
    };

    // 查找节点名称中最后一个点的位置
    const lastDot = results.nodeName && results.nodeName.lastIndexOf(".");

    // 如果找到点，尝试分离对象名称
    if (lastDot !== undefined && lastDot !== -1) {
      const objectName = results.nodeName.substring(lastDot + 1);

      // 对象名称必须根据允许列表进行检查。否则，
      // 无法解析 'foo.bar.baz'：'baz' 必须是属性，但
      // 'bar' 可能是 objectName，或者是 nodeName 的一部分（可以
      // 包含 '.' 字符）。
      if (_supportedObjectNames.indexOf(objectName) !== -1) {
        // 分离节点名称和对象名称
        results.nodeName = results.nodeName.substring(0, lastDot);
        results.objectName = objectName;
      }
    }

    // 验证属性名称是否存在
    if (results.propertyName === null || results.propertyName.length === 0) {
      throw new Error("PropertyBinding: can not parse propertyName from trackName: " + trackName);
    }

    // 返回解析结果
    return results;
  }

  /**
   * 在给定根对象的层次结构中按给定节点名称搜索节点
   *
   * @static
   * @param {Object} root - 根对象
   * @param {string|number} nodeName - 节点名称
   * @return {?Object} 找到的节点。如果没有找到对象则返回 `null`
   */
  static findNode(root, nodeName) {
    // 如果节点名称未定义、为空、为点、为-1，或者匹配根节点的名称或UUID，返回根节点
    if (nodeName === undefined || nodeName === "" || nodeName === "." || nodeName === -1 || nodeName === root.name || nodeName === root.uuid) {
      return root;
    }

    // 在骨骼中搜索
    if (root.skeleton) {
      const bone = root.skeleton.getBoneByName(nodeName);

      if (bone !== undefined) {
        return bone;
      }
    }

    // 在节点子树中搜索
    if (root.children) {
      // 递归搜索子树的函数
      const searchNodeSubtree = function (children) {
        // 遍历所有子节点
        for (let i = 0; i < children.length; i++) {
          const childNode = children[i];

          // 检查子节点的名称或UUID是否匹配
          if (childNode.name === nodeName || childNode.uuid === nodeName) {
            return childNode;
          }

          // 递归搜索子节点的子树
          const result = searchNodeSubtree(childNode.children);

          // 如果找到结果，返回它
          if (result) return result;
        }

        // 没有找到，返回null
        return null;
      };

      // 在根节点的子树中搜索
      const subTreeNode = searchNodeSubtree(root.children);

      if (subTreeNode) {
        return subTreeNode;
      }
    }

    // 没有找到节点，返回null
    return null;
  }

  // 这些用于"绑定"不存在的属性
  _getValue_unavailable() {}
  _setValue_unavailable() {}

  // Getter 方法

  /**
   * 直接获取属性值
   * @param {Array} buffer - 目标缓冲区
   * @param {number} offset - 缓冲区偏移量
   */
  _getValue_direct(buffer, offset) {
    buffer[offset] = this.targetObject[this.propertyName];
  }

  /**
   * 获取数组属性的所有值
   * @param {Array} buffer - 目标缓冲区
   * @param {number} offset - 缓冲区偏移量
   */
  _getValue_array(buffer, offset) {
    const source = this.resolvedProperty;

    // 将源数组的所有元素复制到缓冲区
    for (let i = 0, n = source.length; i !== n; ++i) {
      buffer[offset++] = source[i];
    }
  }

  /**
   * 获取数组属性的特定元素值
   * @param {Array} buffer - 目标缓冲区
   * @param {number} offset - 缓冲区偏移量
   */
  _getValue_arrayElement(buffer, offset) {
    buffer[offset] = this.resolvedProperty[this.propertyIndex];
  }

  /**
   * 使用 toArray 方法获取属性值
   * @param {Array} buffer - 目标缓冲区
   * @param {number} offset - 缓冲区偏移量
   */
  _getValue_toArray(buffer, offset) {
    this.resolvedProperty.toArray(buffer, offset);
  }

  // 直接设置方法

  /**
   * 直接设置属性值
   * @param {Array} buffer - 源缓冲区
   * @param {number} offset - 缓冲区偏移量
   */
  _setValue_direct(buffer, offset) {
    this.targetObject[this.propertyName] = buffer[offset];
  }

  /**
   * 直接设置属性值并标记需要更新
   * @param {Array} buffer - 源缓冲区
   * @param {number} offset - 缓冲区偏移量
   */
  _setValue_direct_setNeedsUpdate(buffer, offset) {
    this.targetObject[this.propertyName] = buffer[offset];
    this.targetObject.needsUpdate = true;
  }

  /**
   * 直接设置属性值并标记矩阵世界需要更新
   * @param {Array} buffer - 源缓冲区
   * @param {number} offset - 缓冲区偏移量
   */
  _setValue_direct_setMatrixWorldNeedsUpdate(buffer, offset) {
    this.targetObject[this.propertyName] = buffer[offset];
    this.targetObject.matrixWorldNeedsUpdate = true;
  }

  // 整个数组设置方法

  /**
   * 设置整个数组属性
   * @param {Array} buffer - 源缓冲区
   * @param {number} offset - 缓冲区偏移量
   */
  _setValue_array(buffer, offset) {
    const dest = this.resolvedProperty;

    // 将缓冲区的值复制到目标数组
    for (let i = 0, n = dest.length; i !== n; ++i) {
      dest[i] = buffer[offset++];
    }
  }

  /**
   * 设置整个数组属性并标记需要更新
   * @param {Array} buffer - 源缓冲区
   * @param {number} offset - 缓冲区偏移量
   */
  _setValue_array_setNeedsUpdate(buffer, offset) {
    const dest = this.resolvedProperty;

    // 将缓冲区的值复制到目标数组
    for (let i = 0, n = dest.length; i !== n; ++i) {
      dest[i] = buffer[offset++];
    }

    // 标记目标对象需要更新
    this.targetObject.needsUpdate = true;
  }

  /**
   * 设置整个数组属性并标记矩阵世界需要更新
   * @param {Array} buffer - 源缓冲区
   * @param {number} offset - 缓冲区偏移量
   */
  _setValue_array_setMatrixWorldNeedsUpdate(buffer, offset) {
    const dest = this.resolvedProperty;

    // 将缓冲区的值复制到目标数组
    for (let i = 0, n = dest.length; i !== n; ++i) {
      dest[i] = buffer[offset++];
    }

    // 标记目标对象的矩阵世界需要更新
    this.targetObject.matrixWorldNeedsUpdate = true;
  }

  // 数组元素设置方法

  /**
   * 设置数组的特定元素
   * @param {Array} buffer - 源缓冲区
   * @param {number} offset - 缓冲区偏移量
   */
  _setValue_arrayElement(buffer, offset) {
    this.resolvedProperty[this.propertyIndex] = buffer[offset];
  }

  /**
   * 设置数组的特定元素并标记需要更新
   * @param {Array} buffer - 源缓冲区
   * @param {number} offset - 缓冲区偏移量
   */
  _setValue_arrayElement_setNeedsUpdate(buffer, offset) {
    this.resolvedProperty[this.propertyIndex] = buffer[offset];
    this.targetObject.needsUpdate = true;
  }

  /**
   * 设置数组的特定元素并标记矩阵世界需要更新
   * @param {Array} buffer - 源缓冲区
   * @param {number} offset - 缓冲区偏移量
   */
  _setValue_arrayElement_setMatrixWorldNeedsUpdate(buffer, offset) {
    this.resolvedProperty[this.propertyIndex] = buffer[offset];
    this.targetObject.matrixWorldNeedsUpdate = true;
  }

  // 具有 FromArray 方法的设置方法

  /**
   * 使用 fromArray 方法设置属性值
   * @param {Array} buffer - 源缓冲区
   * @param {number} offset - 缓冲区偏移量
   */
  _setValue_fromArray(buffer, offset) {
    this.resolvedProperty.fromArray(buffer, offset);
  }

  /**
   * 使用 fromArray 方法设置属性值并标记需要更新
   * @param {Array} buffer - 源缓冲区
   * @param {number} offset - 缓冲区偏移量
   */
  _setValue_fromArray_setNeedsUpdate(buffer, offset) {
    this.resolvedProperty.fromArray(buffer, offset);
    this.targetObject.needsUpdate = true;
  }

  /**
   * 使用 fromArray 方法设置属性值并标记矩阵世界需要更新
   * @param {Array} buffer - 源缓冲区
   * @param {number} offset - 缓冲区偏移量
   */
  _setValue_fromArray_setMatrixWorldNeedsUpdate(buffer, offset) {
    this.resolvedProperty.fromArray(buffer, offset);
    this.targetObject.matrixWorldNeedsUpdate = true;
  }

  /**
   * 未绑定状态的 getValue 方法
   * @param {Array} targetArray - 目标数组
   * @param {number} offset - 偏移量
   */
  _getValue_unbound(targetArray, offset) {
    this.bind(); // 先绑定
    this.getValue(targetArray, offset); // 然后获取值
  }

  /**
   * 未绑定状态的 setValue 方法
   * @param {Array} sourceArray - 源数组
   * @param {number} offset - 偏移量
   */
  _setValue_unbound(sourceArray, offset) {
    this.bind(); // 先绑定
    this.setValue(sourceArray, offset); // 然后设置值
  }

  /**
   * 为此绑定跟踪的属性创建 getter / setter 对
   */
  bind() {
    // 获取目标对象
    let targetObject = this.node;
    const parsedPath = this.parsedPath;

    // 提取解析路径的各个部分
    const objectName = parsedPath.objectName;
    const propertyName = parsedPath.propertyName;
    let propertyIndex = parsedPath.propertyIndex;

    // 如果目标对象不存在，尝试查找
    if (!targetObject) {
      targetObject = PropertyBinding.findNode(this.rootNode, parsedPath.nodeName);

      // 缓存找到的节点
      this.node = targetObject;
    }

    // 设置失败状态，这样我们可以在错误时直接 'return'
    this.getValue = this._getValue_unavailable;
    this.setValue = this._setValue_unavailable;

    // 确保存在值节点
    if (!targetObject) {
      console.warn("THREE.PropertyBinding: No target node found for track: " + this.path + ".");
      return;
    }

    // 如果指定了对象名称，需要进一步导航到对象
    if (objectName) {
      let objectIndex = parsedPath.objectIndex;

      // 特殊情况，我们需要深入层次结构以获取面材质等...
      switch (objectName) {
        case "materials":
          // 检查节点是否有材质
          if (!targetObject.material) {
            console.error("THREE.PropertyBinding: Can not bind to material as node does not have a material.", this);
            return;
          }

          // 检查材质是否有材质数组
          if (!targetObject.material.materials) {
            console.error("THREE.PropertyBinding: Can not bind to material.materials as node.material does not have a materials array.", this);
            return;
          }

          // 将目标对象设置为材质数组
          targetObject = targetObject.material.materials;

          break;

        case "bones":
          // 检查节点是否有骨骼
          if (!targetObject.skeleton) {
            console.error("THREE.PropertyBinding: Can not bind to bones as node does not have a skeleton.", this);
            return;
          }

          // 潜在的未来优化：如果 propertyIndex 已经是整数则跳过此步骤
          // 并将整数字符串转换为真正的整数。

          // 将目标对象设置为骨骼数组
          targetObject = targetObject.skeleton.bones;

          // 支持将变形目标名称解析为索引
          for (let i = 0; i < targetObject.length; i++) {
            if (targetObject[i].name === objectIndex) {
              objectIndex = i;
              break;
            }
          }

          break;

        case "map":
          // 如果对象直接有 map 属性
          if ("map" in targetObject) {
            targetObject = targetObject.map;
            break;
          }

          // 检查节点是否有材质
          if (!targetObject.material) {
            console.error("THREE.PropertyBinding: Can not bind to material as node does not have a material.", this);
            return;
          }

          // 检查材质是否有贴图
          if (!targetObject.material.map) {
            console.error("THREE.PropertyBinding: Can not bind to material.map as node.material does not have a map.", this);
            return;
          }

          // 将目标对象设置为材质贴图
          targetObject = targetObject.material.map;
          break;

        default:
          // 默认情况：检查对象是否有指定的属性
          if (targetObject[objectName] === undefined) {
            console.error("THREE.PropertyBinding: Can not bind to objectName of node undefined.", this);
            return;
          }

          // 将目标对象设置为指定的属性
          targetObject = targetObject[objectName];
      }

      // 如果指定了对象索引，进一步导航
      if (objectIndex !== undefined) {
        if (targetObject[objectIndex] === undefined) {
          console.error("THREE.PropertyBinding: Trying to bind to objectIndex of objectName, but is undefined.", this, targetObject);
          return;
        }

        // 将目标对象设置为指定索引的元素
        targetObject = targetObject[objectIndex];
      }
    }

    // 解析属性
    const nodeProperty = targetObject[propertyName];

    // 检查属性是否存在
    if (nodeProperty === undefined) {
      const nodeName = parsedPath.nodeName;

      console.error("THREE.PropertyBinding: Trying to update property for track: " + nodeName + "." + propertyName + " but it wasn't found.", targetObject);
      return;
    }

    // 确定版本控制方案
    let versioning = this.Versioning.None;

    // 保存目标对象引用
    this.targetObject = targetObject;

    // 根据目标对象类型确定版本控制方案
    if (targetObject.isMaterial === true) {
      versioning = this.Versioning.NeedsUpdate;
    } else if (targetObject.isObject3D === true) {
      versioning = this.Versioning.MatrixWorldNeedsUpdate;
    }

    // 确定属性如何绑定
    let bindingType = this.BindingType.Direct;

    // 如果指定了属性索引
    if (propertyIndex !== undefined) {
      // 访问属性数组的子元素（目前只支持基本类型）

      // 特殊处理变形目标影响
      if (propertyName === "morphTargetInfluences") {
        // 潜在优化：如果 propertyIndex 已经是整数则跳过此步骤，并将整数字符串转换为真正的整数。

        // 支持将变形目标名称解析为索引
        if (!targetObject.geometry) {
          console.error("THREE.PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.", this);
          return;
        }

        if (!targetObject.geometry.morphAttributes) {
          console.error("THREE.PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.morphAttributes.", this);
          return;
        }

        // 如果变形目标字典中存在该索引，使用字典中的值
        if (targetObject.morphTargetDictionary[propertyIndex] !== undefined) {
          propertyIndex = targetObject.morphTargetDictionary[propertyIndex];
        }
      }

      // 设置为数组元素绑定类型
      bindingType = this.BindingType.ArrayElement;

      this.resolvedProperty = nodeProperty;
      this.propertyIndex = propertyIndex;
    } else if (nodeProperty.fromArray !== undefined && nodeProperty.toArray !== undefined) {
      // 必须为 Object3D.Euler/Quaternion 使用复制

      bindingType = this.BindingType.HasFromToArray;

      this.resolvedProperty = nodeProperty;
    } else if (Array.isArray(nodeProperty)) {
      // 整个数组绑定类型
      bindingType = this.BindingType.EntireArray;

      this.resolvedProperty = nodeProperty;
    } else {
      // 直接绑定类型，保存属性名称
      this.propertyName = propertyName;
    }

    // 选择 getter / setter
    this.getValue = this.GetterByBindingType[bindingType];
    this.setValue = this.SetterByBindingTypeAndVersioning[bindingType][versioning];
  }

  /**
   * 解绑属性
   */
  unbind() {
    // 清除节点引用
    this.node = null;

    // 回到 getValue / setValue 的原型版本
    // 注意：避免通过 'delete' 改变 'this' 的形状
    this.getValue = this._getValue_unbound;
    this.setValue = this._setValue_unbound;
  }
}

// 将 Composite 类附加到 PropertyBinding
PropertyBinding.Composite = Composite;

// 绑定类型枚举
PropertyBinding.prototype.BindingType = {
  Direct: 0, // 直接绑定
  EntireArray: 1, // 整个数组绑定
  ArrayElement: 2, // 数组元素绑定
  HasFromToArray: 3, // 具有 fromArray/toArray 方法的绑定
};

// 版本控制枚举
PropertyBinding.prototype.Versioning = {
  None: 0, // 无版本控制
  NeedsUpdate: 1, // 需要更新标记
  MatrixWorldNeedsUpdate: 2, // 矩阵世界需要更新标记
};

// 根据绑定类型获取 getter 方法的数组
PropertyBinding.prototype.GetterByBindingType = [
  PropertyBinding.prototype._getValue_direct, // 直接获取
  PropertyBinding.prototype._getValue_array, // 数组获取
  PropertyBinding.prototype._getValue_arrayElement, // 数组元素获取
  PropertyBinding.prototype._getValue_toArray, // toArray 方法获取
];

// 根据绑定类型和版本控制获取 setter 方法的二维数组
PropertyBinding.prototype.SetterByBindingTypeAndVersioning = [
  [
    // 直接绑定
    PropertyBinding.prototype._setValue_direct, // 无版本控制
    PropertyBinding.prototype._setValue_direct_setNeedsUpdate, // 需要更新标记
    PropertyBinding.prototype._setValue_direct_setMatrixWorldNeedsUpdate, // 矩阵世界需要更新标记
  ],
  [
    // 整个数组绑定
    PropertyBinding.prototype._setValue_array, // 无版本控制
    PropertyBinding.prototype._setValue_array_setNeedsUpdate, // 需要更新标记
    PropertyBinding.prototype._setValue_array_setMatrixWorldNeedsUpdate, // 矩阵世界需要更新标记
  ],
  [
    // 数组元素绑定
    PropertyBinding.prototype._setValue_arrayElement, // 无版本控制
    PropertyBinding.prototype._setValue_arrayElement_setNeedsUpdate, // 需要更新标记
    PropertyBinding.prototype._setValue_arrayElement_setMatrixWorldNeedsUpdate, // 矩阵世界需要更新标记
  ],
  [
    // 具有 FromArray 方法的绑定
    PropertyBinding.prototype._setValue_fromArray, // 无版本控制
    PropertyBinding.prototype._setValue_fromArray_setNeedsUpdate, // 需要更新标记
    PropertyBinding.prototype._setValue_fromArray_setMatrixWorldNeedsUpdate, // 矩阵世界需要更新标记
  ],
];

// 导出 PropertyBinding 类
export { PropertyBinding };
