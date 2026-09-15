// 更新联系我区域，给所在城市添加地图跳转
const token = process.argv[2];

const profile = {
  name: "凌渊",
  role: "全栈开发工程师",
  tagline: "用代码构建更聪明的产品",
  bio: "一名热爱技术与创造的全栈开发者，专注于 Web 应用、前端体验与数据可视化。相信好的产品来自对细节的执着，持续学习、持续输出。",
  location: "三亚 · 中国",
  email: "2338315916@qq.com",
  avatar_initial: "L",
  hero: [
    'const developer = { name: "凌渊", role: "全栈开发工程师" };',
    "while (alive) { code(); learn(); ship(); }",
    'console.log("Hello, World! 👋")'
  ],
  skills: [
    { name: "React / TypeScript", note: "组件化架构 · Hooks · 状态管理", level: 90 },
    { name: "Node.js / 后端服务", note: "REST API · 微服务 · 数据库设计", level: 82 },
    { name: "PHP / MySQL", note: "LAMP 栈 · 服务器运维 · 数据库优化", level: 85 },
    { name: "Python / 数据分析", note: "Pandas · 可视化 · 自动化脚本", level: 78 },
    { name: "UI / 交互设计", note: "设计系统 · 动效 · 响应式", level: 72 },
    { name: "DevOps / 云原生", note: "Docker · CI/CD · 云服务部署", level: 65 }
  ],
  projects: [
    {
      id: 1,
      tech: ["React", "TypeScript", "Node.js", "PostgreSQL"],
      year: "2026",
      title: "kilk 2.0 全栈平台",
      highlight: "React 19 + Vite + TS + Tailwind 4",
      description: "从零构建的全栈协作平台，包含论坛、用户系统、服务支持、管理后台等模块。采用 React 19 + Vite + TypeScript + Tailwind 4 + shadcn/ui 前端，Node.js/Express + PGlite 后端，暗色科技蓝设计系统。"
    },
    {
      id: 2,
      tech: ["PHP", "MySQL", "Apache", "Linux"],
      year: "2026",
      title: "kilk 1.0 网站",
      highlight: "已上线 · kilk.online",
      description: "基于 PHP + MySQL 的轻量级社区网站，部署在阿里云轻量应用服务器。包含论坛、用户管理、服务支持下载等功能，已通过 ICP 备案并配置 SSL 证书自动续期。"
    },
    {
      id: 3,
      tech: ["React", "ECharts", "WebSocket"],
      year: "2025",
      title: "Nebula Dashboard",
      highlight: "实时数据可视化大屏",
      description: "实时数据可视化大屏，支持多数据源接入与自定义图表编排，服务于企业运营监控场景。"
    },
    {
      id: 4,
      tech: ["Node.js", "React", "PostgreSQL", "Docker"],
      year: "2025",
      title: "FlowForge",
      highlight: "可视化工作流编排引擎",
      description: "可视化工作流编排引擎，拖拽式节点设计，支持定时任务与 Webhook 触发，帮助团队自动化重复工作。"
    }
  ],
  timeline: [
    {
      org: "kilk 独立开发",
      title: "全栈开发工程师",
      period: "2026 — 至今",
      description: "独立开发并维护 kilk 平台（1.0 PHP 版 + 2.0 React 全栈版），负责产品设计、前后端开发、服务器运维与部署。"
    },
    {
      org: "某互联网科技公司",
      title: "高级全栈工程师",
      period: "2023 — 2026",
      description: "负责核心业务系统的架构设计与研发，主导前端工程化升级与性能优化，带领小组完成多个关键项目交付。"
    },
    {
      org: "某 SaaS 创业公司",
      title: "前端开发工程师",
      period: "2021 — 2023",
      description: "从 0 到 1 搭建产品前端，落地组件库与设计规范，推动数据可视化能力建设，支撑产品快速迭代。"
    }
  ],
  socials: [
    { href: "https://github.com/Lingyuan945", icon: "github", label: "GitHub", handle: "@Lingyuan945" },
    { href: "mailto:2338315916@qq.com", icon: "email", label: "邮箱", handle: "2338315916@qq.com" }
  ],
  contacts: [
    { href: "mailto:2338315916@qq.com", label: "邮箱", value: "2338315916@qq.com" },
    { href: "https://github.com/Lingyuan945", label: "GitHub", value: "github.com/Lingyuan945" },
    { href: "https://kilk.online", label: "个人网站", value: "kilk.online" },
    { href: "", label: "所在城市", value: "三亚 · 中国" }
  ]
};

fetch("http://localhost:3001/api/admin/ling-profile", {
  method: "PUT",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`
  },
  body: JSON.stringify(profile)
})
  .then(r => r.json())
  .then(d => console.log(JSON.stringify(d, null, 2)))
  .catch(e => console.log("Error:", e.message));
