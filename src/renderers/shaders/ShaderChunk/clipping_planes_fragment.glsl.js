export default /* glsl */`
#if NUM_CLIPPING_PLANES > 0 // 若启用裁剪平面（数量大于 0）

	vec4 plane; // 当前循环处理的裁剪平面（xyz 法向，w 距离）

	#ifdef ALPHA_TO_COVERAGE // 若启用 Alpha-to-Coverage（多重采样软裁剪）

		float distanceToPlane, distanceGradient; // 距离平面的值与其梯度（用于抗锯齿）
		float clipOpacity = 1.0; // 当前像素的裁剪不透明度（初始为 1）

		#pragma unroll_loop_start // 提示编译器展开循环，利于性能
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) { // 处理并集裁剪平面

			plane = clippingPlanes[ i ]; // 读取平面参数
			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w; // 点到平面的带符号距离
			distanceGradient = fwidth( distanceToPlane ) / 2.0; // 距离在屏幕空间的变化率的一半
			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane ); // 累乘平滑的不透明度

			if ( clipOpacity == 0.0 ) discard; // 完全透明则丢弃片元

		}
		#pragma unroll_loop_end // 循环展开结束

		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES // 若存在交集裁剪平面

			float unionClipOpacity = 1.0; // 用于交集的辅助不透明度

			#pragma unroll_loop_start // 展开循环
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) { // 处理交集裁剪平面

				plane = clippingPlanes[ i ]; // 读取平面
				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w; // 计算距离
				distanceGradient = fwidth( distanceToPlane ) / 2.0; // 计算梯度
				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane ); // 交集采用 1-smoothstep

			}
			#pragma unroll_loop_end // 交集循环结束

			clipOpacity *= 1.0 - unionClipOpacity; // 合并并集与交集不透明度

		#endif // 结束：UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES

		diffuseColor.a *= clipOpacity; // 应用裁剪不透明度到片元 alpha

		if ( diffuseColor.a == 0.0 ) discard; // 若 alpha 为 0，丢弃片元

	#else // 未启用 Alpha-to-Coverage 的离散裁剪路径

		#pragma unroll_loop_start // 展开循环
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) { // 遍历并集平面

			plane = clippingPlanes[ i ]; // 读取平面
			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard; // 在平面外则丢弃

		}
		#pragma unroll_loop_end // 并集循环结束

		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES // 若存在交集平面

			bool clipped = true; // 交集需要所有平面同时满足才裁剪

			#pragma unroll_loop_start // 展开循环
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) { // 遍历交集平面

				plane = clippingPlanes[ i ]; // 读取平面
				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped; // 若处于任一平面内侧则保持 true

			}
			#pragma unroll_loop_end // 交集循环结束

			if ( clipped ) discard; // 若所有交集条件满足则丢弃

		#endif // 结束：交集分支

	#endif // 结束：ALPHA_TO_COVERAGE 条件

#endif // 结束：NUM_CLIPPING_PLANES > 0 条件
`;
