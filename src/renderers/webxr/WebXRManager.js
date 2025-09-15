import { ArrayCamera } from '../../cameras/ArrayCamera.js'; // 导入 ArrayCamera，用于包含多视图相机（左右眼）
import { EventDispatcher } from '../../core/EventDispatcher.js'; // 导入事件派发器基类
import { PerspectiveCamera } from '../../cameras/PerspectiveCamera.js'; // 导入透视相机类
import { Vector2 } from '../../math/Vector2.js'; // 导入二维向量
import { Vector3 } from '../../math/Vector3.js'; // 导入三维向量
import { Vector4 } from '../../math/Vector4.js'; // 导入四维向量（用于视口）
import { RAD2DEG } from '../../math/MathUtils.js'; // 导入弧度转角度常量因子
import { WebGLAnimation } from '../webgl/WebGLAnimation.js'; // 导入 WebGL 动画循环封装
import { WebGLRenderTarget } from '../WebGLRenderTarget.js'; // 导入渲染目标封装
import { WebXRController } from './WebXRController.js'; // 导入 XR 控制器封装
import { DepthTexture } from '../../textures/DepthTexture.js'; // 导入深度纹理类型
import { ExternalTexture } from '../../textures/ExternalTexture.js'; // 导入外部纹理类型（XR 提供）
import { DepthFormat, DepthStencilFormat, RGBAFormat, UnsignedByteType, UnsignedIntType, UnsignedInt248Type } from '../../constants.js'; // 导入常量枚举
import { WebXRDepthSensing } from './WebXRDepthSensing.js'; // 导入深度感知管理模块

/**
 * 类概要：WebXR 设备 API 的抽象封装，由 {@link WebGLRenderer} 内部使用。
 * - 作用：对外提供启用/禁用 XR、获取控制器、管理会话、相机与渲染资源等接口。
 * - 继承：EventDispatcher（可派发/监听事件）。
 * - 构造：仅内部使用（@hideconstructor）。
 *
 * @augments EventDispatcher 扩展事件派发功能
 * @hideconstructor 隐藏构造器
 */
class WebXRManager extends EventDispatcher {

