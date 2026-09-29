// 数据库类型定义
export interface User {
  id: string;
  user_no: string;
  username: string;
  name: string;
  avatar: string;
  signature: string;
  department: string;
  job_number: string;
  role: 'user' | 'senior' | 'admin' | 'super';
  remark: string;
  create_time: string;
}

export interface HomeContent {
  id: string;
  banner_title: string;
  banner_desc: string;
  card1_title: string;
  card1_text: string;
  card2_title: string;
  card2_text: string;
  card3_title: string;
  card3_text: string;
}

export interface ServiceFile {
  id: string;
  title: string;
  description: string;
  [key: string]: string;
}

export interface ServiceFileItem {
  id: string;
  file_id: string;
  file_name: string;
  file_path: string;
  file_size: string;
  version: string;
  upload_time: string;
  [key: string]: string;
}

// ===== "关于 Ling" 页面内容 =====

export interface LingSkill {
  name: string;
  level: number;
  note: string;
  category?: 'frontend' | 'backend' | 'fullstack';
}

export interface LingProject {
  id: number;
  title: string;
  description: string;
  tech: string[];
  highlight: string;
  year: string;
  category?: 'frontend' | 'backend' | 'fullstack';
}

export interface LingTimelineItem {
  period: string;
  title: string;
  org: string;
  description: string;
}

export interface LingSocial {
  label: string;
  handle: string;
  href: string;
  icon: string;
}

export interface LingContact {
  label: string;
  value: string;
  href: string;
}

export interface LingProfile {
  id: string;
  username: string;
  name: string;
  role: string;
  tagline: string;
  bio: string;
  location: string;
  email: string;
  avatar?: string | null;
  avatar_initial: string;
  hero: string[];
  skills: LingSkill[];
  projects: LingProject[];
  timeline: LingTimelineItem[];
  socials: LingSocial[];
  contacts: LingContact[];
  updated_at?: string;
}
