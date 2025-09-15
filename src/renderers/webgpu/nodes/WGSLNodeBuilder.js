import NodeUniformsGroup from '../../common/nodes/NodeUniformsGroup.js'; // 引入：节点统一变量组（UBO 管理）

import NodeSampler from '../../common/nodes/NodeSampler.js'; // 引入：采样器节点封装
import { NodeSampledTexture, NodeSampledCubeTexture, NodeSampledTexture3D } from '../../common/nodes/NodeSampledTexture.js'; // 引入：采样纹理节点类型（2D/立方体/3D）

import NodeUniformBuffer from '../../common/nodes/NodeUniformBuffer.js'; // 引入：Uniform 缓冲区节点
import NodeStorageBuffer from '../../common/nodes/NodeStorageBuffer.js'; // 引入：Storage 缓冲区节点

import { NodeBuilder, CodeNode } from '../../../nodes/Nodes.js'; // 引入：节点构建器与内联代码节点

import { getFormat } from '../utils/WebGPUTextureUtils.js'; // 引入：纹理格式工具函数

import WGSLNodeParser from './WGSLNodeParser.js'; // 引入：WGSL 节点解析器
import { NodeAccess } from '../../../nodes/core/constants.js'; // 引入：节点访问枚举（只读/只写/读写）

import VarNode from '../../../nodes/core/VarNode.js'; // 引入：变量节点
import ExpressionNode from '../../../nodes/code/ExpressionNode.js'; // 引入：表达式节点

import { FloatType, RepeatWrapping, ClampToEdgeWrapping, MirroredRepeatWrapping, NearestFilter } from '../../../constants.js'; // 引入：常量（类型、环绕与过滤）

// GPUShaderStage is not defined in browsers not supporting WebGPU // 注：部分环境无 GPUShaderStage
const GPUShaderStage = ( typeof self !== 'undefined' ) ? self.GPUShaderStage : { VERTEX: 1, FRAGMENT: 2, COMPUTE: 4 }; // 兼容定义 GPU 着色器阶段常量

const accessNames = { // 访问模式到 WGSL 修饰符的映射
	[ NodeAccess.READ_ONLY ]: 'read', // 只读 -> read
	[ NodeAccess.WRITE_ONLY ]: 'write', // 只写 -> write
	[ NodeAccess.READ_WRITE ]: 'read_write' // 读写 -> read_write
}; // 结束 accessNames 定义

const wrapNames = { // 纹理环绕模式到代码片段名的映射
	[ RepeatWrapping ]: 'repeat', // 平铺重复
	[ ClampToEdgeWrapping ]: 'clamp', // 边缘钳制
	[ MirroredRepeatWrapping ]: 'mirror' // 镜像重复
}; // 结束 wrapNames 定义

const gpuShaderStageLib = { // 阶段名到阶段位掩码映射（含回退值）
	'vertex': GPUShaderStage ? GPUShaderStage.VERTEX : 1, // 顶点阶段
	'fragment': GPUShaderStage ? GPUShaderStage.FRAGMENT : 2, // 片元阶段
	'compute': GPUShaderStage ? GPUShaderStage.COMPUTE : 4 // 计算阶段
}; // 结束 gpuShaderStageLib 定义

const supports = { // 特性支持表（WGSL 后端）
	instance: true, // 支持实例化
	swizzleAssign: false, // 不支持带重排写入
	storageBuffer: true // 支持存储缓冲
}; // 结束 supports 定义

const wgslFnOpLib = { // 运算符到 polyfill 函数名映射
	'^^': 'tsl_xor' // 异或（布尔）映射为 tsl_xor
}; // 结束 wgslFnOpLib 定义

const wgslTypeLib = { // 内部类型到 WGSL 类型的映射
	float: 'f32', // 浮点
	int: 'i32', // 有符号整数
	uint: 'u32', // 无符号整数
	bool: 'bool', // 布尔
	color: 'vec3<f32>', // 颜色（vec3f）

	vec2: 'vec2<f32>', // 浮点二维向量
	ivec2: 'vec2<i32>', // 整型二维向量
	uvec2: 'vec2<u32>', // 无符号二维向量
	bvec2: 'vec2<bool>', // 布尔二维向量

	vec3: 'vec3<f32>', // 浮点三维向量
	ivec3: 'vec3<i32>', // 整型三维向量
	uvec3: 'vec3<u32>', // 无符号三维向量
	bvec3: 'vec3<bool>', // 布尔三维向量

	vec4: 'vec4<f32>', // 浮点四维向量
	ivec4: 'vec4<i32>', // 整型四维向量
	uvec4: 'vec4<u32>', // 无符号四维向量
	bvec4: 'vec4<bool>', // 布尔四维向量

	mat2: 'mat2x2<f32>', // 2x2 矩阵
	mat3: 'mat3x3<f32>', // 3x3 矩阵
	mat4: 'mat4x4<f32>' // 4x4 矩阵
}; // 结束 wgslTypeLib 定义

const wgslCodeCache = {}; // 缓存已生成的 WGSL 代码片段（避免重复构建）

const wgslPolyfill = { // 提供在 WGSL 中缺失或不一致的函数实现
	tsl_xor: new CodeNode( 'fn tsl_xor( a : bool, b : bool ) -> bool { return ( a || b ) && !( a && b ); }' ), // 布尔异或
	mod_float: new CodeNode( 'fn tsl_mod_float( x : f32, y : f32 ) -> f32 { return x - y * floor( x / y ); }' ), // 浮点取模
	mod_vec2: new CodeNode( 'fn tsl_mod_vec2( x : vec2f, y : vec2f ) -> vec2f { return x - y * floor( x / y ); }' ), // vec2 取模
	mod_vec3: new CodeNode( 'fn tsl_mod_vec3( x : vec3f, y : vec3f ) -> vec3f { return x - y * floor( x / y ); }' ), // vec3 取模
	mod_vec4: new CodeNode( 'fn tsl_mod_vec4( x : vec4f, y : vec4f ) -> vec4f { return x - y * floor( x / y ); }' ), // vec4 取模
	equals_bool: new CodeNode( 'fn tsl_equals_bool( a : bool, b : bool ) -> bool { return a == b; }' ), // bool 等值比较
	equals_bvec2: new CodeNode( 'fn tsl_equals_bvec2( a : vec2f, b : vec2f ) -> vec2<bool> { return vec2<bool>( a.x == b.x, a.y == b.y ); }' ), // bvec2 等值比较
	equals_bvec3: new CodeNode( 'fn tsl_equals_bvec3( a : vec3f, b : vec3f ) -> vec3<bool> { return vec3<bool>( a.x == b.x, a.y == b.y, a.z == b.z ); }' ), // bvec3 等值比较
	equals_bvec4: new CodeNode( 'fn tsl_equals_bvec4( a : vec4f, b : vec4f ) -> vec4<bool> { return vec4<bool>( a.x == b.x, a.y == b.y, a.z == b.z, a.w == b.w ); }' ), // bvec4 等值比较
	repeatWrapping_float: new CodeNode( 'fn tsl_repeatWrapping_float( coord: f32 ) -> f32 { return fract( coord ); }' ), // 重复环绕（单通道）
	mirrorWrapping_float: new CodeNode( 'fn tsl_mirrorWrapping_float( coord: f32 ) -> f32 { let mirrored = fract( coord * 0.5 ) * 2.0; return 1.0 - abs( 1.0 - mirrored ); }' ), // 镜像环绕
	clampWrapping_float: new CodeNode( 'fn tsl_clampWrapping_float( coord: f32 ) -> f32 { return clamp( coord, 0.0, 1.0 ); }' ), // 边缘钳制环绕
	biquadraticTexture: new CodeNode( /* wgsl */`
fn tsl_biquadraticTexture( map : texture_2d<f32>, coord : vec2f, iRes : vec2u, level : u32 ) -> vec4f {

	let res = vec2f( iRes );

	let uvScaled = coord * res;
	let uvWrapping = ( ( uvScaled % res ) + res ) % res;

	// https://www.shadertoy.com/view/WtyXRy

	let uv = uvWrapping - 0.5;
	let iuv = floor( uv );
	let f = fract( uv );

	let rg1 = textureLoad( map, vec2u( iuv + vec2( 0.5, 0.5 ) ) % iRes, level );
	let rg2 = textureLoad( map, vec2u( iuv + vec2( 1.5, 0.5 ) ) % iRes, level );
	let rg3 = textureLoad( map, vec2u( iuv + vec2( 0.5, 1.5 ) ) % iRes, level );
	let rg4 = textureLoad( map, vec2u( iuv + vec2( 1.5, 1.5 ) ) % iRes, level );

	return mix( mix( rg1, rg2, f.x ), mix( rg3, rg4, f.x ), f.y );

}
` ) // 双二次纹理采样（字符串内为 WGSL，不做 JS 注释）
}; // 结束 wgslPolyfill 定义

