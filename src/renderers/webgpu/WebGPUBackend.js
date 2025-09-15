/*// 调试工具：可选地检测 WebGPU 冗余状态设置（默认注释）
import 'https://greggman.github.io/webgpu-avoid-redundant-state-setting/webgpu-check-redundant-state-setting.js'; // 引入检查冗余状态设置的脚本（如需调试可启用）
*/

import { GPUFeatureName, GPULoadOp, GPUStoreOp, GPUIndexFormat, GPUTextureViewDimension } from './utils/WebGPUConstants.js'; // 引入 WebGPU 常量枚举（特性名、加载/存储操作、索引格式、纹理视图维度）

import WGSLNodeBuilder from './nodes/WGSLNodeBuilder.js'; // 引入 WGSL 节点构建器，用于生成着色器
import Backend from '../common/Backend.js'; // 引入通用后端基类 Backend

import WebGPUUtils from './utils/WebGPUUtils.js'; // 引入 WebGPU 工具模块（通用工具）
import WebGPUAttributeUtils from './utils/WebGPUAttributeUtils.js'; // 引入属性相关工具（顶点/存储缓冲等）
import WebGPUBindingUtils from './utils/WebGPUBindingUtils.js'; // 引入绑定相关工具（资源/布局绑定）
import WebGPUPipelineUtils from './utils/WebGPUPipelineUtils.js'; // 引入管线相关工具（渲染/计算管线）
import WebGPUTextureUtils from './utils/WebGPUTextureUtils.js'; // 引入纹理相关工具（创建/视图/加载）

import { WebGPUCoordinateSystem } from '../../constants.js'; // 引入 WebGPU 坐标系常量
import WebGPUTimestampQueryPool from './utils/WebGPUTimestampQueryPool.js'; // 引入时间戳查询池工具（性能计时）
import { warnOnce } from '../../utils.js'; // 引入只警告一次的工具函数
import { ColorManagement } from '../../math/ColorManagement.js'; // 引入颜色管理模块（色调映射等）

/**
 * 简介：一个面向 WebGPU 的渲染后端实现。
 * 参数：无（类定义）。
 * 返回：无（类定义）。
 *
 * @private // 私有：供内部使用
 * @augments Backend // 继承自通用 Backend 基类
 */
class WebGPUBackend extends Backend { // 定义 WebGPUBackend 类，继承 Backend

	/**
	 * WebGPUBackend 配置项类型定义。
	 *
	 * @typedef {Object} WebGPUBackend~Options
	 * @property {boolean} [logarithmicDepthBuffer=false] - 是否启用对数深度缓冲。
	 * @property {boolean} [alpha=true] - 默认帧缓冲（画布最终内容）是否透明；否则为不透明。
	 * @property {boolean} [compatibilityMode=false] - 后端是否启用兼容模式。
	 * @property {boolean} [depth=true] - 默认帧缓冲是否包含深度缓冲。
	 * @property {boolean} [stencil=false] - 默认帧缓冲是否包含模板缓冲。
	 * @property {boolean} [antialias=false] - 是否启用 MSAA 作为默认抗锯齿。
	 * @property {number} [samples=0] - 当 `antialias` 为 `true` 时默认使用 4x；设为非 0 整数可覆盖默认值。
	 * @property {boolean} [forceWebGL=false] - 若为 `true`，无论是否支持 WebGPU，均使用 WebGL 2 后端。
	 * @property {boolean} [trackTimestamp=false] - 是否使用时间戳查询 API 跟踪时间。
	 * @property {string} [powerPreference=undefined] - 功耗偏好。
	 * @property {Object} [requiredLimits=undefined] - 设备请求所需的限制；若适配器无法满足则请求失败。
	 * @property {GPUDevice} [device=undefined] - 应用层已有的 GPU 设备，可传递给渲染器复用。
	 * @property {number} [outputType=undefined] - 输出到画布的纹理类型；默认使用设备首选格式，其他格式可能带来额外开销。
	 */

	/**
	 * 概要：构造一个新的 WebGPU 渲染后端。
	 * 参数：
	 *   - {WebGPUBackend~Options} [parameters]：配置项。
	 * 返回：无。
	 */
	constructor( parameters = {} ) { // 构造函数，接收可选配置对象

		super( parameters ); // 调用父类 Backend 构造函数，初始化通用参数

		/**
		 * 概要：类型标识位，可用于类型检测。
		 * @type {boolean}
		 * @readonly
		 * @default true
		 */
		this.isWebGPUBackend = true; // 标记该实例为 WebGPUBackend

		// 部分参数需要非 "undefined" 的默认值
		this.parameters.alpha = ( parameters.alpha === undefined ) ? true : parameters.alpha; // 画布是否透明，默认 true
		this.parameters.compatibilityMode = ( parameters.compatibilityMode === undefined ) ? false : parameters.compatibilityMode; // 兼容模式开关，默认 false

		this.parameters.requiredLimits = ( parameters.requiredLimits === undefined ) ? {} : parameters.requiredLimits; // 设备必需限制，默认空对象

		/**
		 * 概要：指示后端是否处于兼容模式。
		 * @type {boolean}
		 * @default false
		 */
		this.compatibilityMode = this.parameters.compatibilityMode; // 记录兼容模式状态

		/**
		 * 概要：GPU 设备引用。
		 * @type {?GPUDevice}
		 * @default null
		 */
		this.device = null; // 初始化设备为 null，稍后创建

		/**
		 * 概要：画布上下文引用。
		 * @type {?GPUCanvasContext}
		 * @default null
		 */
		this.context = null; // 初始化上下文为 null，稍后配置

		/**
		 * 概要：默认帧缓冲的颜色附件引用。
		 *
		 * @type {?GPUTexture}
		 * @default null
		 */
		this.colorBuffer = null; // 多重采样时使用的颜色缓冲纹理

		/**
		 * 概要：默认渲染通道描述符引用。
		 *
		 * @type {?Object}
		 * @default null
		 */
		this.defaultRenderPassdescriptor = null; // 延迟创建，按需生成

		/**
		 * 概要：通用工具模块引用。
		 *
		 * @type {WebGPUUtils}
		 */
		this.utils = new WebGPUUtils( this ); // 创建工具模块并传入当前后端实例

		/**
		 * 概要：与着色器属性相关的工具模块引用。
		 *
		 * @type {WebGPUAttributeUtils}
		 */
		this.attributeUtils = new WebGPUAttributeUtils( this ); // 属性/缓冲工具

		/**
		 * 概要：与绑定相关的工具模块引用。
		 *
		 * @type {WebGPUBindingUtils}
		 */
		this.bindingUtils = new WebGPUBindingUtils( this ); // 资源/绑定工具

		/**
		 * 概要：与管线相关的工具模块引用。
		 *
		 * @type {WebGPUPipelineUtils}
		 */
		this.pipelineUtils = new WebGPUPipelineUtils( this ); // 渲染/计算管线工具

		/**
		 * 概要：与纹理相关的工具模块引用。
		 *
		 * @type {WebGPUTextureUtils}
		 */
		this.textureUtils = new WebGPUTextureUtils( this ); // 纹理创建/管理工具

		/**
		 * 概要：管理遮挡查询 resolve 缓冲区的映射表。
		 *
		 * @type {Map<number,GPUBuffer>}
		 */
		this.occludedResolveCache = new Map(); // 以查询 ID 为键缓存对应的缓冲

	} // 构造函数结束

	/**
	 * 概要：初始化后端，使其可用。
	 * 参数：
	 *   - {Renderer} renderer：渲染器实例。
	 * 返回：Promise（初始化完成时 resolve）。
	 * @async
	 */
	async init( renderer ) { // 异步初始化入口

		await super.init( renderer ); // 先调用父类初始化逻辑

		// 初始化上下文与设备（开始）

		const parameters = this.parameters; // 读取配置参数引用

		// 若未通过参数提供现有设备，则新建设备

		let device; // 将要创建或复用的 GPU 设备

		if ( parameters.device === undefined ) { // 未提供设备：请求适配器后创建设备

			const adapterOptions = { // 适配器请求选项
				powerPreference: parameters.powerPreference, // 功耗偏好
				featureLevel: parameters.compatibilityMode ? 'compatibility' : undefined // 兼容模式启用时使用兼容特性级别
			};

			const adapter = ( typeof navigator !== 'undefined' ) ? await navigator.gpu.requestAdapter( adapterOptions ) : null; // 请求 WebGPU 适配器

			if ( adapter === null ) { // 请求失败：抛出错误

				throw new Error( 'WebGPUBackend: 无法创建 WebGPU 适配器。' ); // 无法获取适配器时报错

			} // 适配器可用性检查结束

			// 特性支持枚举

			const features = Object.values( GPUFeatureName ); // 所有可用特性名列表

			const supportedFeatures = []; // 记录当前适配器支持的特性集合

			for ( const name of features ) { // 遍历特性，筛选适配器支持的项

				if ( adapter.features.has( name ) ) { // 适配器声明支持该特性

					supportedFeatures.push( name ); // 记录为必需特性之一

				} // 特性检查结束

			} // 遍历全部特性结束

			const deviceDescriptor = { // 设备请求描述符
				requiredFeatures: supportedFeatures, // 申请所有适配器支持的特性
				requiredLimits: parameters.requiredLimits // 申请所需的限制（若不满足则失败）
			};

			device = await adapter.requestDevice( deviceDescriptor ); // 基于描述符向适配器请求创建设备

		} else { // 已传入现有设备：直接复用

			device = parameters.device; // 使用外部提供的 GPUDevice

		} // 设备创建/复用流程结束

		device.lost.then( ( info ) => { // 监听设备丢失事件，进行上报与处理

			const deviceLossInfo = { // 标准化设备丢失信息
				api: 'WebGPU', // API 类型
				message: info.message || 'Unknown reason', // 丢失原因描述
				reason: info.reason || null, // 具体原因（可能为 null）
				originalEvent: info // 原始事件对象
			};

			renderer.onDeviceLost( deviceLossInfo ); // 通知渲染器处理设备丢失

		} ); // 设备丢失回调注册结束

		const context = ( parameters.context !== undefined ) ? parameters.context : renderer.domElement.getContext( 'webgpu' ); // 获取或复用 WebGPU 画布上下文

		this.device = device; // 保存设备引用
		this.context = context; // 保存上下文引用

		const alphaMode = parameters.alpha ? 'premultiplied' : 'opaque'; // 画布合成模式：预乘透明或不透明

		const toneMappingMode = ColorManagement.getToneMappingMode( this.renderer.outputColorSpace ); // 基于输出色彩空间选择色调映射模式

		this.context.configure( { // 配置 WebGPU 画布上下文
			device: this.device, // 绑定设备
			format: this.utils.getPreferredCanvasFormat(), // 选择画布首选格式
			usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC, // 用作渲染附件与拷贝源
			alphaMode: alphaMode, // 透明度模式
			toneMapping: {
				mode: toneMappingMode // 色调映射模式
			}
		} );

		this.trackTimestamp = this.trackTimestamp && this.hasFeature( GPUFeatureName.TimestampQuery ); // 若支持时间戳查询则启用追踪

		this.updateSize(); // 同步初始尺寸到画布与缓存

	} // init 初始化结束

	/**
	 * 概要：获取后端的坐标系常量。
	 * 返回：number（坐标系枚举值）。
	 * @readonly
	 */
	get coordinateSystem() { // 坐标系只读访问器

		return WebGPUCoordinateSystem; // 返回 WebGPU 使用的坐标系

	} // 坐标系访问器结束

