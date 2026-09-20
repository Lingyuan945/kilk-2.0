import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, IdCard, Loader2, Save, AlertTriangle, UserRound, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { apiGet, apiPut } from '@/lib/api';

interface MyCard {
  id: number;
  username: string;
  name: string;
  role: string;
  tagline: string;
  bio: string;
  location: string;
  email: string;
  avatar: string | null;
  avatar_initial: string;
  hero: unknown;
  skills: unknown;
  projects: unknown;
  timeline: unknown;
  socials: unknown;
  contacts: unknown;
}

// ---- 表单结构（填表式，非 JSON） ----
interface RowObject {
  [key: string]: string;
}

interface FormState {
  tagline: string;
  bio: string;
  location: string;
  email: string;
  avatar_initial: string;
  skills: RowObject[];    // { name, level, note }
  projects: RowObject[];  // { title, description, tech, year }
  timeline: RowObject[];  // { period, title, org, description }
  socials: RowObject[];   // { label, handle, href, icon }
  contacts: RowObject[];  // { label, value, href }
}

const EMPTY_FORM: FormState = {
  tagline: '',
  bio: '',
  location: '',
  email: '',
  avatar_initial: '',
  skills: [],
  projects: [],
  timeline: [],
  socials: [],
  contacts: [],
};

type Msg = { type: 'ok' | 'err'; text: string } | null;

// 解析后端返回的 JSON 字段为数组
function parseArray(v: unknown): any[] {
  if (Array.isArray(v)) return v;
  if (typeof v === 'string') {
    try {
      const p = JSON.parse(v);
      return Array.isArray(p) ? p : [];
    } catch {
      return [];
    }
  }
  return [];
}

// 通用动态行表单区块（填表式模板）
interface FieldDef {
  key: string;
  label: string;
  placeholder?: string;
  type?: 'text' | 'number';
}