const wgslMethods = { // 将通用方法名映射到 WGSL/Polyfill 实现
	dFdx: 'dpdx', // x 方向导数
	dFdy: '- dpdy', // y 方向导数（WebGPU 取负以匹配期望）
	mod_float: 'tsl_mod_float', // 浮点 mod
	mod_vec2: 'tsl_mod_vec2', // vec2 mod
	mod_vec3: 'tsl_mod_vec3', // vec3 mod
	mod_vec4: 'tsl_mod_vec4', // vec4 mod
	equals_bool: 'tsl_equals_bool', // bool 等值
	equals_bvec2: 'tsl_equals_bvec2', // bvec2 等值
	equals_bvec3: 'tsl_equals_bvec3', // bvec3 等值
	equals_bvec4: 'tsl_equals_bvec4', // bvec4 等值
	inversesqrt: 'inverseSqrt', // 逆平方根
	bitcast: 'bitcast<f32>' // 位重解释为 f32
}; // 结束 wgslMethods 定义

// WebGPU issue: does not support pow() with negative base on Windows // Windows 平台 pow(负底数, 指数) 不被支持

if ( typeof navigator !== 'undefined' && /Windows/g.test( navigator.userAgent ) ) { // 检测 Windows 环境，启用 pow polyfill

	wgslPolyfill.pow_float = new CodeNode( 'fn tsl_pow_float( a : f32, b : f32 ) -> f32 { return select( -pow( -a, b ), pow( a, b ), a > 0.0 ); }' ); // 浮点 pow 兼容实现
	wgslPolyfill.pow_vec2 = new CodeNode( 'fn tsl_pow_vec2( a : vec2f, b : vec2f ) -> vec2f { return vec2f( tsl_pow_float( a.x, b.x ), tsl_pow_float( a.y, b.y ) ); }', [ wgslPolyfill.pow_float ] ); // vec2 pow 复用标量实现
	wgslPolyfill.pow_vec3 = new CodeNode( 'fn tsl_pow_vec3( a : vec3f, b : vec3f ) -> vec3f { return vec3f( tsl_pow_float( a.x, b.x ), tsl_pow_float( a.y, b.y ), tsl_pow_float( a.z, b.z ) ); }', [ wgslPolyfill.pow_float ] ); // vec3 pow 复用标量实现
	wgslPolyfill.pow_vec4 = new CodeNode( 'fn tsl_pow_vec4( a : vec4f, b : vec4f ) -> vec4f { return vec4f( tsl_pow_float( a.x, b.x ), tsl_pow_float( a.y, b.y ), tsl_pow_float( a.z, b.z ), tsl_pow_float( a.w, b.w ) ); }', [ wgslPolyfill.pow_float ] ); // vec4 pow 复用标量实现

	wgslMethods.pow_float = 'tsl_pow_float'; // 覆盖映射：pow_float
	wgslMethods.pow_vec2 = 'tsl_pow_vec2'; // 覆盖映射：pow_vec2
	wgslMethods.pow_vec3 = 'tsl_pow_vec3'; // 覆盖映射：pow_vec3
	wgslMethods.pow_vec4 = 'tsl_pow_vec4'; // 覆盖映射：pow_vec4

} // 结束 Windows 兼容分支

// 分隔线 //

let diagnostics = ''; // 诊断指令字符串（用于编译器提示控制）

if ( ( typeof navigator !== 'undefined' && /Firefox|Deno/g.test( navigator.userAgent ) ) !== true ) { // 非 Firefox/Deno 环境追加诊断禁用

	diagnostics += 'diagnostic( off, derivative_uniformity );\n'; // 关闭导数一致性诊断

} // 结束诊断环境判断

/**
 * 面向 WGSL 的节点构建器。
 *
 * 本模块从节点材质生成 WGSL 着色器代码，并生成对应的绑定与顶点缓冲区
 * 定义。这些数据随后被渲染器用于为渲染对象创建渲染与计算管线。
 *
 * @augments NodeBuilder
 */
class WGSLNodeBuilder extends NodeBuilder { // WGSL 目标的节点构建器

	/**
	 * 构造 WGSL 节点构建器实例。
	 *
	 * @param {Object3D} object - 三维对象。
	 * @param {Renderer} renderer - 渲染器。
	 */
	constructor( object, renderer ) { // 构造函数：接收渲染对象与渲染器

		super( object, renderer, new WGSLNodeParser() ); // 调用父类并指定 WGSL 解析器

		/**
		 * A dictionary that holds for each shader stage ('vertex', 'fragment', 'compute')
		 * another dictionary which manages UBOs per group ('render','frame','object').
		 *
		 * @type {Object<string,Object<string,NodeUniformsGroup>>}
		 */
		this.uniformGroups = {}; // 各着色阶段的 UBO 组字典（render/frame/object）

		/**
		 * A dictionary that holds for each shader stage a Map of builtins.
		 *
		 * @type {Object<string,Map<string,Object>>}
		 */
		this.builtins = {}; // 各着色阶段的内建变量映射

		/**
		 * A dictionary that holds for each shader stage a Set of directives.
		 *
		 * @type {Object<string,Set<string>>}
		 */
		this.directives = {}; // 各着色阶段的编译指令集合

		/**
		 * A map for managing scope arrays. Only relevant for when using
		 * {@link WorkgroupInfoNode} in context of compute shaders.
		 *
		 * @type {Map<string,Object>}
		 */
		this.scopedArrays = new Map(); // 作用域数组（计算着色器 WorkgroupInfoNode 使用）

	} // 结束构造函数

	/**
	 * 生成用于采样纹理的 WGSL 代码片段。
	 *
	 * @private
	 * @param {Texture} texture - 纹理对象。
	 * @param {string} textureProperty - 着色器中该纹理的 uniform 名称。
	 * @param {string} uvSnippet - 表示用于采样的纹理坐标的 WGSL 片段。
	 * @param {?string} depthSnippet - 表示 0 基的纹理数组层索引的 WGSL 片段。
	 * @param {string} [shaderStage=this.shaderStage] - 生成该片段对应的着色阶段。
	 * @return {string} 生成的 WGSL 片段。
	 */
	_generateTextureSample( texture, textureProperty, uvSnippet, depthSnippet, shaderStage = this.shaderStage ) { // 为采样纹理生成 WGSL 片段

		if ( shaderStage === 'fragment' ) { // 片元阶段可用 textureSample

			if ( depthSnippet ) { // 数组/立方体等带层索引的采样

				return `textureSample( ${ textureProperty }, ${ textureProperty }_sampler, ${ uvSnippet }, ${ depthSnippet } )`; // 指定层索引采样

			} else { // 普通二维采样

				return `textureSample( ${ textureProperty }, ${ textureProperty }_sampler, ${ uvSnippet } )`; // 常规采样

			} // 结束是否带层索引分支

		} else { // 非片元阶段（如顶点/计算），使用显式 LOD 0

			return this.generateTextureSampleLevel( texture, textureProperty, uvSnippet, '0', depthSnippet ); // LOD 固定为 0

		} // 结束阶段判断

	} // 结束 _generateTextureSample 方法

	/**
	 * 当使用显式 mip 等级采样纹理时，生成对应的 WGSL 片段。
	 *
	 * @private
	 * @param {Texture} texture - 纹理对象。
	 * @param {string} textureProperty - 着色器中该纹理的 uniform 名称。
	 * @param {string} uvSnippet - 表示用于采样的纹理坐标的 WGSL 片段。
	 * @param {string} levelSnippet - 表示 mip 等级（0 为完整尺寸）的 WGSL 片段。
	 * @param {string} depthSnippet - 表示 0 基纹理数组层索引的 WGSL 片段。
	 * @return {string} 生成的 WGSL 片段。
	 */
	generateTextureSampleLevel( texture, textureProperty, uvSnippet, levelSnippet, depthSnippet ) { // 显式 mip 级别采样

		if ( this.isUnfilterable( texture ) === false ) { // 可过滤的常规纹理

			return `textureSampleLevel( ${ textureProperty }, ${ textureProperty }_sampler, ${ uvSnippet }, ${ levelSnippet } )`; // 直接使用 textureSampleLevel

		} else if ( this.isFilteredTexture( texture ) ) { // 需软件过滤的情形

			return this.generateFilteredTexture( texture, textureProperty, uvSnippet, levelSnippet ); // 生成过滤采样代码

		} else { // 其他情况，回落至 textureLoad + LOD

			return this.generateTextureLod( texture, textureProperty, uvSnippet, depthSnippet, levelSnippet ); // 使用显式 LOD 访问

		} // 结束条件分支

	} // 结束 generateTextureSampleLevel 方法