	/**
	 * 概要：从 GPU 存储缓冲属性回读数据到 CPU。
	 * 参数：
	 *   - {StorageBufferAttribute} attribute：存储缓冲区属性。
	 * 返回：Promise<ArrayBuffer>（当数据准备好时返回其 ArrayBuffer）。
	 * @async
	 */
	async getArrayBufferAsync( attribute ) { // 异步读取存储缓冲数据

		return await this.attributeUtils.getArrayBufferAsync( attribute ); // 委托给属性工具执行回读

	} // getArrayBufferAsync 结束

	/**
	 * 概要：返回后端的渲染上下文。
	 * 返回：GPUCanvasContext（渲染上下文）。
	 */
	getContext() { // 获取画布上下文

		return this.context; // 返回内部保存的上下文引用

	} // getContext 结束

	/**
	 * 概要：返回默认渲染通道描述符。
	 * 说明：在 WebGPU 中，默认帧缓冲也需像自定义帧缓冲那样配置，因此即便直接渲染到屏幕也需要渲染通道描述符。
	 * 返回：Object（渲染通道描述符）。
	 * @private
	 */
	_getDefaultRenderPassDescriptor() { // 构建/返回默认渲染通道描述符

		let descriptor = this.defaultRenderPassdescriptor; // 读取缓存的描述符

		if ( descriptor === null ) { // 若未创建则初始化一个描述符

			const renderer = this.renderer; // 读取渲染器引用

			descriptor = { // 基础描述符：仅包含颜色附件数组
				colorAttachments: [ {
					view: null // 视图稍后填充
				} ],
			};

			if ( this.renderer.depth === true || this.renderer.stencil === true ) { // 若需要深度/模板附件

				descriptor.depthStencilAttachment = { // 配置深度模板附件视图
					view: this.textureUtils.getDepthBuffer( renderer.depth, renderer.stencil ).createView()
				};

			} // 深度/模板附件配置结束

			const colorAttachment = descriptor.colorAttachments[ 0 ]; // 缓存颜色附件引用

			if ( this.renderer.samples > 0 ) { // 多重采样开启时

				colorAttachment.view = this.colorBuffer.createView(); // 使用多采样颜色缓冲的视图

			} else { // 非多采样路径

				colorAttachment.resolveTarget = undefined; // 无需解析目标

			} // 多采样条件结束

			this.defaultRenderPassdescriptor = descriptor; // 缓存默认描述符

		} // 默认描述符初始化结束

		const colorAttachment = descriptor.colorAttachments[ 0 ]; // 取出颜色附件引用

		if ( this.renderer.samples > 0 ) { // 多重采样：设置解析目标为当前画布纹理视图

			colorAttachment.resolveTarget = this.context.getCurrentTexture().createView(); // 指向当前帧画布纹理视图

		} else { // 非多采样：直接将颜色附件视图设置为当前画布视图

			colorAttachment.view = this.context.getCurrentTexture().createView(); // 使用当前帧画布纹理视图

		} // 分支结束

		return descriptor; // 返回可用于开启渲染通道的描述符

	} // _getDefaultRenderPassDescriptor 结束

	/**
	 * 概要：判断当前渲染目标是否为“深度为 2D 数组纹理”的渲染目标数组（内部使用）。
	 * 参数：
	 *   - {RenderContext} renderContext：渲染上下文。
	 * 返回：boolean（是否为数组相机且深度纹理维度大于 1）。
	 * @private
	 */
	_isRenderCameraDepthArray( renderContext ) { // 检查目标是否为数组相机的深度数组纹理

		return renderContext.depthTexture && renderContext.depthTexture.image.depth > 1 && renderContext.camera.isArrayCamera; // 同时满足深度纹理存在、深度>1、相机为数组相机

	} // _isRenderCameraDepthArray 结束

	/**
	 * 概要：根据渲染上下文返回对应的渲染通道描述符。
	 * 参数：
	 *   - {RenderContext} renderContext：渲染上下文。
	 *   - {Object} colorAttachmentsConfig：颜色附件配置对象。
	 * 返回：Object（渲染通道描述符）。
	 * @private
	 */
	_getRenderPassDescriptor( renderContext, colorAttachmentsConfig = {} ) { // 构建针对特定渲染目标的描述符

		const renderTarget = renderContext.renderTarget; // 当前渲染目标
		const renderTargetData = this.get( renderTarget ); // 获取与该目标关联的缓存数据

		let descriptors = renderTargetData.descriptors; // 可能按不同条件缓存的描述符集合

		if ( descriptors === undefined ||
			renderTargetData.width !== renderTarget.width ||
			renderTargetData.height !== renderTarget.height ||
			renderTargetData.dimensions !== renderTarget.dimensions ||
			renderTargetData.activeMipmapLevel !== renderContext.activeMipmapLevel ||
			renderTargetData.activeCubeFace !== renderContext.activeCubeFace ||
			renderTargetData.samples !== renderTarget.samples
		) { // 若尺寸/维度/状态发生变化或未初始化，则重建描述符缓存

			descriptors = {}; // 初始化新的描述符映射

			renderTargetData.descriptors = descriptors;

			// dispose

			const onDispose = () => {

				renderTarget.removeEventListener( 'dispose', onDispose );
				this.delete( renderTarget );

			};

			if ( renderTarget.hasEventListener( 'dispose', onDispose ) === false ) {

				renderTarget.addEventListener( 'dispose', onDispose );

			}

		}

		const cacheKey = renderContext.getCacheKey();
		let descriptorBase = descriptors[ cacheKey ];

		if ( descriptorBase === undefined ) {

			const textures = renderContext.textures;
			const textureViews = [];

			let sliceIndex;

			const isRenderCameraDepthArray = this._isRenderCameraDepthArray( renderContext );

			for ( let i = 0; i < textures.length; i ++ ) {

				const textureData = this.get( textures[ i ] );

				const viewDescriptor = {
					label: `colorAttachment_${ i }`,
					baseMipLevel: renderContext.activeMipmapLevel,
					mipLevelCount: 1,
					baseArrayLayer: renderContext.activeCubeFace,
					arrayLayerCount: 1,
					dimension: GPUTextureViewDimension.TwoD
				};

				if ( renderTarget.isRenderTarget3D ) {

					sliceIndex = renderContext.activeCubeFace;

					viewDescriptor.baseArrayLayer = 0;
					viewDescriptor.dimension = GPUTextureViewDimension.ThreeD;
					viewDescriptor.depthOrArrayLayers = textures[ i ].image.depth;

				} else if ( renderTarget.isRenderTarget && textures[ i ].image.depth > 1 ) {

					if ( isRenderCameraDepthArray === true ) {

						const cameras = renderContext.camera.cameras;
						for ( let layer = 0; layer < cameras.length; layer ++ ) {

							const layerViewDescriptor = {
								...viewDescriptor,
								baseArrayLayer: layer,
								arrayLayerCount: 1,
								dimension: GPUTextureViewDimension.TwoD
							};
							const textureView = textureData.texture.createView( layerViewDescriptor );
							textureViews.push( {
								view: textureView,
								resolveTarget: undefined,
								depthSlice: undefined
							} );

						}

					} else {

						viewDescriptor.dimension = GPUTextureViewDimension.TwoDArray;
						viewDescriptor.depthOrArrayLayers = textures[ i ].image.depth;

					}

				}

				if ( isRenderCameraDepthArray !== true ) {

					const textureView = textureData.texture.createView( viewDescriptor );

					let view, resolveTarget;

					if ( textureData.msaaTexture !== undefined ) {

						view = textureData.msaaTexture.createView();
						resolveTarget = textureView;

					} else {

						view = textureView;
						resolveTarget = undefined;

					}

					textureViews.push( {
						view,
						resolveTarget,
						depthSlice: sliceIndex
					} );

				}

			}

			descriptorBase = { textureViews };

			if ( renderContext.depth ) {

				const depthTextureData = this.get( renderContext.depthTexture );
				const options = {};
				if ( renderContext.depthTexture.isArrayTexture ) {

					options.dimension = GPUTextureViewDimension.TwoD;
					options.arrayLayerCount = 1;
					options.baseArrayLayer = renderContext.activeCubeFace;

				}

				descriptorBase.depthStencilView = depthTextureData.texture.createView( options ); // 为深度/模板纹理创建视图

			} // 深度/模板视图创建结束

			descriptors[ cacheKey ] = descriptorBase; // 缓存该组合条件下的基础视图信息

			renderTargetData.width = renderTarget.width; // 同步缓存的宽度
			renderTargetData.height = renderTarget.height; // 同步缓存的高度
			renderTargetData.samples = renderTarget.samples; // 同步缓存的采样数
			renderTargetData.activeMipmapLevel = renderContext.activeMipmapLevel; // 当前 mip 级别
			renderTargetData.activeCubeFace = renderContext.activeCubeFace; // 当前立方体面索引
			renderTargetData.dimensions = renderTarget.dimensions; // 维度（2D/3D/数组）

		} // 若需重建，已更新缓存

		const descriptor = {
			colorAttachments: [] // 颜色附件数组（稍后填充）
		}; // 渲染通道描述符初始结构

		// 将动态属性应用到已缓存的视图
		for ( let i = 0; i < descriptorBase.textureViews.length; i ++ ) { // 遍历每个颜色视图

			const viewInfo = descriptorBase.textureViews[ i ]; // 当前颜色视图信息

			let clearValue = { r: 0, g: 0, b: 0, a: 1 }; // 默认清屏颜色
			if ( i === 0 && colorAttachmentsConfig.clearValue ) { // 仅对第 0 个颜色附件允许自定义清屏颜色

				clearValue = colorAttachmentsConfig.clearValue; // 使用外部提供的清屏颜色

			} // 清屏颜色确定结束

			descriptor.colorAttachments.push( { // 追加一个颜色附件配置
				view: viewInfo.view, // 颜色视图
				depthSlice: viewInfo.depthSlice, // 视图的深度切片（如为 3D/数组）
				resolveTarget: viewInfo.resolveTarget, // 多采样解析目标（若有）
				loadOp: colorAttachmentsConfig.loadOp || GPULoadOp.Load, // 加载操作（默认加载）
				storeOp: colorAttachmentsConfig.storeOp || GPUStoreOp.Store, // 存储操作（默认存储）
				clearValue: clearValue // 清屏颜色
			} );

		} // 遍历颜色视图结束

		if ( descriptorBase.depthStencilView ) { // 若存在深度/模板视图

			descriptor.depthStencilAttachment = { // 配置深度/模板附件
				view: descriptorBase.depthStencilView
			};

		} // 深度/模板附件处理结束

		return descriptor; // 返回最终渲染通道描述符

	} // _getRenderPassDescriptor 结束

