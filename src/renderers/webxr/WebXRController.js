import { Vector3 } from '../../math/Vector3.js'; // 从数学模块导入三维向量类，用于存储/复制速度等数据
import { Group } from '../../objects/Group.js'; // 从物体模块导入 Group，用作控制器各空间的场景节点容器

const _moveEvent = { type: 'move' }; // 预定义的“移动”事件对象，重复复用以避免频繁分配

/**
 * 类概要：表示 XR 控制器及其不同坐标空间（目标射线、握持、手部）。
 * - 作用：封装 XR 输入源的三种空间节点，维护它们的矩阵、可见性、速度并转发事件。
 * - 参数：无。
 * - 返回：无（类定义）。
 *
 * @private 私有：内部使用。
 */
class WebXRController {

	/**
	 * 构造函数概要：构建一个新的 XR 控制器实例。
	 * - 作用：初始化目标射线/握持/手部空间占位引用为 null。
	 * - 参数：无。
	 * - 返回：WebXRController 实例。
	 */
	constructor() {

		/**
		 * XR 控制器的目标射线空间（target ray space）对应的 Group 节点。
		 * @private 私有字段
		 * @type {?Group} 初始为空，按需懒创建
		 * @default null 默认值为 null
		 */
		this._targetRay = null; // 目标射线空间引用，懒加载创建

		/**
		 * XR 控制器的握持空间（grip space）对应的 Group 节点。
		 * @private 私有字段
		 * @type {?Group} 初始为空，按需懒创建
		 * @default null 默认值为 null
		 */
		this._grip = null; // 握持空间引用，懒加载创建

		/**
		 * XR 控制器的手部空间（hand space）对应的 Group 节点。
		 * @private 私有字段
		 * @type {?Group} 初始为空，按需懒创建
		 * @default null 默认值为 null
		 */
		this._hand = null; // 手部空间引用，懒加载创建

	}

	/**
	 * 方法概要：获取 XR 控制器的手部空间 Group（懒创建）。
	 * - 参数：无。
	 * - 返回：{Group} 手部空间的 Group 节点。
	 */
	getHandSpace() { // 获取手部空间（若未创建则创建）

		if ( this._hand === null ) { // 若尚未创建手部空间，则进行懒创建

			this._hand = new Group(); // 创建手部空间 Group
			this._hand.matrixAutoUpdate = false; // 禁用自动更新矩阵，使用外部姿态数据
			this._hand.visible = false; // 初始不可见，只有有姿态数据时才可见

			this._hand.joints = {}; // 存放各手部关节的 Group 映射（按 jointName）
			this._hand.inputState = { pinching: false }; // 自定义输入状态：是否处于捏合中

		}

		return this._hand; // 返回手部空间 Group 引用

	}

	/**
	 * 方法概要：获取 XR 控制器的目标射线空间 Group（懒创建）。
	 * - 参数：无。
	 * - 返回：{Group} 目标射线空间的 Group 节点。
	 */
	getTargetRaySpace() { // 获取目标射线空间（若未创建则创建）

		if ( this._targetRay === null ) { // 若尚未创建目标射线空间，则进行懒创建

			this._targetRay = new Group(); // 创建目标射线空间 Group
			this._targetRay.matrixAutoUpdate = false; // 禁用自动矩阵更新，使用外部姿态
			this._targetRay.visible = false; // 初始不可见
			this._targetRay.hasLinearVelocity = false; // 初始无线速度数据
			this._targetRay.linearVelocity = new Vector3(); // 线速度向量占位
			this._targetRay.hasAngularVelocity = false; // 初始无角速度数据
			this._targetRay.angularVelocity = new Vector3(); // 角速度向量占位

		}

		return this._targetRay; // 返回目标射线空间 Group 引用

	}