	/**
	 * 为纹理坐标生成环绕（wrap）函数。
	 *
	 * @param {Texture} texture - 需要生成环绕函数的纹理。
	 * @return {string} 生成函数的名称。
	 */
	generateWrapFunction( texture ) { // 生成纹理坐标环绕函数（根据包裹模式）

		const functionName = `tsl_coord_${ wrapNames[ texture.wrapS ] }S_${ wrapNames[ texture.wrapT ] }_${ texture.isData3DTexture ? '3d' : '2d' }T`; // 根据 S/T/R 模式命名

		let nodeCode = wgslCodeCache[ functionName ]; // 尝试从缓存获取

		if ( nodeCode === undefined ) { // 未缓存则生成

			const includes = []; // 需要引入的辅助函数列表

			// For 3D textures, use vec3f; for texture arrays, keep vec2f since array index is separate // 注：3D 用 vec3f，数组另算层索引
			const coordType = texture.isData3DTexture ? 'vec3f' : 'vec2f'; // 坐标类型依据纹理维度
			let code = `fn ${ functionName }( coord : ${ coordType } ) -> ${ coordType } {\n\n\treturn ${ coordType }(\n`; // 生成函数开头与返回构造

			const addWrapSnippet = ( wrap, axis ) => { // 根据包裹模式追加对应轴的代码片段

				if ( wrap === RepeatWrapping ) { // 重复模式

					includes.push( wgslPolyfill.repeatWrapping_float ); // 记录需要的函数

					code += `\t\ttsl_repeatWrapping_float( coord.${ axis } )`; // 添加重复环绕代码

				} else if ( wrap === ClampToEdgeWrapping ) { // 钳制模式

					includes.push( wgslPolyfill.clampWrapping_float ); // 引入钳制函数

					code += `\t\ttsl_clampWrapping_float( coord.${ axis } )`; // 添加钳制环绕代码

				} else if ( wrap === MirroredRepeatWrapping ) { // 镜像重复

					includes.push( wgslPolyfill.mirrorWrapping_float ); // 引入镜像函数

					code += `\t\ttsl_mirrorWrapping_float( coord.${ axis } )`; // 添加镜像环绕代码

				} else { // 其他模式（不支持）

					code += `\t\tcoord.${ axis }`; // 直接传递坐标

					console.warn( `WebGPURenderer: Unsupported texture wrap type "${ wrap }" for vertex shader.` ); // 警告：不支持的包裹模式

				}

			}; // 结束 addWrapSnippet 定义

			addWrapSnippet( texture.wrapS, 'x' ); // 处理 S 轴

			code += ',\n'; // 在字符串中添加换行与分隔

			addWrapSnippet( texture.wrapT, 'y' ); // 处理 T 轴

			if ( texture.isData3DTexture ) { // 3D 纹理需处理 R 轴

				code += ',\n'; // 分隔第三个分量
				addWrapSnippet( texture.wrapR, 'z' ); // 处理 R 轴

			} // 结束 3D 判断

			code += '\n\t);\n\n}\n'; // 结束函数字符串

			wgslCodeCache[ functionName ] = nodeCode = new CodeNode( code, includes ); // 缓存生成的 CodeNode

		} // 结束未缓存分支

		nodeCode.build( this ); // 确保依赖函数已构建

		return functionName; // 返回生成的函数名

	} // 结束 generateWrapFunction 方法

	/**
	 * 生成 WGSL 数组类型声明字符串。
	 *
	 * @param {string} type - 元素类型。
	 * @param {?number} [count] - 元素数量。
	 * @return {string} 着色器中的数组类型字符串。
	 */
	generateArrayDeclaration( type, count ) { // 生成数组声明（WGSL 语法）

		return `array< ${ this.getType( type ) }, ${ count } >`; // 例如 array< vec4f, N >

	} // 结束 generateArrayDeclaration 方法

	/**
	 * 生成一个 WGSL 变量以保存指定纹理的尺寸信息。
	 * 同时返回纹理数组的层数信息以及立方体纹理的面数信息。
	 *
	 * @param {Texture} texture - 需要查询尺寸的纹理。
	 * @param {string} textureProperty - 着色器中该纹理 uniform 的名称。
	 * @param {string} levelSnippet - 表示 mip 等级（0 为完整尺寸）的 WGSL 片段。
	 * @return {string} 尺寸变量的片段名称。
	 */
	generateTextureDimension( texture, textureProperty, levelSnippet ) { // 生成保存纹理尺寸的变量

		const textureData = this.getDataFromNode( texture, this.shaderStage, this.globalCache ); // 获取/初始化纹理数据缓存

		if ( textureData.dimensionsSnippet === undefined ) textureData.dimensionsSnippet = {}; // 准备不同 LOD 的尺寸片段缓存

		let textureDimensionNode = textureData.dimensionsSnippet[ levelSnippet ]; // 获取当前 LOD 的尺寸节点

		if ( textureData.dimensionsSnippet[ levelSnippet ] === undefined ) { // 首次为该 LOD 构建

			let textureDimensionsParams; // textureDimensions 调用参数
			let dimensionType; // 返回的尺寸类型（vec2<u32>/vec3<u32>）

			const { primarySamples } = this.renderer.backend.utils.getTextureSampleData( texture ); // 读取采样数
			const isMultisampled = primarySamples > 1; // 是否为多重采样纹理

			if ( texture.isData3DTexture ) { // 3D 纹理返回三维尺寸

				dimensionType = 'vec3<u32>'; // 三维尺寸类型

			} else { // 常规 2D/深度纹理

				// Regular 2D textures, depth textures, etc. // 普通二维、深度等返回二维尺寸
				dimensionType = 'vec2<u32>'; // 二维尺寸类型

			}

			// Build parameters string based on texture type and multisampling // 根据纹理类型/多采样决定参数
			if ( isMultisampled || texture.isStorageTexture ) { // MSAA 或存储纹理不需要 mip 级别

				textureDimensionsParams = textureProperty; // 直接传入纹理句柄

			} else { // 常规纹理可附带 LOD

				textureDimensionsParams = `${textureProperty}${levelSnippet ? `, u32( ${ levelSnippet } )` : ''}`; // 选择性追加 LOD 参数

			} // 结束参数选择

			textureDimensionNode = new VarNode( new ExpressionNode( `textureDimensions( ${ textureDimensionsParams } )`, dimensionType ) ); // 构建表达式并包裹为变量节点

			textureData.dimensionsSnippet[ levelSnippet ] = textureDimensionNode; // 缓存当前 LOD 的尺寸节点

			if ( texture.isArrayTexture || texture.isDataArrayTexture || texture.isData3DTexture ) { // 数组/3D 纹理提供层数信息

				textureData.arrayLayerCount = new VarNode( // 声明层数变量
					new ExpressionNode(
						`textureNumLayers(${textureProperty})`, // 取得数组层数
						'u32' // 返回类型为 u32
					)
				);

			} // 结束层数处理

			// For cube textures, we know it's always 6 faces // 立方体纹理恒为 6 个面
			if ( texture.isTextureCube ) { // 处理立方体面数

				textureData.cubeFaceCount = new VarNode( // 固定常量 6
					new ExpressionNode( '6u', 'u32' ) // 无符号常量 6
				);

			} // 结束立方体面数设置

		} // 结束首次构建尺寸节点分支

		return textureDimensionNode.build( this ); // 返回已构建的尺寸变量片段

	} // 结束 generateTextureDimension 方法

	/**
	 * Generates the WGSL snippet for a manual filtered texture.
	 *
	 * @param {Texture} texture - The texture.
	 * @param {string} textureProperty - The name of the texture uniform in the shader.
	 * @param {string} uvSnippet - A WGSL snippet that represents texture coordinates used for sampling.
	 * @param {string} levelSnippet - A WGSL snippet that represents the mip level, with level 0 containing a full size version of the texture.
	 * @return {string} The WGSL snippet.
	 */
	generateFilteredTexture( texture, textureProperty, uvSnippet, levelSnippet = '0u' ) {

		this._include( 'biquadraticTexture' );

		const wrapFunction = this.generateWrapFunction( texture );
		const textureDimension = this.generateTextureDimension( texture, textureProperty, levelSnippet );

		return `tsl_biquadraticTexture( ${ textureProperty }, ${ wrapFunction }( ${ uvSnippet } ), ${ textureDimension }, u32( ${ levelSnippet } ) )`;

	}

	/**
	 * 生成带显式细节级别（LOD）的纹理读取 WGSL 片段。
	 * 注意该操作为直接读取（lookup），不进行采样或过滤。
	 *
	 * @param {Texture} texture - 纹理对象。
	 * @param {string} textureProperty - 着色器中该纹理的 uniform 名称。
	 * @param {string} uvSnippet - 表示用于采样的纹理坐标的 WGSL 片段。
	 * @param {?string} depthSnippet - 表示 0 基纹理数组层索引的 WGSL 片段。
	 * @param {string} [levelSnippet='0u'] - 表示 mip 等级（0 为完整尺寸）的 WGSL 片段。
	 * @return {string} 生成的 WGSL 片段。
	 */
	generateTextureLod( texture, textureProperty, uvSnippet, depthSnippet, levelSnippet = '0u' ) {

		const wrapFunction = this.generateWrapFunction( texture );
		const textureDimension = this.generateTextureDimension( texture, textureProperty, levelSnippet );

		const vecType = texture.isData3DTexture ? 'vec3' : 'vec2';
		const coordSnippet = `${ vecType }<u32>( ${ wrapFunction }( ${ uvSnippet } ) * ${ vecType }<f32>( ${ textureDimension } ) )`;

		return this.generateTextureLoad( texture, textureProperty, coordSnippet, depthSnippet, levelSnippet );

	}