	/**
	 * 概要：在一次渲染开始时执行，准备后续绘制所需的 WebGPU 状态。
	 * 参数：
	 *   - {RenderContext} renderContext：渲染上下文。
	 * 返回：无。
	 */
	beginRender( renderContext ) { // 渲染开始阶段的状态准备

		const renderContextData = this.get( renderContext ); // 获取渲染上下文关联的数据缓存

		const device = this.device; // 当前 GPU 设备
		const occlusionQueryCount = renderContext.occlusionQueryCount; // 本次需要的遮挡查询数量

		let occlusionQuerySet; // 将要创建的遮挡查询集

		if ( occlusionQueryCount > 0 ) { // 需要进行遮挡查询时

			if ( renderContextData.currentOcclusionQuerySet ) renderContextData.currentOcclusionQuerySet.destroy(); // 释放上一帧的查询集
			if ( renderContextData.currentOcclusionQueryBuffer ) renderContextData.currentOcclusionQueryBuffer.destroy(); // 释放上一帧的查询缓冲

			// 获取包含查询对象数组的引用。注意：在 buffer.mapAsync() 完成前，renderContextData 可能被其他渲染过程修改。
			renderContextData.currentOcclusionQuerySet = renderContextData.occlusionQuerySet; // 记录当前查询集
			renderContextData.currentOcclusionQueryBuffer = renderContextData.occlusionQueryBuffer; // 记录当前查询缓冲
			renderContextData.currentOcclusionQueryObjects = renderContextData.occlusionQueryObjects; // 记录当前查询对象数组

			// 创建新的遮挡查询集

			occlusionQuerySet = device.createQuerySet( { type: 'occlusion', count: occlusionQueryCount, label: `occlusionQuerySet_${ renderContext.id }` } ); // 根据需求数量创建查询集

			renderContextData.occlusionQuerySet = occlusionQuerySet; // 保存查询集
			renderContextData.occlusionQueryIndex = 0; // 重置查询索引
			renderContextData.occlusionQueryObjects = new Array( occlusionQueryCount ); // 重建对象数组

			renderContextData.lastOcclusionObject = null; // 重置上一个遮挡对象引用

		} // 遮挡查询初始化结束

		let descriptor; // 将要使用的渲染通道描述符

		if ( renderContext.textures === null ) { // 直接渲染到默认帧缓冲

			descriptor = this._getDefaultRenderPassDescriptor(); // 获取默认通道描述符

		} else { // 渲染到自定义渲染目标

			descriptor = this._getRenderPassDescriptor( renderContext, { loadOp: GPULoadOp.Load } ); // 获取对应目标的描述符（默认加载）

		} // 渲染通道描述符选择结束

		this.initTimestampQuery( renderContext, descriptor ); // 初始化时间戳查询（若启用）

		descriptor.occlusionQuerySet = occlusionQuerySet; // 将遮挡查询集附加到描述符

		const depthStencilAttachment = descriptor.depthStencilAttachment; // 便捷引用深度/模板附件

		if ( renderContext.textures !== null ) { // 自定义渲染目标路径

			const colorAttachments = descriptor.colorAttachments; // 颜色附件数组

			for ( let i = 0; i < colorAttachments.length; i ++ ) { // 遍历每个颜色附件

				const colorAttachment = colorAttachments[ i ]; // 当前颜色附件

				if ( renderContext.clearColor ) { // 根据 clearColor 决定清屏逻辑

					colorAttachment.clearValue = i === 0 ? renderContext.clearColorValue : { r: 0, g: 0, b: 0, a: 1 }; // 第 0 个使用指定清屏，其余为默认
					colorAttachment.loadOp = GPULoadOp.Clear; // 设置为清除操作

				} else { // 不清屏，加载已有内容

					colorAttachment.loadOp = GPULoadOp.Load; // 设置为加载操作

				}

				colorAttachment.storeOp = GPUStoreOp.Store;

			}

		} else {

			const colorAttachment = descriptor.colorAttachments[ 0 ];

			if ( renderContext.clearColor ) {

				colorAttachment.clearValue = renderContext.clearColorValue;
				colorAttachment.loadOp = GPULoadOp.Clear;

			} else {

				colorAttachment.loadOp = GPULoadOp.Load;

			}

		  	colorAttachment.storeOp = GPUStoreOp.Store;

		}

		//

		if ( renderContext.depth ) {

			if ( renderContext.clearDepth ) {

				depthStencilAttachment.depthClearValue = renderContext.clearDepthValue;
				depthStencilAttachment.depthLoadOp = GPULoadOp.Clear;

			} else {

				depthStencilAttachment.depthLoadOp = GPULoadOp.Load;

			}

		  depthStencilAttachment.depthStoreOp = GPUStoreOp.Store;

		}

		if ( renderContext.stencil ) {

		  if ( renderContext.clearStencil ) {

				depthStencilAttachment.stencilClearValue = renderContext.clearStencilValue;
				depthStencilAttachment.stencilLoadOp = GPULoadOp.Clear;

			} else {

				depthStencilAttachment.stencilLoadOp = GPULoadOp.Load;

			}

		  depthStencilAttachment.stencilStoreOp = GPUStoreOp.Store;

		}

		//

		const encoder = device.createCommandEncoder( { label: 'renderContext_' + renderContext.id } );

		// shadow arrays - prepare bundle encoders for each camera in an array camera

		if ( this._isRenderCameraDepthArray( renderContext ) === true ) {

			const cameras = renderContext.camera.cameras;

			if ( ! renderContextData.layerDescriptors || renderContextData.layerDescriptors.length !== cameras.length ) {

				this._createDepthLayerDescriptors( renderContext, renderContextData, descriptor, cameras );

			} else {

				this._updateDepthLayerDescriptors( renderContext, renderContextData, cameras );

			}

			// Create bundle encoders for each layer
			renderContextData.bundleEncoders = [];
			renderContextData.bundleSets = [];

			// Create separate bundle encoders for each camera in the array
			for ( let i = 0; i < cameras.length; i ++ ) {

				const bundleEncoder = this.pipelineUtils.createBundleEncoder(
					renderContext,
					'renderBundleArrayCamera_' + i
				);

				// Initialize state tracking for this bundle
				const bundleSets = {
					attributes: {},
					bindingGroups: [],
					pipeline: null,
					index: null
				};

				renderContextData.bundleEncoders.push( bundleEncoder );
				renderContextData.bundleSets.push( bundleSets );

			}

			// We'll complete the bundles in finishRender
			// 中文：渲染包稍后在 finishRender 中完成与提交
			renderContextData.currentPass = null; // 数组相机路径下，当前渲染通道先置空，稍后按层执行

		} else { // 非数组相机：直接开启渲染通道

			const currentPass = encoder.beginRenderPass( descriptor ); // 基于描述符开启渲染通道
			renderContextData.currentPass = currentPass; // 保存当前渲染通道引用

			if ( renderContext.viewport ) { // 若设置了视口，则更新视口

				this.updateViewport( renderContext ); // 同步视口到当前通道

			} // 视口设置结束

			if ( renderContext.scissor ) { // 若设置了裁剪矩形，则应用

				const { x, y, width, height } = renderContext.scissorValue; // 读取裁剪矩形参数
				currentPass.setScissorRect( x, y, width, height ); // 设置裁剪矩形

			} // 裁剪矩形设置结束

		} // 非数组相机路径结束

		// 保存本次渲染通道与状态集合引用

		renderContextData.descriptor = descriptor; // 存储渲染通道描述符
		renderContextData.encoder = encoder; // 存储命令编码器
		renderContextData.currentSets = { attributes: {}, bindingGroups: [], pipeline: null, index: null }; // 初始化状态集合缓存
		renderContextData.renderBundles = []; // 存放待执行的渲染包

	}

/**
 * 概要：为数组相机的每个子相机创建一份渲染通道描述符，用于渲染到“深度数组纹理”。
 * 参数：
 *   - {RenderContext} renderContext：渲染上下文。
 *   - {Object} renderContextData：渲染上下文缓存数据。
 *   - {Object} descriptor：基础渲染通道描述符。
 *   - {ArrayCamera} cameras：数组相机对象。
 * 返回：无。
 * @private
 */
	_createDepthLayerDescriptors( renderContext, renderContextData, descriptor, cameras ) { // 创建每层的描述符

		const depthStencilAttachment = descriptor.depthStencilAttachment; // 基础深度/模板附件引用
		renderContextData.layerDescriptors = []; // 初始化层级描述符数组

		const depthTextureData = this.get( renderContext.depthTexture ); // 获取深度纹理的内部数据
		if ( ! depthTextureData.viewCache ) { // 若未有视图缓存则创建

			depthTextureData.viewCache = []; // 初始化视图缓存数组

		} // 视图缓存初始化结束

		for ( let i = 0; i < cameras.length; i ++ ) { // 遍历每个子相机（对应数组纹理层）

			const layerDescriptor = { // 克隆基础描述符，替换颜色视图为该层视图
				...descriptor,
				colorAttachments: [ {
					...descriptor.colorAttachments[ 0 ],
					view: descriptor.colorAttachments[ i ].view
				} ]
			};

			if ( descriptor.depthStencilAttachment ) { // 若有深度/模板附件

				const layerIndex = i; // 当前层索引

				if ( ! depthTextureData.viewCache[ layerIndex ] ) { // 缓存中无该层视图则创建

					depthTextureData.viewCache[ layerIndex ] = depthTextureData.texture.createView( { // 创建该层的 2D 视图
						dimension: GPUTextureViewDimension.TwoD,
						baseArrayLayer: i,
						arrayLayerCount: 1
					} );

				} // 层视图创建完毕

				layerDescriptor.depthStencilAttachment = { // 配置该层的深度/模板附件
					view: depthTextureData.viewCache[ layerIndex ],
					depthLoadOp: depthStencilAttachment.depthLoadOp || GPULoadOp.Clear,
					depthStoreOp: depthStencilAttachment.depthStoreOp || GPUStoreOp.Store,
					depthClearValue: depthStencilAttachment.depthClearValue || 1.0
				};

				if ( renderContext.stencil ) { // 启用模板时，同步模板操作

					layerDescriptor.depthStencilAttachment.stencilLoadOp = depthStencilAttachment.stencilLoadOp; // 模板加载操作
					layerDescriptor.depthStencilAttachment.stencilStoreOp = depthStencilAttachment.stencilStoreOp; // 模板存储操作
					layerDescriptor.depthStencilAttachment.stencilClearValue = depthStencilAttachment.stencilClearValue; // 模板清除值

				} // 模板配置结束

			} else { // 无深度/模板附件时，浅拷贝即可

				layerDescriptor.depthStencilAttachment = { ...depthStencilAttachment }; // 复制附件定义

			} // 分支结束

			renderContextData.layerDescriptors.push( layerDescriptor ); // 推入层描述符数组

		} // 遍历每层结束

	} // _createDepthLayerDescriptors 结束

/**
 * 概要：更新数组相机的每层描述符，以便渲染到深度数组纹理。
 * 参数：
 *   - {RenderContext} renderContext：渲染上下文。
 *   - {Object} renderContextData：渲染上下文缓存数据。
 *   - {ArrayCamera} cameras：数组相机。
 * 返回：无。
 */
	_updateDepthLayerDescriptors( renderContext, renderContextData, cameras ) { // 更新每层的通道配置

		for ( let i = 0; i < cameras.length; i ++ ) { // 遍历每层

			const layerDescriptor = renderContextData.layerDescriptors[ i ]; // 获取该层的描述符

			if ( layerDescriptor.depthStencilAttachment ) { // 若存在深度/模板附件

				const depthAttachment = layerDescriptor.depthStencilAttachment; // 快捷引用

				if ( renderContext.depth ) { // 深度处理

					if ( renderContext.clearDepth ) { // 清除深度

						depthAttachment.depthClearValue = renderContext.clearDepthValue; // 清除值
						depthAttachment.depthLoadOp = GPULoadOp.Clear; // 设为清除

					} else { // 加载深度

						depthAttachment.depthLoadOp = GPULoadOp.Load; // 设为加载

					} // 深度分支结束

				} // 若渲染深度

				if ( renderContext.stencil ) { // 模板处理

					if ( renderContext.clearStencil ) { // 清除模板

						depthAttachment.stencilClearValue = renderContext.clearStencilValue; // 清除值
						depthAttachment.stencilLoadOp = GPULoadOp.Clear; // 设为清除

					} else { // 加载模板

						depthAttachment.stencilLoadOp = GPULoadOp.Load; // 设为加载

					} // 模板分支结束

				} // 若渲染模板

			} // 若有附件

		} // 遍历结束

	} // _updateDepthLayerDescriptors 结束

/**
 * 概要：在一次渲染结束时执行，收尾提交命令、解析遮挡查询、生成 mipmaps 等。
 * 参数：
 *   - {RenderContext} renderContext：渲染上下文。
 * 返回：无。
 */
	finishRender( renderContext ) { // 渲染结束收尾

		const renderContextData = this.get( renderContext ); // 获取上下文缓存
		const occlusionQueryCount = renderContext.occlusionQueryCount; // 遮挡查询数量

		if ( renderContextData.renderBundles.length > 0 ) { // 若存在渲染包，执行之

			renderContextData.currentPass.executeBundles( renderContextData.renderBundles ); // 执行所有渲染包

		} // 渲染包执行结束

		if ( occlusionQueryCount > renderContextData.occlusionQueryIndex ) { // 若仍有未结束的遮挡查询

			renderContextData.currentPass.endOcclusionQuery(); // 结束当前遮挡查询

		} // 遮挡查询收尾结束

		// shadow arrays - Execute bundles for each layer
		// 中文：数组相机路径——为每个层执行对应的渲染包

		const encoder = renderContextData.encoder; // 命令编码器

		if ( this._isRenderCameraDepthArray( renderContext ) === true ) { // 深度数组相机路径

		  const bundles = []; // 累积每层生成的渲染包

		  for ( let i = 0; i < renderContextData.bundleEncoders.length; i ++ ) { // 结束每个层的包编码

				const bundleEncoder = renderContextData.bundleEncoders[ i ]; // 取该层的包编码器
				bundles.push( bundleEncoder.finish() ); // 完成编码，存入列表

			} // 遍历包编码器结束

		  for ( let i = 0; i < renderContextData.layerDescriptors.length; i ++ ) { // 逐层开启通道并执行包

				if ( i < bundles.length ) { // 若存在对应层的包

					const layerDescriptor = renderContextData.layerDescriptors[ i ]; // 取层描述符
					const renderPass = encoder.beginRenderPass( layerDescriptor ); // 开启层渲染通道

					if ( renderContext.viewport ) { // 应用视口设置

						const { x, y, width, height, minDepth, maxDepth } = renderContext.viewportValue; // 解构视口参数
						renderPass.setViewport( x, y, width, height, minDepth, maxDepth ); // 设置视口

					} // 视口结束

					if ( renderContext.scissor ) { // 应用裁剪矩形

						const { x, y, width, height } = renderContext.scissorValue; // 解构裁剪参数
						renderPass.setScissorRect( x, y, width, height ); // 设置裁剪矩形

					} // 裁剪结束

					renderPass.executeBundles( [ bundles[ i ] ] ); // 执行该层的渲染包

					renderPass.end(); // 结束该层的渲染通道

				} // 若存在包

			} // 遍历层描述符结束

		} else if ( renderContextData.currentPass ) { // 非数组相机路径：若存在当前通道则结束

		  renderContextData.currentPass.end(); // 结束当前渲染通道

		} // 分支结束

		if ( occlusionQueryCount > 0 ) { // 若有遮挡查询，需要解析结果

			const bufferSize = occlusionQueryCount * 8; // 查询结果每项 8 字节，计算缓冲区大小

			// 为 QUERY_RESOLVE 分配/复用缓冲区

			let queryResolveBuffer = this.occludedResolveCache.get( bufferSize ); // 尝试复用缓存的解析缓冲

			if ( queryResolveBuffer === undefined ) { // 无缓存则创建新的解析缓冲

				queryResolveBuffer = this.device.createBuffer( // 创建仅用于 QUERY_RESOLVE 的缓冲
					{
						size: bufferSize, // 大小
						usage: GPUBufferUsage.QUERY_RESOLVE | GPUBufferUsage.COPY_SRC // 允许解析并作为拷贝源
					}
				);

				this.occludedResolveCache.set( bufferSize, queryResolveBuffer ); // 缓存该尺寸的解析缓冲

			} // 解析缓冲准备结束

			// 创建可映射读取的缓冲，用于从解析缓冲拷贝结果

			const readBuffer = this.device.createBuffer( // 创建 CPU 可读的缓冲
				{
						size: bufferSize, // 大小
						usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ // 作为拷贝目标并允许映射读取
				}
			);

			// 这里需要两个缓冲：WebGPU 不允许 QUERY_RESOLVE 与 MAP_READ 同时用于一个缓冲
			renderContextData.encoder.resolveQuerySet( renderContextData.occlusionQuerySet, 0, occlusionQueryCount, queryResolveBuffer, 0 ); // 解析查询集到解析缓冲
			renderContextData.encoder.copyBufferToBuffer( queryResolveBuffer, 0, readBuffer, 0, bufferSize ); // 再拷贝到可读缓冲

			renderContextData.occlusionQueryBuffer = readBuffer; // 保存本帧的可读查询结果缓冲

			// 异步解析遮挡结果（不阻塞提交）

			this.resolveOccludedAsync( renderContext ); // 异步处理遮挡查询结果

		} // 遮挡查询解析结束

		this.device.queue.submit( [ renderContextData.encoder.finish() ] ); // 提交命令缓冲到 GPU 队列


		// 针对渲染到纹理的情况，必要时为目标纹理生成 mipmaps

		if ( renderContext.textures !== null ) { // 有自定义渲染目标纹理

			const textures = renderContext.textures; // 取目标纹理列表

			for ( let i = 0; i < textures.length; i ++ ) { // 遍历每个目标纹理

				const texture = textures[ i ]; // 当前纹理

				if ( texture.generateMipmaps === true ) { // 若开启生成 mipmaps

					this.textureUtils.generateMipmaps( texture ); // 生成 mipmaps

				} // 分支结束

			} // 遍历结束

		} // 自定义目标纹理的 mipmaps 处理结束

	}

/**
 * 概要：判断给定 3D 物体是否被场景中其他物体完全遮挡。
 * 参数：
 *   - {RenderContext} renderContext：渲染上下文。
 *   - {Object3D} object：待检测的 3D 物体。
 * 返回：boolean（是否完全被遮挡）。
 */
	isOccluded( renderContext, object ) { // 遮挡判定

		const renderContextData = this.get( renderContext ); // 获取上下文缓存

		return renderContextData.occluded && renderContextData.occluded.has( object ); // 若存在遮挡集合且包含该对象则为遮挡

	} // isOccluded 结束

/**
 * 概要：处理遮挡查询的结果并写回到渲染上下文数据中。
 * 参数：
 *   - {RenderContext} renderContext：渲染上下文。
 * 返回：Promise（当遮挡查询结果处理完成时 resolve）。
 * @async
 */
	async resolveOccludedAsync( renderContext ) { // 异步解析遮挡结果

		const renderContextData = this.get( renderContext ); // 获取上下文缓存

		// handle occlusion query results
		// 中文：处理遮挡查询结果

		const { currentOcclusionQueryBuffer, currentOcclusionQueryObjects } = renderContextData; // 读取当前帧的查询缓冲与对象数组

		if ( currentOcclusionQueryBuffer && currentOcclusionQueryObjects ) { // 若存在查询数据

			const occluded = new WeakSet(); // 记录被完全遮挡的对象集合

			renderContextData.currentOcclusionQueryObjects = null; // 释放对对象数组的引用
			renderContextData.currentOcclusionQueryBuffer = null; // 释放对缓冲的引用

			await currentOcclusionQueryBuffer.mapAsync( GPUMapMode.READ ); // 映射缓冲到 CPU 可读

			const buffer = currentOcclusionQueryBuffer.getMappedRange(); // 获取映射内存视图
			const results = new BigUint64Array( buffer ); // 以 64 位无符号整型数组读取结果

			for ( let i = 0; i < currentOcclusionQueryObjects.length; i ++ ) { // 遍历每个查询对象

				if ( results[ i ] === BigInt( 0 ) ) { // 为 0 表示完全遮挡（无可见像素）

					occluded.add( currentOcclusionQueryObjects[ i ] ); // 将该对象加入遮挡集合

				} // 分支结束

			} // 遍历结束

			currentOcclusionQueryBuffer.destroy(); // 销毁可读缓冲

			renderContextData.occluded = occluded; // 保存遮挡结果集合

		} // 若存在查询数据

	} // resolveOccludedAsync 结束

/**
 * 概要：根据渲染上下文设置当前渲染通道的视口。
 * 参数：
 *   - {RenderContext} renderContext：渲染上下文。
 * 返回：无。
 */
	updateViewport( renderContext ) { // 更新视口

		const { currentPass } = this.get( renderContext ); // 当前渲染通道
		const { x, y, width, height, minDepth, maxDepth } = renderContext.viewportValue; // 视口参数

		currentPass.setViewport( x, y, width, height, minDepth, maxDepth ); // 应用视口

	} // updateViewport 结束

/**
 * 概要：返回包含颜色与透明度的清屏颜色对象。
 * 返回：Color4（清屏颜色）。
 */
	getClearColor() { // 获取清屏颜色

		const clearColor = super.getClearColor(); // 从父类获取清屏颜色

		// only premultiply alpha when alphaMode is "premultiplied"
		// 中文：仅当 alphaMode 为 "premultiplied" 时才进行预乘

		if ( this.renderer.alpha === true ) { // 预乘透明度（与上下文 alphaMode 匹配）

			clearColor.r *= clearColor.a; // R 乘以 A
			clearColor.g *= clearColor.a; // G 乘以 A
			clearColor.b *= clearColor.a; // B 乘以 A

		} // 预乘结束

		return clearColor; // 返回清屏颜色

	} // getClearColor 结束

/**
 * 概要：执行清屏操作。
 * 参数：
 *   - {boolean} color：是否清除颜色缓冲。
 *   - {boolean} depth：是否清除深度缓冲。
 *   - {boolean} stencil：是否清除模板缓冲。
 *   - {?RenderContext} [renderTargetContext=null]：当前设置的渲染目标的渲染上下文；为空表示默认帧缓冲。
 * 返回：无。
 */
	clear( color, depth, stencil, renderTargetContext = null ) { // 清屏操作入口

		const device = this.device; // 设备引用（未直接使用，保留一致性）
		const renderer = this.renderer; // 渲染器引用

		let colorAttachments = []; // 颜色附件数组
		let depthStencilAttachment; // 深度/模板附件引用
		let clearValue; // 清屏颜色值

		let supportsDepth; // 是否支持/启用深度
		let supportsStencil; // 是否支持/启用模板

		if ( color ) { // 需要清颜色时，准备清屏颜色

			const clearColor = this.getClearColor(); // 读取清屏颜色
			clearValue = { r: clearColor.r, g: clearColor.g, b: clearColor.b, a: clearColor.a }; // 转为结构体

		} // 颜色清屏值准备结束

		if ( renderTargetContext === null ) { // 默认帧缓冲路径

			supportsDepth = renderer.depth; // 是否有深度缓冲
			supportsStencil = renderer.stencil; // 是否有模板缓冲

			const descriptor = this._getDefaultRenderPassDescriptor(); // 取默认渲染通道描述符

			if ( color ) { // 配置颜色附件清屏

				colorAttachments = descriptor.colorAttachments; // 颜色附件数组

				const colorAttachment = colorAttachments[ 0 ]; // 首个颜色附件

				colorAttachment.clearValue = clearValue; // 设置清屏颜色
				colorAttachment.loadOp = GPULoadOp.Clear; // 清除操作
				colorAttachment.storeOp = GPUStoreOp.Store; // 存储结果

			} // 颜色附件配置结束

			if ( supportsDepth || supportsStencil ) { // 若包含深度或模板附件

				depthStencilAttachment = descriptor.depthStencilAttachment; // 取深度/模板附件

			} // 深度/模板引用获取结束

		} else { // 渲染到自定义渲染目标路径

			supportsDepth = renderTargetContext.depth; // 目标是否启用深度
			supportsStencil = renderTargetContext.stencil; // 目标是否启用模板

			const clearConfig = { // 构建清屏配置
				loadOp: color ? GPULoadOp.Clear : GPULoadOp.Load, // 颜色附件加载操作
				clearValue: color ? clearValue : undefined // 清屏颜色（如需）
			};

			if ( supportsDepth ) { // 目标有深度附件时

				clearConfig.depthLoadOp = depth ? GPULoadOp.Clear : GPULoadOp.Load; // 深度加载/清除
				clearConfig.depthClearValue = depth ? renderer.getClearDepth() : undefined; // 深度清除值
				clearConfig.depthStoreOp = GPUStoreOp.Store; // 存储结果

			} // 深度配置结束

			if ( supportsStencil ) { // 目标有模板附件时

				clearConfig.stencilLoadOp = stencil ? GPULoadOp.Clear : GPULoadOp.Load; // 模板加载/清除
				clearConfig.stencilClearValue = stencil ? renderer.getClearStencil() : undefined; // 模板清除值
				clearConfig.stencilStoreOp = GPUStoreOp.Store; // 存储结果

			} // 模板配置结束

			const descriptor = this._getRenderPassDescriptor( renderTargetContext, clearConfig ); // 获取目标的通道描述符

			colorAttachments = descriptor.colorAttachments; // 颜色附件数组
			depthStencilAttachment = descriptor.depthStencilAttachment; // 深度/模板附件

		} // 自定义渲染目标路径结束

		if ( supportsDepth && depthStencilAttachment ) { // 若有深度附件

			if ( depth ) { // 清除深度

				depthStencilAttachment.depthLoadOp = GPULoadOp.Clear; // 清除
				depthStencilAttachment.depthClearValue = renderer.getClearDepth(); // 清除值
				depthStencilAttachment.depthStoreOp = GPUStoreOp.Store; // 存储

			} else { // 不清除深度，仅加载

				depthStencilAttachment.depthLoadOp = GPULoadOp.Load; // 加载
				depthStencilAttachment.depthStoreOp = GPUStoreOp.Store; // 存储

			} // 深度处理结束

		} // 若启用深度

		// 模板缓冲处理

		if ( supportsStencil && depthStencilAttachment ) { // 若有模板附件

			if ( stencil ) { // 清除模板

				depthStencilAttachment.stencilLoadOp = GPULoadOp.Clear; // 清除
				depthStencilAttachment.stencilClearValue = renderer.getClearStencil(); // 清除值
				depthStencilAttachment.stencilStoreOp = GPUStoreOp.Store; // 存储

			} else { // 不清除模板，仅加载

				depthStencilAttachment.stencilLoadOp = GPULoadOp.Load; // 加载
				depthStencilAttachment.stencilStoreOp = GPUStoreOp.Store; // 存储

			} // 模板处理结束

		} // 若启用模板

		//

		const encoder = device.createCommandEncoder( { label: 'clear' } );
		const currentPass = encoder.beginRenderPass( {
			colorAttachments,
			depthStencilAttachment
		} );

		currentPass.end();

		device.queue.submit( [ encoder.finish() ] );

	}

