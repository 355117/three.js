export default /* glsl */`
#ifdef USE_FOG // 若启用雾效

	#ifdef FOG_EXP2 // 指数平方雾

		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth ); // e^{-d^2*rho^2}

	#else // 线性雾

		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth ); // 在近远平滑插值

	#endif // 结束：雾模型

	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor ); // 将雾色与片元颜色混合

#endif // 结束：USE_FOG
`;