	/**
	 * 生成在不进行采样/过滤的情况下读取单个 texel 的 WGSL 片段。
	 *
	 * @param {Texture} texture - 纹理对象。
	 * @param {string} textureProperty - 着色器中该纹理的 uniform 名称。
	 * @param {string} uvIndexSnippet - 表示用于读取的整数坐标/索引的 WGSL 片段。
	 * @param {?string} depthSnippet - 表示 0 基纹理数组层索引的 WGSL 片段。
	 * @param {string} [levelSnippet='0u'] - 表示 mip 等级（0 为完整尺寸）的 WGSL 片段。
	 * @return {string} 生成的 WGSL 片段。
	 */
	generateTextureLoad( texture, textureProperty, uvIndexSnippet, depthSnippet, levelSnippet = '0u' ) {

		let snippet;

		if ( depthSnippet ) {

			snippet = `textureLoad( ${ textureProperty }, ${ uvIndexSnippet }, ${ depthSnippet }, u32( ${ levelSnippet } ) )`;

		} else {

			snippet = `textureLoad( ${ textureProperty }, ${ uvIndexSnippet }, u32( ${ levelSnippet } ) )`;

			if ( this.renderer.backend.compatibilityMode && texture.isDepthTexture ) {

				snippet += '.x';

			}

		}

		return snippet;

	}

	/**
	 * 生成向纹理写入单个 texel 的 WGSL 片段。
	 *
	 * @param {Texture} texture - 纹理对象。
	 * @param {string} textureProperty - 着色器中该纹理的 uniform 名称。
	 * @param {string} uvIndexSnippet - 表示整数坐标/索引的 WGSL 片段。
	 * @param {?string} depthSnippet - 表示 0 基纹理数组层索引的 WGSL 片段。
	 * @param {string} valueSnippet - 表示新 texel 值的 WGSL 片段。
	 * @return {string} 生成的 WGSL 片段。
	 */
	generateTextureStore( texture, textureProperty, uvIndexSnippet, depthSnippet, valueSnippet ) {

		let snippet;

		if ( depthSnippet ) {

			snippet = `textureStore( ${ textureProperty }, ${ uvIndexSnippet }, ${ depthSnippet }, ${ valueSnippet } )`;

		} else {

			snippet = `textureStore( ${ textureProperty }, ${ uvIndexSnippet }, ${ valueSnippet } )`;

		}

		return snippet;

	}

	/**
	 * 若给定纹理的采样值需要与参考值比较，则返回 `true`。
	 *
	 * @param {Texture} texture - 纹理对象。
	 * @return {boolean} 是否需要进行深度比较。
	 */
	isSampleCompare( texture ) {

		return texture.isDepthTexture === true && texture.compareFunction !== null;

	}

	/**
	 * 判断给定纹理是否不可过滤（unfilterable）。
	 *
	 * @param {Texture} texture - 纹理对象。
	 * @return {boolean} 是否为不可过滤纹理。
	 */
	isUnfilterable( texture ) {

		return this.getComponentTypeFromTexture( texture ) !== 'float' ||
			( ! this.isAvailable( 'float32Filterable' ) && texture.isDataTexture === true && texture.type === FloatType ) ||
			( this.isSampleCompare( texture ) === false && texture.minFilter === NearestFilter && texture.magFilter === NearestFilter ) ||
			this.renderer.backend.utils.getTextureSampleData( texture ).primarySamples > 1;

	}

	/**
	 * 生成采样/加载给定纹理的 WGSL 片段。
	 *
	 * @param {Texture} texture - 纹理对象。
	 * @param {string} textureProperty - 着色器中该纹理的 uniform 名称。
	 * @param {string} uvSnippet - 表示用于采样的纹理坐标的 WGSL 片段。
	 * @param {?string} depthSnippet - 表示 0 基纹理数组层索引的 WGSL 片段。
	 * @param {string} [shaderStage=this.shaderStage] - 生成该片段对应的着色阶段。
	 * @return {string} 生成的 WGSL 片段。
	 */
	generateTexture( texture, textureProperty, uvSnippet, depthSnippet, shaderStage = this.shaderStage ) {

		let snippet = null;

		if ( this.isUnfilterable( texture ) ) {

			snippet = this.generateTextureLod( texture, textureProperty, uvSnippet, depthSnippet, '0', shaderStage );

		} else {

			snippet = this._generateTextureSample( texture, textureProperty, uvSnippet, depthSnippet, shaderStage );

		}

		return snippet;

	}

	/**
	 * 使用显式梯度（ddx/ddy）采样/加载纹理时生成 WGSL 片段。
	 *
	 * @param {Texture} texture - 纹理对象。
	 * @param {string} textureProperty - 着色器中该纹理的 uniform 名称。
	 * @param {string} uvSnippet - 表示用于采样的纹理坐标的 WGSL 片段。
	 * @param {Array<string>} gradSnippet - 保存两个梯度片段的数组（ddx, ddy）。
	 * @param {?string} depthSnippet - 表示 0 基纹理数组层索引的 WGSL 片段。
	 * @param {string} [shaderStage=this.shaderStage] - 生成该片段对应的着色阶段。
	 * @return {string} 生成的 WGSL 片段。
	 */
	generateTextureGrad( texture, textureProperty, uvSnippet, gradSnippet, depthSnippet, shaderStage = this.shaderStage ) {

		if ( shaderStage === 'fragment' ) {

			// TODO handle i32 or u32 --> uvSnippet, array_index: A, ddx, ddy
			return `textureSampleGrad( ${ textureProperty }, ${ textureProperty }_sampler, ${ uvSnippet },  ${ gradSnippet[ 0 ] }, ${ gradSnippet[ 1 ] } )`;

		} else {

			console.error( `WebGPURenderer: THREE.TextureNode.gradient() does not support ${ shaderStage } shader.` );

		}

	}

	/**
	 * 生成用于采样深度纹理并与参考值进行比较的 WGSL 片段。
	 *
	 * @param {Texture} texture - 深度纹理对象。
	 * @param {string} textureProperty - 着色器中该纹理的 uniform 名称。
	 * @param {string} uvSnippet - 表示用于采样的纹理坐标的 WGSL 片段。
	 * @param {string} compareSnippet - 表示参考深度值的 WGSL 片段。
	 * @param {?string} depthSnippet - 表示 0 基纹理数组层索引的 WGSL 片段。
	 * @param {string} [shaderStage=this.shaderStage] - 生成该片段对应的着色阶段。
	 * @return {string} 生成的 WGSL 片段。
	 */
	generateTextureCompare( texture, textureProperty, uvSnippet, compareSnippet, depthSnippet, shaderStage = this.shaderStage ) {

		if ( shaderStage === 'fragment' ) {

			if ( texture.isDepthTexture === true && texture.isArrayTexture === true ) {

				return `textureSampleCompare( ${ textureProperty }, ${ textureProperty }_sampler, ${ uvSnippet }, ${ depthSnippet }, ${ compareSnippet } )`;

			}

			return `textureSampleCompare( ${ textureProperty }, ${ textureProperty }_sampler, ${ uvSnippet }, ${ compareSnippet } )`;

		} else {

			console.error( `WebGPURenderer: THREE.DepthTexture.compareFunction() does not support ${ shaderStage } shader.` );

		}

	}

	/**
	 * 在使用显式 mip 等级采样纹理时生成 WGSL 片段。
	 *
	 * @param {Texture} texture - 纹理对象。
	 * @param {string} textureProperty - 着色器中该纹理的 uniform 名称。
	 * @param {string} uvSnippet - 表示用于采样的纹理坐标的 WGSL 片段。
	 * @param {string} levelSnippet - 表示 mip 等级（0 为完整尺寸）的 WGSL 片段。
	 * @param {?string} depthSnippet - 表示 0 基纹理数组层索引的 WGSL 片段。
	 * @param {string} [shaderStage=this.shaderStage] - 生成该片段对应的着色阶段。
	 * @return {string} 生成的 WGSL 片段。
	 */
	generateTextureLevel( texture, textureProperty, uvSnippet, levelSnippet, depthSnippet ) {

		if ( this.isUnfilterable( texture ) === false ) {

			return `textureSampleLevel( ${ textureProperty }, ${ textureProperty }_sampler, ${ uvSnippet }, ${ levelSnippet } )`;

		} else if ( this.isFilteredTexture( texture ) ) {

			return this.generateFilteredTexture( texture, textureProperty, uvSnippet, levelSnippet );

		} else {

			return this.generateTextureLod( texture, textureProperty, uvSnippet, depthSnippet, levelSnippet );

		}

	}

	/**
	 * 以对 mip 等级添加偏置（bias）的方式进行采样时，生成 WGSL 片段。
	 *
	 * @param {Texture} texture - 纹理对象。
	 * @param {string} textureProperty - 着色器中该纹理的 uniform 名称。
	 * @param {string} uvSnippet - 表示用于采样的纹理坐标的 WGSL 片段。
	 * @param {string} biasSnippet - 表示在采样前应用到 mip 等级的偏置值片段。
	 * @param {?string} depthSnippet - 表示 0 基纹理数组层索引的 WGSL 片段。
	 * @param {string} [shaderStage=this.shaderStage] - 生成该片段对应的着色阶段。
	 * @return {string} 生成的 WGSL 片段。
	 */
	generateTextureBias( texture, textureProperty, uvSnippet, biasSnippet, depthSnippet, shaderStage = this.shaderStage ) {

		if ( shaderStage === 'fragment' ) {

			return `textureSampleBias( ${ textureProperty }, ${ textureProperty }_sampler, ${ uvSnippet }, ${ biasSnippet } )`;

		} else {

			console.error( `WebGPURenderer: THREE.TextureNode.biasNode does not support ${ shaderStage } shader.` );

		}

	}