	// compute

	/**
	 * 概要：开始一次计算调用，准备随后的计算任务所需状态。
	 * 参数：
	 *  - {Node|Array<Node>} computeGroup：计算节点或计算节点数组。
	 * 返回：void（仅设置状态，不返回值）。
	 */
	beginCompute( computeGroup ) { // 计算开始：为计算任务准备状态

		const groupGPU = this.get( computeGroup ); // 取出该计算组对应的 GPU 缓存数据

		const descriptor = { // 创建计算通道描述符
			label: 'computeGroup_' + computeGroup.id // 为调试标注唯一标签
		};

		this.initTimestampQuery( computeGroup, descriptor ); // 初始化时间戳查询（若启用性能跟踪）

		groupGPU.cmdEncoderGPU = this.device.createCommandEncoder( { label: 'computeGroup_' + computeGroup.id } ); // 为本次计算创建命令编码器

		groupGPU.passEncoderGPU = groupGPU.cmdEncoderGPU.beginComputePass( descriptor ); // 基于描述符开启计算通道编码

	}

	/**
	 * 概要：对指定计算节点执行一次计算调度。
	 * 参数：
	 *  - {Node|Array<Node>} computeGroup：同一计算调用中的节点组（也可为单个节点）。
	 *  - {Node} computeNode：当前计算节点。
	 *  - {Array<BindGroup>} bindings：需要绑定到管线的绑定组数组。
	 *  - {ComputePipeline} pipeline：计算管线对象。
	 *  - {Array<number>|number} [dispatchSizeOrCount=null]：调度尺寸 [x,y,z] 或元素总数（单数）。
	 * 返回：void。
	 */
	compute( computeGroup, computeNode, bindings, pipeline, dispatchSizeOrCount = null ) { // 执行单次计算调度

		const computeNodeData = this.get( computeNode ); // 获取计算节点的缓存数据
		const { passEncoderGPU } = this.get( computeGroup ); // 获取该计算组的通道编码器

		// pipeline

		const pipelineGPU = this.get( pipeline ).pipeline; // 取出底层 GPU 计算管线

		this.pipelineUtils.setPipeline( passEncoderGPU, pipelineGPU ); // 设置当前计算管线

		// bind groups

		for ( let i = 0, l = bindings.length; i < l; i ++ ) { // 依次绑定所有绑定组

			const bindGroup = bindings[ i ]; // 取出绑定组
			const bindingsData = this.get( bindGroup ); // 获取绑定组的 GPU 数据

			passEncoderGPU.setBindGroup( i, bindingsData.group ); // 在插槽 i 处设置绑定组

		}

		let dispatchSize; // 调度尺寸 [x,y,z]

		if ( dispatchSizeOrCount === null ) { // 未显式给定尺寸/数量

			dispatchSizeOrCount = computeNode.count; // 默认取节点的元素数量

		}

		if ( typeof dispatchSizeOrCount === 'number' ) { // 若给定的是总元素数

			// 若为单个总数，根据工作组大小推导调度尺寸

			const count = dispatchSizeOrCount; // 总元素数量

			if ( computeNodeData.dispatchSize === undefined || computeNodeData.count !== count ) { // 若缓存不存在或数量变化

				// 缓存调度尺寸，避免重复计算

				computeNodeData.dispatchSize = [ 0, 1, 1 ]; // 先占位 [x, y, z]
				computeNodeData.count = count; // 记录数量

				const workgroupSize = computeNode.workgroupSize; // 每个工作组内 [x,y,z] 尺寸

				let size = workgroupSize[ 0 ]; // 初始为 x 方向大小

				for ( let i = 1; i < workgroupSize.length; i ++ ) // 连乘得到单个工作组包含的线程总数
					size *= workgroupSize[ i ]; // size *= 当前轴大小

				const dispatchCount = Math.ceil( count / size ); // 需要的工作组总数（向上取整）

				// 基于设备单维最大工作组数进行拆分

				const maxComputeWorkgroupsPerDimension = this.device.limits.maxComputeWorkgroupsPerDimension; // 单维最大工作组数上限

				dispatchSize = [ dispatchCount, 1, 1 ]; // 默认在 X 维度平铺

				if ( dispatchCount > maxComputeWorkgroupsPerDimension ) { // 若超过单维上限

					dispatchSize[ 0 ] = Math.min( dispatchCount, maxComputeWorkgroupsPerDimension ); // X 维裁剪到上限
					dispatchSize[ 1 ] = Math.ceil( dispatchCount / maxComputeWorkgroupsPerDimension ); // 将剩余分配到 Y 维

				}

				computeNodeData.dispatchSize = dispatchSize; // 写回缓存

			}

			dispatchSize = computeNodeData.dispatchSize; // 使用缓存的调度尺寸

		} else { // 若直接给定了 [x,y,z]

			dispatchSize = dispatchSizeOrCount; // 直接使用传入的尺寸

		}

		// 发起工作组调度

		passEncoderGPU.dispatchWorkgroups( // 提交工作组调度命令
			dispatchSize[ 0 ], // x 方向工作组数
			dispatchSize[ 1 ] || 1, // y 方向工作组数（默认 1）
			dispatchSize[ 2 ] || 1 // z 方向工作组数（默认 1）
		);

	}

