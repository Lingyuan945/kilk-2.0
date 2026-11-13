/**
 * 构建包装器：保证 VITE_API_BASE 不被 shell 的路径转换改写。
 * 在 Git Bash / MSYS 下直接 `export VITE_API_BASE=/api` 会被转成
 * `D:/.../PortableGit/api`，导致打包结果里的接口基址指向 file://。
 *
 * 用法：node local-runtime/build.mjs
 */

process.env.VITE_API_BASE = '/api';

const { build } = await import('vite');
await build();