	/**
	 * 返回表示给定节点属性名的 WGSL 片段。
	 *
	 * @param {Node} node - 节点对象。
	 * @param {string} [shaderStage=this.shaderStage] - 生成该片段对应的着色阶段。
	 * @return {string} 属性名片段。
	 */
	getPropertyName( node, shaderStage = this.shaderStage ) {

		if ( node.isNodeVarying === true && node.needsInterpolation === true ) {

			if ( shaderStage === 'vertex' ) {

				return `varyings.${ node.name }`;

			}

		} else if ( node.isNodeUniform === true ) {

			const name = node.name;
			const type = node.type;

			if ( type === 'texture' || type === 'cubeTexture' || type === 'storageTexture' || type === 'texture3D' ) {

				return name;

			} else if ( type === 'buffer' || type === 'storageBuffer' || type === 'indirectStorageBuffer' ) {

				if ( this.isCustomStruct( node ) ) {

					return name;

				}

				return name + '.value';

			} else {

				return node.groupNode.name + '.' + name;

			}

		}

		return super.getPropertyName( node );

	}

	/**
	 * 返回输出结构体的名称。
	 *
	 * @return {string} 输出结构体名称。
	 */
	getOutputStructName() {

		return 'output';

	}

	/**
	 * 将通用运算名解析为底层着色器中的实际函数名。
	 *
	 * @param {string} op - 需要解析的运算符名称。
	 * @return {?string} 解析后的函数名，若不存在则为 null。
	 */
	getFunctionOperator( op ) {

		const fnOp = wgslFnOpLib[ op ];

		if ( fnOp !== undefined ) {

			this._include( fnOp );

			return fnOp;

		}

		return null;

	}

	/**
	 * 返回给定节点在指定着色阶段的访问权限字符串。
	 *
	 * @param {StorageTextureNode|StorageBufferNode} node - 存储类节点。
	 * @param {string} shaderStage - 着色阶段。
	 * @return {string} 节点访问权限标识。
	 */
	getNodeAccess( node, shaderStage ) {

		if ( shaderStage !== 'compute' ) {

			if ( node.isAtomic === true ) {

				console.warn( 'WebGPURenderer: Atomic operations are only supported in compute shaders.' );

				return NodeAccess.READ_WRITE;

			}

			return NodeAccess.READ_ONLY;

		}

		return node.access;

	}

	/**
	 * Returns A WGSL snippet representing the storage access.
	 *
	 * @param {StorageTextureNode|StorageBufferNode} node - The storage node.
	 * @param {string} shaderStage - The shader stage.
	 * @return {string} The WGSL snippet representing the storage access.
	 */
	getStorageAccess( node, shaderStage ) {

		return accessNames[ this.getNodeAccess( node, shaderStage ) ];

	}

	/**
	 * This method is one of the more important ones since it's responsible
	 * for generating a matching binding instance for the given uniform node.
	 *
	 * These bindings are later used in the renderer to create bind groups
	 * and layouts.
	 *
	 * @param {UniformNode} node - The uniform node.
	 * @param {string} type - The node data type.
	 * @param {string} shaderStage - The shader stage.
	 * @param {?string} [name=null] - An optional uniform name.
	 * @return {NodeUniform} The node uniform object.
	 */
	getUniformFromNode( node, type, shaderStage, name = null ) {

		const uniformNode = super.getUniformFromNode( node, type, shaderStage, name );
		const nodeData = this.getDataFromNode( node, shaderStage, this.globalCache );

		if ( nodeData.uniformGPU === undefined ) {

			let uniformGPU;

			const group = node.groupNode;
			const groupName = group.name;

			const bindings = this.getBindGroupArray( groupName, shaderStage );

			if ( type === 'texture' || type === 'cubeTexture' || type === 'storageTexture' || type === 'texture3D' ) {

				let texture = null;

				const access = this.getNodeAccess( node, shaderStage );

				if ( type === 'texture' || type === 'storageTexture' ) {

					if ( node.value.is3DTexture === true ) {

						texture = new NodeSampledTexture3D( uniformNode.name, uniformNode.node, group, access );

					} else {

						texture = new NodeSampledTexture( uniformNode.name, uniformNode.node, group, access );

					}

				} else if ( type === 'cubeTexture' ) {

					texture = new NodeSampledCubeTexture( uniformNode.name, uniformNode.node, group, access );

				} else if ( type === 'texture3D' ) {

					texture = new NodeSampledTexture3D( uniformNode.name, uniformNode.node, group, access );

				}

				texture.store = node.isStorageTextureNode === true;
				texture.setVisibility( gpuShaderStageLib[ shaderStage ] );

				if ( this.isUnfilterable( node.value ) === false && texture.store === false ) {

					const sampler = new NodeSampler( `${ uniformNode.name }_sampler`, uniformNode.node, group );
					sampler.setVisibility( gpuShaderStageLib[ shaderStage ] );

					bindings.push( sampler, texture );

					uniformGPU = [ sampler, texture ];

				} else {

					bindings.push( texture );

					uniformGPU = [ texture ];

				}

			} else if ( type === 'buffer' || type === 'storageBuffer' || type === 'indirectStorageBuffer' ) {

				const bufferClass = type === 'buffer' ? NodeUniformBuffer : NodeStorageBuffer;

				const buffer = new bufferClass( node, group );
				buffer.setVisibility( gpuShaderStageLib[ shaderStage ] );

				bindings.push( buffer );

				uniformGPU = buffer;

				uniformNode.name = name ? name : 'NodeBuffer_' + uniformNode.id;

			} else {

				const uniformsStage = this.uniformGroups[ shaderStage ] || ( this.uniformGroups[ shaderStage ] = {} );

				let uniformsGroup = uniformsStage[ groupName ];

				if ( uniformsGroup === undefined ) {

					uniformsGroup = new NodeUniformsGroup( groupName, group );
					uniformsGroup.setVisibility( gpuShaderStageLib[ shaderStage ] );

					uniformsStage[ groupName ] = uniformsGroup;

					bindings.push( uniformsGroup );

				}

				uniformGPU = this.getNodeUniform( uniformNode, type );

				uniformsGroup.addUniform( uniformGPU );

			}

			nodeData.uniformGPU = uniformGPU;

		}

		return uniformNode;

	}

	/**
	 * This method should be used whenever builtins are required in nodes.
	 * The internal builtins data structure will make sure builtins are
	 * defined in the WGSL source.
	 *
	 * @param {string} name - The builtin name.
	 * @param {string} property - The property name.
	 * @param {string} type - The node data type.
	 * @param {string} [shaderStage=this.shaderStage] - The shader stage this code snippet is generated for.
	 * @return {string} The property name.
	 */
	getBuiltin( name, property, type, shaderStage = this.shaderStage ) {

		const map = this.builtins[ shaderStage ] || ( this.builtins[ shaderStage ] = new Map() );

		if ( map.has( name ) === false ) {

			map.set( name, {
				name,
				property,
				type
			} );

		}

		return property;

	}

	/**
	 * Returns `true` if the given builtin is defined in the given shader stage.
	 *
	 * @param {string} name - The builtin name.
	 * @param {string} [shaderStage=this.shaderStage] - The shader stage this code snippet is generated for.
	 * @return {boolean} Whether the given builtin is defined in the given shader stage or not.
	 */
	hasBuiltin( name, shaderStage = this.shaderStage ) {

		return ( this.builtins[ shaderStage ] !== undefined && this.builtins[ shaderStage ].has( name ) );

	}

	/**
	 * Returns the vertex index builtin.
	 *
	 * @return {string} The vertex index.
	 */
	getVertexIndex() {

		if ( this.shaderStage === 'vertex' ) {

			return this.getBuiltin( 'vertex_index', 'vertexIndex', 'u32', 'attribute' );

		}

		return 'vertexIndex';

	}

	/**
	 * Builds the given shader node.
	 *
	 * @param {ShaderNodeInternal} shaderNode - The shader node.
	 * @return {string} The WGSL function code.
	 */
	buildFunctionCode( shaderNode ) {

		const layout = shaderNode.layout;
		const flowData = this.flowShaderNode( shaderNode );

		const parameters = [];

		for ( const input of layout.inputs ) {

			parameters.push( input.name + ' : ' + this.getType( input.type ) );

		}

		//

		let code = `fn ${ layout.name }( ${ parameters.join( ', ' ) } ) -> ${ this.getType( layout.type ) } {
${ flowData.vars }
${ flowData.code }
`;

		if ( flowData.result ) {

			code += `\treturn ${ flowData.result };\n`;

		}

		code += '\n}\n';

		//

		return code;

	}

	/**
	 * Returns the instance index builtin.
	 *
	 * @return {string} The instance index.
	 */
	getInstanceIndex() {

		if ( this.shaderStage === 'vertex' ) {

			return this.getBuiltin( 'instance_index', 'instanceIndex', 'u32', 'attribute' );

		}

		return 'instanceIndex';

	}