	/**
	 * 概要：结束一次计算调用，提交命令并收尾。
	 * 参数：
	 *  - {Node|Array<Node>} computeGroup：计算节点或节点数组。
	 * 返回：void。
	 */
	finishCompute( computeGroup ) { // 计算结束：关闭通道并提交命令

		const groupData = this.get( computeGroup ); // 获取该计算组的 GPU 状态数据

		groupData.passEncoderGPU.end(); // 结束计算通道编码

		this.device.queue.submit( [ groupData.cmdEncoderGPU.finish() ] ); // 完成命令缓冲并提交到队列

	}

	/**
	 * 概要：用于让 CPU 与 GPU 同步，等待 GPU 完成已提交的工作（如计算任务）。
	 * 参数：无。
	 * 返回：Promise（当 GPU 完成时 resolve）。
	 */
	async waitForGPU() { // 等待 GPU 完成提交的工作

		await this.device.queue.onSubmittedWorkDone(); // 等待队列中已提交的命令执行完成

	}

	// render object

	/**
	 * Executes a draw command for the given render object.
	 *
	 * @param {RenderObject} renderObject - The render object to draw.
	 * @param {Info} info - Holds a series of statistical information about the GPU memory and the rendering process.
	 */
	draw( renderObject, info ) {

		const { object, material, context, pipeline } = renderObject;
		const bindings = renderObject.getBindings();
		const renderContextData = this.get( context );
		const pipelineGPU = this.get( pipeline ).pipeline;

		const index = renderObject.getIndex();
		const hasIndex = ( index !== null );


		const drawParams = renderObject.getDrawParameters();
		if ( drawParams === null ) return;

		// pipeline

		const setPipelineAndBindings = ( passEncoderGPU, currentSets ) => {

			// pipeline
			this.pipelineUtils.setPipeline( passEncoderGPU, pipelineGPU );
			currentSets.pipeline = pipelineGPU;

			// bind groups
			const currentBindingGroups = currentSets.bindingGroups;
			for ( let i = 0, l = bindings.length; i < l; i ++ ) {

				const bindGroup = bindings[ i ];
				const bindingsData = this.get( bindGroup );
				if ( currentBindingGroups[ bindGroup.index ] !== bindGroup.id ) {

					passEncoderGPU.setBindGroup( bindGroup.index, bindingsData.group );
					currentBindingGroups[ bindGroup.index ] = bindGroup.id;

				}

			}

			// attributes

			// index

			if ( hasIndex === true ) { // 若存在索引缓冲

				if ( currentSets.index !== index ) {

					const buffer = this.get( index ).buffer; // 取得索引缓冲区对象
					const indexFormat = ( index.array instanceof Uint16Array ) ? GPUIndexFormat.Uint16 : GPUIndexFormat.Uint32; // 根据索引类型选择格式

					passEncoderGPU.setIndexBuffer( buffer, indexFormat ); // 绑定索引缓冲到通道

					currentSets.index = index; // 记录当前已绑定的索引以便缓存

				}

			}
			// vertex buffers

			const vertexBuffers = renderObject.getVertexBuffers(); // 获取需要绑定的顶点缓冲列表

			for ( let i = 0, l = vertexBuffers.length; i < l; i ++ ) { // 遍历各个顶点缓冲插槽

				const vertexBuffer = vertexBuffers[ i ]; // 取出当前插槽的顶点缓冲

				if ( currentSets.attributes[ i ] !== vertexBuffer ) { // 若缓存未命中则重新绑定

					const buffer = this.get( vertexBuffer ).buffer;
					passEncoderGPU.setVertexBuffer( i, buffer );

					currentSets.attributes[ i ] = vertexBuffer; // 记录已绑定的顶点缓冲以便缓存

				}

			}
			// stencil

			if ( context.stencil === true && material.stencilWrite === true && renderContextData.currentStencilRef !== material.stencilRef ) { // 若启用模板并且引用值发生变化

				passEncoderGPU.setStencilReference( material.stencilRef ); // 更新模板参考值
				renderContextData.currentStencilRef = material.stencilRef; // 缓存当前模板参考值

			}


		};

		// Define draw function
		const draw = ( passEncoderGPU, currentSets ) => { // 定义具体的绘制函数

			setPipelineAndBindings( passEncoderGPU, currentSets ); // 确保管线与绑定已就绪

			if ( object.isBatchedMesh === true ) { // 批量网格路径（多段绘制）

				const starts = object._multiDrawStarts; // 每段起始顶点/索引
				const counts = object._multiDrawCounts; // 每段绘制数量
				const drawCount = object._multiDrawCount; // 段数
				const drawInstances = object._multiDrawInstances; // 每段实例数（可选）

				if ( drawInstances !== null ) {

					// @deprecated, r174
					warnOnce( 'THREE.WebGPUBackend: renderMultiDrawInstances has been deprecated and will be removed in r184. Append to renderMultiDraw arguments and use indirection.' ); // 弃用提示（r174 起）

				}

				for ( let i = 0; i < drawCount; i ++ ) { // 遍历每一段进行绘制

					const count = drawInstances ? drawInstances[ i ] : 1; // 本段实例数
					const firstInstance = count > 1 ? 0 : i; // 若多实例从 0 开始，否则用段索引当作实例起点

					if ( hasIndex === true ) {

						passEncoderGPU.drawIndexed( counts[ i ], count, starts[ i ] / index.array.BYTES_PER_ELEMENT, 0, firstInstance ); // 索引绘制本段

					} else {

						passEncoderGPU.draw( counts[ i ], count, starts[ i ], firstInstance ); // 非索引绘制本段

					}

					info.update( object, counts[ i ], count ); // 更新渲染统计

				}

			} else if ( hasIndex === true ) { // 单段索引绘制路径

				const { vertexCount: indexCount, instanceCount, firstVertex: firstIndex } = drawParams; // 解构绘制参数

				const indirect = renderObject.getIndirect(); // 检查是否使用间接绘制

				if ( indirect !== null ) {

					const buffer = this.get( indirect ).buffer;

					passEncoderGPU.drawIndexedIndirect( buffer, 0 );

				} else {

					passEncoderGPU.drawIndexed( indexCount, instanceCount, firstIndex, 0, 0 ); // 索引绘制（间接为空时）

				}

				info.update( object, indexCount, instanceCount ); // 更新渲染统计

			} else {

				const { vertexCount, instanceCount, firstVertex } = drawParams; // 非索引绘制的参数

				const indirect = renderObject.getIndirect(); // 是否间接绘制

				if ( indirect !== null ) {

					const buffer = this.get( indirect ).buffer; // 取得间接参数缓冲

					passEncoderGPU.drawIndirect( buffer, 0 ); // 间接绘制命令

				} else {

					passEncoderGPU.draw( vertexCount, instanceCount, firstVertex, 0 ); // 直接绘制命令

				}

				info.update( object, vertexCount, instanceCount ); // 更新渲染统计

			}

		};

		if ( renderObject.camera.isArrayCamera && renderObject.camera.cameras.length > 0 ) { // 数组相机路径

			const cameraData = this.get( renderObject.camera ); // 相机相关 GPU 数据
			const cameras = renderObject.camera.cameras; // 子相机列表
			const cameraIndex = renderObject.getBindingGroup( 'cameraIndex' ); // 相机索引的绑定组

			if ( cameraData.indexesGPU === undefined || cameraData.indexesGPU.length !== cameras.length ) { // 若尚未创建或数量不匹配则重建

				const bindingsData = this.get( cameraIndex ); // 获取绑定布局
				const indexesGPU = []; // 存放每个子相机的索引绑定

				const data = new Uint32Array( [ 0, 0, 0, 0 ] ); // 暂存写入的索引数据

				for ( let i = 0, len = cameras.length; i < len; i ++ ) { // 为每个子相机创建一个绑定

					data[ 0 ] = i; // 将相机索引写入缓冲

					const bindGroupIndex = this.bindingUtils.createBindGroupIndex( data, bindingsData.layout ); // 基于布局创建绑定组索引

					indexesGPU.push( bindGroupIndex ); // 收集起来

				}

				cameraData.indexesGPU = indexesGPU; // 缓存索引绑定（TODO：可抽到全局库）

			}

			const pixelRatio = this.renderer.getPixelRatio(); // 获取像素比

			for ( let i = 0, len = cameras.length; i < len; i ++ ) { // 逐子相机绘制

				const subCamera = cameras[ i ]; // 当前子相机

				if ( object.layers.test( subCamera.layers ) ) { // 图层过滤通过

					const vp = subCamera.viewport; // 该子相机的视口



					let pass = renderContextData.currentPass; // 默认使用当前渲染通道
					let sets = renderContextData.currentSets; // 当前状态集
					if ( renderContextData.bundleEncoders ) { // 若启用渲染束，切换到对应束编码器

						const bundleEncoder = renderContextData.bundleEncoders[ i ]; // 当前层的束编码器
						const bundleSets = renderContextData.bundleSets[ i ]; // 当前层的状态集
						pass = bundleEncoder; // 使用束编码器绘制
						sets = bundleSets; // 使用束状态集

					}



					if ( vp ) { // 若子相机定义了视口则设置

						pass.setViewport(
							Math.floor( vp.x * pixelRatio ),
							Math.floor( vp.y * pixelRatio ),
							Math.floor( vp.width * pixelRatio ),
							Math.floor( vp.height * pixelRatio ),
							context.viewportValue.minDepth,
							context.viewportValue.maxDepth
						);

					}


					// Set camera index binding for this layer
					if ( cameraIndex && cameraData.indexesGPU ) {

						pass.setBindGroup( cameraIndex.index, cameraData.indexesGPU[ i ] );
					sets.bindingGroups[ cameraIndex.index ] = cameraIndex.id; // 更新该插槽的绑定 id 缓存

					}

					draw( pass, sets ); // 在当前层执行绘制


				} // 若通过图层测试

			} // 遍历子相机完成

		} else { // 非数组相机路径

			// Regular single camera rendering
			if ( renderContextData.currentPass ) { // 若存在当前渲染通道

				// Handle occlusion queries
				if ( renderContextData.occlusionQuerySet !== undefined ) { // 处理遮挡查询切换

					const lastObject = renderContextData.lastOcclusionObject; // 上一对象
					if ( lastObject !== object ) { // 若对象发生切换

						if ( lastObject !== null && lastObject.occlusionTest === true ) { // 若上一个对象参与遮挡测试

							renderContextData.currentPass.endOcclusionQuery(); // 结束上一个遮挡查询
							renderContextData.occlusionQueryIndex ++; // 查询索引递增

						} // 上一对象遮挡收尾

						if ( object.occlusionTest === true ) { // 当前对象参与遮挡测试

							renderContextData.currentPass.beginOcclusionQuery( renderContextData.occlusionQueryIndex ); // 开始新的遮挡查询
							renderContextData.occlusionQueryObjects[ renderContextData.occlusionQueryIndex ] = object; // 记录对象

						} // 当前对象遮挡设置

						renderContextData.lastOcclusionObject = object; // 更新最后对象引用

					} // 对象切换处理结束

				} // 遮挡处理结束

				draw( renderContextData.currentPass, renderContextData.currentSets ); // 执行绘制

			} // 存在当前 pass

		} // 非数组相机分支结束

	} // draw 结束