	/**
	 * 方法概要：获取 XR 控制器的握持空间 Group（懒创建）。
	 * - 参数：无。
	 * - 返回：{Group} 握持空间的 Group 节点。
	 */
	getGripSpace() { // 获取握持空间（若未创建则创建）

		if ( this._grip === null ) { // 若尚未创建握持空间，则进行懒创建

			this._grip = new Group(); // 创建握持空间 Group
			this._grip.matrixAutoUpdate = false; // 禁用自动矩阵更新
			this._grip.visible = false; // 初始不可见
			this._grip.hasLinearVelocity = false; // 初始无线速度
			this._grip.linearVelocity = new Vector3(); // 线速度向量占位
			this._grip.hasAngularVelocity = false; // 初始无角速度
			this._grip.angularVelocity = new Vector3(); // 角速度向量占位

		}

		return this._grip; // 返回握持空间 Group 引用

	}

	/**
	 * 方法概要：将事件转发到控制器的各个空间（targetRay/grip/hand）。
	 * - 参数：{Object} event 要派发的事件对象。
	 * - 返回：{WebXRController} 当前实例（便于链式调用）。
	 */
	dispatchEvent( event ) { // 向各空间 Group 转发事件

		if ( this._targetRay !== null ) { // 若已创建目标射线空间，则派发事件

			this._targetRay.dispatchEvent( event ); // 向目标射线空间节点派发事件

		}

		if ( this._grip !== null ) { // 若已创建握持空间，则派发事件

			this._grip.dispatchEvent( event ); // 向握持空间节点派发事件

		}

		if ( this._hand !== null ) { // 若已创建手部空间，则派发事件

			this._hand.dispatchEvent( event ); // 向手部空间节点派发事件

		}

		return this; // 返回当前实例

	}

	/**
	 * 方法概要：连接给定的 XR 输入源并初始化手部关节。
	 * - 参数：{XRInputSource} inputSource 输入源对象。
	 * - 返回：{WebXRController} 当前实例（链式）。
	 */
	connect( inputSource ) { // 连接输入源

		if ( inputSource && inputSource.hand ) { // 若输入源存在且为手部输入（hand-tracking）

			const hand = this._hand; // 取手部空间引用

			if ( hand ) { // 若已创建手部空间

				for ( const inputjoint of inputSource.hand.values() ) { // 遍历所有输入关节空间

					// 连接时创建并缓存所有关节对应的 Group
					this._getHandJoint( hand, inputjoint ); // 懒创建指定关节的 Group

				}

			}

		}

		this.dispatchEvent( { type: 'connected', data: inputSource } ); // 派发“connected”事件，附带输入源数据

		return this; // 返回当前实例

	}

	/**
	 * 方法概要：断开与给定 XR 输入源的连接并隐藏相关空间。
	 * - 参数：{XRInputSource} inputSource 输入源对象。
	 * - 返回：{WebXRController} 当前实例（链式）。
	 */
	disconnect( inputSource ) { // 断开输入源

		this.dispatchEvent( { type: 'disconnected', data: inputSource } ); // 派发“disconnected”事件

		if ( this._targetRay !== null ) { // 若存在目标射线空间

			this._targetRay.visible = false; // 将目标射线空间隐藏

		}

		if ( this._grip !== null ) { // 若存在握持空间

			this._grip.visible = false; // 将握持空间隐藏

		}

		if ( this._hand !== null ) { // 若存在手部空间

			this._hand.visible = false; // 将手部空间隐藏

		}

		return this; // 返回当前实例

	}

