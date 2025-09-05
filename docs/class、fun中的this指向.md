# JavaScript 中 Class 的 `new` 和普通函数 `new` 的差异详解

## 目录

- [基本语法对比](#基本语法对比)
- [new 操作符执行过程](#new-操作符执行过程)
- [关键差异对比表](#关键差异对比表)
- [内存和性能差异](#内存和性能差异)
- [Three.js 中的实际应用](#threejs-中的实际应用)
- [错误处理和调试差异](#错误处理和调试差异)
- [使用建议](#使用建议)
- [函数 new 的系统使用示例](#函数-new-的系统使用示例)
  - [传统构造函数模式](#1-传统构造函数模式)
  - [工厂函数模式（Three.js 风格）](#2-工厂函数模式threejs-风格)
  - [模块化管理器模式](#3-模块化管理器模式)
  - [事件驱动模式](#4-事件驱动模式)
  - [缓存和优化模式](#5-缓存和优化模式)
- [性能测试](#性能测试)
- [函数 new 中的 this 指向详解](#函数-new-中的-this-指向详解)
- [实际应用场景对比](#实际应用场景对比)
- [最佳实践建议](#最佳实践建议)

## 基本语法对比

### ES6 Class 方式

```javascript
class Sky extends Mesh {
  constructor() {
    super();
    this.isSky = true;
  }

  method() {
    return "class method";
  }
}

// 使用
const sky = new Sky();
```

### 普通函数构造器方式

```javascript
// 传统构造函数
function Vehicle(type) {
  this.type = type;
}

Vehicle.prototype.start = function () {
  return `${this.type} started`;
};

// 工厂函数（Three.js 常用模式）
function WebGLCubeUVMaps(renderer) {
  let cubeUVmaps = new WeakMap();
  let pmremGenerator = null;

  function get(texture) {
    // 实现逻辑
  }

  function dispose() {
    // 清理逻辑
  }

  return {
    get: get,
    dispose: dispose,
  };
}

// 使用
const vehicle = new Vehicle("car");
const cubeUVMaps = new WebGLCubeUVMaps(renderer);
```

## new 操作符执行过程

### Class 的 `new` 执行过程

```javascript
class MyClass {
  constructor(value) {
    this.value = value;
    this.type = "class";
  }

  method() {
    return this.value;
  }
}

// 当执行 new MyClass('test') 时：
// 1. 创建新对象，原型指向 MyClass.prototype
// 2. 调用 constructor，this 绑定到新对象
// 3. 如果 constructor 没有返回对象，返回新创建的对象
// 4. 方法存储在 MyClass.prototype 上，所有实例共享
```

### 普通函数的 `new` 执行过程

```javascript
// 传统构造函数方式
function MyFunction(value) {
  this.value = value;
  this.type = "function";
}

MyFunction.prototype.method = function () {
  return this.value;
};

// 工厂函数方式（Three.js 常用）
function MyFactory(value) {
  const privateVar = "private";

  function method() {
    return value + privateVar;
  }

  return {
    value: value,
    method: method,
  };
}

// 执行过程：
// 1. 创建新对象
// 2. 执行函数，this 绑定到新对象（构造函数）或忽略（工厂函数）
// 3. 如果函数返回对象，使用返回的对象；否则返回新创建的对象
```

## 关键差异对比表

| 特性            | ES6 Class            | 普通函数构造器           | 工厂函数              |
| --------------- | -------------------- | ------------------------ | --------------------- |
| **语法**        | `class` 关键字       | `function` + `prototype` | `function` + `return` |
| **严格模式**    | 自动启用             | 需要手动启用             | 需要手动启用          |
| **提升**        | 不提升（暂时性死区） | 函数声明提升             | 函数声明提升          |
| **原型链**      | 自动设置             | 手动设置                 | 无原型链              |
| **方法共享**    | 原型上共享           | 原型上共享               | 每个实例独立          |
| **私有变量**    | 需要 `#` 语法        | 无真正私有               | 闭包实现私有          |
| **继承**        | `extends` + `super`  | 原型链操作               | 组合模式              |
| **`this` 绑定** | 严格绑定             | 可变绑定                 | 可能不使用 `this`     |
| **内存效率**    | 高（方法共享）       | 高（方法共享）           | 低（方法独立）        |
| **封装性**      | 中等                 | 低                       | 高                    |

## 内存和性能差异

### Class 方式的内存模型

```javascript
class Vehicle {
  constructor(type) {
    this.type = type; // 实例属性
  }

  start() {
    // 原型方法，所有实例共享
    return `${this.type} started`;
  }
}

const car1 = new Vehicle("car");
const car2 = new Vehicle("truck");

// car1.start === car2.start (true) - 方法共享
// 内存效率高，适合大量实例
```

### 工厂函数的内存模型

```javascript
function createVehicle(type) {
  return {
    type: type,
    start() {
      // 每个实例都有独立的方法
      return `${type} started`;
    },
  };
}

const car1 = createVehicle("car");
const car2 = createVehicle("truck");

// car1.start === car2.start (false) - 方法独立
// 内存使用较多，但提供更好的封装
```

## Three.js 中的实际应用

### Class 方式（现代 Three.js 组件）

```javascript
// 几何体、材质等公共 API
class DecalGeometry extends BufferGeometry {
  constructor(mesh, position, orientation, size) {
    super();
    // 使用 this 设置实例属性
    // 继承 BufferGeometry 的所有方法
  }
}

class Sky extends Mesh {
  constructor() {
    super();
    this.isSky = true;
  }
}
```

### 工厂函数方式（Three.js 内部工具）

```javascript
// WebGL 管理器和工具类
function WebGLAttributes(gl) {
  const buffers = new WeakMap(); // 私有变量

  function createBuffer(attribute, bufferType) {
    // 私有函数
  }

  function get(attribute) {
    // 公共方法
  }

  return {
    get: get,
    remove: remove,
    update: update,
  };
}

function WebGLCubeUVMaps(renderer) {
  let cubeUVmaps = new WeakMap();
  let pmremGenerator = null;

  return {
    get: get,
    dispose: dispose,
  };
}
```

## 错误处理和调试差异

### Class 的错误处理

```javascript
class MyClass {
  constructor() {
    // Class 必须使用 new 调用
    if (new.target === undefined) {
      throw new Error("MyClass must be called with new");
    }
  }
}

// MyClass(); // 抛出错误
// new MyClass(); // 正常工作
```

### 普通函数的错误处理

```javascript
function MyFunction() {
  // 传统方式检查
  if (!(this instanceof MyFunction)) {
    return new MyFunction();
  }

  // 或者工厂函数方式（不关心 new）
  return {
    // 对象内容
  };
}

// MyFunction(); // 可能工作
// new MyFunction(); // 也工作
```

## 使用建议

### 何时使用 Class

- ✅ 需要继承关系
- ✅ 大量相似实例
- ✅ 需要原型方法共享
- ✅ 团队熟悉 OOP 模式
- ✅ 公共 API 设计

**示例场景**：几何体、材质、光源、相机等 Three.js 核心对象

### 何时使用工厂函数

- ✅ 需要真正的私有变量
- ✅ 复杂的初始化逻辑
- ✅ 不需要继承
- ✅ 函数式编程风格
- ✅ 内部工具和管理器

**示例场景**：WebGL 管理器、渲染器内部工具、状态管理器

## 函数 new 的系统使用示例

### 1. 传统构造函数模式

```javascript
// 基础构造函数
function Person(name, age) {
  this.name = name;
  this.age = age;
  this.type = "human";
}

// 添加原型方法
Person.prototype.greet = function () {
  return `Hello, I'm ${this.name}`;
};

Person.prototype.getAge = function () {
  return this.age;
};

// 使用
const person1 = new Person("Alice", 25);
const person2 = new Person("Bob", 30);

console.log(person1.greet()); // "Hello, I'm Alice"
console.log(person1.getAge()); // 25
console.log(person1.greet === person2.greet); // true (方法共享)
```

### 2. 工厂函数模式（Three.js 风格）

```javascript
// WebGL 状态管理器示例
function WebGLState(gl) {
  // 私有变量
  let currentProgram = null;
  let currentBlending = null;
  const cache = new Map();

  // 私有方法
  function validateProgram(program) {
    return program && gl.isProgram(program);
  }

  function updateCache(key, value) {
    cache.set(key, value);
  }

  // 公共接口
  return {
    // 设置着色器程序
    useProgram(program) {
      if (currentProgram !== program && validateProgram(program)) {
        gl.useProgram(program);
        currentProgram = program;
        updateCache("program", program);
      }
    },

    // 设置混合模式
    setBlending(blending) {
      if (currentBlending !== blending) {
        switch (blending) {
          case "normal":
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
            break;
          case "additive":
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
            break;
        }
        currentBlending = blending;
      }
    },

    // 重置状态
    reset() {
      currentProgram = null;
      currentBlending = null;
      cache.clear();
    },

    // 获取缓存信息
    getCache() {
      return new Map(cache); // 返回副本，保护内部状态
    },
  };
}

// 使用
const state = new WebGLState(gl);
state.useProgram(shaderProgram);
state.setBlending("additive");
```

### 3. 模块化管理器模式

```javascript
// 纹理管理器
function TextureManager(gl, capabilities) {
  // 私有状态
  const textures = new WeakMap();
  const textureUnits = new Array(capabilities.maxTextures).fill(null);
  let currentTextureSlot = 0;

  // 私有工具函数
  function isPowerOfTwo(value) {
    return (value & (value - 1)) === 0;
  }

  function getTextureType(texture) {
    if (texture.isDataTexture) return gl.TEXTURE_2D;
    if (texture.isCubeTexture) return gl.TEXTURE_CUBE_MAP;
    return gl.TEXTURE_2D;
  }

  function generateMipmaps(target, texture) {
    if (isPowerOfTwo(texture.image.width) && isPowerOfTwo(texture.image.height)) {
      gl.generateMipmap(target);
    }
  }

  // 公共接口
  return {
    // 上传纹理
    uploadTexture(texture, slot = 0) {
      const textureData = textures.get(texture);

      if (!textureData) {
        // 首次上传
        const glTexture = gl.createTexture();
        const target = getTextureType(texture);

        gl.activeTexture(gl.TEXTURE0 + slot);
        gl.bindTexture(target, glTexture);

        if (texture.isDataTexture) {
          gl.texImage2D(target, 0, gl.RGBA, texture.image.width, texture.image.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, texture.image.data);
        } else {
          gl.texImage2D(target, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.image);
        }

        generateMipmaps(target, texture);

        textures.set(texture, {
          glTexture,
          target,
          version: texture.version,
        });

        textureUnits[slot] = texture;
      } else if (textureData.version < texture.version) {
        // 更新纹理
        gl.activeTexture(gl.TEXTURE0 + slot);
        gl.bindTexture(textureData.target, textureData.glTexture);
        gl.texSubImage2D(textureData.target, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, texture.image);
        textureData.version = texture.version;
      }
    },

    // 绑定纹理到指定槽位
    bindTexture(texture, slot) {
      const textureData = textures.get(texture);
      if (textureData && textureUnits[slot] !== texture) {
        gl.activeTexture(gl.TEXTURE0 + slot);
        gl.bindTexture(textureData.target, textureData.glTexture);
        textureUnits[slot] = texture;
      }
    },

    // 释放纹理
    deallocateTexture(texture) {
      const textureData = textures.get(texture);
      if (textureData) {
        gl.deleteTexture(textureData.glTexture);
        textures.delete(texture);

        // 清理纹理单元引用
        for (let i = 0; i < textureUnits.length; i++) {
          if (textureUnits[i] === texture) {
            textureUnits[i] = null;
          }
        }
      }
    },

    // 获取统计信息
    getInfo() {
      return {
        textureCount: textures.size || 0, // WeakMap 没有 size，这里是示意
        activeUnits: textureUnits.filter((t) => t !== null).length,
        maxUnits: capabilities.maxTextures,
      };
    },
  };
}

// 使用
const textureManager = new TextureManager(gl, { maxTextures: 16 });
textureManager.uploadTexture(diffuseTexture, 0);
textureManager.bindTexture(normalTexture, 1);
```

### 4. 事件驱动模式

```javascript
// 事件管理器
function EventManager() {
  // 私有事件存储
  const events = new Map();
  const onceEvents = new Set();

  // 私有工具函数
  function validateEventName(eventName) {
    return typeof eventName === "string" && eventName.length > 0;
  }

  function validateCallback(callback) {
    return typeof callback === "function";
  }

  return {
    // 注册事件监听器
    on(eventName, callback) {
      if (!validateEventName(eventName) || !validateCallback(callback)) {
        throw new Error("Invalid event name or callback");
      }

      if (!events.has(eventName)) {
        events.set(eventName, []);
      }

      events.get(eventName).push(callback);
      return this; // 支持链式调用
    },

    // 注册一次性事件监听器
    once(eventName, callback) {
      const wrappedCallback = (...args) => {
        callback(...args);
        this.off(eventName, wrappedCallback);
        onceEvents.delete(wrappedCallback);
      };

      onceEvents.add(wrappedCallback);
      return this.on(eventName, wrappedCallback);
    },

    // 移除事件监听器
    off(eventName, callback) {
      if (!events.has(eventName)) return this;

      const callbacks = events.get(eventName);
      const index = callbacks.indexOf(callback);

      if (index > -1) {
        callbacks.splice(index, 1);
        if (callbacks.length === 0) {
          events.delete(eventName);
        }
      }

      return this;
    },

    // 触发事件
    emit(eventName, ...args) {
      if (!events.has(eventName)) return this;

      const callbacks = events.get(eventName).slice(); // 复制数组避免修改问题
      callbacks.forEach((callback) => {
        try {
          callback(...args);
        } catch (error) {
          console.error(`Error in event handler for "${eventName}":`, error);
        }
      });

      return this;
    },

    // 清除所有事件
    clear() {
      events.clear();
      onceEvents.clear();
      return this;
    },

    // 获取事件信息
    getEventNames() {
      return Array.from(events.keys());
    },

    listenerCount(eventName) {
      return events.has(eventName) ? events.get(eventName).length : 0;
    },
  };
}

// 使用示例
const eventManager = new EventManager();

// 注册事件
eventManager
  .on("render", (deltaTime) => {
    console.log(`Rendering frame, delta: ${deltaTime}ms`);
  })
  .on("resize", (width, height) => {
    console.log(`Window resized: ${width}x${height}`);
  })
  .once("init", () => {
    console.log("Application initialized");
  });

// 触发事件
eventManager.emit("init");
eventManager.emit("render", 16.67);
eventManager.emit("resize", 1920, 1080);
```

### 5. 缓存和优化模式

```javascript
// 几何体缓存管理器
function GeometryCache() {
  // 私有缓存存储
  const cache = new Map();
  const stats = {
    hits: 0,
    misses: 0,
    created: 0,
  };

  // 私有工具函数
  function generateKey(type, parameters) {
    return `${type}_${JSON.stringify(parameters)}`;
  }

  function createGeometry(type, parameters) {
    stats.created++;

    switch (type) {
      case "box":
        return new BoxGeometry(parameters.width || 1, parameters.height || 1, parameters.depth || 1);
      case "sphere":
        return new SphereGeometry(parameters.radius || 1, parameters.widthSegments || 32, parameters.heightSegments || 16);
      case "plane":
        return new PlaneGeometry(parameters.width || 1, parameters.height || 1);
      default:
        throw new Error(`Unknown geometry type: ${type}`);
    }
  }

  return {
    // 获取几何体（带缓存）
    get(type, parameters = {}) {
      const key = generateKey(type, parameters);

      if (cache.has(key)) {
        stats.hits++;
        return cache.get(key);
      }

      stats.misses++;
      const geometry = createGeometry(type, parameters);
      cache.set(key, geometry);

      return geometry;
    },

    // 预加载几何体
    preload(geometries) {
      geometries.forEach(({ type, parameters }) => {
        this.get(type, parameters);
      });
    },

    // 清除缓存
    clear() {
      // 释放几何体资源
      cache.forEach((geometry) => {
        if (geometry.dispose) {
          geometry.dispose();
        }
      });

      cache.clear();
      stats.hits = 0;
      stats.misses = 0;
      stats.created = 0;
    },

    // 获取缓存统计
    getStats() {
      return {
        ...stats,
        cacheSize: cache.size,
        hitRate: stats.hits / (stats.hits + stats.misses) || 0,
      };
    },

    // 缓存大小限制
    setMaxSize(maxSize) {
      if (cache.size > maxSize) {
        const entries = Array.from(cache.entries());
        const toRemove = entries.slice(0, cache.size - maxSize);

        toRemove.forEach(([key, geometry]) => {
          if (geometry.dispose) {
            geometry.dispose();
          }
          cache.delete(key);
        });
      }
    },
  };
}

// 使用示例
const geometryCache = new GeometryCache();

// 获取几何体（首次创建）
const box1 = geometryCache.get("box", { width: 2, height: 2, depth: 2 });
const box2 = geometryCache.get("box", { width: 2, height: 2, depth: 2 }); // 从缓存获取

console.log(box1 === box2); // true，同一个对象

// 预加载常用几何体
geometryCache.preload([
  { type: "sphere", parameters: { radius: 1 } },
  { type: "plane", parameters: { width: 10, height: 10 } },
]);

// 查看统计信息
console.log(geometryCache.getStats());
// { hits: 1, misses: 3, created: 3, cacheSize: 3, hitRate: 0.25 }
```

## 性能测试

```javascript
// 性能测试：创建 10000 个实例

// Class 方式
console.time("Class");
class TestClass {
  constructor(value) {
    this.value = value;
  }
  method() {
    return this.value;
  }
}

for (let i = 0; i < 10000; i++) {
  new TestClass(i);
}
console.timeEnd("Class");

// 工厂函数方式
console.time("Factory");
function TestFactory(value) {
  return {
    value: value,
    method() {
      return value;
    },
  };
}

for (let i = 0; i < 10000; i++) {
  new TestFactory(i);
}
console.timeEnd("Factory");

// 通常结果：Class 方式更快，内存使用更少
```

## 函数 new 中的 this 指向详解

### 1. new 操作符的 this 绑定机制

当使用 `new` 操作符调用函数时，JavaScript 引擎会执行以下步骤，其中 `this` 的绑定是关键：

```javascript
// 模拟 new 操作符的内部实现
function simulateNew(constructor, ...args) {
  // 1. 创建一个新的空对象
  const newObject = {};

  // 2. 将新对象的原型链接到构造函数的 prototype
  Object.setPrototypeOf(newObject, constructor.prototype);

  // 3. 将构造函数的 this 绑定到新对象，并执行构造函数
  const result = constructor.apply(newObject, args);

  // 4. 如果构造函数返回对象，则返回该对象；否则返回新创建的对象
  return typeof result === "object" && result !== null ? result : newObject;
}

// 使用示例
function Person(name) {
  console.log("this 指向:", this); // this 指向新创建的对象
  this.name = name;
}

const person1 = new Person("Alice");
const person2 = simulateNew(Person, "Bob");

console.log(person1); // Person { name: 'Alice' }
console.log(person2); // Person { name: 'Bob' }
```

### 2. 不同函数类型中的 this 指向

#### 2.1 传统构造函数

```javascript
function Vehicle(type) {
  console.log("构造函数中的 this:", this);
  console.log("this 的构造函数:", this.constructor);
  console.log("this 的原型:", Object.getPrototypeOf(this));

  this.type = type;
  this.id = Math.random();

  // this 指向新创建的 Vehicle 实例
  return this; // 可选，默认返回 this
}

Vehicle.prototype.start = function () {
  console.log("方法中的 this:", this);
  return `${this.type} started`;
};

const car = new Vehicle("car");
// 输出：
// 构造函数中的 this: Vehicle {}
// this 的构造函数: [Function: Vehicle]
// this 的原型: Vehicle {}

console.log(car.start());
// 输出：
// 方法中的 this: Vehicle { type: 'car', id: 0.123... }
// car started
```

#### 2.2 工厂函数中的 this

```javascript
function createManager(name) {
  console.log("工厂函数中的 this:", this);
  // 在工厂函数中，this 指向新创建的空对象（如果使用 new）
  // 但通常工厂函数不使用 this，而是创建并返回新对象

  const manager = {
    name: name,
    employees: [],

    addEmployee(employee) {
      console.log("方法中的 this:", this);
      // 这里的 this 指向 manager 对象
      this.employees.push(employee);
    },
  };

  return manager; // 返回自定义对象，忽略 new 创建的对象
}

// 使用 new 调用工厂函数
const manager1 = new createManager("Alice");
console.log("manager1:", manager1);
// 输出：
// 工厂函数中的 this: {} (new 创建的空对象，但被忽略)
// manager1: { name: 'Alice', employees: [], addEmployee: [Function] }

manager1.addEmployee("Bob");
// 输出：
// 方法中的 this: { name: 'Alice', employees: ['Bob'], addEmployee: [Function] }
```

### 3. this 指向的特殊情况

#### 3.1 箭头函数中的 this

```javascript
function TraditionalConstructor(value) {
  this.value = value;

  // 传统函数 - this 在调用时确定
  this.getValue = function () {
    console.log("传统函数中的 this:", this);
    return this.value;
  };

  // 箭头函数 - this 在定义时确定（继承外层的 this）
  this.getValueArrow = () => {
    console.log("箭头函数中的 this:", this);
    return this.value;
  };
}

const obj = new TraditionalConstructor("test");

// 直接调用
obj.getValue(); // this 指向 obj
obj.getValueArrow(); // this 指向 obj

// 赋值后调用
const getValue = obj.getValue;
const getValueArrow = obj.getValueArrow;

getValue(); // this 指向 undefined (严格模式) 或 window (非严格模式)
getValueArrow(); // this 仍然指向 obj (箭头函数特性)
```

#### 3.2 返回对象时的 this

```javascript
function ConstructorWithReturn(name) {
  console.log("构造函数开始，this:", this);

  this.name = name;
  this.type = "original";

  // 返回不同类型的值，观察 this 的变化
  return {
    name: name,
    type: "returned",
    getThis() {
      console.log("返回对象方法中的 this:", this);
      return this;
    },
  };
}

const instance = new ConstructorWithReturn("test");
console.log("最终实例:", instance);
// 输出：
// 构造函数开始，this: ConstructorWithReturn {}
// 最终实例: { name: 'test', type: 'returned', getThis: [Function] }

instance.getThis();
// 输出：
// 返回对象方法中的 this: { name: 'test', type: 'returned', getThis: [Function] }
```

### 4. this 绑定的调试技巧

```javascript
function DebugConstructor(name) {
  // 调试 this 的工具函数
  function debugThis(label) {
    console.log(`=== ${label} ===`);
    console.log("this:", this);
    console.log("this.constructor:", this.constructor);
    console.log("this.constructor.name:", this.constructor.name);
    console.log("instanceof DebugConstructor:", this instanceof DebugConstructor);
    console.log("Object.getPrototypeOf(this):", Object.getPrototypeOf(this));
    console.log("this === DebugConstructor.prototype:", this === DebugConstructor.prototype);
    console.log("");
  }

  debugThis.call(this, "构造函数开始");

  this.name = name;
  this.created = new Date();

  // 添加实例方法
  this.instanceMethod = function () {
    debugThis.call(this, "实例方法调用");
  };

  debugThis.call(this, "构造函数结束");
}

// 添加原型方法
DebugConstructor.prototype.prototypeMethod = function () {
  console.log("=== 原型方法调用 ===");
  console.log("this:", this);
  console.log("this.name:", this.name);
  console.log("");
};

const debugInstance = new DebugConstructor("Debug Test");
debugInstance.instanceMethod();
debugInstance.prototypeMethod();
```

### 5. 常见的 this 指向陷阱

#### 5.1 方法作为回调函数

```javascript
function EventEmitter() {
  this.events = {};
  this.name = "EventEmitter";

  this.on = function (event, callback) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
  };

  this.emit = function (event, ...args) {
    console.log("emit 方法中的 this:", this.name);

    if (this.events[event]) {
      this.events[event].forEach((callback) => {
        // 注意：这里的 callback 中的 this 可能不是预期的
        callback.apply(this, args); // 显式绑定 this
      });
    }
  };
}

function Handler(name) {
  this.name = name;

  this.handleEvent = function (data) {
    console.log(`${this.name} 处理事件:`, data);
    console.log("处理器中的 this:", this);
  };
}

const emitter = new EventEmitter();
const handler = new Handler("MyHandler");

// 错误的方式 - this 指向会丢失
emitter.on("test", handler.handleEvent);

// 正确的方式 - 绑定 this
emitter.on("test", handler.handleEvent.bind(handler));

// 或使用箭头函数
emitter.on("test", (...args) => handler.handleEvent(...args));

emitter.emit("test", "some data");
```

#### 5.2 setTimeout 中的 this

```javascript
function Timer(name) {
  this.name = name;
  this.count = 0;

  this.start = function () {
    console.log(`${this.name} 定时器启动`);

    // 错误的方式 - this 指向会丢失
    setTimeout(function () {
      console.log("setTimeout 中的 this:", this); // undefined 或 window
      // this.count++; // 错误！
    }, 1000);

    // 正确的方式 1 - 保存 this 引用
    const self = this;
    setTimeout(function () {
      console.log("保存引用方式，this:", self);
      self.count++;
    }, 2000);

    // 正确的方式 2 - 使用 bind
    setTimeout(
      function () {
        console.log("bind 方式，this:", this);
        this.count++;
      }.bind(this),
      3000
    );

    // 正确的方式 3 - 使用箭头函数
    setTimeout(() => {
      console.log("箭头函数方式，this:", this);
      this.count++;
    }, 4000);
  };
}

const timer = new Timer("MyTimer");
timer.start();
```

### 6. Three.js 中的 this 指向实例

```javascript
// Three.js 风格的工厂函数中的 this
function WebGLRenderer(parameters = {}) {
  console.log("WebGLRenderer 中的 this:", this);

  // 私有变量
  const canvas = parameters.canvas || document.createElement("canvas");
  const gl = canvas.getContext("webgl2");

  // 私有方法
  function render(scene, camera) {
    console.log("私有 render 方法中的 this:", this); // 指向调用者
    // 渲染逻辑
  }

  // 返回的公共接口
  const renderer = {
    domElement: canvas,

    render: function (scene, camera) {
      console.log("公共 render 方法中的 this:", this); // 指向 renderer 对象
      render.call(this, scene, camera);
    },

    setSize: function (width, height) {
      console.log("setSize 方法中的 this:", this); // 指向 renderer 对象
      canvas.width = width;
      canvas.height = height;
    },
  };

  return renderer;
}

// 使用 new 调用
const renderer = new WebGLRenderer();
renderer.render(scene, camera);
renderer.setSize(800, 600);
```

### 7. this 指向总结表

| 调用方式                | this 指向                          | 示例                          | 说明                           |
| ----------------------- | ---------------------------------- | ----------------------------- | ------------------------------ |
| `new Constructor()`     | 新创建的实例对象                   | `new Person('Alice')`         | 构造函数中的 `this` 指向新实例 |
| `new FactoryFunction()` | 新创建的空对象（通常被忽略）       | `new createManager()`         | 工厂函数返回自定义对象         |
| `obj.method()`          | 调用方法的对象                     | `person.getName()`            | `this` 指向 `person`           |
| `method()`              | `undefined`（严格模式）或 `window` | `const fn = obj.method; fn()` | 丢失对象上下文                 |
| `method.call(obj)`      | 显式指定的对象                     | `fn.call(person)`             | 强制绑定 `this`                |
| `method.bind(obj)()`    | 绑定时指定的对象                   | `fn.bind(person)()`           | 永久绑定 `this`                |
| `() => {}`              | 定义时的外层 `this`                | 箭头函数                      | 继承外层作用域的 `this`        |

### 8. 实际开发中的 this 最佳实践

#### 8.1 构造函数中的 this 管理

```javascript
function Component(element, options = {}) {
  // 确保 this 指向正确
  if (!(this instanceof Component)) {
    return new Component(element, options);
  }

  this.element = element;
  this.options = { ...Component.defaults, ...options };
  this.isInitialized = false;

  // 绑定事件处理器，确保 this 指向组件实例
  this.handleClick = this.handleClick.bind(this);
  this.handleResize = this.handleResize.bind(this);

  this.init();
}

Component.defaults = {
  autoInit: true,
  responsive: true,
};

Component.prototype.init = function () {
  console.log("初始化组件，this:", this.constructor.name);

  // 添加事件监听器
  this.element.addEventListener("click", this.handleClick);
  window.addEventListener("resize", this.handleResize);

  this.isInitialized = true;
};

Component.prototype.handleClick = function (event) {
  console.log("点击处理器，this:", this.constructor.name);
  // this 正确指向组件实例
  this.toggle();
};

Component.prototype.handleResize = function (event) {
  console.log("调整大小处理器，this:", this.constructor.name);
  // this 正确指向组件实例
  if (this.options.responsive) {
    this.updateLayout();
  }
};

Component.prototype.toggle = function () {
  console.log("切换状态，this:", this);
};

Component.prototype.updateLayout = function () {
  console.log("更新布局，this:", this);
};

// 使用
const button = document.querySelector("#myButton");
const component = new Component(button, { responsive: true });
```

#### 8.2 工厂函数中的 this 处理

```javascript
function createStateMachine(initialState) {
  console.log("工厂函数中的 this:", this); // new 创建的空对象（被忽略）

  // 私有状态
  let currentState = initialState;
  const states = new Map();
  const listeners = new Set();

  // 私有方法
  function notifyListeners(oldState, newState) {
    listeners.forEach((listener) => {
      try {
        // 注意：这里的 listener 中的 this 需要特别处理
        listener.call(stateMachine, oldState, newState);
      } catch (error) {
        console.error("状态监听器错误:", error);
      }
    });
  }

  // 公共接口对象
  const stateMachine = {
    // 获取当前状态
    getCurrentState() {
      console.log("getCurrentState 中的 this:", this); // 指向 stateMachine
      return currentState;
    },

    // 转换状态
    transition(newState) {
      console.log("transition 中的 this:", this); // 指向 stateMachine

      if (states.has(newState)) {
        const oldState = currentState;
        currentState = newState;
        notifyListeners(oldState, newState);
        return true;
      }
      return false;
    },

    // 添加状态
    addState(stateName, stateConfig) {
      console.log("addState 中的 this:", this); // 指向 stateMachine
      states.set(stateName, stateConfig);
      return this; // 支持链式调用
    },

    // 添加监听器
    onStateChange(listener) {
      console.log("onStateChange 中的 this:", this); // 指向 stateMachine

      if (typeof listener === "function") {
        listeners.add(listener);
      }
      return this; // 支持链式调用
    },

    // 移除监听器
    offStateChange(listener) {
      listeners.delete(listener);
      return this;
    },
  };

  return stateMachine;
}

// 使用示例
const machine = new createStateMachine("idle");

machine
  .addState("idle", { color: "gray" })
  .addState("running", { color: "green" })
  .addState("error", { color: "red" })
  .onStateChange(function (oldState, newState) {
    console.log("状态监听器中的 this:", this); // 指向 stateMachine
    console.log(`状态从 ${oldState} 变为 ${newState}`);
  });

machine.transition("running");
```

## 实际应用场景对比

### 场景 1：大量相似对象（推荐 Class）

```javascript
// ❌ 工厂函数 - 内存浪费
function createParticle(x, y, velocity) {
  return {
    x,
    y,
    velocity,
    update() {
      /* 每个粒子都有独立的 update 方法 */
    },
    render() {
      /* 每个粒子都有独立的 render 方法 */
    },
  };
}

// ✅ Class - 内存高效
class Particle {
  constructor(x, y, velocity) {
    this.x = x;
    this.y = y;
    this.velocity = velocity;
  }

  update() {
    /* 所有粒子共享同一个 update 方法 */
  }
  render() {
    /* 所有粒子共享同一个 render 方法 */
  }
}

// 创建 10000 个粒子时，Class 方式内存使用显著更少
```

### 场景 2：需要私有状态（推荐工厂函数）

```javascript
// ❌ Class - 无法真正私有化
class DatabaseConnection {
  constructor(config) {
    this._config = config; // 仍然可以被外部访问
    this._isConnected = false;
  }

  connect() {
    // 外部仍可访问 this._config
  }
}

// ✅ 工厂函数 - 真正的私有状态
function createDatabaseConnection(config) {
  let isConnected = false; // 真正私有
  const connectionPool = new Map(); // 真正私有

  return {
    connect() {
      // config 和 isConnected 无法被外部访问
      if (!isConnected) {
        // 连接逻辑
        isConnected = true;
      }
    },

    disconnect() {
      isConnected = false;
      connectionPool.clear();
    },

    isConnected() {
      return isConnected; // 只读访问
    },
  };
}
```

### 场景 3：复杂初始化逻辑（推荐工厂函数）

```javascript
// ❌ Class - 构造函数复杂
class ComplexRenderer {
  constructor(canvas, options) {
    // 复杂的初始化逻辑都在构造函数中
    this.canvas = canvas;
    this.gl = canvas.getContext("webgl2");

    if (!this.gl) {
      throw new Error("WebGL2 not supported");
    }

    this.programs = new Map();
    this.textures = new WeakMap();
    this.buffers = new WeakMap();

    // 初始化着色器
    this._initShaders();
    this._initBuffers();
    this._setupEventListeners();
  }

  _initShaders() {
    /* 复杂逻辑 */
  }
  _initBuffers() {
    /* 复杂逻辑 */
  }
  _setupEventListeners() {
    /* 复杂逻辑 */
  }
}

// ✅ 工厂函数 - 清晰的初始化流程
function createRenderer(canvas, options = {}) {
  // 验证和准备
  const gl = canvas.getContext("webgl2");
  if (!gl) {
    throw new Error("WebGL2 not supported");
  }

  // 私有状态
  const programs = new Map();
  const textures = new WeakMap();
  const buffers = new WeakMap();

  // 私有初始化函数
  function initShaders() {
    // 着色器初始化逻辑
  }

  function initBuffers() {
    // 缓冲区初始化逻辑
  }

  function setupEventListeners() {
    // 事件监听器设置
  }

  // 执行初始化
  initShaders();
  initBuffers();
  setupEventListeners();

  // 返回公共接口
  return {
    render(scene, camera) {
      // 渲染逻辑
    },

    dispose() {
      // 清理资源
      programs.clear();
      // 移除事件监听器等
    },
  };
}
```

### 场景 4：需要继承（推荐 Class）

```javascript
// ✅ Class - 自然的继承
class Shape {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  move(dx, dy) {
    this.x += dx;
    this.y += dy;
  }
}

class Circle extends Shape {
  constructor(x, y, radius) {
    super(x, y);
    this.radius = radius;
  }

  area() {
    return Math.PI * this.radius * this.radius;
  }
}

// ❌ 工厂函数 - 继承复杂
function createShape(x, y) {
  return {
    x,
    y,
    move(dx, dy) {
      this.x += dx;
      this.y += dy;
    },
  };
}

function createCircle(x, y, radius) {
  const shape = createShape(x, y);
  return {
    ...shape,
    radius,
    area() {
      return Math.PI * radius * radius;
    },
  };
}
```

## 最佳实践建议

### 选择 Class 的情况

```javascript
// 1. 大量相似实例
class Particle {
  /* ... */
}

// 2. 需要继承
class Mesh extends Object3D {
  /* ... */
}

// 3. 公共 API
class Geometry {
  /* ... */
}

// 4. 简单的数据结构
class Vector3 {
  /* ... */
}
```

### 选择工厂函数的情况

```javascript
// 1. 需要私有状态
function createCache() {
  /* ... */
}

// 2. 复杂初始化
function createRenderer() {
  /* ... */
}

// 3. 工具和管理器
function createEventManager() {
  /* ... */
}

// 4. 配置和选项处理
function createConfig(options) {
  /* ... */
}
```

## 总结

### Class 的 `new` 特点

- ✅ 严格的 OOP 模式
- ✅ 自动原型链设置
- ✅ 方法共享，内存效率高
- ✅ 更好的继承支持
- ✅ 现代 JavaScript 标准

### 普通函数的 `new` 特点

- ✅ 更灵活的模式选择
- ✅ 可以实现真正的私有变量
- ✅ 每个实例可以有独立的方法
- ✅ 更适合函数式编程
- ✅ 向后兼容性好

### Three.js 的混合策略

- **公共 API**：使用 Class（如几何体、材质、光源）
- **内部工具**：使用工厂函数（如管理器、工具类）
- **优势**：提供最佳的灵活性和性能平衡

两种方式都可以使用 `new` 操作符，但它们的内部机制和适用场景有显著差异。选择哪种方式取决于具体的需求和设计目标。

---

_文档创建时间：2025-09-05_  
_基于 Three.js 代码库分析_