	// cache key
	// 中文：缓存键

/**
 * 概要：判断渲染管线是否需要更新（材质/上下文/拓扑等变化）。
 * 参数：
 *   - {RenderObject} renderObject：渲染对象。
 * 返回：boolean（是否需要更新管线）。
 */
	needsRenderUpdate( renderObject ) { // 是否需要更新渲染管线

		const data = this.get( renderObject ); // 获取对象缓存

		const { object, material } = renderObject; // 解构对象与材质

		const utils = this.utils; // 工具模块

		const sampleCount = utils.getSampleCountRenderContext( renderObject.context ); // 采样数
		const colorSpace = utils.getCurrentColorSpace( renderObject.context ); // 色彩空间
		const colorFormat = utils.getCurrentColorFormat( renderObject.context ); // 颜色格式
		const depthStencilFormat = utils.getCurrentDepthStencilFormat( renderObject.context ); // 深度模板格式
		const primitiveTopology = utils.getPrimitiveTopology( object, material ); // 图元拓扑

		let needsUpdate = false; // 标记是否需要更新

		if ( data.material !== material || data.materialVersion !== material.version || // 材质或版本变化
			data.transparent !== material.transparent || data.blending !== material.blending || data.premultipliedAlpha !== material.premultipliedAlpha ||
			data.blendSrc !== material.blendSrc || data.blendDst !== material.blendDst || data.blendEquation !== material.blendEquation || // 混合参数变化
			data.blendSrcAlpha !== material.blendSrcAlpha || data.blendDstAlpha !== material.blendDstAlpha || data.blendEquationAlpha !== material.blendEquationAlpha || // Alpha 混合参数变化
			data.colorWrite !== material.colorWrite || data.depthWrite !== material.depthWrite || data.depthTest !== material.depthTest || data.depthFunc !== material.depthFunc || // 深度/颜色写入与测试变化
			data.stencilWrite !== material.stencilWrite || data.stencilFunc !== material.stencilFunc || // 模板写入/函数变化
			data.stencilFail !== material.stencilFail || data.stencilZFail !== material.stencilZFail || data.stencilZPass !== material.stencilZPass || // 模板操作变化
			data.stencilFuncMask !== material.stencilFuncMask || data.stencilWriteMask !== material.stencilWriteMask || // 模板掩码变化
			data.side !== material.side || data.alphaToCoverage !== material.alphaToCoverage || // 面剔除与 Alpha-to-Coverage 变化
			data.sampleCount !== sampleCount || data.colorSpace !== colorSpace || // 采样数/色彩空间变化
			data.colorFormat !== colorFormat || data.depthStencilFormat !== depthStencilFormat || // 颜色/深度模板格式变化
			data.primitiveTopology !== primitiveTopology || // 拓扑变化
			data.clippingContextCacheKey !== renderObject.clippingContextCacheKey // 裁剪上下文缓存键变化
		) { // 若任一条件成立则需要更新

			data.material = material; data.materialVersion = material.version; // 缓存材质与版本
			data.transparent = material.transparent; data.blending = material.blending; data.premultipliedAlpha = material.premultipliedAlpha; // 透明与混合
			data.blendSrc = material.blendSrc; data.blendDst = material.blendDst; data.blendEquation = material.blendEquation; // 混合方程/因子
			data.blendSrcAlpha = material.blendSrcAlpha; data.blendDstAlpha = material.blendDstAlpha; data.blendEquationAlpha = material.blendEquationAlpha; // Alpha 混合参数
			data.colorWrite = material.colorWrite; // 是否写入颜色
			data.depthWrite = material.depthWrite; data.depthTest = material.depthTest; data.depthFunc = material.depthFunc; // 深度设置
			data.stencilWrite = material.stencilWrite; data.stencilFunc = material.stencilFunc; // 模板设置
			data.stencilFail = material.stencilFail; data.stencilZFail = material.stencilZFail; data.stencilZPass = material.stencilZPass; // 模板操作
			data.stencilFuncMask = material.stencilFuncMask; data.stencilWriteMask = material.stencilWriteMask; // 模板掩码
			data.side = material.side; data.alphaToCoverage = material.alphaToCoverage; // 面剔除与 A2C
			data.sampleCount = sampleCount; // 采样数
			data.colorSpace = colorSpace; // 色彩空间
			data.colorFormat = colorFormat; // 颜色格式
			data.depthStencilFormat = depthStencilFormat; // 深度模板格式
			data.primitiveTopology = primitiveTopology; // 图元拓扑
			data.clippingContextCacheKey = renderObject.clippingContextCacheKey; // 裁剪上下文键

			needsUpdate = true; // 标记为需要更新

		} // 条件结束

		return needsUpdate; // 返回是否需要更新

	} // needsRenderUpdate 结束

/**
 * 概要：生成用于标识渲染管线的缓存键。
 * 参数：
 *   - {RenderObject} renderObject：渲染对象。
 * 返回：string（缓存键）。
 */
	getRenderCacheKey( renderObject ) { // 获取渲染管线缓存键

		const { object, material } = renderObject; // 解构对象与材质

		const utils = this.utils; // 工具模块
		const renderContext = renderObject.context; // 渲染上下文

		return [ // 拼接关键状态生成缓存键
			material.transparent, material.blending, material.premultipliedAlpha,
			material.blendSrc, material.blendDst, material.blendEquation,
			material.blendSrcAlpha, material.blendDstAlpha, material.blendEquationAlpha,
			material.colorWrite,
			material.depthWrite, material.depthTest, material.depthFunc,
			material.stencilWrite, material.stencilFunc,
			material.stencilFail, material.stencilZFail, material.stencilZPass,
			material.stencilFuncMask, material.stencilWriteMask,
			material.side,
			utils.getSampleCountRenderContext( renderContext ),
			utils.getCurrentColorSpace( renderContext ), utils.getCurrentColorFormat( renderContext ), utils.getCurrentDepthStencilFormat( renderContext ),
			utils.getPrimitiveTopology( object, material ),
			renderObject.getGeometryCacheKey(),
			renderObject.clippingContextCacheKey
		].join(); // 转为字符串

	} // getRenderCacheKey 结束

