import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Loader2,
  Plus,
  Save,
  Shield,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { apiGet, apiPut } from '@/lib/api';
import type {
  LingContact,
  LingProfile,
  LingProject,
  LingSkill,
  LingTimelineItem,
} from '@/types';

type Msg = { type: 'ok' | 'err'; text: string } | null;

const EMPTY_SKILL: LingSkill = { name: '', level: 70, note: '' };
const EMPTY_PROJECT: LingProject = {
  id: 0,
  title: '',
  description: '',
  tech: [],
  highlight: '',
  year: '',
};
const EMPTY_TIMELINE: LingTimelineItem = { period: '', title: '', org: '', description: '' };
const EMPTY_CONTACT: LingContact = { label: '', value: '', href: '' };

const inputClass = 'border-slate-700 bg-slate-800/50 text-slate-100 placeholder:text-slate-500';

/** 数组通用更新：替换第 index 项 */
function updateItem<T>(list: T[], index: number, patch: Partial<T>): T[] {
  return list.map((item, i) => (i === index ? { ...item, ...patch } : item));
}

/** 技能编辑行 */
function SkillRows({
  skills,
  onChange,
}: {
  skills: LingSkill[];
  onChange: (next: LingSkill[]) => void;
}) {
  return (
    <div className="space-y-3">
      {skills.map((skill, i) => (
        <div key={i} className="rounded-lg border border-slate-700/50 bg-slate-800/30 p-3">
          <div className="flex gap-2">
            <Input
              value={skill.name}
              placeholder="技能名称"
              onChange={(e) => onChange(updateItem(skills, i, { name: e.target.value }))}
              className={inputClass}
            />
            <Input
              type="number"
              min={0}
              max={100}
              value={String(skill.level ?? 0)}
              placeholder="等级 0-100"
              onChange={(e) =>
                onChange(updateItem(skills, i, { level: Number(e.target.value) || 0 }))
              }
              className={`${inputClass} w-28`}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0 text-red-400 hover:bg-red-500/10 hover:text-red-400"
              onClick={() => onChange(skills.filter((_, j) => j !== i))}
              aria-label="删除技能"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <Input
            value={skill.note}
            placeholder="备注（可选）"
            onChange={(e) => onChange(updateItem(skills, i, { note: e.target.value }))}
            className={`${inputClass} mt-2`}
          />
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="border-slate-700 text-slate-200"
        onClick={() => onChange([...skills, { ...EMPTY_SKILL }])}
      >
        <Plus className="mr-1 h-4 w-4" /> 添加技能
      </Button>
    </div>
  );
}

/** 技术支持分类编辑行 */
function ProjectRows({
  projects,
  onChange,
}: {
  projects: LingProject[];
  onChange: (next: LingProject[]) => void;
}) {
  return (
    <div className="space-y-3">
      {projects.map((project, i) => (
        <div key={i} className="space-y-2 rounded-lg border border-slate-700/50 bg-slate-800/30 p-3">
          <div className="flex gap-2">
            <Input
              value={project.title}
              placeholder="分类名称（前端 / 后端 / 数据库）"
              onChange={(e) => onChange(updateItem(projects, i, { title: e.target.value }))}
              className={inputClass}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0 text-red-400 hover:bg-red-500/10 hover:text-red-400"
              onClick={() => onChange(projects.filter((_, j) => j !== i))}
              aria-label="删除分类"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <Textarea
            value={project.description}
            placeholder="分类描述"
            onChange={(e) => onChange(updateItem(projects, i, { description: e.target.value }))}
            className={`${inputClass} min-h-[56px]`}
          />
          <Input
            value={project.tech.join(', ')}
            placeholder="技术名称（逗号分隔，如：React, Node.js, PostgreSQL）"
            onChange={(e) =>
              onChange(
                updateItem(projects, i, {
                  tech: e.target.value
                    .split(',')
                    .map((t) => t.trim())
                    .filter(Boolean),
                })
              )
            }
            className={inputClass}
          />
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="border-slate-700 text-slate-200"
        onClick={() =>
          onChange([...projects, { ...EMPTY_PROJECT, id: Date.now() }])
        }
      >
        <Plus className="mr-1 h-4 w-4" /> 添加分类
      </Button>
    </div>
  );
}

/** 时间线编辑行 */
function TimelineRows({
  items,
  onChange,
}: {
  items: LingTimelineItem[];
  onChange: (next: LingTimelineItem[]) => void;
}) {
  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="space-y-2 rounded-lg border border-slate-700/50 bg-slate-800/30 p-3">
          <div className="flex gap-2">
            <Input
              value={item.period}
              placeholder="时间段（如：2023 — 至今）"
              onChange={(e) => onChange(updateItem(items, i, { period: e.target.value }))}
              className={inputClass}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0 text-red-400 hover:bg-red-500/10 hover:text-red-400"
              onClick={() => onChange(items.filter((_, j) => j !== i))}
              aria-label="删除经历"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex gap-2">
            <Input
              value={item.title}
              placeholder="职位 / 学历"
              onChange={(e) => onChange(updateItem(items, i, { title: e.target.value }))}
              className={inputClass}
            />
            <Input
              value={item.org}
              placeholder="公司 / 学校"
              onChange={(e) => onChange(updateItem(items, i, { org: e.target.value }))}
              className={inputClass}
            />
          </div>
          <Textarea
            value={item.description}
            placeholder="描述"
            onChange={(e) => onChange(updateItem(items, i, { description: e.target.value }))}
            className={`${inputClass} min-h-[56px]`}
          />
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="border-slate-700 text-slate-200"
        onClick={() => onChange([...items, { ...EMPTY_TIMELINE }])}
      >
        <Plus className="mr-1 h-4 w-4" /> 添加经历
      </Button>
    </div>
  );
}

/** 社交 / 联系方式通用编辑行 */
function SimpleRows<T extends { label: string }>({
  items,
  onChange,
  fields,
  empty,
  addLabel,
}: {
  items: T[];
  onChange: (next: T[]) => void;
  fields: { key: keyof T; placeholder: string }[];
  empty: T;
  addLabel: string;
}) {
  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="flex gap-2">
          {fields.map((field) => (
            <Input
              key={String(field.key)}
              value={String(item[field.key] ?? '')}
              placeholder={field.placeholder}
              onChange={(e) => onChange(updateItem(items, i, { [field.key]: e.target.value } as Partial<T>))}
              className={inputClass}
            />
          ))}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 text-red-400 hover:bg-red-500/10 hover:text-red-400"
            onClick={() => onChange(items.filter((_, j) => j !== i))}
            aria-label="删除"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="border-slate-700 text-slate-200"
        onClick={() => onChange([...items, { ...empty }])}
      >
        <Plus className="mr-1 h-4 w-4" /> {addLabel}
      </Button>
    </div>
  );
}

export default function LingTab() {
  const [profile, setProfile] = useState<LingProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);

  useEffect(() => {
    apiGet<{ data: LingProfile }>('/ling')
      .then((res) => setProfile(res.data))
      .catch((e: Error) => setMsg({ type: 'err', text: e.message || '加载失败' }))
      .finally(() => setLoading(false));
  }, []);

  const updateField = (field: keyof LingProfile, value: unknown) => {
    setProfile((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const save = async () => {
    if (!profile) return;
    if (!profile.name.trim()) {
      setMsg({ type: 'err', text: '姓名不能为空' });
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      await apiPut('/admin/ling-profile', profile);
      setMsg({ type: 'ok', text: '关于 Ling 内容已保存' });
      setTimeout(() => setMsg(null), 3000);
    } catch (e: any) {
      setMsg({ type: 'err', text: e.message || '保存失败' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full rounded-lg bg-slate-800/60" />
        ))}
      </div>
    );
  }

  if (!profile) {
    return (
      <Card className="glass-card border-0">
        <CardContent className="py-12 text-center">
          <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-red-400" />
          <p className="text-sm text-slate-400">{msg?.text || '暂无内容'}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {msg && (
        <div
          className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
            msg.type === 'ok' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
          }`}
        >
          {msg.type === 'ok' ? <Shield className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          {msg.text}
        </div>
      )}

      {/* 基本信息 */}
      <Card className="glass-card border-0">
        <CardContent className="space-y-4 p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-200">
            <span className="h-4 w-1 rounded-full bg-gradient-to-b from-blue-400 to-cyan-400" />
            基本信息
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs text-slate-400">姓名 *</Label>
              <Input
                value={profile.name}
                onChange={(e) => updateField('name', e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-slate-400">头衔</Label>
              <Input
                value={profile.role}
                onChange={(e) => updateField('role', e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-slate-400">标语</Label>
              <Input
                value={profile.tagline}
                onChange={(e) => updateField('tagline', e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-slate-400">邮箱</Label>
              <Input
                value={profile.email}
                onChange={(e) => updateField('email', e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs text-slate-400">头像首字母（无头像时显示）</Label>
              <Input
                value={profile.avatar_initial}
                maxLength={2}
                onChange={(e) => updateField('avatar_initial', e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="flex items-end">
              <p className="text-xs text-slate-500">
                头像随账号自动展示：修改个人主页头像即可同步到「关于 Ling」。
              </p>
            </div>
          </div>
          <div className="space-y-2">
            <Label className="text-xs text-slate-400">个人简介</Label>
            <Textarea
              value={profile.bio}
              onChange={(e) => updateField('bio', e.target.value)}
              className={`${inputClass} min-h-[80px]`}
            />
          </div>
        </CardContent>
      </Card>

      {/* 技术栈 */}
      <Card className="glass-card border-0">
        <CardContent className="space-y-4 p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-200">
            <span className="h-4 w-1 rounded-full bg-gradient-to-b from-blue-400 to-cyan-400" />
            技术栈
          </h3>
          <SkillRows skills={profile.skills} onChange={(skills) => updateField('skills', skills)} />
        </CardContent>
      </Card>

      {/* 技术支持 */}
      <Card className="glass-card border-0">
        <CardContent className="space-y-4 p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-200">
            <span className="h-4 w-1 rounded-full bg-gradient-to-b from-blue-400 to-cyan-400" />
            技术支持（前端 / 后端 / 数据库）
          </h3>
          <ProjectRows
            projects={profile.projects}
            onChange={(projects) => updateField('projects', projects)}
          />
        </CardContent>
      </Card>

      {/* 经历 */}
      <Card className="glass-card border-0">
        <CardContent className="space-y-4 p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-200">
            <span className="h-4 w-1 rounded-full bg-gradient-to-b from-blue-400 to-cyan-400" />
            经历与教育
          </h3>
          <TimelineRows
            items={profile.timeline}
            onChange={(timeline) => updateField('timeline', timeline)}
          />
        </CardContent>
      </Card>

      {/* 联系我 */}
      <Card className="glass-card border-0">
        <CardContent className="space-y-5 p-5">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-200">
            <span className="h-4 w-1 rounded-full bg-gradient-to-b from-blue-400 to-cyan-400" />
            联系我
          </h3>
          <SimpleRows<LingContact>
            items={profile.contacts}
            onChange={(contacts) => updateField('contacts', contacts)}
            fields={[
              { key: 'label', placeholder: '名称（邮箱）' },
              { key: 'value', placeholder: '内容（you@example.com）' },
              { key: 'href', placeholder: '链接（mailto:...，可留空）' },
            ]}
            empty={EMPTY_CONTACT}
            addLabel="添加联系方式"
          />
        </CardContent>
      </Card>

      {/* 保存 */}
      <Button onClick={save} disabled={saving} className="w-full bg-blue-600 hover:bg-blue-500">
        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
        保存关于 Ling 内容
      </Button>
    </div>
  );
}