	/**
	 * Returns the invocation local index builtin.
	 *
	 * @return {string} The invocation local index.
	 */
	getInvocationLocalIndex() {

		return this.getBuiltin( 'local_invocation_index', 'invocationLocalIndex', 'u32', 'attribute' );

	}

	/**
	 * Returns the subgroup size builtin.
	 *
	 * @return {string} The subgroup size.
	 */
	getSubgroupSize() {

		this.enableSubGroups();

		return this.getBuiltin( 'subgroup_size', 'subgroupSize', 'u32', 'attribute' );

	}

	/**
	 * Returns the invocation subgroup index builtin.
	 *
	 * @return {string} The invocation subgroup index.
	 */
	getInvocationSubgroupIndex() {

		this.enableSubGroups();

		return this.getBuiltin( 'subgroup_invocation_id', 'invocationSubgroupIndex', 'u32', 'attribute' );

	}

	/**
	 * Returns the subgroup index builtin.
	 *
	 * @return {string} The subgroup index.
	 */
	getSubgroupIndex() {

		this.enableSubGroups();

		return this.getBuiltin( 'subgroup_id', 'subgroupIndex', 'u32', 'attribute' );

	}

	/**
	 * Overwritten as a NOP since this method is intended for the WebGL 2 backend.
	 *
	 * @return {null} Null.
	 */
	getDrawIndex() {

		return null;

	}

	/**
	 * Returns the front facing builtin.
	 *
	 * @return {string} The front facing builtin.
	 */
	getFrontFacing() {

		return this.getBuiltin( 'front_facing', 'isFront', 'bool' );

	}

	/**
	 * Returns the frag coord builtin.
	 *
	 * @return {string} The frag coord builtin.
	 */
	getFragCoord() {

		return this.getBuiltin( 'position', 'fragCoord', 'vec4<f32>' ) + '.xy';

	}

	/**
	 * Returns the frag depth builtin.
	 *
	 * @return {string} The frag depth builtin.
	 */
	getFragDepth() {

		return 'output.' + this.getBuiltin( 'frag_depth', 'depth', 'f32', 'output' );

	}

	/**
	 * Returns the clip distances builtin.
	 *
	 * @return {string} The clip distances builtin.
	 */
	getClipDistance() {

		return 'varyings.hw_clip_distances';

	}

	/**
	 * Whether to flip texture data along its vertical axis or not.
	 *
	 * @return {boolean} Returns always `false` in context of WGSL.
	 */
	isFlipY() {

		return false;

	}

	/**
	 * Enables the given directive for the given shader stage.
	 *
	 * @param {string} name - The directive name.
	 * @param {string} [shaderStage=this.shaderStage] - The shader stage to enable the directive for.
	 */
	enableDirective( name, shaderStage = this.shaderStage ) {

		const stage = this.directives[ shaderStage ] || ( this.directives[ shaderStage ] = new Set() );
		stage.add( name );

	}

	/**
	 * Returns the directives of the given shader stage as a WGSL string.
	 *
	 * @param {string} shaderStage - The shader stage.
	 * @return {string} A WGSL snippet that enables the directives of the given stage.
	 */
	getDirectives( shaderStage ) {

		const snippets = [];
		const directives = this.directives[ shaderStage ];

		if ( directives !== undefined ) {

			for ( const directive of directives ) {

				snippets.push( `enable ${directive};` );

			}

		}

		return snippets.join( '\n' );

	}

	/**
	 * Enables the 'subgroups' directive.
	 */
	enableSubGroups() {

		this.enableDirective( 'subgroups' );

	}

	/**
	 * Enables the 'subgroups-f16' directive.
	 */
	enableSubgroupsF16() {

		this.enableDirective( 'subgroups-f16' );

	}

	/**
	 * Enables the 'clip_distances' directive.
	 */
	enableClipDistances() {

		this.enableDirective( 'clip_distances' );

	}

	/**
	 * Enables the 'f16' directive.
	 */
	enableShaderF16() {

		this.enableDirective( 'f16' );

	}

	/**
	 * Enables the 'dual_source_blending' directive.
	 */
	enableDualSourceBlending() {

		this.enableDirective( 'dual_source_blending' );

	}

	/**
	 * Enables hardware clipping.
	 *
	 * @param {string} planeCount - The clipping plane count.
	 */
	enableHardwareClipping( planeCount ) {

		this.enableClipDistances();
		this.getBuiltin( 'clip_distances', 'hw_clip_distances', `array<f32, ${ planeCount } >`, 'vertex' );

	}

	/**
	 * Returns the builtins of the given shader stage as a WGSL string.
	 *
	 * @param {string} shaderStage - The shader stage.
	 * @return {string} A WGSL snippet that represents the builtins of the given stage.
	 */
	getBuiltins( shaderStage ) {

		const snippets = [];
		const builtins = this.builtins[ shaderStage ];

		if ( builtins !== undefined ) {

			for ( const { name, property, type } of builtins.values() ) {

				snippets.push( `@builtin( ${name} ) ${property} : ${type}` );

			}

		}

		return snippets.join( ',\n\t' );

	}

	/**
	 * This method should be used when a new scoped buffer is used in context of
	 * compute shaders. It adds the array to the internal data structure which is
	 * later used to generate the respective WGSL.
	 *
	 * @param {string} name - The array name.
	 * @param {string} scope - The scope.
	 * @param {string} bufferType - The buffer type.
	 * @param {string} bufferCount - The buffer count.
	 * @return {string} The array name.
	 */
	getScopedArray( name, scope, bufferType, bufferCount ) {

		if ( this.scopedArrays.has( name ) === false ) {

			this.scopedArrays.set( name, {
				name,
				scope,
				bufferType,
				bufferCount
			} );

		}

		return name;

	}

	/**
	 * Returns the scoped arrays of the given shader stage as a WGSL string.
	 *
	 * @param {string} shaderStage - The shader stage.
	 * @return {string|undefined} The WGSL snippet that defines the scoped arrays.
	 * Returns `undefined` when used in the vertex or fragment stage.
	 */
	getScopedArrays( shaderStage ) {

		if ( shaderStage !== 'compute' ) {

			return;

		}

		const snippets = [];

		for ( const { name, scope, bufferType, bufferCount } of this.scopedArrays.values() ) {

			const type = this.getType( bufferType );

			snippets.push( `var<${scope}> ${name}: array< ${type}, ${bufferCount} >;` );

		}

		return snippets.join( '\n' );

	}

	/**
	 * Returns the shader attributes of the given shader stage as a WGSL string.
	 *
	 * @param {string} shaderStage - The shader stage.
	 * @return {string} The WGSL snippet that defines the shader attributes.
	 */
	getAttributes( shaderStage ) {

		const snippets = [];

		if ( shaderStage === 'compute' ) {

			this.getBuiltin( 'global_invocation_id', 'globalId', 'vec3<u32>', 'attribute' );
			this.getBuiltin( 'workgroup_id', 'workgroupId', 'vec3<u32>', 'attribute' );
			this.getBuiltin( 'local_invocation_id', 'localId', 'vec3<u32>', 'attribute' );
			this.getBuiltin( 'num_workgroups', 'numWorkgroups', 'vec3<u32>', 'attribute' );

			if ( this.renderer.hasFeature( 'subgroups' ) ) {

				this.enableDirective( 'subgroups', shaderStage );
				this.getBuiltin( 'subgroup_size', 'subgroupSize', 'u32', 'attribute' );

			}

		}

		if ( shaderStage === 'vertex' || shaderStage === 'compute' ) {

			const builtins = this.getBuiltins( 'attribute' );

			if ( builtins ) snippets.push( builtins );

			const attributes = this.getAttributesArray();

			for ( let index = 0, length = attributes.length; index < length; index ++ ) {

				const attribute = attributes[ index ];
				const name = attribute.name;
				const type = this.getType( attribute.type );

				snippets.push( `@location( ${index} ) ${ name } : ${ type }` );

			}

		}

		return snippets.join( ',\n\t' );

	}

	/**
	 * Returns the members of the given struct type node as a WGSL string.
	 *
	 * @param {StructTypeNode} struct - The struct type node.
	 * @return {string} The WGSL snippet that defines the struct members.
	 */
	getStructMembers( struct ) {

		const snippets = [];

		for ( const member of struct.members ) {

			const prefix = struct.output ? '@location( ' + member.index + ' ) ' : '';

			let type = this.getType( member.type );

			if ( member.atomic ) {

				type = 'atomic< ' + type + ' >';

			}

			snippets.push( `\t${ prefix + member.name } : ${ type }` );

		}

		if ( struct.output ) {

			snippets.push( `\t${ this.getBuiltins( 'output' ) }` );

		}

		return snippets.join( ',\n' );

	}

	/**
	 * Returns the structs of the given shader stage as a WGSL string.
	 *
	 * @param {string} shaderStage - The shader stage.
	 * @return {string} The WGSL snippet that defines the structs.
	 */
	getStructs( shaderStage ) {

		let result = '';

		const structs = this.structs[ shaderStage ];

		if ( structs.length > 0 ) {

			const snippets = [];

			for ( const struct of structs ) {

				let snippet = `struct ${ struct.name } {\n`;
				snippet += this.getStructMembers( struct );
				snippet += '\n};';

				snippets.push( snippet );

			}

			result = '\n' + snippets.join( '\n\n' ) + '\n';

		}

		return result;

	}