	// textures

	/**
	 * Creates a GPU sampler for the given texture.
	 *
	 * @param {Texture} texture - The texture to create the sampler for.
	 */
	createSampler( texture ) {

		this.textureUtils.createSampler( texture );

	}

	/**
	 * Destroys the GPU sampler for the given texture.
	 *
	 * @param {Texture} texture - The texture to destroy the sampler for.
	 */
	destroySampler( texture ) {

		this.textureUtils.destroySampler( texture );

	}

	/**
	 * 概要：为指定纹理创建一个默认纹理，占位以便实际纹理就绪前使用。
	 * 参数：
	 *  - {Texture} texture：目标纹理对象。
	 * 返回：void。
	 */
	createDefaultTexture( texture ) { // 创建默认占位纹理

		this.textureUtils.createDefaultTexture( texture ); // 委托纹理工具创建默认纹理

	}

	/**
	 * 概要：在 GPU 上为给定纹理对象创建底层纹理资源。
	 * 参数：
	 *  - {Texture} texture：纹理对象。
	 *  - {Object} [options={}]：可选配置。
	 * 返回：void。
	 */
	createTexture( texture, options ) { // 创建 GPU 纹理

		this.textureUtils.createTexture( texture, options ); // 委托纹理工具完成创建

	}

	/**
	 * 概要：将已更新的纹理数据上传至 GPU。
	 * 参数：
	 *  - {Texture} texture：纹理对象。
	 *  - {Object} [options={}]：可选配置。
	 * 返回：void。
	 */
	updateTexture( texture, options ) { // 更新 GPU 纹理数据

		this.textureUtils.updateTexture( texture, options ); // 委托纹理工具执行上传

	}

	/**
	 * 概要：为给定纹理生成 mipmap。
	 * 参数：
	 *  - {Texture} texture：纹理对象。
	 * 返回：void。
	 */
	generateMipmaps( texture ) { // 生成 mipmap 级别

		this.textureUtils.generateMipmaps( texture ); // 委托纹理工具生成

	}

	/**
	 * 概要：销毁给定纹理对象在 GPU 上的资源。
	 * 参数：
	 *  - {Texture} texture：纹理对象。
	 * 返回：void。
	 */
	destroyTexture( texture ) { // 销毁 GPU 纹理资源

		this.textureUtils.destroyTexture( texture ); // 委托纹理工具销毁

	}

	/**
	 * 概要：以 TypedArray 的形式返回纹理的像素数据。
	 * 参数：
	 *  - {Texture} texture：要拷贝的纹理。
	 *  - {number} x：拷贝区域起点 X。
	 *  - {number} y：拷贝区域起点 Y。
	 *  - {number} width：拷贝宽度。
	 *  - {number} height：拷贝高度。
	 *  - {number} faceIndex：立方体面索引。
	 * 返回：Promise<TypedArray>（拷贝完成后返回像素数组）。
	 */
	async copyTextureToBuffer( texture, x, y, width, height, faceIndex ) { // 将纹理像素拷贝到 CPU 缓冲

		return this.textureUtils.copyTextureToBuffer( texture, x, y, width, height, faceIndex ); // 委托纹理工具执行并返回结果

	}

	/**
	 * 概要：为给定渲染上下文初始化时间戳查询。
	 * 参数：
	 *  - {RenderContext} renderContext：渲染上下文。
	 *  - {Object} descriptor：查询描述符。
	 * 返回：void。
	 */
	initTimestampQuery( renderContext, descriptor ) { // 初始化时间戳查询

		if ( ! this.trackTimestamp ) return; // 未启用时间跟踪则跳过

		const type = renderContext.isComputeNode ? 'compute' : 'render'; // 根据上下文类型选择池类别

		if ( ! this.timestampQueryPool[ type ] ) { // 若对应查询池尚未创建

			// TODO: 可配置的最大查询数
			this.timestampQueryPool[ type ] = new WebGPUTimestampQueryPool( this.device, type, 2048 ); // 创建时间戳查询池

		}

		const timestampQueryPool = this.timestampQueryPool[ type ]; // 取出查询池

		const baseOffset = timestampQueryPool.allocateQueriesForContext( renderContext ); // 为该上下文分配查询偏移

		descriptor.timestampWrites = {
			querySet: timestampQueryPool.querySet,
			beginningOfPassWriteIndex: baseOffset,
			endOfPassWriteIndex: baseOffset + 1,
		  };

	}


	// node builder

	/**
	 * Returns a node builder for the given render object.
	 *
	 * @param {RenderObject} object - The render object.
	 * @param {Renderer} renderer - The renderer.
	 * @return {WGSLNodeBuilder} The node builder.
	 */
	createNodeBuilder( object, renderer ) {

		return new WGSLNodeBuilder( object, renderer );

	}

	// program

	/**
	 * Creates a shader program from the given programmable stage.
	 *
	 * @param {ProgrammableStage} program - The programmable stage.
	 */
	createProgram( program ) {

		const programGPU = this.get( program );

		programGPU.module = { // 为可编程阶段创建/缓存着色器模块
			module: this.device.createShaderModule( { code: program.code, label: program.stage + ( program.name !== '' ? `_${ program.name }` : '' ) } ), // 基于源码创建 ShaderModule，并设置标签
			entryPoint: 'main' // 入口函数名
		};

	}

	/**
	 * 概要：销毁给定可编程阶段的着色器程序与相关缓存。
	 * 参数：
	 *  - {ProgrammableStage} program：可编程阶段对象。
	 * 返回：void。
	 */
	destroyProgram( program ) { // 销毁着色器程序

		this.delete( program ); // 从资源缓存中删除，触发底层释放

	}

	// pipelines

	/**
	 * 概要：为给定渲染对象创建渲染管线。
	 * 参数：
	 *  - {RenderObject} renderObject：渲染对象。
	 *  - {Array<Promise>} promises：编译期 Promise 列表（用于 compileAsync）。
	 * 返回：void。
	 */
	createRenderPipeline( renderObject, promises ) { // 创建渲染管线

		this.pipelineUtils.createRenderPipeline( renderObject, promises ); // 委托管线工具创建

	}

	/**
	 * 概要：为给定计算节点创建计算管线。
	 * 参数：
	 *  - {ComputePipeline} computePipeline：计算管线。
	 *  - {Array<BindGroup>} bindings：绑定组。
	 * 返回：void。
	 */
	createComputePipeline( computePipeline, bindings ) { // 创建计算管线

		this.pipelineUtils.createComputePipeline( computePipeline, bindings ); // 委托管线工具创建

	}

	/**
	 * 概要：准备状态以便开始编码渲染束（Render Bundle）。
	 * 参数：
	 *  - {RenderContext} renderContext：渲染上下文。
	 * 返回：void。
	 */
	beginBundle( renderContext ) { // 开始渲染束编码

		const renderContextData = this.get( renderContext ); // 取出上下文的 GPU 数据

		renderContextData._currentPass = renderContextData.currentPass; // 备份当前渲染通道
		renderContextData._currentSets = renderContextData.currentSets; // 备份当前状态集

		renderContextData.currentSets = { attributes: {}, bindingGroups: [], pipeline: null, index: null }; // 为束编码初始化独立状态集
		renderContextData.currentPass = this.pipelineUtils.createBundleEncoder( renderContext ); // 创建束编码器作为当前通道

	}

	/**
	 * 概要：结束渲染束编码并恢复原有渲染通道状态。
	 * 参数：
	 *  - {RenderContext} renderContext：渲染上下文。
	 *  - {RenderBundle} bundle：渲染束对象。
	 * 返回：void。
	 */
	finishBundle( renderContext, bundle ) { // 完成束编码并收尾

		const renderContextData = this.get( renderContext ); // 获取上下文数据

		const bundleEncoder = renderContextData.currentPass; // 取得束编码器
		const bundleGPU = bundleEncoder.finish(); // 结束编码，得到 GPU Bundle

		this.get( bundle ).bundleGPU = bundleGPU; // 存入 bundle 对象的 GPU 句柄

		// restore render pass state

		renderContextData.currentSets = renderContextData._currentSets; // 恢复之前的状态集
		renderContextData.currentPass = renderContextData._currentPass; // 恢复之前的渲染通道

	}

	/**
	 * 概要：将渲染束加入到渲染上下文的数据中。
	 * 参数：
	 *  - {RenderContext} renderContext：渲染上下文。
	 *  - {RenderBundle} bundle：要添加的渲染束。
	 * 返回：void。
	 */
	addBundle( renderContext, bundle ) { // 添加渲染束

		const renderContextData = this.get( renderContext ); // 获取上下文数据

		renderContextData.renderBundles.push( this.get( bundle ).bundleGPU ); // 压入 GPU Bundle 以便稍后执行

	}

	// bindings

	/**
	 * Creates bindings from the given bind group definition.
	 *
	 * @param {BindGroup} bindGroup - The bind group.
	 * @param {Array<BindGroup>} bindings - Array of bind groups.
	 * @param {number} cacheIndex - The cache index.
	 * @param {number} version - The version.
	 */
	createBindings( bindGroup, bindings, cacheIndex, version ) {

		this.bindingUtils.createBindings( bindGroup, bindings, cacheIndex, version );

	}

	/**
	 * Updates the given bind group definition.
	 *
	 * @param {BindGroup} bindGroup - The bind group.
	 * @param {Array<BindGroup>} bindings - Array of bind groups.
	 * @param {number} cacheIndex - The cache index.
	 * @param {number} version - The version.
	 */
	updateBindings( bindGroup, bindings, cacheIndex, version ) {

		this.bindingUtils.createBindings( bindGroup, bindings, cacheIndex, version );

	}

	/**
	 * 概要：更新一个缓冲区绑定的 GPU 状态。
	 * 参数：
	 *  - {Buffer} binding：待更新的缓冲区绑定对象。
	 * 返回：void。
	 */
	updateBinding( binding ) { // 更新缓冲区绑定

		this.bindingUtils.updateBinding( binding ); // 委托绑定工具执行更新

	}

	// attributes

