import NodeFunction from '../../../nodes/core/NodeFunction.js'; // 引入通用节点函数基类
import NodeFunctionInput from '../../../nodes/core/NodeFunctionInput.js'; // 引入节点函数输入描述类

const declarationRegexp = /^[fn]*\s*([a-z_0-9]+)?\s*\(([\s\S]*?)\)\s*[\-\>]*\s*([a-z_0-9]+(?:<[\s\S]+?>)?)/i; // 匹配函数声明（名称、参数、返回类型）
const propertiesRegexp = /([a-z_0-9]+)\s*:\s*([a-z_0-9]+(?:<[\s\S]+?>)?)/ig; // 匹配参数对（name: type）

const wgslTypeLib = { // WGSL 类型到内部节点类型的映射表
	'f32': 'float',
	'i32': 'int',
	'u32': 'uint',
	'bool': 'bool',

	'vec2<f32>': 'vec2',
 	'vec2<i32>': 'ivec2',
 	'vec2<u32>': 'uvec2',
 	'vec2<bool>': 'bvec2',

	'vec2f': 'vec2',
	'vec2i': 'ivec2',
	'vec2u': 'uvec2',
	'vec2b': 'bvec2',

	'vec3<f32>': 'vec3',
	'vec3<i32>': 'ivec3',
	'vec3<u32>': 'uvec3',
	'vec3<bool>': 'bvec3',

	'vec3f': 'vec3',
	'vec3i': 'ivec3',
	'vec3u': 'uvec3',
	'vec3b': 'bvec3',

	'vec4<f32>': 'vec4',
	'vec4<i32>': 'ivec4',
	'vec4<u32>': 'uvec4',
	'vec4<bool>': 'bvec4',

	'vec4f': 'vec4',
	'vec4i': 'ivec4',
	'vec4u': 'uvec4',
	'vec4b': 'bvec4',

	'mat2x2<f32>': 'mat2',
	'mat2x2f': 'mat2',

	'mat3x3<f32>': 'mat3',
	'mat3x3f': 'mat3',

	'mat4x4<f32>': 'mat4',
	'mat4x4f': 'mat4',

	'sampler': 'sampler',

	'texture_1d': 'texture',

	'texture_2d': 'texture',
	'texture_2d_array': 'texture',
	'texture_multisampled_2d': 'cubeTexture',

	'texture_depth_2d': 'depthTexture',
	'texture_depth_2d_array': 'depthTexture',
	'texture_depth_multisampled_2d': 'depthTexture',
	'texture_depth_cube': 'depthTexture',
	'texture_depth_cube_array': 'depthTexture',

	'texture_3d': 'texture3D',

	'texture_cube': 'cubeTexture',
	'texture_cube_array': 'cubeTexture',

	'texture_storage_1d': 'storageTexture',
	'texture_storage_2d': 'storageTexture',
	'texture_storage_2d_array': 'storageTexture',
	'texture_storage_3d': 'storageTexture'

}; // 结束类型映射表定义

const parse = ( source ) => { // 解析 WGSL 函数字符串，提取类型、输入、名称与代码块

	source = source.trim(); // 去除首尾空白

	const declaration = source.match( declarationRegexp ); // 匹配函数声明部分

	if ( declaration !== null && declaration.length === 4 ) { // 成功匹配到（名称、参数、返回类型）三段

		const inputsCode = declaration[ 2 ]; // 原始参数段字符串
		const propsMatches = []; // 收集参数匹配结果
		let match = null; // 临时匹配对象

		while ( ( match = propertiesRegexp.exec( inputsCode ) ) !== null ) { // 迭代提取 name/type 对

			propsMatches.push( { name: match[ 1 ], type: match[ 2 ] } ); // 保存一组参数条目

		}

		// 将匹配的参数转换为 NodeFunctionInput
		const inputs = []; // 解析后的输入数组
		for ( let i = 0; i < propsMatches.length; i ++ ) { // 遍历参数条目

			const { name, type } = propsMatches[ i ]; // 获取参数名与原始类型

			let resolvedType = type; // 最终解析后的类型标识

			if ( resolvedType.startsWith( 'ptr' ) ) { // 指针类型统一视作 pointer

				resolvedType = 'pointer'; // 指定内部 pointer 类型

			} else { // 非指针类型的进一步处理

				if ( resolvedType.startsWith( 'texture' ) ) { // 纹理类型去掉泛型参数

					resolvedType = type.split( '<' )[ 0 ]; // 仅保留基本纹理类型前缀

				} // 结束纹理类型处理

				resolvedType = wgslTypeLib[ resolvedType ]; // 使用映射将 WGSL 类型转换为内部类型

			} // 结束类型判断

			inputs.push( new NodeFunctionInput( resolvedType, name ) ); // 记录一个输入参数描述

		} // 结束参数处理循环

		const blockCode = source.substring( declaration[ 0 ].length ); // 提取函数体代码块
		const outputType = declaration[ 3 ] || 'void'; // 返回类型，默认 void

		const name = declaration[ 1 ] !== undefined ? declaration[ 1 ] : ''; // 函数名（可能为空）
		const type = wgslTypeLib[ outputType ] || outputType; // 内部返回类型

		return { // 返回解析结果对象
			type, // 内部返回类型
			inputs, // 输入参数数组
			name, // 函数名称
			inputsCode, // 原始参数片段代码
			blockCode, // 函数体代码块
			outputType // WGSL 原始返回类型
		};

	} else { // 未匹配到函数声明，抛出异常

		throw new Error( 'FunctionNode: Function is not a WGSL code.' ); // 非 WGSL 函数格式

	} // 结束 if 分支

}; // 结束 parse 函数定义

/**
 * 表示一个 WGSL 节点函数的封装。
 *
 * @augments NodeFunction
 */
class WGSLNodeFunction extends NodeFunction { // 定义 WGSL 节点函数，继承 NodeFunction

	/**
	 * 构造一个 WGSL 节点函数对象。
	 *
	 * @param {string} source - WGSL 源码字符串。
	 */
	constructor( source ) { // 通过 WGSL 源码构造函数节点

		const { type, inputs, name, inputsCode, blockCode, outputType } = parse( source ); // 先解析源字符串

		super( type, inputs, name ); // 调用父类构造，设置类型与参数

		this.inputsCode = inputsCode; // 缓存参数段源码
		this.blockCode = blockCode; // 缓存函数体代码
		this.outputType = outputType; // 缓存 WGSL 返回类型

	} // 结束构造器

	/**
	 * 返回该节点函数对应的 WGSL 源码。
	 *
	 * @param {string} [name=this.name] - 函数名。
	 * @return {string} 着色器源码。
	 */
	getCode( name = this.name ) { // 生成该函数的 WGSL 源码字符串

		const outputType = this.outputType !== 'void' ? '-> ' + this.outputType : ''; // 非 void 需要带返回类型箭头

		return `fn ${ name } ( ${ this.inputsCode.trim() } ) ${ outputType }` + this.blockCode; // 拼接函数头与函数体

	} // 结束 getCode 方法

} // 结束 WGSLNodeFunction 类

export default WGSLNodeFunction; // 默认导出 WGSLNodeFunction