	/**
	 * Returns a WGSL string representing a variable.
	 *
	 * @param {string} type - The variable's type.
	 * @param {string} name - The variable's name.
	 * @param {?number} [count=null] - The array length.
	 * @return {string} The WGSL snippet that defines a variable.
	 */
	getVar( type, name, count = null ) {

		let snippet = `var ${ name } : `;

		if ( count !== null ) {

			snippet += this.generateArrayDeclaration( type, count );

		} else {

			snippet += this.getType( type );

		}

		return snippet;

	}

	/**
	 * Returns the variables of the given shader stage as a WGSL string.
	 *
	 * @param {string} shaderStage - The shader stage.
	 * @return {string} The WGSL snippet that defines the variables.
	 */
	getVars( shaderStage ) {

		const snippets = [];
		const vars = this.vars[ shaderStage ];

		if ( vars !== undefined ) {

			for ( const variable of vars ) {

				snippets.push( `\t${ this.getVar( variable.type, variable.name, variable.count ) };` );

			}

		}

		return `\n${ snippets.join( '\n' ) }\n`;

	}

	/**
	 * Returns the varyings of the given shader stage as a WGSL string.
	 *
	 * @param {string} shaderStage - The shader stage.
	 * @return {string} The WGSL snippet that defines the varyings.
	 */
	getVaryings( shaderStage ) {

		const snippets = [];

		if ( shaderStage === 'vertex' ) {

			this.getBuiltin( 'position', 'Vertex', 'vec4<f32>', 'vertex' );

		}

		if ( shaderStage === 'vertex' || shaderStage === 'fragment' ) {

			const varyings = this.varyings;
			const vars = this.vars[ shaderStage ];

			for ( let index = 0; index < varyings.length; index ++ ) {

				const varying = varyings[ index ];

				if ( varying.needsInterpolation ) {

					let attributesSnippet = `@location( ${index} )`;

					if ( varying.interpolationType ) {

						const samplingSnippet = varying.interpolationSampling !== null ? `, ${ varying.interpolationSampling } )` : ' )';

						attributesSnippet += ` @interpolate( ${ varying.interpolationType }${ samplingSnippet }`;

						// Otherwise, optimize interpolation when sensible

					} else if ( /^(int|uint|ivec|uvec)/.test( varying.type ) ) {

						attributesSnippet += ` @interpolate( ${ this.renderer.backend.compatibilityMode ? 'flat, either' : 'flat' } )`;

					}

					snippets.push( `${ attributesSnippet } ${ varying.name } : ${ this.getType( varying.type ) }` );

				} else if ( shaderStage === 'vertex' && vars.includes( varying ) === false ) {

					vars.push( varying );

				}

			}

		}

		const builtins = this.getBuiltins( shaderStage );

		if ( builtins ) snippets.push( builtins );

		const code = snippets.join( ',\n\t' );

		return shaderStage === 'vertex' ? this._getWGSLStruct( 'VaryingsStruct', '\t' + code ) : code;

	}

	isCustomStruct( nodeUniform ) {

		const attribute = nodeUniform.value;
		const bufferNode = nodeUniform.node;

		const isAttributeStructType = ( attribute.isBufferAttribute || attribute.isInstancedBufferAttribute ) && bufferNode.structTypeNode !== null;

		const isStructArray =
			( bufferNode.value && bufferNode.value.array ) &&
			( typeof bufferNode.value.itemSize === 'number' && bufferNode.value.array.length > bufferNode.value.itemSize );

		return isAttributeStructType && ! isStructArray;

	}

	/**
	 * Returns the uniforms of the given shader stage as a WGSL string.
	 *
	 * @param {string} shaderStage - The shader stage.
	 * @return {string} The WGSL snippet that defines the uniforms.
	 */
	getUniforms( shaderStage ) {

		const uniforms = this.uniforms[ shaderStage ];

		const bindingSnippets = [];
		const bufferSnippets = [];
		const structSnippets = [];
		const uniformGroups = {};

		for ( const uniform of uniforms ) {

			const groupName = uniform.groupNode.name;
			const uniformIndexes = this.bindingsIndexes[ groupName ];

			if ( uniform.type === 'texture' || uniform.type === 'cubeTexture' || uniform.type === 'storageTexture' || uniform.type === 'texture3D' ) {

				const texture = uniform.node.value;

				if ( this.isUnfilterable( texture ) === false && uniform.node.isStorageTextureNode !== true ) {

					if ( this.isSampleCompare( texture ) ) {

						bindingSnippets.push( `@binding( ${ uniformIndexes.binding ++ } ) @group( ${ uniformIndexes.group } ) var ${ uniform.name }_sampler : sampler_comparison;` );

					} else {

						bindingSnippets.push( `@binding( ${ uniformIndexes.binding ++ } ) @group( ${ uniformIndexes.group } ) var ${ uniform.name }_sampler : sampler;` );

					}

				}

				let textureType;

				let multisampled = '';

				const { primarySamples } = this.renderer.backend.utils.getTextureSampleData( texture );

				if ( primarySamples > 1 ) {

					multisampled = '_multisampled';

				}

				if ( texture.isCubeTexture === true ) {

					textureType = 'texture_cube<f32>';

				} else if ( texture.isDepthTexture === true ) {

					if ( this.renderer.backend.compatibilityMode && texture.compareFunction === null ) {

						textureType = `texture${ multisampled }_2d<f32>`;

					} else {

						textureType = `texture_depth${ multisampled }_2d${ texture.isArrayTexture === true ? '_array' : '' }`;

					}

				} else if ( uniform.node.isStorageTextureNode === true ) {

					const format = getFormat( texture );
					const access = this.getStorageAccess( uniform.node, shaderStage );

					const is3D = uniform.node.value.is3DTexture;
					const isArrayTexture = uniform.node.value.isArrayTexture;

					const dimension = is3D ? '3d' : `2d${ isArrayTexture ? '_array' : '' }`;

					textureType = `texture_storage_${ dimension }<${ format }, ${ access }>`;

				} else if ( texture.isArrayTexture === true || texture.isDataArrayTexture === true || texture.isCompressedArrayTexture === true ) {

					textureType = 'texture_2d_array<f32>';

				} else if ( texture.is3DTexture === true || texture.isData3DTexture === true ) {

					textureType = 'texture_3d<f32>';

				} else {

					const componentPrefix = this.getComponentTypeFromTexture( texture ).charAt( 0 );

					textureType = `texture${ multisampled }_2d<${ componentPrefix }32>`;

				}

				bindingSnippets.push( `@binding( ${ uniformIndexes.binding ++ } ) @group( ${ uniformIndexes.group } ) var ${ uniform.name } : ${ textureType };` );

			} else if ( uniform.type === 'buffer' || uniform.type === 'storageBuffer' || uniform.type === 'indirectStorageBuffer' ) {

				const bufferNode = uniform.node;
				const bufferType = this.getType( bufferNode.getNodeType( this ) );
				const bufferCount = bufferNode.bufferCount;
				const bufferCountSnippet = bufferCount > 0 && uniform.type === 'buffer' ? ', ' + bufferCount : '';
				const bufferAccessMode = bufferNode.isStorageBufferNode ? `storage, ${ this.getStorageAccess( bufferNode, shaderStage ) }` : 'uniform';

				if ( this.isCustomStruct( uniform ) ) {

					bufferSnippets.push( `@binding( ${ uniformIndexes.binding ++ } ) @group( ${ uniformIndexes.group } ) var<${ bufferAccessMode }> ${ uniform.name } : ${ bufferType };` );

				} else {

					const bufferTypeSnippet = bufferNode.isAtomic ? `atomic<${ bufferType }>` : `${ bufferType }`;
					const bufferSnippet = `\tvalue : array< ${ bufferTypeSnippet }${ bufferCountSnippet } >`;

					bufferSnippets.push( this._getWGSLStructBinding( uniform.name, bufferSnippet, bufferAccessMode, uniformIndexes.binding ++, uniformIndexes.group ) );

				}

			} else {

				const vectorType = this.getType( this.getVectorType( uniform.type ) );
				const groupName = uniform.groupNode.name;

				const group = uniformGroups[ groupName ] || ( uniformGroups[ groupName ] = {
					index: uniformIndexes.binding ++,
					id: uniformIndexes.group,
					snippets: []
				} );

				group.snippets.push( `\t${ uniform.name } : ${ vectorType }` );

			}

		}

		for ( const name in uniformGroups ) {

			const group = uniformGroups[ name ];

			structSnippets.push( this._getWGSLStructBinding( name, group.snippets.join( ',\n' ), 'uniform', group.index, group.id ) );

		}

		let code = bindingSnippets.join( '\n' );
		code += bufferSnippets.join( '\n' );
		code += structSnippets.join( '\n' );

		return code;

	}

