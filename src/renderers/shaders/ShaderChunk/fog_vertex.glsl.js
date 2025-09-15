export default /* glsl */`
#ifdef USE_FOG // 若启用雾效

	vFogDepth = - mvPosition.z; // 使用视空间 z 作为雾深度（取反为正）

#endif // 结束：USE_FOG
`;
