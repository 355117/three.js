export default /* glsl */`
#ifdef USE_BUMPMAP // 如果启用了凹凸贴图（法线扰动）

	uniform sampler2D bumpMap; // 凹凸贴图采样器（高度贴图）
	uniform float bumpScale; // 凹凸强度缩放系数

	// Bump Mapping Unparametrized Surfaces on the GPU by Morten S. Mikkelsen // 参考论文：GPU 上的无参数凹凸映射（Mikkelsen）
	// https://mmikk.github.io/papers3d/mm_sfgrad_bump.pdf // 论文链接

	// Evaluate the derivative of the height w.r.t. screen-space using forward differencing (listing 2) // 使用前向差分在屏幕空间计算高度导数

	vec2 dHdxy_fwd() { // 计算高度相对于屏幕坐标的偏导数

		vec2 dSTdx = dFdx( vBumpMapUv ); // 沿 x 方向的 UV 微分
		vec2 dSTdy = dFdy( vBumpMapUv ); // 沿 y 方向的 UV 微分

		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x; // 当前像素的高度值（放大后）
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll; // 沿 x 的高度差
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll; // 沿 y 的高度差

		return vec2( dBx, dBy ); // 返回高度梯度（x,y）

	} // 函数结束

	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) { // 任意空间法线扰动（MikkTSpace 方法）

		// normalize is done to ensure that the bump map looks the same regardless of the texture's scale // 归一化以减少纹理尺度对效果的影响
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) ); // 曲面在屏幕空间的 x 方向导向向量
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) ); // 曲面在屏幕空间的 y 方向导向向量
		vec3 vN = surf_norm; // normalized // 原始表面法线（已归一化）

		vec3 R1 = cross( vSigmaY, vN ); // R1 为切向方向之一（Y 与法线叉积）
		vec3 R2 = cross( vN, vSigmaX ); // R2 为切向方向之二（法线与 X 叉积）

		float fDet = dot( vSigmaX, R1 ) * faceDirection; // 雅可比行列式（带面朝向校正）

		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 ); // 高度梯度投影到切空间向量
		return normalize( abs( fDet ) * surf_norm - vGrad ); // 用梯度修正法线并归一化

	} // 函数结束

#endif // 结束：USE_BUMPMAP 条件
`;