	/**
	 * Controls the code build of the shader stages.
	 */
	buildCode() {

		const shadersData = this.material !== null ? { fragment: {}, vertex: {} } : { compute: {} };

		this.sortBindingGroups();

		for ( const shaderStage in shadersData ) {

			this.shaderStage = shaderStage;

			const stageData = shadersData[ shaderStage ];
			stageData.uniforms = this.getUniforms( shaderStage );
			stageData.attributes = this.getAttributes( shaderStage );
			stageData.varyings = this.getVaryings( shaderStage );
			stageData.structs = this.getStructs( shaderStage );
			stageData.vars = this.getVars( shaderStage );
			stageData.codes = this.getCodes( shaderStage );
			stageData.directives = this.getDirectives( shaderStage );
			stageData.scopedArrays = this.getScopedArrays( shaderStage );

			//

			let flow = '// code\n\n';
			flow += this.flowCode[ shaderStage ];

			const flowNodes = this.flowNodes[ shaderStage ];
			const mainNode = flowNodes[ flowNodes.length - 1 ];

			const outputNode = mainNode.outputNode;
			const isOutputStruct = ( outputNode !== undefined && outputNode.isOutputStructNode === true );

			for ( const node of flowNodes ) {

				const flowSlotData = this.getFlowData( node/*, shaderStage*/ );
				const slotName = node.name;

				if ( slotName ) {

					if ( flow.length > 0 ) flow += '\n';

					flow += `\t// flow -> ${ slotName }\n`;

				}

				flow += `${ flowSlotData.code }\n\t`;

				if ( node === mainNode && shaderStage !== 'compute' ) {

					flow += '// result\n\n\t';

					if ( shaderStage === 'vertex' ) {

						flow += `varyings.Vertex = ${ flowSlotData.result };`;

					} else if ( shaderStage === 'fragment' ) {

						if ( isOutputStruct ) {

							stageData.returnType = outputNode.getNodeType( this );
							stageData.structs += 'var<private> output : ' + stageData.returnType + ';';

							flow += `return ${ flowSlotData.result };`;

						} else {

							let structSnippet = '\t@location(0) color: vec4<f32>';

							const builtins = this.getBuiltins( 'output' );

							if ( builtins ) structSnippet += ',\n\t' + builtins;

							stageData.returnType = 'OutputStruct';
							stageData.structs += this._getWGSLStruct( 'OutputStruct', structSnippet );
							stageData.structs += '\nvar<private> output : OutputStruct;';

							flow += `output.color = ${ flowSlotData.result };\n\n\treturn output;`;

						}

					}

				}

			}

			stageData.flow = flow;

		}

		this.shaderStage = null;

		if ( this.material !== null ) {

			this.vertexShader = this._getWGSLVertexCode( shadersData.vertex );
			this.fragmentShader = this._getWGSLFragmentCode( shadersData.fragment );

		} else {

			// Early strictly validated in computeNode

			const workgroupSize = this.object.workgroupSize;

			this.computeShader = this._getWGSLComputeCode( shadersData.compute, workgroupSize );

		}

	}

	/**
	 * Returns the native shader method name for a given generic name.
	 *
	 * @param {string} method - The method name to resolve.
	 * @param {?string} [output=null] - An optional output.
	 * @return {string} The resolved WGSL method name.
	 */
	getMethod( method, output = null ) {

		let wgslMethod;

		if ( output !== null ) {

			wgslMethod = this._getWGSLMethod( method + '_' + output );

		}

		if ( wgslMethod === undefined ) {

			wgslMethod = this._getWGSLMethod( method );

		}

		return wgslMethod || method;

	}

	/**
	 * Returns the native snippet for a ternary operation.
	 *
	 * @param {string} condSnippet - The condition determining which expression gets resolved.
	 * @param {string} ifSnippet - The expression to resolve to if the condition is true.
	 * @param {string} elseSnippet - The expression to resolve to if the condition is false.
	 * @return {string} The resolved method name.
	 */
	getTernary( condSnippet, ifSnippet, elseSnippet ) {

		return `select( ${elseSnippet}, ${ifSnippet}, ${condSnippet} )`;

	}


	/**
	 * Returns the WGSL type of the given node data type.
	 *
	 * @param {string} type - The node data type.
	 * @return {string} The WGSL type.
	 */
	getType( type ) {

		return wgslTypeLib[ type ] || type;

	}

	/**
	 * Whether the requested feature is available or not.
	 *
	 * @param {string} name - The requested feature.
	 * @return {boolean} Whether the requested feature is supported or not.
	 */
	isAvailable( name ) {

		let result = supports[ name ];

		if ( result === undefined ) {

			if ( name === 'float32Filterable' ) {

				result = this.renderer.hasFeature( 'float32-filterable' );

			} else if ( name === 'clipDistance' ) {

				result = this.renderer.hasFeature( 'clip-distances' );

			}

			supports[ name ] = result;

		}

		return result;

	}

	/**
	 * Returns the native shader method name for a given generic name.
	 *
	 * @private
	 * @param {string} method - The method name to resolve.
	 * @return {string} The resolved WGSL method name.
	 */
	_getWGSLMethod( method ) {

		if ( wgslPolyfill[ method ] !== undefined ) {

			this._include( method );

		}

		return wgslMethods[ method ];

	}

	/**
	 * Includes the given method name into the current
	 * function node.
	 *
	 * @private
	 * @param {string} name - The method name to include.
	 * @return {CodeNode} The respective code node.
	 */
	_include( name ) {

		const codeNode = wgslPolyfill[ name ];
		codeNode.build( this );

		if ( this.currentFunctionNode !== null ) {

			this.currentFunctionNode.includes.push( codeNode );

		}

		return codeNode;

	}

	/**
	 * Returns a WGSL vertex shader based on the given shader data.
	 *
	 * @private
	 * @param {Object} shaderData - The shader data.
	 * @return {string} The vertex shader.
	 */
	_getWGSLVertexCode( shaderData ) {

		return `${ this.getSignature() }
// directives
${shaderData.directives}

// structs
${shaderData.structs}

// uniforms
${shaderData.uniforms}

// varyings
${shaderData.varyings}
var<private> varyings : VaryingsStruct;

// codes
${shaderData.codes}

@vertex
fn main( ${shaderData.attributes} ) -> VaryingsStruct {

	// vars
	${shaderData.vars}

	// flow
	${shaderData.flow}

	return varyings;

}
`;

	}

	/**
	 * Returns a WGSL fragment shader based on the given shader data.
	 *
	 * @private
	 * @param {Object} shaderData - The shader data.
	 * @return {string} The vertex shader.
	 */
	_getWGSLFragmentCode( shaderData ) {

		return `${ this.getSignature() }
// global
${ diagnostics }

// structs
${shaderData.structs}

// uniforms
${shaderData.uniforms}

// codes
${shaderData.codes}

@fragment
fn main( ${shaderData.varyings} ) -> ${shaderData.returnType} {

	// vars
	${shaderData.vars}

	// flow
	${shaderData.flow}

}
`;

	}

	/**
	 * Returns a WGSL compute shader based on the given shader data.
	 *
	 * @private
	 * @param {Object} shaderData - The shader data.
	 * @param {string} workgroupSize - The workgroup size.
	 * @return {string} The vertex shader.
	 */
	_getWGSLComputeCode( shaderData, workgroupSize ) {

		const [ workgroupSizeX, workgroupSizeY, workgroupSizeZ ] = workgroupSize;

		return `${ this.getSignature() }
// directives
${ shaderData.directives }

// system
var<private> instanceIndex : u32;

// locals
${ shaderData.scopedArrays }

// structs
${ shaderData.structs }

// uniforms
${ shaderData.uniforms }

// codes
${ shaderData.codes }

@compute @workgroup_size( ${ workgroupSizeX }, ${ workgroupSizeY }, ${ workgroupSizeZ } )
fn main( ${ shaderData.attributes } ) {

	// system
	instanceIndex = globalId.x
		+ globalId.y * ( ${ workgroupSizeX } * numWorkgroups.x )
		+ globalId.z * ( ${ workgroupSizeX } * numWorkgroups.x ) * ( ${ workgroupSizeY } * numWorkgroups.y );

	// vars
	${ shaderData.vars }

	// flow
	${ shaderData.flow }

}
`;

	}

	/**
	 * Returns a WGSL struct based on the given name and variables.
	 *
	 * @private
	 * @param {string} name - The struct name.
	 * @param {string} vars - The struct variables.
	 * @return {string} The WGSL snippet representing a struct.
	 */
	_getWGSLStruct( name, vars ) {

		return `
struct ${name} {
${vars}
};`;

	}

	/**
	 * Returns a WGSL struct binding.
	 *
	 * @private
	 * @param {string} name - The struct name.
	 * @param {string} vars - The struct variables.
	 * @param {string} access - The access.
	 * @param {number} [binding=0] - The binding index.
	 * @param {number} [group=0] - The group index.
	 * @return {string} The WGSL snippet representing a struct binding.
	 */
	_getWGSLStructBinding( name, vars, access, binding = 0, group = 0 ) {

		const structName = name + 'Struct';
		const structSnippet = this._getWGSLStruct( structName, vars );

		return `${structSnippet}
@binding( ${ binding } ) @group( ${ group } )
var<${access}> ${ name } : ${ structName };`;

	}

}

export default WGSLNodeBuilder;
