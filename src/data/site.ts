// EXPORTS: ISiteInfo, ISkill, IProject, ITimelineItem, ISocialLink, IContactInfo,
//          SITE_INFO, SKILLS, PROJECTS, TIMELINE, SOCIAL_LINKS, CONTACT_INFO
//
// ⚠️ 占位数据：姓名、简介、项目、经历等均为示例内容。
// 只需修改本文件即可全站更新，无需改动任何组件。

export interface ISiteInfo {
  name: string;
  role: string;
  tagline: string;
  bio: string;
  location: string;
  email: string;
  avatarInitial: string;
  hero: string[];
}

export interface ISkill {
  name: string;
  level: number; // 0-100
  note: string;
}

export interface IProject {
  id: number;
  title: string;
  description: string;
  tech: string[];
  highlight: string;
  year: string;
}

export interface ITimelineItem {
  period: string;
  title: string;
  org: string;
  description: string;
}

export interface ISocialLink {
  label: string;
  handle: string;
  href: string;
  icon: 'github' | 'email' | 'linkedin' | 'twitter' | 'rss';
}

export interface IContactInfo {
  label: string;
  value: string;
  href: string;
}

export const SITE_INFO: ISiteInfo = {
  name: '你的名字',
  role: '全栈开发工程师',
  tagline: '用代码构建更聪明的产品',
  bio: '一名热爱技术与创造的全栈开发者，专注于 Web 应用、前端体验与数据可视化。相信好的产品来自对细节的执着，持续学习、持续输出。',
  location: '三亚 · 中国',
  email: 'hello@example.com',
  avatarInitial: 'Y',
  hero: [
    'const developer = { name: "你的名字", role: "全栈开发工程师" };',
    'while (alive) { code(); learn(); ship(); }',
    'console.log("Hello, World! 👋")',
  ],
};

export const SKILLS: ISkill[] = [
  { name: 'React / TypeScript', level: 90, note: '组件化架构 · Hooks · 状态管理' },
  { name: 'Node.js / 后端服务', level: 82, note: 'REST API · 微服务 · 数据库设计' },
  { name: 'Python / 数据分析', level: 78, note: 'Pandas · 可视化 · 自动化脚本' },
  { name: 'UI / 交互设计', level: 72, note: '设计系统 · 动效 · 响应式' },
  { name: 'DevOps / 云原生', level: 65, note: 'Docker · CI/CD · 云服务部署' },
  { name: '产品思维', level: 75, note: '需求分析 · 快速原型 · 用户研究' },
];

export const PROJECTS: IProject[] = [
  {
    id: 1,
    title: 'Nebula Dashboard',
    description: '实时数据可视化大屏，支持多数据源接入与自定义图表编排，服务于企业运营监控场景。',
    tech: ['React', 'TypeScript', 'ECharts', 'WebSocket'],
    highlight: '3k+ 月活 · 20+ 企业客户',
    year: '2025',
  },
  {
    id: 2,
    title: 'FlowForge',
    description: '可视化工作流编排引擎，拖拽式节点设计，支持定时任务与 Webhook 触发，帮助团队自动化重复工作。',
    tech: ['Node.js', 'React', 'PostgreSQL', 'Docker'],
    highlight: '节省团队 40% 重复工时',
    year: '2025',
  },
  {
    id: 3,
    title: 'Pulse Bot',
    description: '开源社群运营机器人，自动聚合多平台消息、生成日报并推送，接入 200+ 技术社群。',
    tech: ['Python', 'Redis', 'Docker'],
    highlight: 'GitHub 500+ Star',
    year: '2024',
  },
  {
    id: 4,
    title: 'Lume Docs',
    description: '基于 AI 的文档协作工具，支持语义搜索与自动摘要，让团队知识沉淀更高效。',
    tech: ['React', 'LLM', 'Vector DB'],
    highlight: '内部 30+ 团队使用',
    year: '2024',
  },
];

export const TIMELINE: ITimelineItem[] = [
  {
    period: '2023 — 至今',
    title: '高级全栈工程师',
    org: '某互联网科技公司',
    description: '负责核心业务系统的架构设计与研发，主导前端工程化升级与性能优化，带领 5 人小组完成多个关键项目交付。',
  },
  {
    period: '2021 — 2023',
    title: '前端开发工程师',
    org: '某 SaaS 创业公司',
    description: '从 0 到 1 搭建产品前端，落地组件库与设计规范，推动数据可视化能力建设，支撑产品快速迭代。',
  },
  {
    period: '2019 — 2021',
    title: '软件工程师',
    org: '某软件服务公司',
    description: '参与企业级管理系统的前后端开发，覆盖订单、报表与权限模块，积累了扎实的工程实践基础。',
  },
  {
    period: '2019',
    title: '计算机科学与技术 · 学士',
    org: '某大学',
    description: '主修软件工程方向，多次获得校级奖学金，毕业设计获评优秀。',
  },
];

export const SOCIAL_LINKS: ISocialLink[] = [
  { label: 'GitHub', handle: '@yourname', href: 'https://github.com', icon: 'github' },
  { label: '邮箱', handle: 'hello@example.com', href: 'mailto:hello@example.com', icon: 'email' },
  { label: 'LinkedIn', handle: '/in/yourname', href: 'https://linkedin.com', icon: 'linkedin' },
  { label: 'Twitter / X', handle: '@yourname', href: 'https://x.com', icon: 'twitter' },
];

export const CONTACT_INFO: IContactInfo[] = [
  { label: '邮箱', value: 'hello@example.com', href: 'mailto:hello@example.com' },
  { label: 'GitHub', value: 'github.com/yourname', href: 'https://github.com' },
  { label: '所在城市', value: '三亚 · 中国', href: '' },
  { label: '工作时间', value: '工作日 9:00 — 18:00 (UTC+8)', href: '' },
];