function ListBlock({
  title,
  hint,
  items,
  setItems,
  defs,
  addLabel,
  emptyHint,
}: {
  title: string;
  hint: string;
  items: RowObject[];
  setItems: (v: RowObject[]) => void;
  defs: FieldDef[];
  addLabel: string;
  emptyHint: string;
}) {
  const update = (i: number, key: string, v: string) => {
    setItems(items.map((row, idx) => (idx === i ? { ...row, [key]: v } : row)));
  };
  const remove = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const add = () => setItems([...items, Object.fromEntries(defs.map((d) => [d.key, '']))]);

  return (
    <div className="space-y-2.5 rounded-xl border border-slate-800 bg-slate-900/40 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <Label className="text-sm font-semibold text-slate-200">{title}</Label>
        <span className="truncate text-[10px] text-slate-600">{hint}</span>
      </div>

      {items.length === 0 && <p className="text-xs text-slate-600">{emptyHint}</p>}

      {items.map((row, i) => (
        <div
          key={i}
          className="flex items-start gap-2 rounded-lg border border-slate-800 bg-slate-800/30 p-3"
        >
          <div className={`grid flex-1 gap-x-3 gap-y-2 ${defs.length > 1 ? 'sm:grid-cols-2' : ''}`}>
            {defs.map((d) => (
              <div key={d.key} className="space-y-1">
                <Label className="text-[10px] text-slate-500">{d.label}</Label>
                <Input
                  type={d.type || 'text'}
                  value={String(row[d.key] ?? '')}
                  onChange={(e) => update(i, d.key, e.target.value)}
                  placeholder={d.placeholder}
                  className="h-8 border-slate-700 bg-slate-900/60 text-xs text-slate-100"
                />
              </div>
            ))}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="mt-5 h-8 w-8 shrink-0 text-slate-500 hover:bg-red-500/10 hover:text-red-400"
            onClick={() => remove(i)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}

      <Button
        variant="outline"
        size="sm"
        className="gap-1.5 border-dashed border-slate-700 text-xs text-slate-400 hover:border-blue-500/50 hover:text-blue-300"
        onClick={add}
      >
        <Plus className="h-3.5 w-3.5" /> {addLabel}
      </Button>
    </div>
  );
}

export default function DeveloperCardManagePage() {
  const [loading, setLoading] = useState(true);
  const [notDev, setNotDev] = useState(false);
  const [card, setCard] = useState<MyCard | null>(null);
  const [form, setForm] = useState<FormState>({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiGet<{ data: MyCard | null }>('/developers/me');
        if (res.data) {
          const d = res.data;
          setCard(d);
          setForm({
            tagline: d.tagline || '',
            bio: d.bio || '',
            location: d.location || '',
            email: d.email || '',
            avatar_initial: d.avatar_initial || '',
            skills: parseArray(d.skills).map((r) => ({ name: r.name || '', level: r.level ?? '', note: r.note || '' })),
            projects: parseArray(d.projects).map((r) => ({
              title: r.title || '',
              description: r.description || '',
              tech: Array.isArray(r.tech) ? r.tech.join('，') : (r.tech || ''),
              year: r.year || '',
            })),
            timeline: parseArray(d.timeline).map((r) => ({ period: r.period || '', title: r.title || '', org: r.org || '', description: r.description || '' })),
            socials: parseArray(d.socials).map((r) => ({ label: r.label || '', handle: r.handle || '', href: r.href || '', icon: r.icon || '' })),
            contacts: parseArray(d.contacts).map((r) => ({ label: r.label || '', value: r.value || '', href: r.href || '' })),
          });
        } else {
          setNotDev(true);
        }
      } catch (e: any) {
        setMsg({ type: 'err', text: e.message || '加载失败' });
        setNotDev(true);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async () => {
    const has = (r: RowObject) => Object.values(r).some((v) => String(v ?? '').trim() !== '');
    const cleanText = (rows: RowObject[]) =>
      rows.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, String(v ?? '').trim()])));
    const filterRows = (rows: RowObject[]) => cleanText(rows).filter(has);

    const payload: Record<string, unknown> = {
      tagline: form.tagline.trim(),
      bio: form.bio.trim(),
      location: form.location.trim(),
      email: form.email.trim(),
      avatar_initial: form.avatar_initial.trim(),
      // hero 已隐藏编辑区块，不提交（保持原值）
      skills: filterRows(form.skills).map((r) => ({
        name: r.name, level: Number(r.level) || 0, note: r.note,
      })),
      projects: filterRows(form.projects).map((r, i) => ({
        id: i + 1, title: r.title, description: r.description,
        tech: (r.tech || '').split(/[,，、]/).map((s) => s.trim()).filter(Boolean),
        year: r.year,
      })),
      timeline: filterRows(form.timeline).map((r) => ({
        period: r.period, title: r.title, org: r.org, description: r.description,
      })),
      socials: filterRows(form.socials).map((r) => ({
        label: r.label, handle: r.handle, href: r.href, icon: r.icon,
      })),
      contacts: filterRows(form.contacts).map((r) => ({
        label: r.label, value: r.value, href: r.href,
      })),
    };
    setSaving(true);
    try {
      await apiPut('/developers/me', payload);
      setMsg({ type: 'ok', text: '名片已保存' });
      setTimeout(() => setMsg(null), 3000);
    } catch (e: any) {
      setMsg({ type: 'err', text: e.message || '保存失败' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-5 py-8 md:px-8 md:py-12">
      <div className="animate-fade-in-up mb-6 flex items-center justify-between">
        <Link
          to="/about-ling"
          className="inline-flex items-center gap-1 text-sm text-slate-400 transition-all hover:translate-x-[-2px] hover:text-blue-400"
        >
          <ArrowLeft className="h-4 w-4" /> 返回开发者列表
        </Link>
        <Button asChild variant="ghost" size="sm" className="gap-2 text-slate-400 hover:text-blue-300">
          <Link to={card ? `/developer/${card.username}` : '/about-ling'}>
            <IdCard className="h-3.5 w-3.5" /> 预览我的名片
          </Link>
        </Button>
      </div>

      {msg && (
        <div className={`mb-4 flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
          msg.type === 'ok' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'
        }`}>
          {msg.type === 'ok' ? <Save className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
          {msg.text}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
        </div>
      ) : notDev ? (
        <Card className="glass-card border-0">
          <CardContent className="py-16 text-center">
            <UserRound className="mx-auto mb-3 h-12 w-12 text-slate-700" />
            <p className="text-sm text-slate-400">当前账号还不是开发者</p>
            <p className="mt-1 text-xs text-slate-600">请联系超级管理员将你添加为开发者后，即可管理自己的名片</p>
            <Link to="/about-ling" className="mt-4 inline-block text-sm text-blue-400 hover:underline">
              返回开发者列表
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div>
          {/* 名片概览 */}
          <div className="animate-fade-in-up mb-6">
            <Card className="glass-card border-0 overflow-hidden">
              <div className="relative h-20 overflow-hidden bg-gradient-to-r from-blue-600/50 via-indigo-600/40 to-purple-600/50">
                <div className="tech-grid absolute inset-0 opacity-40" />
              </div>
              <CardContent className="relative px-6 pb-5">
                <div className="-mt-9 mb-3 flex items-end gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-blue-500/40 bg-slate-800 shadow-[0_0_24px_hsl(217_91%_60%/0.35)]">
                    {card?.avatar ? (
                      <img src={card.avatar} alt={card.name} className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-2xl font-bold text-blue-300">{card?.avatar_initial || 'D'}</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1 pb-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-bold text-slate-100">{card?.name}</span>
                      <Badge variant="outline" className="border-blue-500/30 bg-blue-500/10 text-blue-300">
                        {card?.role || '开发者'}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-400">@{card?.username} · 名片内容由你管理，分类由超管管理</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 编辑表单 */}
          <div className="animate-fade-in-up stagger-delay-1 space-y-4">
            <Card className="glass-card border-0">
              <CardContent className="grid gap-4 p-5">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-400">标语</Label>
                    <Input
                      value={form.tagline}
                      onChange={(e) => setForm({ ...form, tagline: e.target.value })}
                      placeholder="一句话介绍"
                      className="border-slate-700 bg-slate-800/50 text-slate-100"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-400">所在城市</Label>
                    <Input
                      value={form.location}
                      onChange={(e) => setForm({ ...form, location: e.target.value })}
                      placeholder="如：深圳"
                      className="border-slate-700 bg-slate-800/50 text-slate-100"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-400">邮箱</Label>
                    <Input
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="border-slate-700 bg-slate-800/50 text-slate-100"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-400">头像首字母（无头像时显示）</Label>
                    <Input
                      value={form.avatar_initial}
                      onChange={(e) => setForm({ ...form, avatar_initial: e.target.value })}
                      maxLength={2}
                      className="border-slate-700 bg-slate-800/50 text-slate-100"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-400">个人简介</Label>
                  <Textarea
                    value={form.bio}
                    onChange={(e) => setForm({ ...form, bio: e.target.value })}
                    placeholder="详细介绍自己"
                    className="min-h-[80px] border-slate-700 bg-slate-800/50 text-slate-100"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card border-0">
              <CardContent className="grid gap-4 p-5">
                <p className="text-xs font-semibold uppercase tracking-widest text-blue-400">
                  名片内容
                </p>

                {/* 技能 */}
                <ListBlock
                  title="技能"
                  hint="名称 + 掌握等级(0-100) + 说明"
                  items={form.skills}
                  setItems={(v) => setForm({ ...form, skills: v })}
                  defs={[
                    { key: 'name', label: '技能名称', placeholder: '如：React' },
                    { key: 'level', label: '掌握等级', placeholder: '如：90', type: 'number' },
                    { key: 'note', label: '说明', placeholder: '如：组件化架构 · Hooks' },
                  ]}
                  addLabel="添加技能"
                  emptyHint="暂无技能，点击下方按钮添加"
                />

                {/* 技术支持（项目分组） */}
                <ListBlock
                  title="技术支持（项目分组）"
                  hint="标题 + 说明 + 技术标签(逗号分隔) + 年份"
                  items={form.projects}
                  setItems={(v) => setForm({ ...form, projects: v })}
                  defs={[
                    { key: 'title', label: '分组标题', placeholder: '如：前端' },
                    { key: 'description', label: '说明', placeholder: '该分组提供什么支持' },
                    { key: 'tech', label: '技术标签', placeholder: '如：React，TypeScript（逗号分隔）' },
                    { key: 'year', label: '年份', placeholder: '如：2026' },
                  ]}
                  addLabel="添加分组"
                  emptyHint="暂无项目分组，点击下方按钮添加"
                />

                {/* 阅历 */}
                <ListBlock
                  title="阅历"
                  hint="时间段 + 经历 + 机构 + 说明"
                  items={form.timeline}
                  setItems={(v) => setForm({ ...form, timeline: v })}
                  defs={[
                    { key: 'period', label: '时间段', placeholder: '如：2024-2026' },
                    { key: 'title', label: '经历', placeholder: '如：全栈工程师' },
                    { key: 'org', label: '机构', placeholder: '如：某公司' },
                    { key: 'description', label: '说明', placeholder: '做了什么' },
                  ]}
                  addLabel="添加经历"
                  emptyHint="暂无阅历，点击下方按钮添加"
                />

                {/* 社交链接 */}
                <ListBlock
                  title="社交链接"
                  hint="名称 + 账号 + 链接 + 图标名(可选)"
                  items={form.socials}
                  setItems={(v) => setForm({ ...form, socials: v })}
                  defs={[
                    { key: 'label', label: '名称', placeholder: '如：GitHub' },
                    { key: 'handle', label: '账号', placeholder: '如：xxx' },
                    { key: 'href', label: '链接', placeholder: 'https://...' },
                    { key: 'icon', label: '图标名', placeholder: '如：github（可选）' },
                  ]}
                  addLabel="添加社交链接"
                  emptyHint="暂无社交链接，点击下方按钮添加"
                />

                {/* 联系方式 */}
                <ListBlock
                  title="联系方式"
                  hint="名称 + 内容 + 链接(可选)"
                  items={form.contacts}
                  setItems={(v) => setForm({ ...form, contacts: v })}
                  defs={[
                    { key: 'label', label: '名称', placeholder: '如：邮箱' },
                    { key: 'value', label: '内容', placeholder: 'xxx@xx.com' },
                    { key: 'href', label: '链接', placeholder: 'mailto:...（可选）' },
                  ]}
                  addLabel="添加联系方式"
                  emptyHint="暂无联系方式，点击下方按钮添加"
                />

                <p className="text-[11px] text-slate-500">
                  全部留空表示无内容；直接填写文字即可，保存后名片页自动排版展示。
                </p>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-3">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="gap-2 bg-blue-600 hover:bg-blue-500"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                保存名片
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
