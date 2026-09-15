import { useEffect, useState, useRef } from 'react';
import { Download, Pencil, Plus, Trash2, FileText, Calendar, Upload, Layers, X, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { apiGet, apiPost, apiPut, apiDelete, apiUpload } from '@/lib/api';

interface ServiceVersion {
  id: number;
  file_path: string;
  file_name: string;
  file_size: number;
  download_count: number;
  version_note: string;
  create_time: string;
}

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
  versions: ServiceVersion[];
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

export default function ServiceTab() {
  const [services, setServices] = useState<ServiceFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ServiceForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 版本管理
  const [versionDialog, setVersionDialog] = useState<ServiceFile | null>(null);
  const [versions, setVersions] = useState<ServiceVersion[]>([]);
  const [versionNote, setVersionNote] = useState('');
  const [versionFile, setVersionFile] = useState<File | null>(null);
  const [uploadingVersion, setUploadingVersion] = useState(false);
  const versionFileRef = useRef<HTMLInputElement>(null);

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
    setUploadFile(null);
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
    setUploadFile(null);
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.title.trim()) {
      alert('标题不能为空');
      return;
    }

    setSubmitting(true);
    try {
      let filePath = form.file_path;
      let fileName = form.file_name;
      let fileSize = Number(form.file_size) || 0;

      // 如果有新选择的文件，先上传到服务器
      if (uploadFile) {
        const fd = new FormData();
        fd.append('file', uploadFile);
        const up = await apiUpload('/admin/services/upload', fd);
        filePath = up.data.url;
        fileName = uploadFile.name;
        fileSize = uploadFile.size;
      }

      const payload = {
        title: form.title.trim(),
        description: form.description,
        file_path: filePath,
        file_name: fileName,
        file_size: fileSize,
      };

      if (editingId) {
        await apiPut(`/admin/services/${editingId}`, payload);
      } else {
        await apiPost('/admin/services', payload);
      }

      setDialogOpen(false);
      loadServices();
    } catch (err: any) {
      console.error('保存服务文件失败:', err);
      alert('保存失败：' + (err.message || '请重试'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这个服务文件吗？相关版本记录和文件也会被删除。')) return;

    try {
      await apiDelete(`/admin/services/${id}`);
      loadServices();
    } catch (err) {
      console.error('删除服务文件失败:', err);
      alert('删除失败，请重试');
    }
  };

  // ===== 版本管理 =====
  const openVersions = (service: ServiceFile) => {
    setVersionDialog(service);
    setVersions(service.versions || []);
    setVersionFile(null);
    setVersionNote('');
  };

  const handleUploadVersion = async () => {
    if (!versionFile) {
      alert('请先选择要上传的文件');
      return;
    }
    setUploadingVersion(true);
    try {
      const fd = new FormData();
      fd.append('file', versionFile);
      if (versionNote) fd.append('version_note', versionNote);
      await apiUpload(`/admin/services/${versionDialog!.id}/versions`, fd);
      setVersionFile(null);
      setVersionNote('');
      if (versionFileRef.current) versionFileRef.current.value = '';
      await loadServices();
      const updated = services.find((s) => s.id === versionDialog!.id);
      if (updated) setVersions(updated.versions || []);
      alert('新版本上传成功');
    } catch (err: any) {
      console.error('上传版本失败:', err);
      alert('上传失败：' + (err.message || '请重试'));
    } finally {
      setUploadingVersion(false);
    }
  };

  const handleDeleteVersion = async (versionId: number) => {
    if (!confirm('确定要删除这个版本吗？文件也会从服务器移除。')) return;
    try {
      await apiDelete(`/admin/services/versions/${versionId}`);
      await loadServices();
      const updated = services.find((s) => s.id === versionDialog!.id);
      if (updated) setVersions(updated.versions || []);
    } catch (err: any) {
      console.error('删除版本失败:', err);
      alert('删除失败：' + (err.message || '请重试'));
    }
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
        <p className="text-sm text-slate-400">管理服务支持文件（上传文件至服务器，用户可在服务支持页面下载）</p>
        <Button onClick={openAdd} className="gap-2 bg-blue-600 hover:bg-blue-500">
          <Plus className="h-4 w-4" /> 新增服务
        </Button>
      </div>

      {services.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/40 p-12 text-center">
          <FileText className="mx-auto mb-3 h-12 w-12 text-slate-600" />
          <p className="text-slate-400">暂无服务文件</p>
          <p className="mt-1 text-xs text-slate-600">点击右上角"新增服务"上传第一个服务文件</p>
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
                    size="sm"
                    onClick={() => openVersions(service)}
                    className="gap-1 text-slate-300 hover:text-cyan-300"
                  >
                    <Layers className="h-4 w-4" /> 版本管理
                  </Button>
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
              <Label>文件上传</Label>
              <div
                className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-slate-600 bg-slate-800/30 px-4 py-4 transition-colors hover:border-blue-500/50"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="h-5 w-5 shrink-0 text-blue-400" />
                <div className="min-w-0 flex-1">
                  {uploadFile ? (
                    <div className="flex items-center gap-2 text-sm text-cyan-300">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="truncate">{uploadFile.name}</span>
                      <span className="shrink-0 text-xs text-slate-500">{formatSize(uploadFile.size)}</span>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-slate-300">
                        {editingId && form.file_name ? '如需更换文件，请点击选择' : '点击选择要上传的文件'}
                      </p>
                      <p className="text-xs text-slate-500">支持任意格式，最大 500MB</p>
                    </div>
                  )}
                </div>
                {uploadFile && (
                  <X
                    className="h-4 w-4 shrink-0 text-slate-500 hover:text-red-400"
                    onClick={(e) => {
                      e.stopPropagation();
                      setUploadFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                  />
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
              />
              {!uploadFile && editingId && form.file_name && (
                <p className="text-xs text-slate-500">当前文件：{form.file_name}（{formatSize(Number(form.file_size) || 0)}）</p>
              )}
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

      {/* 版本管理弹窗 */}
      <Dialog open={!!versionDialog} onOpenChange={(open) => !open && setVersionDialog(null)}>
        <DialogContent className="max-w-2xl border-slate-700 bg-slate-900 text-slate-100">
          <DialogHeader>
            <DialogTitle>版本管理 · {versionDialog?.title}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {/* 上传新版本 */}
            <div className="rounded-lg border border-slate-700/60 bg-slate-800/30 p-4">
              <p className="mb-3 text-sm font-medium text-slate-200">
                <Upload className="mr-1 inline h-4 w-4 text-blue-400" /> 上传新版本
              </p>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div
                  className="flex flex-1 cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-600 px-3 py-2.5 transition-colors hover:border-blue-500/50"
                  onClick={() => versionFileRef.current?.click()}
                >
                  {versionFile ? (
                    <div className="flex min-w-0 items-center gap-2 text-sm text-cyan-300">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      <span className="truncate">{versionFile.name}</span>
                      <span className="shrink-0 text-xs text-slate-500">{formatSize(versionFile.size)}</span>
                    </div>
                  ) : (
                    <span className="text-sm text-slate-400">点击选择文件</span>
                  )}
                  <input
                    ref={versionFileRef}
                    type="file"
                    className="hidden"
                    onChange={(e) => setVersionFile(e.target.files?.[0] || null)}
                  />
                </div>
                <Input
                  value={versionNote}
                  onChange={(e) => setVersionNote(e.target.value)}
                  placeholder="版本说明（可选）"
                  className="sm:w-48 border-slate-700 bg-slate-800/50 text-slate-100 placeholder:text-slate-500"
                />
                <Button
                  onClick={handleUploadVersion}
                  disabled={uploadingVersion}
                  className="shrink-0 gap-1 bg-blue-600 hover:bg-blue-500"
                >
                  <Upload className="h-4 w-4" /> {uploadingVersion ? '上传中...' : '上传'}
                </Button>
              </div>
            </div>

            {/* 版本列表 */}
            {versions.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-700 bg-slate-900/40 p-8 text-center">
                <p className="text-sm text-slate-500">暂无版本，上传第一个版本吧</p>
              </div>
            ) : (
              <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
                {versions.map((v, idx) => (
                  <div
                    key={v.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-slate-800/60 bg-slate-800/40 px-4 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="shrink-0 rounded bg-blue-500/15 px-1.5 py-0.5 text-[10px] font-medium text-blue-400">
                          v{versions.length - idx}
                        </span>
                        <p className="truncate text-sm font-medium text-slate-200">{v.file_name}</p>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        <span>{formatSize(v.file_size)}</span>
                        <span>{v.download_count} 次下载</span>
                        <span>{formatDate(v.create_time)}</span>
                        {v.version_note && <span className="text-cyan-400/80">「{v.version_note}」</span>}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <a href={v.file_path} download={v.file_name}>
                        <Button variant="ghost" size="icon" className="text-slate-400 hover:text-blue-400">
                          <Download className="h-4 w-4" />
                        </Button>
                      </a>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteVersion(v.id)}
                        className="text-slate-400 hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setVersionDialog(null)} className="border-slate-600 text-slate-300">
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
