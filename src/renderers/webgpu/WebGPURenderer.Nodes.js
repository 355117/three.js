import Renderer from '../common/Renderer.js'; // 引入通用渲染器基类 Renderer
import WebGLBackend from '../webgl-fallback/WebGLBackend.js'; // 引入 WebGL 后备渲染后端实现
import WebGPUBackend from './WebGPUBackend.js'; // 引入 WebGPU 渲染后端实现
import BasicNodeLibrary from './nodes/BasicNodeLibrary.js'; // 引入基础节点材质库，用于类型映射

/**
 * 简介：仅支持“节点材质”的 WebGPU 渲染器变体，不支持传统材质（如 `MeshBasicMaterial`）。
 * 参数：无（类定义本身无直接参数）。
 * 返回：无（类定义）。
 *
 * 说明：这是 {@link WebGPURenderer} 的替代版本，仅面向节点系统的材质流程；
 *       因此像 `MeshBasicMaterial` 这类非节点材质不兼容。
 *
 * @private // 私有：不建议直接从外部使用
 * @augments Renderer // 继承自 Renderer 基类
 */
class WebGPURenderer extends Renderer { // 定义 WebGPURenderer 类，继承 Renderer

	/**
	 * 概要：构造一个新的 WebGPU 渲染器（节点材质专用）。
	 * 参数：
	 *   - {WebGPURenderer~Options} [parameters]：配置项，支持强制使用 WebGL 或回退等选项。
	 * 返回：无。
	 */
	constructor( parameters = {} ) { // 构造函数，接收可选的配置对象参数

		let BackendClass; // 声明后端类变量，用于按条件选择具体后端

		if ( parameters.forceWebGL ) { // 若配置中指定强制使用 WebGL，则选择 WebGL 后端

			BackendClass = WebGLBackend; // 选用 WebGL 后端实现

		} else { // 否则默认尝试使用 WebGPU 后端

			BackendClass = WebGPUBackend; // 选用 WebGPU 后端实现

			parameters.getFallback = () => { // 定义回退函数：当 WebGPU 不可用时返回 WebGL 后端

				console.warn( 'THREE.WebGPURenderer: WebGPU 不可用，正在使用 WebGL2 后端运行。' ); // 提示当前回退到 WebGL2

				return new WebGLBackend( parameters ); // 返回一个基于相同参数创建的 WebGL 后端实例

			}; // 结束回退函数定义

		} // 条件分支结束

		const backend = new BackendClass( parameters ); // 基于选择的后端类和参数实例化后端对象

		super( backend, parameters ); // 调用父类 Renderer 构造函数，注入后端与参数

		/**
		 * 概要：将默认的库替换为标准节点库，用于类型映射；本版本不支持材质映射。
		 * @type {BasicNodeLibrary}
		 */
		this.library = new BasicNodeLibrary(); // 设置节点库，以支持节点类型的默认映射

		/**
		 * 概要：类型标识位，可用于运行时类型判断。
		 * @type {boolean}
		 * @readonly
		 * @default true
		 */
		this.isWebGPURenderer = true; // 设定只读标记，指示这是 WebGPURenderer 实例

	} // 构造函数结束

} // 类定义结束

export default WebGPURenderer; // 默认导出 WebGPURenderer 类
