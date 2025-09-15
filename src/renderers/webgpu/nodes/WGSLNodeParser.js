import NodeParser from '../../../nodes/core/NodeParser.js'; // 引入通用节点解析器基类
import WGSLNodeFunction from './WGSLNodeFunction.js'; // 引入 WGSL 节点函数封装类

/**
 * WGSL 节点解析器。
 *
 * @augments NodeParser
 */
class WGSLNodeParser extends NodeParser { // 定义 WGSL 节点解析器，继承自 NodeParser

	/**
	 * 解析传入的 WGSL 源码并返回节点函数对象。
	 *
	 * @param {string} source - WGSL 源码。
	 * @return {WGSLNodeFunction} 节点函数对象。
	 */
	parseFunction( source ) { // 解析传入的 WGSL 源码并返回封装的函数节点

		return new WGSLNodeFunction( source ); // 使用源码构造 WGSL 节点函数对象

	}

} // 结束 WGSLNodeParser 类定义

export default WGSLNodeParser; // 默认导出 WGSLNodeParser
