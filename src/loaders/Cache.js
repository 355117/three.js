/**
 * @class
 * @classdesc 一个简单的缓存系统，由 {@link FileLoader} 内部使用。
 * 要在所有使用 {@link FileLoader} 的加载器中启用缓存，请在应用程序中添加 `THREE.Cache.enabled = true;`。
 * A simple caching system, used internally by {@link FileLoader}.
 * To enable caching across all loaders that use {@link FileLoader}, add `THREE.Cache.enabled = true.` once in your app.
 * @hideconstructor
 */
// 定义缓存对象，包含缓存相关的属性和方法
const Cache = {
  /**
   * 是否启用缓存。
   * Whether caching is enabled or not.
   *
   * @static
   * @type {boolean}
   * @default false
   */
  enabled: false, // 缓存启用标志，默认为false

  /**
   * 存储缓存文件的字典。
   * A dictionary that holds cached files.
   *
   * @static
   * @type {Object<string,Object>}
   */
  files: {}, // 缓存文件的存储对象，键为字符串，值为任意对象

  /**
   * 添加一个缓存条目，使用键来引用文件。如果该键已经存在文件，则会被覆盖。
   * Adds a cache entry with a key to reference the file. If this key already
   * holds a file, it is overwritten.
   *
   * @static
   * @param {string} key - 用于引用缓存文件的键。The key to reference the cached file.
   * @param {Object} file - 要缓存的文件。The file to be cached.
   */
  add: function (key, file) {
    // 如果缓存未启用，直接返回
    if (this.enabled === false) return;

    // 调试日志（已注释）
    // console.log( 'THREE.Cache', 'Adding key:', key );

    // 将文件存储到缓存中，使用指定的键
    this.files[key] = file;
  },

  /**
   * 获取给定键的缓存值。
   * Gets the cached value for the given key.
   *
   * @static
   * @param {string} key - 用于引用缓存文件的键。The key to reference the cached file.
   * @return {Object|undefined} 缓存的文件。如果键不存在则返回 `undefined`。The cached file. If the key does not exist `undefined` is returned.
   */
  get: function (key) {
    // 如果缓存未启用，直接返回
    if (this.enabled === false) return;

    // 调试日志（已注释）
    // console.log( 'THREE.Cache', 'Checking key:', key );

    // 返回指定键对应的缓存文件
    return this.files[key];
  },

  /**
   * 移除与给定键关联的缓存文件。
   * Removes the cached file associated with the given key.
   *
   * @static
   * @param {string} key - 用于引用缓存文件的键。The key to reference the cached file.
   */
  remove: function (key) {
    // 从缓存对象中删除指定键的条目
    delete this.files[key];
  },

  /**
   * 从缓存中移除所有值。
   * Remove all values from the cache.
   *
   * @static
   */
  clear: function () {
    // 重置缓存对象为空对象，清除所有缓存
    this.files = {};
  },
};

// 导出Cache对象供其他模块使用
export { Cache };
