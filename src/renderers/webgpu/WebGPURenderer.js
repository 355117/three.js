import Renderer from '../common/Renderer.js'; // 引入通用渲染器基类 Renderer
import WebGLBackend from '../webgl-fallback/WebGLBackend.js'; // 引入 WebGL 后备渲染后端实现
import WebGPUBackend from './WebGPUBackend.js'; // 引入 WebGPU 渲染后端实现
import StandardNodeLibrary from './nodes/StandardNodeLibrary.js'; // 引入标准节点库，用于类型映射
/* // 调试处理器：通过 Proxy 打印 WebGPUBackend 某些方法调用（可选）
const debugHandler = { // 定义一个调试处理器对象

	get: function ( target, name ) { // 拦截属性访问器，target 为目标对象，name 为属性名

		// 添加 |update（原英文注释：Add |update）
		if ( /^(create|destroy)/.test( name ) ) console.log( 'WebGPUBackend.' + name ); // 若名称以 create/destroy 开头，则输出日志

		return target[ name ]; // 返回目标对象对应属性值

	}

}; // 调试处理器定义结束
*/ // 默认注释掉，如需调试可配合 Proxy 启用

/**
 * 简介：这是 `WebGLRenderer` 的全新替代方案。`WebGPURenderer` 能根据环境选择不同后端。
 *       浏览器支持 WebGPU 时默认使用 WebGPU 后端，否则回退到 WebGL 2 后端。
 * 参数：无（类定义）。
 * 返回：无（类定义）。
 *
 * @augments Renderer // 继承自 Renderer 基类
 */
class WebGPURenderer extends Renderer { // 定义 WebGPURenderer 类，继承 Renderer

	/**
	 * WebGPURenderer 配置项类型定义。
	 *
	 * @typedef {Object} WebGPURenderer~Options
	 * @property {boolean} [logarithmicDepthBuffer=false] - 是否启用对数深度缓冲。
	 * @property {boolean} [alpha=true] - 默认帧缓冲（最终画布内容）是否透明；否则为不透明。
	 * @property {boolean} [depth=true] - 默认帧缓冲是否包含深度缓冲。
	 * @property {boolean} [stencil=false] - 默认帧缓冲是否包含模板缓冲。
	 * @property {boolean} [antialias=false] - 是否启用 MSAA 作为默认抗锯齿。
	 * @property {number} [samples=0] - 当 `antialias` 为 `true` 时默认使用 4x 采样；设为非 0 的整数可覆盖默认值。
	 * @property {boolean} [forceWebGL=false] - 若为 `true`，无论是否支持 WebGPU，均使用 WebGL 2 后端。
	 * @property {boolean} [multiview=false] - 若为 `true` 且支持，在 WebXR 渲染中启用 multiview。
	 * @property {number} [outputType=undefined] - 输出到画布的纹理类型；默认使用设备首选格式，其他格式可能带来开销。
	 * @property {number} [colorBufferType=HalfFloatType] - 颜色缓冲区的数据类型。默认 `HalfFloatType` 画质最佳；为节省内存与带宽可用 `UnsignedByteType`，但会降低质量。
	 */

	/**
	 * 概要：构造一个新的 WebGPU 渲染器。
	 * 参数：
	 *   - {WebGPURenderer~Options} [parameters]：配置项。
	 * 返回：无。
	 */
	constructor( parameters = {} ) { // 构造函数，接收可选配置对象

		let BackendClass; // 后端类占位，根据条件选择 WebGPU 或 WebGL

		if ( parameters.forceWebGL ) { // 若强制使用 WebGL，则直接选 WebGL 后端

			BackendClass = WebGLBackend; // 选用 WebGL 后端实现

		} else { // 否则尝试 WebGPU 后端，并设置回退逻辑

			BackendClass = WebGPUBackend; // 默认使用 WebGPU 后端

			parameters.getFallback = () => { // 定义回退函数：WebGPU 不可用时返回 WebGL 后端

				console.warn( 'THREE.WebGPURenderer: WebGPU 不可用，正在使用 WebGL2 后端运行。' ); // 输出回退提示

				return new WebGLBackend( parameters ); // 基于同一参数创建 WebGL 后端实例

			}; // 回退函数结束

		} // 条件分支结束

		const backend = new BackendClass( parameters ); // 实例化所选后端对象

		//super( new Proxy( backend, debugHandler ) ); // 可选：通过 Proxy 包装后端以启用调试日志
		super( backend, parameters ); // 调用父类构造函数，注入后端与配置参数

		/**
		 * 概要：用标准节点库覆盖通用默认库，用于类型映射。
		 * @type {StandardNodeLibrary}
		 */
		this.library = new StandardNodeLibrary(); // 设置节点库以支持节点类型映射

		/**
		 * 概要：类型标识位，可用于类型检测。
		 * @type {boolean}
		 * @readonly
		 * @default true
		 */
		this.isWebGPURenderer = true; // 标记该实例为 WebGPURenderer

		if ( typeof __THREE_DEVTOOLS__ !== 'undefined' ) { // 如果浏览器存在 THREE 开发者工具钩子

			__THREE_DEVTOOLS__.dispatchEvent( new CustomEvent( 'observe', { detail: this } ) ); // 触发观察事件，注册当前实例

		} // 条件结束

	} // 构造函数结束

} // 类定义结束

export default WebGPURenderer; // 默认导出 WebGPURenderer 类
