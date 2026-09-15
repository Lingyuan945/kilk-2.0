import { useEffect, useState } from 'react';
import { Download, Pencil, Plus, Trash2, FileText, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';

interface ServiceFile {
  id: number;
  title: string;
  description: string;
  file_path: string;
  file_name: string;
  file_size: number;
  create_time: string;
  username?: string;
  author_name?: string;
  versions: any[];
  total_downloads: number;
}

interface ServiceForm {
  title: string;
  description: string;
  file_path: string;
  file_name: string;
  file_size: string;
}

const emptyForm: ServiceForm = {
  title: '',
  description: '',
  file_path: '',
  file_name: '',
  file_size: '',
};

export default function ServiceTab() {
  const [services, setServices] = useState<ServiceFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ServiceForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const loadServices = async () => {
    setLoading(true);
    try {
      const res = await apiGet('/admin/services');
      if (res.ok) {
        setServices(res.data || []);
      }
    } catch (err) {
      console.error('加载服务文件失败:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadServices();
  }, []);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (service: ServiceFile) => {
    setEditingId(service.id);
    setForm({
      title: service.title,
      description: service.description,
      file_path: service.file_path,
      file_name: service.file_name,
      file_size: String(service.file_size || ''),
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      alert('标题不能为空');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description,
        file_path: form.file_path,
        file_name: form.file_name,
        file_size: Number(form.file_size) || 0,
      };

      if (editingId) {
        await apiPut(`/admin/services/${editingId}`, payload);
      } else {
        await apiPost('/admin/services', payload);
      }

      setDialogOpen(false);
      loadServices();
    } catch (err) {
      console.error('保存服务文件失败:', err);
      alert('保存失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这个服务文件吗？相关版本记录也会被删除。')) return;

    try {
      await apiDelete(`/admin/services/${id}`);
      loadServices();
    } catch (err) {
      console.error('删除服务文件失败:', err);
      alert('删除失败，请重试');
    }
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('zh-CN');
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-800/50" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-slate-400">管理服务支持文件，用户可在服务支持页面下载</p>
        <Button onClick={openAdd} className="gap-2 bg-blue-600 hover:bg-blue-500">
          <Plus className="h-4 w-4" /> 新增服务
        </Button>
      </div>

      {services.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/40 p-12 text-center">
          <FileText className="mx-auto mb-3 h-12 w-12 text-slate-600" />
          <p className="text-slate-400">暂无服务文件</p>
          <p className="mt-1 text-xs text-slate-600">点击右上角"新增服务"添加第一个服务文件</p>
        </div>
      ) : (
        <div className="space-y-3">
          {services.map((service) => (
            <Card
              key={service.id}
              className="glow-border-hover border-slate-700/60 bg-slate-900/60 transition-colors hover:border-blue-500/40"
            >
              <CardContent className="flex items-center gap-4 p-5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
                  <FileText className="h-6 w-6" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate font-semibold text-slate-100">{service.title}</h3>
                    <span className="shrink-0 rounded-full bg-blue-500/10 px-2 py-0.5 text-xs text-blue-400">
                      {service.versions?.length || 0} 个版本
                    </span>
                  </div>
                  <p className="mt-1 truncate text-sm text-slate-400">{service.description || '暂无描述'}</p>
                  <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <Download className="h-3 w-3" /> {service.total_downloads} 次下载
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> {formatDate(service.create_time)}
                    </span>
                    {service.file_size > 0 && (
                      <span>{formatSize(service.file_size)}</span>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEdit(service)}
                    className="text-slate-400 hover:text-blue-400"
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(service.id)}
                    className="text-slate-400 hover:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 新增/编辑弹窗 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="border-slate-700 bg-slate-900 text-slate-100">
          <DialogHeader>
            <DialogTitle>{editingId ? '编辑服务文件' : '新增服务文件'}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="service-title">标题 *</Label>
              <Input
                id="service-title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="例如：PrinterKeeper"
                className="border-slate-700 bg-slate-800/50 text-slate-100 placeholder:text-slate-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="service-desc">描述</Label>
              <Textarea
                id="service-desc"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="服务文件的简短描述"
                className="min-h-[80px] border-slate-700 bg-slate-800/50 text-slate-100 placeholder:text-slate-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="service-path">文件路径</Label>
              <Input
                id="service-path"
                value={form.file_path}
                onChange={(e) => setForm({ ...form, file_path: e.target.value })}
                placeholder="例如：/upload/service/xxx.zip"
                className="border-slate-700 bg-slate-800/50 text-slate-100 placeholder:text-slate-500"
              />
              <p className="text-xs text-slate-500">填写服务器上的文件相对路径，用户点击下载时使用</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="service-name">文件名</Label>
                <Input
                  id="service-name"
                  value={form.file_name}
                  onChange={(e) => setForm({ ...form, file_name: e.target.value })}
                  placeholder="例如：PrinterKeeper.zip"
                  className="border-slate-700 bg-slate-800/50 text-slate-100 placeholder:text-slate-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="service-size">文件大小 (字节)</Label>
                <Input
                  id="service-size"
                  value={form.file_size}
                  onChange={(e) => setForm({ ...form, file_size: e.target.value })}
                  placeholder="例如：82528"
                  className="border-slate-700 bg-slate-800/50 text-slate-100 placeholder:text-slate-500"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="border-slate-600 text-slate-300">
              取消
            </Button>
            <Button onClick={handleSubmit} disabled={submitting} className="bg-blue-600 hover:bg-blue-500">
              {submitting ? '保存中...' : editingId ? '保存修改' : '添加'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
