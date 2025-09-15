export default /* glsl */`
#ifdef USE_FOG // 若启用雾效

	varying float vFogDepth; // 传递到片元的深度值

#endif // 结束：USE_FOG
`;
