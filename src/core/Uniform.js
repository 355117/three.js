/**
 * 表示一个uniform变量，它是一个全局着色器变量。它们被传递给着色器程序。
 *
 * Uniform变量在GPU渲染管线中用于向着色器传递不经常变化的数据，
 * 如变换矩阵、光照参数、纹理等。
 *
 * 在声明{@link ShaderMaterial}的uniform时，可以通过值或对象来声明：
 * ```js
 * uniforms: {
 * 	time: { value: 1.0 },
 * 	resolution: new Uniform( new Vector2() )
 * };
 * ```
 * 由于此类只能在{@link ShaderMaterial}的上下文中使用，因此仅在
 * {@link WebGLRenderer}中受支持。
 */
class Uniform {
  /**
   * 构造一个新的uniform变量
   *
   * @param {any} value - uniform的值，可以是任何类型的数据
   */
  constructor(value) {
    /**
     * uniform变量的值
     * 这个值会被传递给着色器程序使用
     *
     * @type {any}
     */
    this.value = value; // 存储uniform的值
  }

  /**
   * 返回一个包含此实例复制值的新uniform
   * 如果值具有`clone()`方法，则该值也会被克隆
   *
   * @return {Uniform} 此实例的克隆
   */
  clone() {
    // 检查值是否有clone方法，如果有则调用clone()，否则直接复制值
    return new Uniform(this.value.clone === undefined ? this.value : this.value.clone());
  }
}

// 导出Uniform类
export { Uniform };