	/**
	 * 概要：为索引类型的着色器属性创建 GPU 缓冲。
	 * 参数：
	 *  - {BufferAttribute} attribute：索引属性。
	 * 返回：void。
	 */
	createIndexAttribute( attribute ) { // 创建索引属性的 GPU 缓冲

		let usage = GPUBufferUsage.INDEX | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST; // 基础用途：索引/拷贝源/拷贝目标

		if ( attribute.isStorageBufferAttribute || attribute.isStorageInstancedBufferAttribute ) { // 若同时作为存储缓冲使用

			usage |= GPUBufferUsage.STORAGE; // 增加 STORAGE 用途标记

		}

		this.attributeUtils.createAttribute( attribute, usage ); // 按用途创建缓冲

	}

	/**
	 * 概要：为一般顶点属性创建 GPU 缓冲。
	 * 参数：
	 *  - {BufferAttribute} attribute：顶点属性。
	 * 返回：void。
	 */
	createAttribute( attribute ) { // 创建顶点属性缓冲

		this.attributeUtils.createAttribute( attribute, GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST ); // 用途：顶点/拷贝

	}

	/**
	 * 概要：为存储属性创建 GPU 缓冲（可同时作为顶点缓冲使用）。
	 * 参数：
	 *  - {BufferAttribute} attribute：存储属性。
	 * 返回：void。
	 */
	createStorageAttribute( attribute ) { // 创建存储属性缓冲

		this.attributeUtils.createAttribute( attribute, GPUBufferUsage.STORAGE | GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST ); // 用途：存储/顶点/拷贝

	}

	/**
	 * 概要：为“间接参数”存储属性创建 GPU 缓冲（INDIRECT 用途）。
	 * 参数：
	 *  - {BufferAttribute} attribute：存储属性。
	 * 返回：void。
	 */
	createIndirectStorageAttribute( attribute ) { // 创建用于间接绘制参数的存储缓冲

		this.attributeUtils.createAttribute( attribute, GPUBufferUsage.STORAGE | GPUBufferUsage.INDIRECT | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST ); // 用途：存储/间接/拷贝

	}

	/**
	 * 概要：更新着色器属性对应的 GPU 缓冲内容。
	 * 参数：
	 *  - {BufferAttribute} attribute：要更新的属性。
	 * 返回：void。
	 */
	updateAttribute( attribute ) { // 更新属性缓冲

		this.attributeUtils.updateAttribute( attribute ); // 委托属性工具执行更新

	}

	/**
	 * 概要：销毁着色器属性的 GPU 缓冲。
	 * 参数：
	 *  - {BufferAttribute} attribute：要销毁的属性。
	 * 返回：void。
	 */
	destroyAttribute( attribute ) { // 销毁属性缓冲

		this.attributeUtils.destroyAttribute( attribute ); // 委托属性工具执行销毁

	}

	// canvas

	/**
	 * 概要：触发默认渲染通道描述符的更新（例如画布尺寸或 MSAA 变更时）。
	 * 参数：无。
	 * 返回：void。
	 */
	updateSize() { // 更新与画布相关的尺寸/资源

		this.colorBuffer = this.textureUtils.getColorBuffer(); // 刷新默认颜色缓冲（如 MSAA 中间缓冲）
		this.defaultRenderPassdescriptor = null; // 置空默认渲染通道描述符以便下次重建

	}

	// utils public

	/**
	 * 概要：返回各向异性过滤的最大等级。
	 * 返回：number（最大各向异性等级）。
	 */
	getMaxAnisotropy() { // 获取最大各向异性过滤值

		return 16; // WebGPU 后端当前固定返回 16

	}

	/**
	 * 概要：检测后端是否支持指定的 WebGPU 特性。
	 * 参数：
	 *  - {string} name：特性名称。
	 * 返回：boolean（是否支持）。
	 */
	hasFeature( name ) { // 判断特性支持

		return this.device.features.has( name ); // 查询设备特性集合

	}

	/**
	 * 概要：将源纹理的指定区域拷贝到目标纹理的指定位置。
	 * 参数：
	 *  - {Texture} srcTexture：源纹理。
	 *  - {Texture} dstTexture：目标纹理。
	 *  - {?(Box3|Box2)} [srcRegion=null]：源纹理的拷贝区域（Box3/Box2）。
	 *  - {?(Vector2|Vector3)} [dstPosition=null]：目标纹理上的放置位置。
	 *  - {number} [srcLevel=0]：源纹理的 mip 级别。
	 *  - {number} [dstLevel=0]：目标纹理的 mip 级别。
	 * 返回：void。
	 */
	copyTextureToTexture( srcTexture, dstTexture, srcRegion = null, dstPosition = null, srcLevel = 0, dstLevel = 0 ) { // 纹理到纹理拷贝

		let dstX = 0; // 目标 X 起点
		let dstY = 0; // 目标 Y 起点
		let dstZ = 0; // 目标 Z 起点（层）

		let srcX = 0; // 源区域 X 起点
		let srcY = 0; // 源区域 Y 起点
		let srcZ = 0; // 源区域 Z 起点（层）

		let srcWidth = srcTexture.image.width; // 默认源宽
		let srcHeight = srcTexture.image.height; // 默认源高
		let srcDepth = 1; // 默认源深度


		if ( srcRegion !== null ) { // 若指定了源区域

			if ( srcRegion.isBox3 === true ) { // 3D 区域

				srcX = srcRegion.min.x; // 起点 X
				srcY = srcRegion.min.y; // 起点 Y
				srcZ = srcRegion.min.z; // 起点 Z
				srcWidth = srcRegion.max.x - srcRegion.min.x; // 宽度
				srcHeight = srcRegion.max.y - srcRegion.min.y; // 高度
				srcDepth = srcRegion.max.z - srcRegion.min.z; // 深度

			} else { // 否则视为 Box2（2D 区域）

				srcX = srcRegion.min.x; // 起点 X
				srcY = srcRegion.min.y; // 起点 Y
				srcWidth = srcRegion.max.x - srcRegion.min.x; // 宽度
				srcHeight = srcRegion.max.y - srcRegion.min.y; // 高度
				srcDepth = 1; // 深度为 1

			}

		}


		if ( dstPosition !== null ) { // 若指定了目标位置

			dstX = dstPosition.x; // 目标 X
			dstY = dstPosition.y; // 目标 Y
			dstZ = dstPosition.z || 0; // 目标 Z（层），缺省为 0

		}

		const encoder = this.device.createCommandEncoder( { label: 'copyTextureToTexture_' + srcTexture.id + '_' + dstTexture.id } ); // 创建命令编码器

		const sourceGPU = this.get( srcTexture ).texture; // 获取源 GPU 纹理
		const destinationGPU = this.get( dstTexture ).texture; // 获取目标 GPU 纹理

		encoder.copyTextureToTexture( // 提交纹理到纹理的拷贝命令
			{
				texture: sourceGPU, // 源纹理
				mipLevel: srcLevel, // 源 mip 级
				origin: { x: srcX, y: srcY, z: srcZ } // 源起点
			},
			{
				texture: destinationGPU, // 目标纹理
				mipLevel: dstLevel, // 目标 mip 级
				origin: { x: dstX, y: dstY, z: dstZ } // 目标起点
			},
			[
				srcWidth, // 拷贝宽
				srcHeight, // 拷贝高
				srcDepth // 拷贝深
			]
		);

		this.device.queue.submit( [ encoder.finish() ] ); // 完成命令缓冲并提交

		if ( dstLevel === 0 && dstTexture.generateMipmaps ) { // 若目标为 base level 且需要生成 mipmap

			this.textureUtils.generateMipmaps( dstTexture ); // 生成 mipmap

		}

	}

	/**
	 * 概要：将当前绑定的帧缓冲内容拷贝到给定纹理的区域中。
	 * 参数：
	 *  - {Texture} texture：目标纹理。
	 *  - {RenderContext} renderContext：渲染上下文。
	 *  - {Vector4} rectangle：拷贝矩形 [x, y, width, height]。
	 * 返回：void。
	 */
	copyFramebufferToTexture( texture, renderContext, rectangle ) { // 帧缓冲到纹理拷贝

		const renderContextData = this.get( renderContext ); // 取出上下文 GPU 数据

		let sourceGPU = null; // 源纹理句柄

		if ( renderContext.renderTarget ) { // 若在渲染到自定义目标

			if ( texture.isDepthTexture ) { // 深度纹理拷贝

				sourceGPU = this.get( renderContext.depthTexture ).texture; // 使用渲染目标的深度纹理

			} else { // 颜色纹理拷贝

				sourceGPU = this.get( renderContext.textures[ 0 ] ).texture; // 使用渲染目标的第一个颜色附件

			}

		} else { // 从默认帧缓冲（画布）拷贝

			if ( texture.isDepthTexture ) { // 深度纹理拷贝

				sourceGPU = this.textureUtils.getDepthBuffer( renderContext.depth, renderContext.stencil ); // 获取默认深度（或深度模板）缓冲

			} else { // 颜色纹理拷贝

				sourceGPU = this.context.getCurrentTexture(); // 当前画布纹理

			}

		}

		const destinationGPU = this.get( texture ).texture; // 目标纹理句柄

		if ( sourceGPU.format !== destinationGPU.format ) { // 源与目标格式不一致

			console.error( 'WebGPUBackend: copyFramebufferToTexture: Source and destination formats do not match.', sourceGPU.format, destinationGPU.format ); // 报错提示

			return; // 直接返回不执行拷贝

		}

		let encoder; // 命令编码器

		if ( renderContextData.currentPass ) { // 若当前已有渲染通道在进行

			renderContextData.currentPass.end(); // 先结束当前通道

			encoder = renderContextData.encoder; // 复用现有编码器

		} else { // 否则创建临时编码器

			encoder = this.device.createCommandEncoder( { label: 'copyFramebufferToTexture_' + texture.id } ); // 创建新编码器

		}

		encoder.copyTextureToTexture( // 执行纹理到纹理拷贝
			{
				texture: sourceGPU, // 源纹理
				origin: [ rectangle.x, rectangle.y, 0 ], // 源起点
			},
			{
				texture: destinationGPU // 目标纹理
			},
			[
				rectangle.z, // 宽度
				rectangle.w // 高度
			]
		);

		if ( renderContextData.currentPass ) { // 若之前结束了一个通道，需要重启它

			const { descriptor } = renderContextData; // 取出 pass 描述符

			for ( let i = 0; i < descriptor.colorAttachments.length; i ++ ) { // 所有颜色附件改为 Load（避免清屏）

				descriptor.colorAttachments[ i ].loadOp = GPULoadOp.Load; // 改为加载已有内容

			}

			if ( renderContext.depth ) descriptor.depthStencilAttachment.depthLoadOp = GPULoadOp.Load; // 深度改为加载
			if ( renderContext.stencil ) descriptor.depthStencilAttachment.stencilLoadOp = GPULoadOp.Load; // 模板改为加载

			renderContextData.currentPass = encoder.beginRenderPass( descriptor ); // 重启渲染通道
			renderContextData.currentSets = { attributes: {}, bindingGroups: [], pipeline: null, index: null }; // 重置当前状态集

			if ( renderContext.viewport ) { // 若定义了视口则恢复

				this.updateViewport( renderContext ); // 设置视口

			}

			if ( renderContext.scissor ) { // 若定义了裁剪矩形则恢复

				const { x, y, width, height } = renderContext.scissorValue; // 取出裁剪参数

				renderContextData.currentPass.setScissorRect( x, y, width, height ); // 设置裁剪矩形

			}

		} else { // 若使用了临时编码器

			this.device.queue.submit( [ encoder.finish() ] ); // 直接提交该命令缓冲

		}

		if ( texture.generateMipmaps ) { // 目标纹理需要 mipmap

			this.textureUtils.generateMipmaps( texture ); // 生成 mipmap

		}

	}

} // WebGPUBackend 类定义结束

export default WebGPUBackend; // 默认导出 WebGPUBackend 类