	/**
	 * 方法概要：使用给定输入源、XR 帧与参考空间更新控制器的姿态。
	 * - 作用：更新 targetRay/grip/hand 三个空间的矩阵、可见性与速度，并派发移动事件。
	 * - 参数：
	 *   - {XRInputSource} inputSource 输入源。
	 *   - {XRFrame} frame 当前 XR 帧。
	 *   - {XRReferenceSpace} referenceSpace 参考空间。
	 * - 返回：{WebXRController} 当前实例。
	 */
	update( inputSource, frame, referenceSpace ) { // 更新控制器姿态与状态

		let inputPose = null; // 目标射线或回退到握持的姿态
		let gripPose = null; // 握持空间姿态
		let handPose = null; // 手部空间是否有效（手部跟踪）

		const targetRay = this._targetRay; // 缓存目标射线空间引用
		const grip = this._grip; // 缓存握持空间引用
		const hand = this._hand; // 缓存手部空间引用

		if ( inputSource && frame.session.visibilityState !== 'visible-blurred' ) { // 有输入源且可见性非“visible-blurred”时才更新

			if ( hand && inputSource.hand ) { // 若启用手部跟踪：优先更新手部

				handPose = true; // 标记拥有有效的手部姿态数据

				for ( const inputjoint of inputSource.hand.values() ) { // 遍历所有关节空间

					// 使用 XRJoint 的姿态更新各关节 Group
					const jointPose = frame.getJointPose( inputjoint, referenceSpace ); // 获取关节相对参考空间的姿态

					// 每帧用关节姿态更新该关节的变换
					const joint = this._getHandJoint( hand, inputjoint ); // 取得/创建对应关节的 Group

					if ( jointPose !== null ) { // 若获得有效关节姿态

						joint.matrix.fromArray( jointPose.transform.matrix ); // 从数组写入局部矩阵
						joint.matrix.decompose( joint.position, joint.rotation, joint.scale ); // 分解到位置/旋转/缩放
						joint.matrixWorldNeedsUpdate = true; // 标记需要更新世界矩阵
						joint.jointRadius = jointPose.radius; // 存储关节半径（可用于可视化）

					}

					joint.visible = jointPose !== null; // 仅当有姿态时可见

				}

				// 自定义事件

				// 检测捏合：食指指尖与拇指指尖距离
				const indexTip = hand.joints[ 'index-finger-tip' ]; // 食指指尖关节节点
				const thumbTip = hand.joints[ 'thumb-tip' ]; // 拇指指尖关节节点
				const distance = indexTip.position.distanceTo( thumbTip.position ); // 计算两指尖距离

				const distanceToPinch = 0.02; // 认为捏合的距离阈值（米）
				const threshold = 0.005; // 加/减滞后阈值，避免抖动

				if ( hand.inputState.pinching && distance > distanceToPinch + threshold ) { // 若当前为捏合状态且距离回到阈值之外，则结束捏合

					hand.inputState.pinching = false; // 更新状态为未捏合
					this.dispatchEvent( { // 派发捏合结束事件
						type: 'pinchend', // 事件类型：捏合结束
						handedness: inputSource.handedness, // 哪只手（left/right）
						target: this // 事件目标：控制器
					} );

				} else if ( ! hand.inputState.pinching && distance <= distanceToPinch - threshold ) { // 若当前未捏合且距离进入阈值内，则开始捏合

					hand.inputState.pinching = true; // 更新状态为捏合中
					this.dispatchEvent( { // 派发捏合开始事件
						type: 'pinchstart', // 事件类型：捏合开始
						handedness: inputSource.handedness, // 哪只手
						target: this // 事件目标
					} );

				}

			} else { // 否则使用传统的握持/目标射线空间更新

				if ( grip !== null && inputSource.gripSpace ) { // 若存在握持空间节点且输入源提供 gripSpace

					gripPose = frame.getPose( inputSource.gripSpace, referenceSpace ); // 获取握持姿态

					if ( gripPose !== null ) { // 若握持姿态有效

						grip.matrix.fromArray( gripPose.transform.matrix ); // 从姿态写入局部矩阵
						grip.matrix.decompose( grip.position, grip.rotation, grip.scale ); // 分解到位姿
						grip.matrixWorldNeedsUpdate = true; // 标记需更新世界矩阵

						if ( gripPose.linearVelocity ) { // 若提供线速度

							grip.hasLinearVelocity = true; // 标记有线速度
							grip.linearVelocity.copy( gripPose.linearVelocity ); // 复制线速度向量

						} else { // 否则标记无线速度

							grip.hasLinearVelocity = false; // 无线速度

						}

						if ( gripPose.angularVelocity ) { // 若提供角速度

							grip.hasAngularVelocity = true; // 标记有角速度
							grip.angularVelocity.copy( gripPose.angularVelocity ); // 复制角速度向量

						} else { // 否则标记无角速度

							grip.hasAngularVelocity = false; // 无角速度

						}

					}

				}

			}

			if ( targetRay !== null ) { // 若存在目标射线空间节点

				inputPose = frame.getPose( inputSource.targetRaySpace, referenceSpace ); // 获取目标射线姿态

				// 某些运行时（如 Vive Cosmos + Vive OpenXR）仅提供握持空间，此时目标射线等同于握持
				if ( inputPose === null && gripPose !== null ) { // 若无法获取目标射线姿态且握持姿态有效，则回退

					inputPose = gripPose; // 使用握持姿态作为目标射线姿态

				}

				if ( inputPose !== null ) { // 若获得有效姿态

					targetRay.matrix.fromArray( inputPose.transform.matrix ); // 从姿态写入局部矩阵
					targetRay.matrix.decompose( targetRay.position, targetRay.rotation, targetRay.scale ); // 分解到位姿
					targetRay.matrixWorldNeedsUpdate = true; // 标记需更新世界矩阵

					if ( inputPose.linearVelocity ) { // 若提供线速度

						targetRay.hasLinearVelocity = true; // 标记有线速度
						targetRay.linearVelocity.copy( inputPose.linearVelocity ); // 复制线速度

					} else { // 否则标记无线速度

						targetRay.hasLinearVelocity = false; // 无线速度

					}

					if ( inputPose.angularVelocity ) { // 若提供角速度

						targetRay.hasAngularVelocity = true; // 标记有角速度
						targetRay.angularVelocity.copy( inputPose.angularVelocity ); // 复制角速度

					} else { // 否则标记无角速度

						targetRay.hasAngularVelocity = false; // 无角速度

					}

					this.dispatchEvent( _moveEvent ); // 派发“move”事件，通知外界位置/姿态更新

				}

			}


		}

		if ( targetRay !== null ) { // 更新目标射线可见性（有姿态才可见）

			targetRay.visible = ( inputPose !== null ); // 目标射线空间可见性

		}

		if ( grip !== null ) { // 更新握持空间可见性（有姿态才可见）

			grip.visible = ( gripPose !== null ); // 握持空间可见性

		}

		if ( hand !== null ) { // 更新手部空间可见性（有手部姿态才可见）

			hand.visible = ( handPose !== null ); // 手部空间可见性

		}

		return this; // 返回当前实例

	}

	/**
	 * 私有方法概要：根据输入关节空间返回对应的关节 Group（懒创建）。
	 * - 参数：
	 *   - {Group} hand 手部空间的 Group。
	 *   - {XRJointSpace} inputjoint XR 关节空间对象。
	 * - 返回：{Group} 与该关节名对应的 Group。
	 */
	_getHandJoint( hand, inputjoint ) { // 获取/创建并返回指定关节的 Group

		if ( hand.joints[ inputjoint.jointName ] === undefined ) { // 若映射中不存在该关节

			const joint = new Group(); // 新建关节 Group
			joint.matrixAutoUpdate = false; // 禁用自动矩阵更新
			joint.visible = false; // 初始不可见
			hand.joints[ inputjoint.jointName ] = joint; // 保存到映射

			hand.add( joint ); // 将关节节点加入手部空间

		}

		return hand.joints[ inputjoint.jointName ]; // 返回已存在/新建的关节 Group

	}

}


export { WebXRController }; // 导出 WebXRController 类供其他模块使用
