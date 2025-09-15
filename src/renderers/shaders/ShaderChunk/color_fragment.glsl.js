export default /* glsl */`
#if defined( USE_COLOR_ALPHA ) // 若启用颜色并包含 alpha 分量

	diffuseColor *= vColor; // 直接以插值颜色乘到 RGBA 上

#elif defined( USE_COLOR ) // 若仅启用 RGB 颜色（无 alpha）

	diffuseColor.rgb *= vColor; // 仅乘到 RGB 通道，alpha 保持不变

#endif // 结束：颜色混合
`;