	/**
	 * 构造函数概要：创建 WebXR 管理器实例。
	 * - 参数：
	 *   - {WebGLRenderer} renderer 渲染器实例。
	 *   - {WebGL2RenderingContext} gl WebGL2 上下文。
	 * - 返回：WebXRManager 实例。
	 */
	constructor( renderer, gl ) { // 初始化 XR 管理器

		super(); // 调用父类 EventDispatcher 构造函数

		const scope = this; // 保存 this 引用以便闭包中使用

		let session = null; // 当前 XR 会话引用

		let framebufferScaleFactor = 1.0; // 帧缓冲缩放因子（分辨率缩放）

		let referenceSpace = null; // 当前参考空间
		let referenceSpaceType = 'local-floor'; // 默认参考空间类型：local-floor
		// Set default foveation to maximum.
		let foveation = 1.0; // 默认固定注视渲染强度：最大（边缘降低分辨率）
		let customReferenceSpace = null; // 用户自定义参考空间（可覆盖默认）

		let pose = null; // 当前视图姿态（保留以备使用）
		let glBinding = null; // XR-WebGL 绑定对象（XRWebGLBinding）
		let glProjLayer = null; // XR 投影视图层（XRProjectionLayer）
		let glBaseLayer = null; // XR WebGL 基础层（XRWebGLLayer）
		let xrFrame = null; // 当前 XR 帧缓存引用（供外部获取）

		const depthSensing = new WebXRDepthSensing(); // 深度感知管理器
		const cameraAccessTextures = {}; // 相机原始图像外部纹理缓存（按 XR Camera 句柄）
		const attributes = gl.getContextAttributes(); // WebGL 上下文属性（如深度、模板、抗锯齿）

		let initialRenderTarget = null; // 进入 XR 前原始渲染目标
		let newRenderTarget = null; // XR 渲染中的新渲染目标

		const controllers = []; // WebXRController 实例列表（按索引）
		const controllerInputSources = []; // 对应的 XRInputSource 列表（按索引）

		const currentSize = new Vector2(); // 进入 XR 前的渲染尺寸
		let currentPixelRatio = null; // 进入 XR 前的像素比

		// 相机初始化

		const cameraL = new PerspectiveCamera(); // 左眼相机
		cameraL.viewport = new Vector4(); // 左眼视口

		const cameraR = new PerspectiveCamera(); // 右眼相机
		cameraR.viewport = new Vector4(); // 右眼视口

		const cameras = [ cameraL, cameraR ]; // 眼相机数组（索引 0 左，1 右）

		const cameraXR = new ArrayCamera(); // XR 相机（包含多个子相机）

		let _currentDepthNear = null; // 记录已应用的近裁剪，避免重复设置
		let _currentDepthFar = null; // 记录已应用的远裁剪

		// 对外可配置的状态

		/**
		 * 是否自动更新 XR 相机（若为 false 则需手动调用 updateCamera）。
		 * @type {boolean}
		 * @default true
		 */
		this.cameraAutoUpdate = true; // 默认自动更新 XR 相机

		/**
		 * 标记渲染器是否启用 XR 渲染。若要使用 XR，请设为 true。
		 * @type {boolean}
		 * @default false
		 */
		this.enabled = false; // 默认未启用 XR

		/**
		 * 是否处于 XR 呈现（会话运行）状态。
		 * @type {boolean}
		 * @readonly
		 * @default false
		 */
		this.isPresenting = false; // 是否正在 XR 会话中

		/**
		 * 方法概要：返回指定索引控制器的“目标射线”空间 Group。
		 * - 用途：适合用于可视化指向性 UI 光标/射线等。
		 * - 参数：{number} index 控制器索引。
		 * - 返回：{Group} 目标射线空间 Group。
		 */
		this.getController = function ( index ) { // 获取控制器目标射线空间

			let controller = controllers[ index ]; // 取该索引的控制器

			if ( controller === undefined ) { // 若未创建则创建控制器实例

				controller = new WebXRController(); // 新建控制器封装
				controllers[ index ] = controller; // 缓存到数组

			}

			return controller.getTargetRaySpace(); // 返回目标射线空间 Group

		}; // getController 结束

		/**
		 * 方法概要：返回指定索引控制器的“握持”空间 Group。
		 * - 用途：适合用于显示手持物体（与目标射线可并存）。
		 * - 说明：若同时需要手持物和指向射线，可将手持物添加到 getControllerGrip()，射线添加到 getController()。
		 * - 参数：{number} index 控制器索引。
		 * - 返回：{Group} 握持空间 Group。
		 */
		this.getControllerGrip = function ( index ) { // 获取控制器握持空间

			let controller = controllers[ index ]; // 取该索引的控制器

			if ( controller === undefined ) { // 若未创建则新建

				controller = new WebXRController(); // 新建控制器封装
				controllers[ index ] = controller; // 缓存到数组

			}

			return controller.getGripSpace(); // 返回握持空间 Group

		}; // getControllerGrip 结束

		/**
		 * 方法概要：返回指定索引控制器的“手部”空间 Group（基于 hand-tracking）。
		 * - 参数：{number} index 控制器索引。
		 * - 返回：{Group} 手部空间 Group。
		 */
		this.getHand = function ( index ) { // 获取控制器手部空间

			let controller = controllers[ index ]; // 取该索引的控制器

			if ( controller === undefined ) { // 若未创建则新建

				controller = new WebXRController(); // 新建控制器封装
				controllers[ index ] = controller; // 缓存到数组

			}

			return controller.getHandSpace(); // 返回手部空间 Group

		}; // getHand 结束

		// 会话事件处理与生命周期

		function onSessionEvent( event ) { // 处理控制器相关事件（select/squeeze 等）

			const controllerIndex = controllerInputSources.indexOf( event.inputSource ); // 查找触发事件的输入源索引

			if ( controllerIndex === - 1 ) { // 未找到匹配控制器则忽略

				return; // 直接返回

			}

			const controller = controllers[ controllerIndex ]; // 获取对应控制器实例

			if ( controller !== undefined ) { // 若存在控制器

				controller.update( event.inputSource, event.frame, customReferenceSpace || referenceSpace ); // 先更新控制器姿态
				controller.dispatchEvent( { type: event.type, data: event.inputSource } ); // 再转发事件到控制器空间

			}

		}

		function onSessionEnd() { // 会话结束时清理与还原状态

			session.removeEventListener( 'select', onSessionEvent ); // 移除选择事件
			session.removeEventListener( 'selectstart', onSessionEvent ); // 移除选择开始
			session.removeEventListener( 'selectend', onSessionEvent ); // 移除选择结束
			session.removeEventListener( 'squeeze', onSessionEvent ); // 移除握压
			session.removeEventListener( 'squeezestart', onSessionEvent ); // 移除握压开始
			session.removeEventListener( 'squeezeend', onSessionEvent ); // 移除握压结束
			session.removeEventListener( 'end', onSessionEnd ); // 移除会话结束监听
			session.removeEventListener( 'inputsourceschange', onInputSourcesChange ); // 移除输入源变更监听

			for ( let i = 0; i < controllers.length; i ++ ) { // 遍历控制器断开连接

				const inputSource = controllerInputSources[ i ]; // 取对应输入源

				if ( inputSource === null ) continue; // 若本索引无输入源则跳过

				controllerInputSources[ i ] = null; // 清空输入源记录

				controllers[ i ].disconnect( inputSource ); // 通知控制器断开并隐藏空间

			}

			_currentDepthNear = null; // 重置已应用的近裁剪记录
			_currentDepthFar = null; // 重置已应用的远裁剪记录

			depthSensing.reset(); // 重置深度感知模块
			for ( const key in cameraAccessTextures ) { // 清空相机纹理缓存

				delete cameraAccessTextures[ key ]; // 删除条目

			}

			// 还原帧缓冲/渲染状态

			renderer.setRenderTarget( initialRenderTarget ); // 恢复进入 XR 前的渲染目标

			glBaseLayer = null; // 释放 XRWebGLLayer 引用
			glProjLayer = null; // 释放 XRProjectionLayer 引用
			glBinding = null; // 释放 XRWebGLBinding 引用
			session = null; // 清空会话
			newRenderTarget = null; // 置空 XR 渲染目标

			// 停止动画循环并更新状态

			animation.stop(); // 停止 XR 动画循环

			scope.isPresenting = false; // 标记不再呈现

			renderer.setPixelRatio( currentPixelRatio ); // 恢复原始像素比
			renderer.setSize( currentSize.width, currentSize.height, false ); // 恢复原始尺寸

			scope.dispatchEvent( { type: 'sessionend' } ); // 派发会话结束事件

		}

		/**
		 * 方法概要：设置帧缓冲缩放因子。
		 * - 注意：XR 会话进行中不可调用。
		 * - 参数：{number} value 缩放因子。
		 */
		this.setFramebufferScaleFactor = function ( value ) { // 设置帧缓冲缩放

			framebufferScaleFactor = value; // 更新缩放因子

			if ( scope.isPresenting === true ) { // 若正在呈现，给出警告

				console.warn( 'THREE.WebXRManager: Cannot change framebuffer scale while presenting.' ); // 无法在呈现时更改

			}

		}; // setFramebufferScaleFactor 结束

		/**
		 * 方法概要：设置参考空间类型，以便与用户真实环境建立合适的空间关系。
		 * - 说明：根据用户移动方式选择合适的参考空间可改善追踪，默认 'local-floor'。
		 * - 链接：参考可选类型 https://developer.mozilla.org/en-US/docs/Web/API/XRReferenceSpace#reference_space_types
		 * - 注意：XR 会话进行中不可调用。
		 * - 参数：{string} value 参考空间类型。
		 */
		this.setReferenceSpaceType = function ( value ) { // 设置参考空间类型

			referenceSpaceType = value; // 更新类型

			if ( scope.isPresenting === true ) { // 若正在呈现，给出警告

				console.warn( 'THREE.WebXRManager: Cannot change reference space type while presenting.' ); // 呈现时不可更改

			}

		}; // setReferenceSpaceType 结束

		/**
		 * 方法概要：获取当前 XR 参考空间。
		 * - 返回：{XRReferenceSpace} 返回自定义或默认参考空间。
		 */
		this.getReferenceSpace = function () { // 获取参考空间

			return customReferenceSpace || referenceSpace; // 优先返回自定义的参考空间

		}; // getReferenceSpace 结束

		/**
		 * 方法概要：设置自定义 XR 参考空间。
		 * - 参数：{XRReferenceSpace} space 参考空间实例。
		 */
		this.setReferenceSpace = function ( space ) { // 设置自定义参考空间

			customReferenceSpace = space; // 覆盖默认参考空间

		}; // setReferenceSpace 结束

		/**
		 * 方法概要：返回当前 XR 基础图层（XRWebGLLayer 或 XRProjectionLayer）。
		 * - 返回：{?(XRWebGLLayer|XRProjectionLayer)} 当前基础图层或 null。
		 */
		this.getBaseLayer = function () { // 获取基础图层

			return glProjLayer !== null ? glProjLayer : glBaseLayer; // 优先返回投影层

		}; // getBaseLayer 结束

		/**
		 * 方法概要：返回当前 XR-WebGL 绑定对象。
		 * - 返回：{?XRWebGLBinding} 绑定对象或 null。
		 */
		this.getBinding = function () { // 获取 XRWebGLBinding

			return glBinding; // 返回绑定对象

		}; // getBinding 结束

		/**
		 * 方法概要：返回当前 XR 帧。
		 * - 返回：{?XRFrame} XR 帧对象；会话外返回 null。
		 */
		this.getFrame = function () { // 获取 XR 帧

			return xrFrame; // 返回帧引用

		}; // getFrame 结束

		/**
		 * 方法概要：返回当前 XR 会话。
		 * - 返回：{?XRSession} XR 会话；会话外返回 null。
		 */
		this.getSession = function () { // 获取 XR 会话

			return session; // 返回会话引用

		}; // getSession 结束

		/**
		 * 方法概要：设置 XR 会话（通常由 *Button 模块请求后注入），并启动 XR 渲染。
		 * - 异步：返回会在会话设置后 resolve。
		 * - 参数：{XRSession} value 要设置的 XR 会话。
		 * - 返回：{Promise} 设置完成的 Promise。
		 */
		this.setSession = async function ( value ) { // 设置 XR 会话并初始化渲染资源

			session = value; // 记录会话引用

			if ( session !== null ) { // 若会话有效，开始初始化流程

				initialRenderTarget = renderer.getRenderTarget(); // 记录当前渲染目标以便退出时还原

				session.addEventListener( 'select', onSessionEvent ); // 监听选择事件
				session.addEventListener( 'selectstart', onSessionEvent ); // 监听选择开始
				session.addEventListener( 'selectend', onSessionEvent ); // 监听选择结束
				session.addEventListener( 'squeeze', onSessionEvent ); // 监听握压
				session.addEventListener( 'squeezestart', onSessionEvent ); // 监听握压开始
				session.addEventListener( 'squeezeend', onSessionEvent ); // 监听握压结束
				session.addEventListener( 'end', onSessionEnd ); // 监听会话结束
				session.addEventListener( 'inputsourceschange', onInputSourcesChange ); // 监听输入源变更

				if ( attributes.xrCompatible !== true ) { // 若上下文未标记 XR 兼容

					await gl.makeXRCompatible(); // 调整 GL 上下文以支持 XR

				}

				currentPixelRatio = renderer.getPixelRatio(); // 记录当前像素比
				renderer.getSize( currentSize ); // 记录当前渲染尺寸

				if ( typeof XRWebGLBinding !== 'undefined' ) { // 若浏览器提供 XRWebGLBinding 接口

					glBinding = new XRWebGLBinding( session, gl ); // 创建 XR-WebGL 绑定

				}

				// 检测浏览器是否支持 XRProjectionLayer（优于 XRWebGLLayer）
				const useLayers = glBinding !== null && 'createProjectionLayer' in XRWebGLBinding.prototype; // 是否使用投影层

				if ( ! useLayers ) { // 不支持投影层：回退使用 XRWebGLLayer

					const layerInit = { // XRWebGLLayer 初始化参数
						antialias: attributes.antialias, // 是否抗锯齿
						alpha: true, // 允许 alpha
						depth: attributes.depth, // 启用深度缓冲
						stencil: attributes.stencil, // 启用模板缓冲
						framebufferScaleFactor: framebufferScaleFactor // 帧缓冲缩放因子
					};

					glBaseLayer = new XRWebGLLayer( session, gl, layerInit ); // 创建 XRWebGLLayer

					session.updateRenderState( { baseLayer: glBaseLayer } ); // 设置为当前基础图层

					renderer.setPixelRatio( 1 ); // XR 模式下像素比设为 1
					renderer.setSize( glBaseLayer.framebufferWidth, glBaseLayer.framebufferHeight, false ); // 设定渲染尺寸为层的帧缓冲尺寸

					newRenderTarget = new WebGLRenderTarget( // 创建渲染目标以承接 XR 输出
						glBaseLayer.framebufferWidth, // 宽度
						glBaseLayer.framebufferHeight, // 高度
						{
							format: RGBAFormat, // 颜色格式 RGBA8
							type: UnsignedByteType, // 无符号字节类型
							colorSpace: renderer.outputColorSpace, // 与渲染器输出色彩空间一致
							stencilBuffer: attributes.stencil, // 是否包含模板缓冲
							resolveDepthBuffer: ( glBaseLayer.ignoreDepthValues === false ), // 需要解析深度缓冲则开启
							resolveStencilBuffer: ( glBaseLayer.ignoreDepthValues === false ) // 需要解析模板缓冲则开启

						}
					); // 创建完成

				} else { // 支持投影层：使用 XRProjectionLayer

					let depthFormat = null; // three.js 深度格式
					let depthType = null; // three.js 深度类型
					let glDepthFormat = null; // GL 深度内部格式

					if ( attributes.depth ) { // 若启用深度缓冲

						glDepthFormat = attributes.stencil ? gl.DEPTH24_STENCIL8 : gl.DEPTH_COMPONENT24; // 选择 GL 深度（可带模板）
						depthFormat = attributes.stencil ? DepthStencilFormat : DepthFormat; // 对应 three.js 深度格式
						depthType = attributes.stencil ? UnsignedInt248Type : UnsignedIntType; // 对应 three.js 深度类型

					}

					const projectionlayerInit = { // 投影层初始化参数
						colorFormat: gl.RGBA8, // 颜色格式
						depthFormat: glDepthFormat, // 深度/模板格式
						scaleFactor: framebufferScaleFactor // 分辨率缩放
					};

					glProjLayer = glBinding.createProjectionLayer( projectionlayerInit ); // 通过 binding 创建投影层

					session.updateRenderState( { layers: [ glProjLayer ] } ); // 使用投影层配置渲染状态

					renderer.setPixelRatio( 1 ); // XR 模式像素比设为 1
					renderer.setSize( glProjLayer.textureWidth, glProjLayer.textureHeight, false ); // 设置渲染尺寸为层贴图尺寸

					newRenderTarget = new WebGLRenderTarget( // 为投影层创建渲染目标
						glProjLayer.textureWidth, // 宽
						glProjLayer.textureHeight, // 高
						{
							format: RGBAFormat, // 颜色格式 RGBA8
							type: UnsignedByteType, // 数据类型无符号字节
							depthTexture: new DepthTexture( glProjLayer.textureWidth, glProjLayer.textureHeight, depthType, undefined, undefined, undefined, undefined, undefined, undefined, depthFormat ), // 深度纹理
							stencilBuffer: attributes.stencil, // 是否包含模板缓冲
							colorSpace: renderer.outputColorSpace, // 输出色彩空间
							samples: attributes.antialias ? 4 : 0, // 多重采样数量
							resolveDepthBuffer: ( glProjLayer.ignoreDepthValues === false ), // 是否解析深度
							resolveStencilBuffer: ( glProjLayer.ignoreDepthValues === false ) // 是否解析模板
						} );

				}

				newRenderTarget.isXRRenderTarget = true; // 标记 XR 渲染目标（TODO：将来移除，参见 #23278）

				this.setFoveation( foveation ); // 应用默认/当前的固定注视渲染值

				customReferenceSpace = null; // 清空自定义参考空间
				referenceSpace = await session.requestReferenceSpace( referenceSpaceType ); // 请求默认参考空间

				animation.setContext( session ); // 将动画上下文设置为 XR 会话
				animation.start(); // 启动 XR 动画循环

				scope.isPresenting = true; // 标记进入 XR 呈现状态

				scope.dispatchEvent( { type: 'sessionstart' } ); // 派发会话开始事件

			}

		};

		/**
		 * 方法概要：获取当前 XR 会话的环境混合模式。
		 * - 返回：'opaque' | 'additive' | 'alpha-blend' | undefined，会话外为 undefined。
		 */
		this.getEnvironmentBlendMode = function () { // 获取环境混合模式

			if ( session !== null ) { // 会话有效时返回模式

				return session.environmentBlendMode; // 返回 environmentBlendMode

			}

		};

		/**
		 * 方法概要：获取当前通过深度感知得到的深度纹理。
		 * - 返回：{?Texture} 深度纹理或 null。
		 */
		this.getDepthTexture = function () { // 获取深度纹理

			return depthSensing.getDepthTexture(); // 代理至深度感知模块

		};

		function onInputSourcesChange( event ) { // 处理输入源变更事件

			// 处理断开事件

			for ( let i = 0; i < event.removed.length; i ++ ) { // 遍历被移除的输入源

				const inputSource = event.removed[ i ]; // 输入源对象
				const index = controllerInputSources.indexOf( inputSource ); // 查找其控制器索引

				if ( index >= 0 ) { // 若找到

					controllerInputSources[ index ] = null; // 清空记录
					controllers[ index ].disconnect( inputSource ); // 通知断开

				}

			}

			// 处理新连接事件

			for ( let i = 0; i < event.added.length; i ++ ) { // 遍历新增输入源

				const inputSource = event.added[ i ]; // 输入源对象

				let controllerIndex = controllerInputSources.indexOf( inputSource ); // 是否已分配索引

				if ( controllerIndex === - 1 ) { // 尚未分配，寻找空位

					// 为当前没有输入源的控制器分配该输入源

					for ( let i = 0; i < controllers.length; i ++ ) { // 在控制器数组中查找空槽

						if ( i >= controllerInputSources.length ) { // 若输入源列表不足则扩展

							controllerInputSources.push( inputSource ); // 追加新输入源
							controllerIndex = i; // 记录索引
							break; // 退出查找

						} else if ( controllerInputSources[ i ] === null ) { // 找到空位

							controllerInputSources[ i ] = inputSource; // 占用空位
							controllerIndex = i; // 记录索引
							break; // 退出查找

						}

					}

					// 若所有控制器均已有输入源，则忽略新的输入源

					if ( controllerIndex === - 1 ) break; // 无空位则终止处理

				}

				const controller = controllers[ controllerIndex ]; // 取对应控制器实例

				if ( controller ) { // 若存在控制器

					controller.connect( inputSource ); // 通知控制器连接输入源

				}

			}

		}

		// 计算集合视锥时使用的临时向量

		const cameraLPos = new Vector3(); // 左相机世界位置
		const cameraRPos = new Vector3(); // 右相机世界位置

		/**
		 * 方法概要：根据左右眼相机的视锥合集，设置 ArrayCamera 的投影矩阵。
		 * - 假设：两相机平行、共享 X 轴、已设置好投影/世界矩阵，且近远裁剪相同。
		 * - 可视化：https://computergraphics.stackexchange.com/a/4765
		 * - 参数：
		 *   - {ArrayCamera} camera 需要设置的数组相机。
		 *   - {PerspectiveCamera} cameraL 左眼相机。
		 *   - {PerspectiveCamera} cameraR 右眼相机。
		 */
		function setProjectionFromUnion( camera, cameraL, cameraR ) { // 合并左右眼视锥

			cameraLPos.setFromMatrixPosition( cameraL.matrixWorld ); // 提取左眼世界位置
			cameraRPos.setFromMatrixPosition( cameraR.matrixWorld ); // 提取右眼世界位置

			const ipd = cameraLPos.distanceTo( cameraRPos ); // 计算瞳距（眼间距）

			const projL = cameraL.projectionMatrix.elements; // 左眼投影矩阵元素
			const projR = cameraR.projectionMatrix.elements; // 右眼投影矩阵元素

			// VR 系统通常左右眼近远裁剪相同，且上下视锥相同，这里使用左眼值
			const near = projL[ 14 ] / ( projL[ 10 ] - 1 ); // 从投影矩阵反求 near
			const far = projL[ 14 ] / ( projL[ 10 ] + 1 ); // 从投影矩阵反求 far
			const topFov = ( projL[ 9 ] + 1 ) / projL[ 5 ]; // 上视角切线
			const bottomFov = ( projL[ 9 ] - 1 ) / projL[ 5 ]; // 下视角切线

			const leftFov = ( projL[ 8 ] - 1 ) / projL[ 0 ]; // 左视角切线
			const rightFov = ( projR[ 8 ] + 1 ) / projR[ 0 ]; // 右视角切线
			const left = near * leftFov; // 近裁剪面左边界
			const right = near * rightFov; // 近裁剪面右边界

			// 计算新相机相对左眼位置偏移，xOffset 约为 ipd/2
			const zOffset = ipd / ( - leftFov + rightFov ); // Z 方向偏移
			const xOffset = zOffset * - leftFov; // X 方向偏移

			// TODO: 是否有更优的偏移应用方式？
			cameraL.matrixWorld.decompose( camera.position, camera.quaternion, camera.scale ); // 用左眼姿态初始化
			camera.translateX( xOffset ); // 应用 X 偏移
			camera.translateZ( zOffset ); // 应用 Z 偏移
			camera.matrixWorld.compose( camera.position, camera.quaternion, camera.scale ); // 组合世界矩阵
			camera.matrixWorldInverse.copy( camera.matrixWorld ).invert(); // 更新逆矩阵

			// 检查是否使用无限远平面投影
			if ( projL[ 10 ] === - 1.0 ) { // -1 表示无限远

				// 使用左眼投影矩阵，位置偏移已覆盖双眼视锥（假设对称投影）
				camera.projectionMatrix.copy( cameraL.projectionMatrix ); // 拷贝左眼投影
				camera.projectionMatrixInverse.copy( cameraL.projectionMatrixInverse ); // 拷贝左眼逆投影

			} else { // 有限远平面

				// 计算左右眼视锥合集并缩放，保证近裁剪在世界空间位置不变（相对新相机）
				const near2 = near + zOffset; // 新近裁剪
				const far2 = far + zOffset; // 新远裁剪
				const left2 = left - xOffset; // 新左边界
				const right2 = right + ( ipd - xOffset ); // 新右边界
				const top2 = topFov * far / far2 * near2; // 新上边界
				const bottom2 = bottomFov * far / far2 * near2; // 新下边界

				camera.projectionMatrix.makePerspective( left2, right2, top2, bottom2, near2, far2 ); // 重建投影矩阵
				camera.projectionMatrixInverse.copy( camera.projectionMatrix ).invert(); // 更新逆投影

			}

		}

		function updateCamera( camera, parent ) { // 更新相机世界矩阵与逆矩阵

			if ( parent === null ) { // 若无父节点

				camera.matrixWorld.copy( camera.matrix ); // 世界矩阵即为本地矩阵

			} else { // 有父节点

				camera.matrixWorld.multiplyMatrices( parent.matrixWorld, camera.matrix ); // 父世界矩阵 * 本地矩阵

			}

			camera.matrixWorldInverse.copy( camera.matrixWorld ).invert(); // 更新逆矩阵

		}

		/**
		 * 方法概要：更新 XR 相机状态（当 cameraAutoUpdate=false 时在应用层调用）。
		 * - 作用：根据 XR 相机更新传入的非 XR 相机的位姿与投影，使其与 XR 相机一致。
		 * - 参数：{Camera} camera 场景中的常规相机。
		 */
		this.updateCamera = function ( camera ) { // 手动更新 XR 相机并同步到用户相机

			if ( session === null ) return; // 会话不存在则跳过

			let depthNear = camera.near; // 默认使用用户相机的近裁剪
			let depthFar = camera.far; // 默认使用用户相机的远裁剪

			if ( depthSensing.texture !== null ) { // 若启用深度感知并提供深度范围

				if ( depthSensing.depthNear > 0 ) depthNear = depthSensing.depthNear; // 使用运行时近裁剪
				if ( depthSensing.depthFar > 0 ) depthFar = depthSensing.depthFar; // 使用运行时远裁剪

			}

			cameraXR.near = cameraR.near = cameraL.near = depthNear; // 同步近裁剪
			cameraXR.far = cameraR.far = cameraL.far = depthFar; // 同步远裁剪

			if ( _currentDepthNear !== cameraXR.near || _currentDepthFar !== cameraXR.far ) { // 若与上次不同则更新会话渲染状态

				// 注意：新的 renderState 要到下一帧才生效。参见 #18320

				session.updateRenderState( { // 请求更新会话的深度范围
					depthNear: cameraXR.near, // 近裁剪
					depthFar: cameraXR.far // 远裁剪
				} );

				_currentDepthNear = cameraXR.near; // 记录已应用近裁剪
				_currentDepthFar = cameraXR.far; // 记录已应用远裁剪

			}

			// 继承用户相机的层并启用双目层（1=左，2=右）
			cameraXR.layers.mask = camera.layers.mask | 0b110; // 打开左右眼层位
			cameraL.layers.mask = cameraXR.layers.mask & 0b011; // 左眼层掩码
			cameraR.layers.mask = cameraXR.layers.mask & 0b101; // 右眼层掩码

			const parent = camera.parent; // 用户相机的父节点
			const cameras = cameraXR.cameras; // XR 相机的子相机数组

			updateCamera( cameraXR, parent ); // 更新 XR 相机世界矩阵

			for ( let i = 0; i < cameras.length; i ++ ) { // 更新每个子相机的世界矩阵

				updateCamera( cameras[ i ], parent ); // 更新子相机

			}

			// 更新投影矩阵以便正确地进行视锥裁剪

			if ( cameras.length === 2 ) { // 双目：使用合并视锥

				setProjectionFromUnion( cameraXR, cameraL, cameraR ); // 计算并设置合并投影

			} else { // 单目（AR）：直接复制左眼投影

				// 假设为 AR 单相机设置

				cameraXR.projectionMatrix.copy( cameraL.projectionMatrix ); // 复制投影矩阵

			}

			// 更新用户相机及其子节点

			updateUserCamera( camera, cameraXR, parent ); // 将 XR 相机姿态同步给用户相机

		};

		function updateUserCamera( camera, cameraXR, parent ) { // 根据 XR 相机更新用户相机

			if ( parent === null ) { // 若无父节点，直接采用 XR 世界矩阵

				camera.matrix.copy( cameraXR.matrixWorld ); // 直接拷贝矩阵

			} else { // 有父节点，则从父节点坐标系计算

				camera.matrix.copy( parent.matrixWorld ); // 获取父世界矩阵
				camera.matrix.invert(); // 取逆得到从世界到父局部
				camera.matrix.multiply( cameraXR.matrixWorld ); // 组合得到相机的本地矩阵

			}

			camera.matrix.decompose( camera.position, camera.quaternion, camera.scale ); // 分解为位姿
			camera.updateMatrixWorld( true ); // 递归更新世界矩阵

			camera.projectionMatrix.copy( cameraXR.projectionMatrix ); // 同步投影矩阵
			camera.projectionMatrixInverse.copy( cameraXR.projectionMatrixInverse ); // 同步逆投影

			if ( camera.isPerspectiveCamera ) { // 若为透视相机

				camera.fov = RAD2DEG * 2 * Math.atan( 1 / camera.projectionMatrix.elements[ 5 ] ); // 从投影矩阵推导 fov
				camera.zoom = 1; // 重置缩放为 1

			}

		}

		/**
		 * 方法概要：返回表示当前 XR 相机的 {@link ArrayCamera} 实例。
		 * - 说明：每个视图对应一个子相机。fov 请基于投影矩阵手动计算。
		 * - 返回：{ArrayCamera} XR 相机。
		 */
		this.getCamera = function () { // 获取 XR 相机

			return cameraXR; // 返回数组相机

		};

		/**
		 * 方法概要：返回投影层使用的固定注视渲染强度。
		 * - 返回：{number|undefined} 若未创建图层则为 undefined。
		 */
		this.getFoveation = function () { // 获取固定注视渲染值

			if ( glProjLayer === null && glBaseLayer === null ) { // 若尚未创建任一图层

				return undefined; // 无可用值

			}

			return foveation; // 返回当前值

		};

		/**
		 * 方法概要：设置固定注视渲染强度。
		 * - 参数：{number} value 范围 [0,1]；0=无（全分辨率），1=最大（边缘低分辨率）。
		 */
		this.setFoveation = function ( value ) { // 设置固定注视渲染值

			// 0 = 无固定注视 = 全分辨率
			// 1 = 最大固定注视 = 边缘低分辨率

			foveation = value; // 更新内部记录

			if ( glProjLayer !== null ) { // 若使用投影层

				glProjLayer.fixedFoveation = value; // 设置投影层固定注视值

			}

			if ( glBaseLayer !== null && glBaseLayer.fixedFoveation !== undefined ) { // 若使用基础层且支持该属性

				glBaseLayer.fixedFoveation = value; // 设置基础层固定注视值

			}

		};

		/**
		 * 方法概要：返回是否支持深度感知。
		 * - 返回：{boolean} 是否存在深度纹理。
		 */
		this.hasDepthSensing = function () { // 是否有深度感知

			return depthSensing.texture !== null; // 有纹理则表示启用

		};

		/**
		 * 方法概要：返回深度感知可视化网格。
		 * - 返回：{Mesh} 可视化网格或 null。
		 */
		this.getDepthSensingMesh = function () { // 获取深度感知网格

			return depthSensing.getMesh( cameraXR ); // 传入 XR 相机用于视口信息

		}; // getDepthSensingMesh 结束

		/**
		 * 方法概要：从与视图对齐的 {@link XRCamera} 获取不透明的原始相机纹理（仅当前帧有效）。
		 * - 参数：{XRCamera} xrCamera 目标 XR 相机。
		 * - 返回：{?Texture} 当前帧的原始相机图像纹理或 null。
		 */
		this.getCameraTexture = function ( xrCamera ) { // 获取原始相机帧纹理

			return cameraAccessTextures[ xrCamera ]; // 从缓存映射中返回

		};

		// 动画循环

		let onAnimationFrameCallback = null; // 用户自定义的每帧回调

		function onAnimationFrame( time, frame ) { // XR 每帧回调（由 WebGLAnimation 驱动）

			pose = frame.getViewerPose( customReferenceSpace || referenceSpace ); // 获取观察者姿态
			xrFrame = frame; // 记录当前 XR 帧供外部查询

			if ( pose !== null ) { // 若成功获取姿态

				const views = pose.views; // 获取所有视图（左右眼等）

				if ( glBaseLayer !== null ) { // 使用 XRWebGLLayer 的路径

					renderer.setRenderTargetFramebuffer( newRenderTarget, glBaseLayer.framebuffer ); // 绑定 XR 帧缓冲
					renderer.setRenderTarget( newRenderTarget ); // 设置当前渲染目标

				}

				let cameraXRNeedsUpdate = false; // 是否需要重建 cameraXR 的子相机列表

				// 检查是否需要重建 cameraXR 的相机列表

				if ( views.length !== cameraXR.cameras.length ) { // 视图数量变化时需要重建

					cameraXR.cameras.length = 0; // 清空列表
					cameraXRNeedsUpdate = true; // 标记需要更新

				}

				for ( let i = 0; i < views.length; i ++ ) { // 遍历每个视图并设置相机

					const view = views[ i ]; // 当前视图

					let viewport = null; // 当前视图的视口

					if ( glBaseLayer !== null ) { // XRWebGLLayer：直接查询视口

						viewport = glBaseLayer.getViewport( view ); // 获取视口

					} else { // XRProjectionLayer：通过 binding 获取子图像

						const glSubImage = glBinding.getViewSubImage( glProjLayer, view ); // 获取子图像
						viewport = glSubImage.viewport; // 子图像视口

						// 对于并排投影，仅生成一张纹理给双眼共享
						if ( i === 0 ) { // 仅在第一个视图上设置纹理

							renderer.setRenderTargetTextures( // 设置渲染目标使用的颜色/深度纹理
								newRenderTarget,
								glSubImage.colorTexture,
								glSubImage.depthStencilTexture );

							renderer.setRenderTarget( newRenderTarget ); // 切换到新的渲染目标

						}

					}

					let camera = cameras[ i ]; // 获取/创建对应子相机

					if ( camera === undefined ) { // 若不存在则创建新相机

						camera = new PerspectiveCamera(); // 创建透视相机
						camera.layers.enable( i ); // 启用对应眼的层
						camera.viewport = new Vector4(); // 初始化视口对象
						cameras[ i ] = camera; // 存入数组

					}

					camera.matrix.fromArray( view.transform.matrix ); // 从视图姿态写入局部矩阵
					camera.matrix.decompose( camera.position, camera.quaternion, camera.scale ); // 分解为位姿
					camera.projectionMatrix.fromArray( view.projectionMatrix ); // 设置投影矩阵
					camera.projectionMatrixInverse.copy( camera.projectionMatrix ).invert(); // 更新逆投影
					camera.viewport.set( viewport.x, viewport.y, viewport.width, viewport.height ); // 设置视口

					if ( i === 0 ) { // 将第一个子相机的姿态复制到 XR 相机

						cameraXR.matrix.copy( camera.matrix ); // 复制局部矩阵
						cameraXR.matrix.decompose( cameraXR.position, cameraXR.quaternion, cameraXR.scale ); // 分解到 XR 相机

					}

					if ( cameraXRNeedsUpdate === true ) { // 若需要，追加相机到 XR 相机列表

						cameraXR.cameras.push( camera ); // 加入子相机数组

					}

				}

				//

				const enabledFeatures = session.enabledFeatures; // 会话启用的能力特性集合
				const gpuDepthSensingEnabled = enabledFeatures && // 是否启用 GPU 深度感知
					enabledFeatures.includes( 'depth-sensing' ) &&
					session.depthUsage == 'gpu-optimized';

				if ( gpuDepthSensingEnabled && glBinding ) { // 启用且存在 binding 时尝试获取深度信息

					const depthData = glBinding.getDepthInformation( views[ 0 ] ); // 从第一个视图获取深度信息

					if ( depthData && depthData.isValid && depthData.texture ) { // 校验深度数据有效

						depthSensing.init( depthData, session.renderState ); // 初始化/更新深度感知模块

					}

				}

				const cameraAccessEnabled = enabledFeatures && // 是否启用相机访问
				    enabledFeatures.includes( 'camera-access' );

				if ( cameraAccessEnabled ) { // 相机访问启用时，从 XR 相机获取原始图像纹理

					renderer.state.unbindTexture(); // 解绑当前纹理，避免污染

					if ( glBinding ) { // 需存在 binding 才能获取摄像头纹理

						for ( let i = 0; i < views.length; i ++ ) { // 遍历每个视图

							const camera = views[ i ].camera; // 视图的 XRCamera

							if ( camera ) { // 若该视图提供相机

								let cameraTex = cameraAccessTextures[ camera ]; // 查找缓存的外部纹理

								if ( ! cameraTex ) { // 若不存在则创建

									cameraTex = new ExternalTexture(); // 新建外部纹理容器
									cameraAccessTextures[ camera ] = cameraTex; // 存入缓存

								}

								const glTexture = glBinding.getCameraImage( camera ); // 通过 binding 获取底层 GL 纹理
								cameraTex.sourceTexture = glTexture; // 赋值给外部纹理容器

							}

						}

					}

				}

			}

			// 更新控制器姿态（targetRay/grip/hand）

			for ( let i = 0; i < controllers.length; i ++ ) { // 遍历所有控制器槽位

				const inputSource = controllerInputSources[ i ]; // 对应的输入源
				const controller = controllers[ i ]; // 控制器对象

				if ( inputSource !== null && controller !== undefined ) { // 若存在有效输入源与控制器

					controller.update( inputSource, frame, customReferenceSpace || referenceSpace ); // 更新控制器姿态与事件

				}

			}

			if ( onAnimationFrameCallback ) onAnimationFrameCallback( time, frame ); // 调用用户自定义每帧回调

			if ( frame.detectedPlanes ) { // 若运行时提供平面检测结果

				scope.dispatchEvent( { type: 'planesdetected', data: frame } ); // 向外派发“检测到平面”事件

			}

			xrFrame = null; // 清空帧引用，确保 getFrame 在帧外返回 null

		}

		const animation = new WebGLAnimation(); // 创建动画循环控制器

		animation.setAnimationLoop( onAnimationFrame ); // 设置 XR 帧回调

		this.setAnimationLoop = function ( callback ) { // 供外部设置每帧回调

			onAnimationFrameCallback = callback; // 存储回调引用

		};

		this.dispose = function () {}; // 预留清理接口（当前无额外资源）

	}

}

export { WebXRManager }; // 导出 WebXRManager 供外部使用
